import Phaser from 'phaser'
import type { Role } from '../../content/ids'
import { BLOCKING, T } from '../art/pixels'
import { bus } from '../bus'
import { buildMaze, hideClues, MAZE_START, PAWPRINT_COUNT, PAWPRINT_SECONDS, type MazeData } from '../map/courtyardMaze'
import { type Pt } from '../systems/movement'
import { Walker, zoomFor } from '../systems/walker'

/** “Find the Missing Pawprints”: search leaf piles before time runs out. */
export class PetCourtyardScene extends Phaser.Scene {
  private maze!: MazeData
  private walker!: Walker
  private layer!: Phaser.Tilemaps.TilemapLayer
  private paws: Pt[] = []
  private artifactAt!: Pt
  private searched = new Set<string>()
  private found = 0
  private artifact = false
  private secondsLeft = PAWPRINT_SECONDS
  private ended = false
  private role: Role = 'ut'
  private reduced = false
  private cat!: Phaser.Physics.Arcade.Sprite
  private simba!: Phaser.GameObjects.Sprite
  private simbaMoves = 0
  private offs: (() => void)[] = []

  constructor() {
    super('pawprints')
  }

  init(data: { role: Role; reduced: boolean }) {
    this.role = data.role
    this.reduced = data.reduced
    this.searched.clear()
    this.found = 0
    this.artifact = false
    this.secondsLeft = PAWPRINT_SECONDS
    this.ended = false
    this.simbaMoves = 0
  }

  create() {
    this.maze = buildMaze()
    const clues = hideClues(this.maze.leaves)
    this.paws = clues.paws
    this.artifactAt = clues.artifact
    const tilemap = this.make.tilemap({ data: this.maze.tiles, tileWidth: 16, tileHeight: 16 })
    const ts = tilemap.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!
    this.layer = tilemap.createLayer(0, ts, 0, 0)!
    this.layer.setCollision(BLOCKING)
    const W = this.maze.tiles[0].length * 16
    const H = this.maze.tiles.length * 16
    this.physics.world.setBounds(0, 0, W, H)

    this.walker = new Walker(this, 'player', MAZE_START, this.maze.walk)
    this.physics.add.collider(this.walker.sprite, this.layer)

    // Sleepy Cat naps in corridors (a gentle, tappable obstacle)
    this.cat = this.physics.add.staticSprite(0, 0, 'cat', 0)
    this.moveCat()
    this.physics.add.collider(this.walker.sprite, this.cat)
    this.time.addEvent({ delay: 9000, loop: true, callback: () => this.moveCat() })

    // Simba sniffs around, sometimes running straight at a hidden pawprint (a hint!)
    this.simba = this.add.sprite(10 * 16, 5 * 16 + 12, 'simba', 0).setOrigin(0.5, 1)
    this.moveSimba()

    const cam = this.cameras.main
    cam.setRoundPixels(true)
    cam.setBackgroundColor('#5F8063')
    cam.startFollow(this.walker.sprite, true, 0.15, 0.15)
    const fit = () => {
      const z = Math.max(zoomFor(this.scale.width, this.scale.height), Math.min(this.scale.width / W, this.scale.height / H))
      cam.setZoom(z)
      // When the maze is smaller than the screen, centre it instead of pinning it top-left.
      const vw = this.scale.width / z
      const vh = this.scale.height / z
      cam.setBounds(Math.min(0, (W - vw) / 2), Math.min(0, (H - vh) / 2), Math.max(W, vw), Math.max(H, vh))
    }
    fit()
    this.scale.on('resize', fit)

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.ended) return
      const wp = cam.getWorldPoint(p.x, p.y)
      if (Phaser.Math.Distance.Between(wp.x, wp.y, this.cat.x, this.cat.y) < 14) return this.tapCat()
      this.walker.walkTo({ x: Math.floor(wp.x / 16), y: Math.floor(wp.y / 16) })
    })
    const keys = this.input.keyboard!.addKeys('E,ENTER,SPACE', false) as Record<string, Phaser.Input.Keyboard.Key>
    for (const k of Object.values(keys))
      k.on('down', () => {
        const s = this.walker.sprite
        if (Phaser.Math.Distance.Between(s.x, s.y - 6, this.cat.x, this.cat.y) < 26) this.tapCat()
      })
    this.offs.push(
      bus.on('press', () => {
        const s = this.walker.sprite
        if (Phaser.Math.Distance.Between(s.x, s.y - 6, this.cat.x, this.cat.y) < 26) this.tapCat()
      }),
      bus.on('pawQuit', () => this.finish(true)),
    )
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.ended) return
        this.secondsLeft--
        this.emitProgress()
        if (this.secondsLeft <= 0) this.finish(false)
      },
    })
    this.events.once('shutdown', () => {
      this.offs.forEach((o) => o())
      this.offs = []
      this.walker.destroy()
    })
    this.emitProgress()
  }

  update(_t: number, dt: number) {
    this.walker.update(dt, this.ended)
    this.simba.setDepth(this.simba.y)
    this.cat.setDepth(this.cat.y)
    if (this.ended) return
    const tile = this.walker.tile()
    const key = `${tile.x},${tile.y}`
    if (this.maze.tiles[tile.y]?.[tile.x] === T.LEAVES && !this.searched.has(key)) this.search(tile, key)
  }

  private search(tile: Pt, key: string) {
    this.searched.add(key)
    this.layer.putTileAt(T.COURT, tile.x, tile.y)
    const x = tile.x * 16 + 8
    const y = tile.y * 16 + 8
    if (this.paws.some((p) => p.x === tile.x && p.y === tile.y)) {
      this.found++
      this.add.image(x, y, 'paw').setDepth(1)
      this.pop(x, y, '+10 pawprint!')
      this.emitProgress()
      if (this.found >= PAWPRINT_COUNT) this.time.delayedCall(500, () => this.finish(false))
    } else if (tile.x === this.artifactAt.x && tile.y === this.artifactAt.y) {
      this.artifact = true
      this.add.image(x, y, this.role === 'satyam' ? 'ball' : 'bell').setDepth(1)
      this.pop(x, y, this.role === 'satyam' ? 'Simba’s lost ball!' : 'The cat’s tiny bell!')
      this.emitProgress()
    } else {
      this.pop(x, y, 'Just leaves.')
    }
  }

  private pop(x: number, y: number, text: string) {
    const t = this.add
      .text(x, y - 6, text, { fontFamily: 'Tiny5, monospace', fontSize: '16px', color: '#FFF8E8', stroke: '#2B2230', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScale(0.5)
      .setResolution(3)
      .setDepth(9000)
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: this.reduced ? 700 : 1300, onComplete: () => t.destroy() })
  }

  private emitProgress() {
    bus.emit('pawProgress', { found: this.found, seconds: Math.max(0, this.secondsLeft), artifact: this.artifact })
  }

  private corridorTiles(): Pt[] {
    const out: Pt[] = []
    this.maze.walk.forEach((row, y) =>
      row.forEach((w, x) => {
        if (w && this.maze.tiles[y][x] === T.COURT && !(x === MAZE_START.x && y === MAZE_START.y)) out.push({ x, y })
      }),
    )
    return out
  }

  private moveCat() {
    const me = this.walker?.tile()
    const options = this.corridorTiles().filter((p) => !me || Math.abs(p.x - me.x) + Math.abs(p.y - me.y) > 2)
    const p = Phaser.Utils.Array.GetRandom(options)
    this.cat.setPosition(p.x * 16 + 8, p.y * 16 + 10)
    this.cat.refreshBody()
    this.cat.setFrame(0)
  }

  private tapCat() {
    this.cat.setFrame(1)
    bus.emit('pawCat')
    this.time.delayedCall(700, () => this.moveCat())
  }

  private moveSimba() {
    if (!this.scene.isActive()) return
    this.simbaMoves++
    const hidden = this.paws.filter((p) => !this.searched.has(`${p.x},${p.y}`))
    const target =
      this.simbaMoves % 3 === 0 && hidden.length ? Phaser.Utils.Array.GetRandom(hidden) : Phaser.Utils.Array.GetRandom(this.corridorTiles())
    const x = target.x * 16 + 8
    const y = target.y * 16 + 12
    this.simba.setFlipX(x < this.simba.x)
    this.simba.play('simba-run')
    this.tweens.add({
      targets: this.simba,
      x,
      y,
      duration: Math.max(500, Phaser.Math.Distance.Between(this.simba.x, this.simba.y, x, y) * 14),
      onComplete: () => {
        this.simba.anims.stop()
        this.simba.setFrame(0)
        if (!this.reduced) this.tweens.add({ targets: this.simba, y: y - 4, duration: 120, yoyo: true, repeat: 1 })
        this.time.delayedCall(Phaser.Math.Between(900, 2000), () => this.moveSimba())
      },
    })
  }

  private finish(quit: boolean) {
    if (this.ended) return
    this.ended = true
    this.walker.stop()
    bus.emit('pawEnd', { found: this.found, artifact: this.artifact, quit })
  }
}
