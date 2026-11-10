import Phaser from 'phaser'
import type { PieceId, Role, ZoneId } from '../../content/ids'
import type { AvatarConfig } from '../../models/types'
import { BLOCKING } from '../art/pixels'
import { bus } from '../bus'
import { buildHanoiMap, type HanoiMap, type SpotDef } from '../map/hanoiMap'
import { nearestSpot, type Pt } from '../systems/movement'
import { Walker, zoomFor } from '../systems/walker'
import { ensureBaseTextures, setAvatarTexture } from '../textures'

export interface OverworldData {
  avatar: AvatarConfig
  role: Role
  other: { cfg: AvatarConfig; role: Role } | null
  pieces: PieceId[]
  reduced: boolean
  firstVisit: boolean
}

interface LiveSpot {
  id: string
  label: string
  x: number
  y: number
  r: number
}

const REACH = 22

/** The walkable Hanoi street with five zones and lots of small discoveries. */
export class HanoiOverworld extends Phaser.Scene {
  private map!: HanoiMap
  private walker!: Walker
  private spots: (SpotDef & { x: number; y: number })[] = []
  private sparkles = new Map<PieceId, Phaser.GameObjects.Sprite>()
  private cat!: Phaser.GameObjects.Sprite
  private simba!: Phaser.GameObjects.Sprite
  private koi: Phaser.GameObjects.Image[] = []
  private koiFollowUntil = 0
  private other: Phaser.GameObjects.Sprite | null = null
  private paused = false
  private reduced = false
  private nearId: string | null = null
  private bellRings = 0
  private guide: Phaser.GameObjects.Container | null = null
  private offs: (() => void)[] = []
  private initData!: OverworldData

  constructor() {
    super('overworld')
  }

  init(data: OverworldData) {
    this.initData = data
    this.reduced = data.reduced
  }

  create() {
    const d = this.initData
    ensureBaseTextures(this)
    setAvatarTexture(this, 'player', d.avatar, d.role)
    this.map = buildHanoiMap()
    const m = this.map

    const tilemap = this.make.tilemap({ data: m.tiles, tileWidth: 16, tileHeight: 16 })
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', 16, 16, 0, 0)!
    const layer = tilemap.createLayer(0, tileset, 0, 0)!
    layer.setCollision(BLOCKING)
    const W = m.tiles[0].length * 16
    const H = m.tiles.length * 16
    this.physics.world.setBounds(0, 0, W, H)

    // Signs
    for (const l of m.labels) {
      const t = this.add.text(l.tx * 16, l.ty * 16, l.text, { fontFamily: 'Tiny5, monospace', fontSize: '16px', color: '#FFF8E8', stroke: '#2B2230', strokeThickness: 4 })
      t.setOrigin(0.5).setScale(0.5).setResolution(3).setDepth(5000)
    }

    // Warm lantern light
    for (const p of m.lanternPosts) {
      const g = this.add.image(p.x * 16 + 8, p.y * 16 + 4, 'glow').setDepth(4000).setBlendMode(Phaser.BlendModes.ADD)
      if (!this.reduced) this.tweens.add({ targets: g, alpha: { from: 0.65, to: 1 }, duration: 1400 + Math.random() * 800, yoyo: true, repeat: -1 })
    }
    for (const p of m.hangingLanterns) {
      const lan = this.add.image(p.x * 16, p.y * 16, 'hlantern').setDepth(4100)
      if (!this.reduced) this.tweens.add({ targets: lan, angle: { from: -6, to: 6 }, duration: 1800 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    // string between lanterns
    const g = this.add.graphics().setDepth(4050)
    g.lineStyle(1, 0x2b2230, 0.6)
    g.beginPath()
    g.moveTo(m.hangingLanterns[0].x * 16 - 8, 6.6 * 16)
    m.hangingLanterns.forEach((p) => g.lineTo(p.x * 16, p.y * 16 - 3))
    g.strokePath()

    // Spots
    this.spots = m.spots.map((s) => ({ ...s, x: s.tx * 16 + 8, y: s.ty * 16 + 8 }))
    for (const s of this.spots) {
      if (s.kind === 'piece') {
        const sp = this.add.sprite(s.x, s.y - 2, 'sparkle', 0).setDepth(4500)
        if (!this.reduced) sp.play('sparkle')
        this.sparkles.set(s.piece!, sp)
      }
    }
    this.add.image(8 * 16 + 8, 6 * 16 + 9, 'bell').setDepth(10)

    // Sleepy Cat, breathing
    this.cat = this.add.sprite(m.catSpot.x * 16 + 8, m.catSpot.y * 16 + 10, 'cat', 0).setDepth(m.catSpot.y * 16 + 10)
    if (!this.reduced) this.tweens.add({ targets: this.cat, scaleY: { from: 1, to: 1.07 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // Simba, wandering the park
    this.simba = this.add.sprite(23 * 16, 22 * 16, 'simba', 0).setOrigin(0.5, 1)
    this.wanderSimba()

    // Koi
    for (let i = 0; i < 2; i++) {
      const k = this.add.image(12 * 16 + 10 + i * 18, 23 * 16 + 10 + i * 10, 'koi').setDepth(5)
      this.koi.push(k)
      if (!this.reduced) this.tweens.add({ targets: k, x: k.x + 12 - i * 20, duration: 2600 + i * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => k.toggleFlipX(), onRepeat: () => k.toggleFlipX() })
    }

    // The other player stands near "their" building
    if (d.other) this.placeOther(d.other.cfg, d.other.role)

    // Player
    this.walker = new Walker(this, 'player', m.start, m.walk)
    this.physics.add.collider(this.walker.sprite, layer)
    this.walker.facing = 1
    this.hideFoundPieces(d.pieces)

    // Camera
    const cam = this.cameras.main
    cam.setBounds(0, 0, W, H)
    cam.setRoundPixels(true)
    cam.startFollow(this.walker.sprite, true, 0.14, 0.14)
    cam.setBackgroundColor('#2B2230')
    const fit = () => cam.setZoom(zoomFor(this.scale.width, this.scale.height))
    fit()
    this.scale.on('resize', fit)

    // Ambient life
    this.time.addEvent({ delay: 4200, loop: true, callback: () => this.spawnScooter() })
    this.time.addEvent({ delay: 19000, loop: true, callback: () => this.flyPlane() })
    this.spawnScooter()

    // Tutorial guide arrow over the café door on first visit
    if (d.firstVisit) this.showGuide({ x: 7, y: 6 })

    // Input: tap to move / tap an object to walk to it and interact
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.paused) return
      const wp = cam.getWorldPoint(p.x, p.y)
      if (this.time.now < this.koiFollowUntil) return
      const hit = nearestSpot(this.liveSpots(), wp.x, wp.y, 14)
      const tx = Math.floor(wp.x / 16)
      const ty = Math.floor(wp.y / 16)
      if (hit) this.walker.walkTo(this.standTileFor(hit), () => this.interact(hit.id))
      else this.walker.walkTo({ x: tx, y: ty })
    })
    const keys = this.input.keyboard!.addKeys('E,ENTER,SPACE', false) as Record<string, Phaser.Input.Keyboard.Key>
    for (const k of Object.values(keys)) k.on('down', () => this.pressInteract())

    this.offs.push(
      bus.on('press', () => this.pressInteract()),
      bus.on('pause', (v) => {
        this.paused = v
        if (v) this.walker.stop()
      }),
      bus.on('reduced', (v) => (this.reduced = v)),
      bus.on('avatar', ({ cfg, role }) => {
        setAvatarTexture(this, 'player', cfg, role)
        this.walker.sprite.setTexture('player', 0)
      }),
      bus.on('other', (o) => {
        this.other?.destroy()
        this.other = null
        if (o) this.placeOther(o.cfg, o.role)
      }),
      bus.on('pieces', (p) => this.hideFoundPieces(p)),
      bus.on('goto', (zone: ZoneId) => {
        const s = this.spots.find((x) => x.zone === zone)
        if (s) this.walker.walkTo({ x: s.tx, y: s.ty }, () => this.interact(s.id))
      }),
    )
    this.events.once('shutdown', () => this.cleanup())
    this.events.once('destroy', () => this.cleanup())
    bus.emit('ready')
  }

  private cleanup() {
    this.offs.forEach((o) => o())
    this.offs = []
    this.walker?.destroy()
  }

  update(_t: number, dt: number) {
    this.walker.update(dt, this.paused)
    const p = this.walker.sprite
    const near = this.paused ? null : nearestSpot(this.liveSpots(), p.x, p.y - 4, REACH)
    const id = near?.id ?? null
    if (id !== this.nearId) {
      this.nearId = id
      bus.emit('near', near ? { id: near.id, label: near.label } : null)
    }
    if (this.guide && Math.hypot(p.x - (7 * 16 + 8), p.y - 7 * 16) < 26) {
      this.guide.destroy()
      this.guide = null
    }
    if (this.time.now < this.koiFollowUntil) {
      const ptr = this.input.activePointer
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y)
      const k = this.koi[0]
      const px = Phaser.Math.Clamp(wp.x, 12 * 16 + 2, 15 * 16 - 4)
      const py = Phaser.Math.Clamp(wp.y, 23 * 16 + 2, 25 * 16 - 3)
      k.setFlipX(px > k.x)
      k.x += (px - k.x) * 0.12
      k.y += (py - k.y) * 0.12
    }
    this.simba.setDepth(this.simba.y)
  }

  // ---------------------------------------------------------------- helpers

  private liveSpots(): LiveSpot[] {
    const list: LiveSpot[] = this.spots
      .filter((s) => s.kind !== 'piece' || this.sparkles.get(s.piece!)?.visible)
      .map((s) => ({ id: s.id, label: s.label, x: s.x, y: s.y, r: REACH }))
    list.push({ id: 'simba', label: 'Pet Simba', x: this.simba.x, y: this.simba.y - 6, r: REACH })
    return list
  }

  private standTileFor(s: LiveSpot): Pt {
    return { x: Math.floor(s.x / 16), y: Math.floor(s.y / 16) }
  }

  private pressInteract() {
    if (this.paused || !this.nearId) return
    this.interact(this.nearId)
  }

  private interact(id: string) {
    if (this.paused) return
    if (id === 'cat') {
      this.cat.setFrame(1)
      this.time.delayedCall(1300, () => this.cat.setFrame(0))
    } else if (id === 'simba') {
      this.spinSimba()
    } else if (id === 'koi') {
      this.koiFollowUntil = this.time.now + 3000
    } else if (id === 'bell') {
      this.bellRings = (this.bellRings + 1) % 3
      this.floatText(8 * 16 + 8, 6 * 16, this.bellRings === 0 ? 'DING DING DING!' : 'Ding!')
    }
    bus.emit('interact', { id })
  }

  private floatText(x: number, y: number, text: string) {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Tiny5, monospace', fontSize: '16px', color: '#EAA84C', stroke: '#2B2230', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScale(0.5)
      .setResolution(3)
      .setDepth(6000)
    this.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: this.reduced ? 600 : 1100, onComplete: () => t.destroy() })
  }

  private placeOther(cfg: AvatarConfig, role: Role) {
    setAvatarTexture(this, 'other', cfg, role)
    const s = this.map.npcSpot[role]
    this.other = this.add.sprite(s.x * 16 + 8, s.y * 16 + 12, 'other', 0).setOrigin(0.5, 1).setDepth(s.y * 16 + 12)
    if (!this.reduced) this.tweens.add({ targets: this.other, y: this.other.y - 1, duration: 900, yoyo: true, repeat: -1 })
  }

  private hideFoundPieces(found: PieceId[]) {
    for (const [piece, sp] of this.sparkles) sp.setVisible(!found.includes(piece))
  }

  private wanderSimba() {
    const a = this.map.simbaArea
    const walk = this.map.walk
    let tx = 0
    let ty = 0
    for (let tries = 0; tries < 20; tries++) {
      tx = Phaser.Math.Between(a.x0, a.x1)
      ty = Phaser.Math.Between(a.y0, a.y1)
      if (walk[ty]?.[tx]) break
    }
    const x = tx * 16 + 8
    const y = ty * 16 + 12
    this.simba.setFlipX(x < this.simba.x)
    this.simba.play('simba-run')
    this.tweens.add({
      targets: this.simba,
      x,
      y,
      duration: Math.max(600, Phaser.Math.Distance.Between(this.simba.x, this.simba.y, x, y) * 22),
      onComplete: () => {
        this.simba.anims.stop()
        this.simba.setFrame(0)
        this.time.delayedCall(Phaser.Math.Between(1200, 3200), () => this.wanderSimba())
      },
    })
  }

  private spinSimba() {
    this.tweens.killTweensOf(this.simba)
    this.simba.anims.stop()
    let flips = 0
    this.time.addEvent({
      delay: this.reduced ? 1 : 120,
      repeat: 5,
      callback: () => {
        this.simba.toggleFlipX()
        if (++flips === 6) {
          const toy = this.add.image(this.simba.x + (this.simba.flipX ? -10 : 10), this.simba.y - 2, 'toy').setDepth(this.simba.y + 1)
          this.tweens.add({ targets: toy, alpha: 0, delay: 2500, duration: 600, onComplete: () => toy.destroy() })
          this.time.delayedCall(900, () => this.wanderSimba())
        }
      },
    })
  }

  private spawnScooter() {
    if (this.reduced && Math.random() < 0.5) return
    const ltr = Math.random() < 0.5
    const y = (ltr ? 10 : 12) * 16 + 10
    const W = this.map.tiles[0].length * 16
    const s = this.add.image(ltr ? -24 : W + 24, y, 'scooter').setFlipX(!ltr).setDepth(y)
    this.tweens.add({ targets: s, x: ltr ? W + 24 : -24, duration: 9000 + Math.random() * 3000, onComplete: () => s.destroy() })
  }

  private flyPlane() {
    if (this.reduced) return
    const W = this.map.tiles[0].length * 16
    const p = this.add.image(-12, 20 + Math.random() * 30, 'plane').setDepth(7000)
    this.tweens.add({ targets: p, x: W + 12, y: p.y + 40, duration: 12000, ease: 'Sine.easeInOut', onComplete: () => p.destroy() })
  }

  private showGuide(tile: Pt) {
    const c = this.add.container(tile.x * 16 + 8, tile.y * 16 - 10).setDepth(6500)
    const arrow = this.add.triangle(0, 0, -5, -6, 5, -6, 0, 2, 0xeaa84c).setStrokeStyle(1, 0x2b2230)
    const glow = this.add.image(0, 12, 'glow').setScale(1.4).setBlendMode(Phaser.BlendModes.ADD)
    c.add([glow, arrow])
    if (!this.reduced) this.tweens.add({ targets: arrow, y: -4, duration: 500, yoyo: true, repeat: -1 })
    this.guide = c
  }
}
