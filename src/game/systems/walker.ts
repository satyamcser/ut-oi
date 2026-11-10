import Phaser from 'phaser'
import { bus, typingInForm } from '../bus'
import { IDLE_FRAME, WALK_ANIM } from '../textures'
import { facingOf, findPath, type Grid, type Pt } from './movement'

const SPEED = 72

/**
 * Moves a character with keyboard (WASD/arrows), the on-screen D-pad, or
 * tap-to-move along a BFS path. Physics bodies collide with the tile layer.
 */
export class Walker {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  facing = 0
  private path: Pt[] = []
  private stuckMs = 0
  private dpad = { dx: 0, dy: 0 }
  private keys: Record<string, Phaser.Input.Keyboard.Key>
  private offDpad: () => void
  private texKey: string
  private grid: Grid
  onArrive: (() => void) | null = null

  constructor(scene: Phaser.Scene, texKey: string, tile: Pt, grid: Grid) {
    this.texKey = texKey
    this.grid = grid
    this.sprite = scene.physics.add.sprite(tile.x * 16 + 8, tile.y * 16 + 12, texKey, 0)
    this.sprite.setOrigin(0.5, 1)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(8, 5)
    body.setOffset(4, 19)
    // enableCapture = false: never swallow keys the page (forms) needs.
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as Record<string, Phaser.Input.Keyboard.Key>
    this.offDpad = bus.on('dpad', (d) => {
      this.dpad = d
      if (d.dx || d.dy) this.path = []
    })
  }

  destroy() {
    this.offDpad()
  }

  tile(): Pt {
    return { x: Math.floor(this.sprite.x / 16), y: Math.floor((this.sprite.y - 3) / 16) }
  }

  walkTo(goal: Pt, onArrive: (() => void) | null = null) {
    const p = findPath(this.grid, this.tile(), goal)
    this.path = p ?? []
    this.stuckMs = 0
    this.onArrive = onArrive
    if (p && p.length === 0) {
      const cb = this.onArrive
      this.onArrive = null
      cb?.()
    }
  }

  stop() {
    this.path = []
    this.onArrive = null
    this.sprite.setVelocity(0, 0)
    this.idle()
  }

  update(dtMs: number, paused: boolean) {
    if (paused) {
      this.sprite.setVelocity(0, 0)
      this.idle()
      return
    }
    let dx = 0
    let dy = 0
    if (!typingInForm()) {
      const k = this.keys
      if (k.LEFT.isDown || k.A.isDown) dx -= 1
      if (k.RIGHT.isDown || k.D.isDown) dx += 1
      if (k.UP.isDown || k.W.isDown) dy -= 1
      if (k.DOWN.isDown || k.S.isDown) dy += 1
    }
    dx += this.dpad.dx
    dy += this.dpad.dy
    dx = Phaser.Math.Clamp(dx, -1, 1)
    dy = Phaser.Math.Clamp(dy, -1, 1)

    if (dx || dy) {
      this.path = []
      this.onArrive = null
    } else if (this.path.length) {
      const n = this.path[0]
      const tx = n.x * 16 + 8
      const ty = n.y * 16 + 12
      const vx = tx - this.sprite.x
      const vy = ty - this.sprite.y
      if (Math.hypot(vx, vy) < 2) {
        this.sprite.setPosition(tx, ty)
        this.path.shift()
        if (!this.path.length) {
          this.sprite.setVelocity(0, 0)
          const cb = this.onArrive
          this.onArrive = null
          cb?.()
          this.idle()
          return
        }
      } else {
        dx = Math.abs(vx) > 1 ? Math.sign(vx) : 0
        dy = Math.abs(vy) > 1 ? Math.sign(vy) : 0
      }
      const body = this.sprite.body as Phaser.Physics.Arcade.Body
      if (body.blocked.none) this.stuckMs = 0
      else if ((this.stuckMs += dtMs) > 700) this.stop()
    }

    const len = Math.hypot(dx, dy) || 1
    this.sprite.setVelocity((dx / len) * SPEED, (dy / len) * SPEED)
    if (dx || dy) {
      this.facing = facingOf(dx, dy, this.facing)
      this.sprite.setFlipX(this.facing === 3)
      this.sprite.anims.play(`${this.texKey}-${WALK_ANIM[this.facing]}`, true)
    } else this.idle()
    this.sprite.setDepth(this.sprite.y)
  }

  private idle() {
    this.sprite.anims.stop()
    this.sprite.setFrame(IDLE_FRAME[this.facing])
    this.sprite.setFlipX(this.facing === 3)
  }
}

/** Camera zoom so roughly a dozen tiles fit across a phone and more on desktop. */
export function zoomFor(w: number, h: number): number {
  const z = Math.min(w / (16 * 11), h / (16 * 8))
  return Phaser.Math.Clamp(Math.floor(z * 2) / 2, 2, 4)
}
