import Phaser from 'phaser'
import type { Role } from '../content/ids'
import type { AvatarConfig } from '../models/types'
import {
  AVATAR_H,
  AVATAR_W,
  drawTileset,
  makeAvatarSheet,
  makeBell,
  makeCatSheet,
  makeGlow,
  makeHangingLantern,
  makeKoi,
  makePaw,
  makePlane,
  makeScooter,
  makeSimbaSheet,
  makeSparkle,
  makeToy,
  PAL,
} from './art/pixels'

/** Registers a canvas as a texture, slicing it into equal frames. */
export function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, fw: number, fh: number) {
  if (scene.textures.exists(key)) scene.textures.remove(key)
  const tex = scene.textures.addCanvas(key, canvas)!
  const cols = Math.floor(canvas.width / fw)
  for (let i = 0; i < cols; i++) tex.add(i, 0, i * fw, 0, fw, fh)
}

export function ensureBaseTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('tiles')) return
  scene.textures.addCanvas('tiles', drawTileset())
  addSheet(scene, 'simba', makeSimbaSheet(), 18, 14)
  addSheet(scene, 'cat', makeCatSheet(), 16, 11)
  addSheet(scene, 'sparkle', makeSparkle(), 9, 9)
  scene.textures.addCanvas('scooter', makeScooter())
  scene.textures.addCanvas('koi', makeKoi())
  scene.textures.addCanvas('paw', makePaw())
  scene.textures.addCanvas('toy', makeToy())
  scene.textures.addCanvas('ball', makeToy(PAL.amber))
  scene.textures.addCanvas('bell', makeBell())
  scene.textures.addCanvas('plane', makePlane())
  scene.textures.addCanvas('glow', makeGlow())
  scene.textures.addCanvas('hlantern', makeHangingLantern())
}

/** (Re)builds a character sheet and its walk animations. */
export function setAvatarTexture(scene: Phaser.Scene, key: string, cfg: AvatarConfig, role: Role) {
  addSheet(scene, key, makeAvatarSheet(cfg, role), AVATAR_W, AVATAR_H)
  const anims: [string, number[]][] = [
    ['down', [1, 0, 2, 0]],
    ['up', [4, 3, 5, 3]],
    ['side', [7, 6, 8, 6]],
  ]
  for (const [name, frames] of anims) {
    const k = `${key}-${name}`
    if (scene.anims.exists(k)) scene.anims.remove(k)
    scene.anims.create({ key: k, frames: frames.map((f) => ({ key, frame: f })), frameRate: 8, repeat: -1 })
  }
  const sk = 'simba-run'
  if (!scene.anims.exists(sk)) scene.anims.create({ key: sk, frames: [1, 2].map((f) => ({ key: 'simba', frame: f })), frameRate: 8, repeat: -1 })
  if (!scene.anims.exists('sparkle')) scene.anims.create({ key: 'sparkle', frames: [0, 1].map((f) => ({ key: 'sparkle', frame: f })), frameRate: 2, repeat: -1 })
}

/** Facing → idle frame index in the 9-frame sheet. */
export const IDLE_FRAME = [0, 3, 6, 6]
export const WALK_ANIM = ['down', 'up', 'side', 'side']
