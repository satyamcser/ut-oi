// Original pixel art, drawn programmatically onto canvases (no image files,
// no borrowed assets). Everything is authored at 1 px = 1 pixel and scaled up
// with nearest-neighbour filtering.
import type { Role } from '../../content/ids'
import type { AvatarConfig } from '../../models/types'

export const PAL = {
  parchment: '#F9F1DF',
  amber: '#EAA84C',
  amberDark: '#C98A33',
  jasmine: '#779A7A',
  jasmineDark: '#5F8063',
  jasmineLight: '#93B393',
  coffee: '#5D4235',
  coffeeLight: '#7B5A47',
  coral: '#DA887C',
  coralDark: '#B96A5F',
  evening: '#323E64',
  eveningLight: '#4A5A86',
  lavender: '#B7A9CC',
  lavenderDark: '#9786B1',
  ink: '#2B2230',
  white: '#FFFFFF',
  cream: '#F2E6CC',
  creamDark: '#DCCBA8',
  yellowWall: '#E8C46E',
  yellowWallDark: '#CFA955',
  roof: '#B65E48',
  roofDark: '#954A38',
  road: '#4C5168',
  roadDark: '#41455A',
  pave: '#E6D6B5',
  paveDark: '#D2BF98',
  water: '#6FA3B8',
  waterLight: '#9CC7D6',
  stool: '#D9534F',
  leaf: '#6C8F55',
  leafDark: '#557543',
  straw: '#E8D29A',
  strawDark: '#C9B074',
}

export const SKINS = ['#F6D9C4', '#E6B793', '#C68B63', '#8C5B3D']
export const SKIN_SHADES = ['#E7C2A8', '#D19E78', '#AE734D', '#734830']
export const HAIRS = ['#2B2230', '#4E3426', '#7A5236', '#B98E62']
export const SKIN_NAMES = ['Light', 'Warm', 'Tan', 'Deep']
export const HAIR_COLOR_NAMES = ['Black', 'Dark brown', 'Brown', 'Light brown']
export const HAIR_STYLE_NAMES = ['Short', 'Long', 'Bob', 'Bun']
export const ACCESSORY_NAMES = ['None', 'Nón lá (conical hat)', 'Paw pin', 'Flower clip']

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

type Ctx = CanvasRenderingContext2D

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}
const dot = (ctx: Ctx, x: number, y: number, color: string) => rect(ctx, x, y, 1, 1, color)

// ------------------------------------------------------------------ tiles

export const TILE = 16

export const T = {
  GRASS: 0,
  GRASS_FLOWER: 1,
  PAVE: 2,
  ROAD: 3,
  ROAD_DASH: 4,
  WALL_CREAM: 5,
  WALL_YELLOW: 6,
  WALL_LAV: 7,
  WINDOW_CREAM: 8,
  WINDOW_YELLOW: 9,
  WINDOW_LAV: 10,
  DOOR: 11,
  ROOF: 12,
  EAVE: 13,
  TREE: 14,
  WATER: 15,
  FENCE: 16,
  PLANTER: 17,
  STOOL: 18,
  TABLE: 19,
  LANTERN_POST: 20,
  BENCH: 21,
  PETHOUSE: 22,
  STAIRS: 23,
  COURT: 24,
  GATE: 25,
  CHALKBOARD: 26,
  NOTICEBOARD: 27,
  TREATBOX: 28,
  AWNING: 29,
  BIKE: 30,
  SCOOTER_PARKED: 31,
  LEAVES: 32,
  STICKY_BOARD: 33,
} as const

export const TILE_COUNT = 34

export const BLOCKING: number[] = [
  T.WALL_CREAM, T.WALL_YELLOW, T.WALL_LAV, T.WINDOW_CREAM, T.WINDOW_YELLOW, T.WINDOW_LAV, T.DOOR, T.ROOF, T.EAVE,
  T.TREE, T.WATER, T.FENCE, T.PLANTER, T.STOOL, T.TABLE, T.LANTERN_POST, T.BENCH, T.PETHOUSE, T.STAIRS,
  T.CHALKBOARD, T.NOTICEBOARD, T.TREATBOX, T.AWNING, T.BIKE, T.SCOOTER_PARKED, T.STICKY_BOARD,
]

function speckle(ctx: Ctx, ox: number, oy: number, color: string, seed: number, n: number) {
  let s = seed
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280
    const x = s % 16
    s = (s * 9301 + 49297) % 233280
    const y = s % 16
    dot(ctx, ox + x, oy + y, color)
  }
}

function wall(ctx: Ctx, o: number, base: string, dark: string) {
  rect(ctx, o, 0, 16, 16, base)
  rect(ctx, o, 15, 16, 1, dark)
  for (let y = 4; y < 16; y += 5) rect(ctx, o, y, 16, 1, dark + '55')
}

function windowOn(ctx: Ctx, o: number, base: string, dark: string, shutter: string) {
  wall(ctx, o, base, dark)
  rect(ctx, o + 3, 3, 10, 10, PAL.ink)
  rect(ctx, o + 4, 4, 8, 8, '#F5DFA4')
  rect(ctx, o + 7, 4, 2, 8, PAL.creamDark)
  rect(ctx, o + 1, 3, 2, 10, shutter)
  rect(ctx, o + 13, 3, 2, 10, shutter)
  for (let y = 4; y < 13; y += 2) {
    rect(ctx, o + 1, y, 2, 1, PAL.ink + '44')
    rect(ctx, o + 13, y, 2, 1, PAL.ink + '44')
  }
  rect(ctx, o + 2, 13, 12, 1, dark)
}

/** Draws the whole tileset into one strip: TILE_COUNT × 16 px wide. */
export function drawTileset(): HTMLCanvasElement {
  const c = makeCanvas(TILE * TILE_COUNT, TILE)
  const ctx = c.getContext('2d')!
  const at = (id: number) => id * TILE

  // grass
  let o = at(T.GRASS)
  rect(ctx, o, 0, 16, 16, PAL.jasmine)
  speckle(ctx, o, 0, PAL.jasmineLight, 7, 14)
  speckle(ctx, o, 0, PAL.jasmineDark, 13, 10)
  o = at(T.GRASS_FLOWER)
  rect(ctx, o, 0, 16, 16, PAL.jasmine)
  speckle(ctx, o, 0, PAL.jasmineLight, 21, 10)
  ;[[3, 4], [11, 3], [6, 11], [13, 12]].forEach(([x, y], i) => {
    const col = [PAL.coral, PAL.white, PAL.amber, PAL.lavender][i]
    dot(ctx, o + x, y - 1, col)
    dot(ctx, o + x - 1, y, col)
    dot(ctx, o + x + 1, y, col)
    dot(ctx, o + x, y + 1, col)
    dot(ctx, o + x, y, PAL.amber)
  })
  // pavement
  o = at(T.PAVE)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o, 7, 16, 1, PAL.paveDark)
  rect(ctx, o, 15, 16, 1, PAL.paveDark)
  rect(ctx, o + 7, 0, 1, 7, PAL.paveDark)
  rect(ctx, o + 15, 8, 1, 7, PAL.paveDark)
  speckle(ctx, o, 0, PAL.paveDark, 5, 4)
  // road
  o = at(T.ROAD)
  rect(ctx, o, 0, 16, 16, PAL.road)
  speckle(ctx, o, 0, PAL.roadDark, 3, 12)
  o = at(T.ROAD_DASH)
  rect(ctx, o, 0, 16, 16, PAL.road)
  speckle(ctx, o, 0, PAL.roadDark, 9, 12)
  rect(ctx, o + 2, 7, 8, 2, PAL.amber)
  // walls & windows
  wall(ctx, at(T.WALL_CREAM), PAL.cream, PAL.creamDark)
  wall(ctx, at(T.WALL_YELLOW), PAL.yellowWall, PAL.yellowWallDark)
  wall(ctx, at(T.WALL_LAV), PAL.lavender, PAL.lavenderDark)
  windowOn(ctx, at(T.WINDOW_CREAM), PAL.cream, PAL.creamDark, PAL.jasmineDark)
  windowOn(ctx, at(T.WINDOW_YELLOW), PAL.yellowWall, PAL.yellowWallDark, PAL.jasmineDark)
  windowOn(ctx, at(T.WINDOW_LAV), PAL.lavender, PAL.lavenderDark, PAL.evening)
  // door
  o = at(T.DOOR)
  rect(ctx, o, 0, 16, 16, PAL.creamDark)
  rect(ctx, o + 2, 1, 12, 15, PAL.coffee)
  rect(ctx, o + 3, 2, 4, 6, PAL.coffeeLight)
  rect(ctx, o + 9, 2, 4, 6, PAL.coffeeLight)
  rect(ctx, o + 3, 9, 4, 6, PAL.coffeeLight)
  rect(ctx, o + 9, 9, 4, 6, PAL.coffeeLight)
  dot(ctx, o + 8, 9, PAL.amber)
  // roof (terracotta tiles)
  o = at(T.ROOF)
  rect(ctx, o, 0, 16, 16, PAL.roof)
  for (let y = 0; y < 16; y += 4) {
    rect(ctx, o, y + 3, 16, 1, PAL.roofDark)
    for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) dot(ctx, o + x, y + 1, PAL.roofDark)
  }
  o = at(T.EAVE)
  rect(ctx, o, 0, 16, 9, PAL.roof)
  rect(ctx, o, 3, 16, 1, PAL.roofDark)
  rect(ctx, o, 8, 16, 2, PAL.roofDark)
  rect(ctx, o, 10, 16, 6, PAL.ink + '55')
  // tree
  o = at(T.TREE)
  rect(ctx, o, 0, 16, 16, PAL.jasmine)
  ctx.fillStyle = PAL.leafDark
  ctx.beginPath()
  ctx.arc(o + 8, 7, 7.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = PAL.leaf
  ctx.beginPath()
  ctx.arc(o + 7, 6, 6, 0, Math.PI * 2)
  ctx.fill()
  speckle(ctx, o, 0, PAL.jasmineLight, 31, 6)
  rect(ctx, o + 7, 13, 2, 3, PAL.coffee)
  // water
  o = at(T.WATER)
  rect(ctx, o, 0, 16, 16, PAL.water)
  rect(ctx, o + 2, 4, 5, 1, PAL.waterLight)
  rect(ctx, o + 9, 10, 5, 1, PAL.waterLight)
  dot(ctx, o + 12, 3, PAL.waterLight)
  // fence
  o = at(T.FENCE)
  rect(ctx, o, 0, 16, 16, PAL.jasmine)
  rect(ctx, o, 5, 16, 2, PAL.coffeeLight)
  rect(ctx, o, 10, 16, 2, PAL.coffeeLight)
  for (const x of [1, 7, 13]) rect(ctx, o + x, 2, 2, 13, PAL.coffee)
  // planter
  o = at(T.PLANTER)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 3, 9, 10, 6, PAL.roof)
  rect(ctx, o + 3, 9, 10, 1, PAL.roofDark)
  ctx.fillStyle = PAL.leaf
  ctx.beginPath()
  ctx.arc(o + 8, 6, 5, 0, Math.PI * 2)
  ctx.fill()
  dot(ctx, o + 6, 4, PAL.coral)
  dot(ctx, o + 10, 6, PAL.white)
  // red plastic stool
  o = at(T.STOOL)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 4, 6, 8, 3, PAL.stool)
  rect(ctx, o + 4, 6, 8, 1, '#EF7A73')
  rect(ctx, o + 5, 9, 1, 5, PAL.stool)
  rect(ctx, o + 10, 9, 1, 5, PAL.stool)
  rect(ctx, o + 5, 12, 6, 1, PAL.stool)
  // low table
  o = at(T.TABLE)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 2, 5, 12, 3, PAL.coffeeLight)
  rect(ctx, o + 3, 8, 1, 6, PAL.coffee)
  rect(ctx, o + 12, 8, 1, 6, PAL.coffee)
  rect(ctx, o + 6, 2, 3, 3, PAL.white)
  rect(ctx, o + 6, 3, 3, 1, PAL.coffee)
  // lantern post
  o = at(T.LANTERN_POST)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 7, 4, 2, 12, PAL.ink)
  rect(ctx, o + 5, 2, 6, 5, PAL.amber)
  rect(ctx, o + 5, 2, 6, 1, PAL.coralDark)
  rect(ctx, o + 5, 6, 6, 1, PAL.coralDark)
  rect(ctx, o + 7, 3, 2, 3, '#FFE2A6')
  // bench
  o = at(T.BENCH)
  rect(ctx, o, 0, 16, 16, PAL.jasmine)
  rect(ctx, o + 1, 5, 14, 2, PAL.coffeeLight)
  rect(ctx, o + 1, 8, 14, 3, PAL.coffeeLight)
  rect(ctx, o + 2, 11, 1, 3, PAL.ink)
  rect(ctx, o + 13, 11, 1, 3, PAL.ink)
  // pet house
  o = at(T.PETHOUSE)
  rect(ctx, o, 0, 16, 16, '#D9C7A2')
  ctx.fillStyle = PAL.coral
  ctx.beginPath()
  ctx.moveTo(o + 1, 7)
  ctx.lineTo(o + 8, 1)
  ctx.lineTo(o + 15, 7)
  ctx.fill()
  rect(ctx, o + 2, 7, 12, 8, PAL.amber)
  rect(ctx, o + 5, 9, 6, 6, PAL.ink)
  rect(ctx, o + 6, 10, 4, 5, '#3A2F3F')
  // stairs
  o = at(T.STAIRS)
  rect(ctx, o, 0, 16, 16, PAL.creamDark)
  for (let y = 1; y < 16; y += 3) {
    rect(ctx, o, y, 16, 2, PAL.cream)
    rect(ctx, o, y + 2, 16, 1, PAL.coffeeLight)
  }
  // courtyard ground
  o = at(T.COURT)
  rect(ctx, o, 0, 16, 16, '#D8C9A6')
  speckle(ctx, o, 0, '#C5B48F', 17, 10)
  speckle(ctx, o, 0, '#E5D9BB', 19, 8)
  // gate
  o = at(T.GATE)
  rect(ctx, o, 0, 16, 16, '#D8C9A6')
  rect(ctx, o, 2, 2, 13, PAL.coffee)
  rect(ctx, o + 14, 2, 2, 13, PAL.coffee)
  // chalkboard
  o = at(T.CHALKBOARD)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 2, 1, 12, 11, PAL.coffee)
  rect(ctx, o + 3, 2, 10, 9, '#2F3B35')
  rect(ctx, o + 4, 4, 6, 1, PAL.white)
  rect(ctx, o + 4, 6, 8, 1, PAL.white)
  rect(ctx, o + 4, 8, 5, 1, PAL.amber)
  rect(ctx, o + 3, 12, 1, 3, PAL.coffee)
  rect(ctx, o + 12, 12, 1, 3, PAL.coffee)
  // noticeboard
  o = at(T.NOTICEBOARD)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 1, 1, 14, 10, PAL.coffeeLight)
  rect(ctx, o + 2, 2, 5, 4, PAL.white)
  rect(ctx, o + 8, 2, 6, 5, PAL.parchment)
  rect(ctx, o + 3, 7, 6, 3, PAL.coral)
  dot(ctx, o + 4, 2, PAL.coral)
  dot(ctx, o + 11, 2, PAL.evening)
  rect(ctx, o + 7, 11, 2, 4, PAL.coffee)
  // treat box
  o = at(T.TREATBOX)
  rect(ctx, o, 0, 16, 16, '#D8C9A6')
  rect(ctx, o + 2, 5, 12, 9, PAL.coral)
  rect(ctx, o + 2, 5, 12, 2, PAL.coralDark)
  rect(ctx, o + 6, 8, 4, 3, PAL.parchment)
  // café awning
  o = at(T.AWNING)
  for (let x = 0; x < 16; x += 4) {
    rect(ctx, o + x, 0, 2, 11, PAL.jasmineDark)
    rect(ctx, o + x + 2, 0, 2, 11, PAL.parchment)
  }
  for (let x = 0; x < 16; x += 4) rect(ctx, o + x, 11, 3, 2, x % 8 ? PAL.parchment : PAL.jasmineDark)
  rect(ctx, o, 13, 16, 3, PAL.yellowWallDark)
  // bicycle
  o = at(T.BIKE)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  ctx.strokeStyle = PAL.ink
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(o + 4, 11, 3, 0, Math.PI * 2)
  ctx.arc(o + 12, 11, 3, 0, Math.PI * 2)
  ctx.stroke()
  rect(ctx, o + 4, 8, 8, 1, PAL.jasmineDark)
  rect(ctx, o + 7, 6, 1, 5, PAL.jasmineDark)
  rect(ctx, o + 10, 5, 3, 1, PAL.ink)
  rect(ctx, o + 6, 5, 3, 1, PAL.coffee)
  // parked scooter
  o = at(T.SCOOTER_PARKED)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 2, 7, 11, 4, PAL.evening)
  rect(ctx, o + 9, 3, 2, 5, PAL.eveningLight)
  rect(ctx, o + 8, 3, 5, 1, PAL.ink)
  rect(ctx, o + 3, 6, 5, 1, PAL.coffee)
  rect(ctx, o + 2, 11, 3, 3, PAL.ink)
  rect(ctx, o + 10, 11, 3, 3, PAL.ink)
  // leaf pile (pawprint hiding spot)
  o = at(T.LEAVES)
  rect(ctx, o, 0, 16, 16, '#D8C9A6')
  ;[[4, 9, PAL.amber], [7, 7, PAL.leaf], [10, 9, PAL.coral], [6, 10, PAL.amberDark], [9, 11, PAL.leafDark], [8, 9, PAL.amber]].forEach(([x, y, col]) =>
    rect(ctx, o + (x as number), y as number, 3, 2, col as string),
  )
  // sticky-note board
  o = at(T.STICKY_BOARD)
  rect(ctx, o, 0, 16, 16, PAL.pave)
  rect(ctx, o + 1, 1, 14, 11, PAL.coffeeLight)
  ;[[2, 2, '#FFE88A'], [7, 2, '#F7B8C4'], [11, 3, '#B8E0C8'], [3, 7, '#B8D4F0'], [8, 7, '#FFE88A']].forEach(([x, y, col]) =>
    rect(ctx, o + (x as number), y as number, 4, 4, col as string),
  )
  rect(ctx, o + 7, 12, 2, 3, PAL.coffee)
  return c
}

// ------------------------------------------------------------------ avatars

const OUTFIT: Record<Role, { top: string; topDark: string; bottom: string; aodai: string; aodaiDark: string }> = {
  satyam: { top: PAL.eveningLight, topDark: PAL.evening, bottom: '#3A3442', aodai: PAL.amber, aodaiDark: PAL.amberDark },
  ut: { top: PAL.coral, topDark: PAL.coralDark, bottom: PAL.coffee, aodai: PAL.lavender, aodaiDark: PAL.lavenderDark },
}

/** dir: 0 down, 1 up, 2 side (faces right; flip for left). frame: 0 stand, 1/2 steps. */
export function drawAvatar(ctx: Ctx, ox: number, oy: number, dir: 0 | 1 | 2, frame: 0 | 1 | 2, cfg: AvatarConfig, role: Role) {
  const skin = SKINS[cfg.skin] ?? SKINS[0]
  const skinShade = SKIN_SHADES[cfg.skin] ?? SKIN_SHADES[0]
  const hair = HAIRS[cfg.hairColor] ?? HAIRS[0]
  const o = OUTFIT[role]
  const aodai = cfg.outfit === 'aodai'
  const r = (x: number, y: number, w: number, h: number, c: string) => rect(ctx, ox + x, oy + y, w, h, c)
  const side = dir === 2
  const hx = side ? 5 : 4
  const hw = side ? 7 : 8

  // long hair behind the body
  if (cfg.hair === 1 && !side) r(3, 5, 10, 9, hair)
  if (cfg.hair === 1 && side) r(4, 5, 4, 9, hair)

  // legs & shoes (walk cycle)
  const lift = (leg: 0 | 1) => (frame === 1 && leg === 0) || (frame === 2 && leg === 1)
  const legColor = aodai ? '#F4EFE6' : o.bottom
  if (side) {
    const a = frame === 1 ? 5 : frame === 2 ? 8 : 6
    const b = frame === 1 ? 8 : frame === 2 ? 5 : 8
    r(a, 18, 2, 4, legColor)
    r(b, 18, 2, 4, legColor)
    r(a, 22, 3, 1, PAL.ink)
    r(b, 22, 3, 1, PAL.ink)
  } else {
    r(5, 18, 2, lift(0) ? 3 : 4, legColor)
    r(9, 18, 2, lift(1) ? 3 : 4, legColor)
    r(5, lift(0) ? 21 : 22, 2, 1, PAL.ink)
    r(9, lift(1) ? 21 : 22, 2, 1, PAL.ink)
  }

  // body / outfit
  const bx = side ? 5 : 4
  const bw = side ? 6 : 8
  if (aodai) {
    r(bx, 11, bw, 7, o.aodai)
    r(side ? 6 : 6, 18, side ? 4 : 4, 3, o.aodai) // long front panel
    r(bx, 11, bw, 1, o.aodaiDark)
    if (!side) {
      r(7, 11, 2, 2, o.aodaiDark) // mandarin collar
      r(8, 13, 1, 4, o.aodaiDark)
    }
  } else {
    r(bx, 11, bw, 7, o.top)
    r(bx, 17, bw, 1, o.topDark)
    if (dir === 0) r(7, 11, 2, 1, PAL.parchment)
  }
  // arms
  const armColor = aodai ? o.aodai : o.top
  if (side) {
    const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0
    r(7 + swing, 12, 2, 5, armColor)
    r(7 + swing, 17, 2, 1, skin)
  } else {
    const ly = frame === 1 ? 16 : 17
    const ry = frame === 2 ? 16 : 17
    r(3, 12, 1, ly - 12, armColor)
    r(12, 12, 1, ry - 12, armColor)
    r(3, ly, 1, 1, skin)
    r(12, ry, 1, 1, skin)
  }

  // head
  r(hx, 3, hw, 8, skin)
  r(hx, 10, hw, 1, skinShade)
  if (dir === 0) {
    r(6, 7, 1, 2, PAL.ink)
    r(9, 7, 1, 2, PAL.ink)
    r(5, 9, 1, 1, '#E7A092')
    r(10, 9, 1, 1, '#E7A092')
  } else if (side) {
    r(10, 7, 1, 2, PAL.ink)
    r(11, 9, 1, 1, '#E7A092')
  }

  // hair on top
  const top = () => r(hx, 2, hw, 3, hair)
  if (dir === 1) {
    // back of the head
    r(hx, 2, hw, 8, hair)
    if (cfg.hair === 1) r(hx - 1, 5, hw + 2, 9, hair)
    if (cfg.hair === 2) r(hx - 1, 5, hw + 2, 5, hair)
    if (cfg.hair === 3) r(6, 0, 4, 2, hair)
  } else if (side) {
    top()
    r(5, 5, 3, 4, hair) // back of head
    if (cfg.hair === 1) r(4, 5, 3, 9, hair)
    if (cfg.hair === 2) r(4, 5, 4, 5, hair)
    if (cfg.hair === 3) r(4, 1, 3, 3, hair)
    r(9, 5, 2, 1, hair) // fringe
  } else {
    top()
    if (cfg.hair === 0) {
      r(4, 5, 1, 2, hair)
      r(11, 5, 1, 2, hair)
      r(5, 5, 3, 1, hair)
    } else if (cfg.hair === 1) {
      r(3, 4, 2, 9, hair)
      r(11, 4, 2, 9, hair)
      r(5, 5, 6, 1, hair)
    } else if (cfg.hair === 2) {
      r(3, 4, 2, 6, hair)
      r(11, 4, 2, 6, hair)
      r(5, 5, 6, 1, hair)
    } else {
      r(6, 0, 4, 2, hair)
      r(4, 5, 1, 1, hair)
      r(11, 5, 1, 1, hair)
      r(5, 5, 2, 1, hair)
    }
  }

  // accessories
  if (cfg.accessory === 1) {
    // nón lá (conical hat)
    r(2, 4, 12, 1, PAL.strawDark)
    r(3, 3, 10, 1, PAL.straw)
    r(5, 2, 6, 1, PAL.straw)
    r(6, 1, 4, 1, PAL.straw)
    r(7, 0, 2, 1, PAL.strawDark)
  } else if (cfg.accessory === 2 && dir !== 1) {
    const px = side ? 6 : 5
    dot(ctx, ox + px, oy + 14, PAL.parchment)
    dot(ctx, ox + px + 1, oy + 13, PAL.parchment)
    dot(ctx, ox + px - 1, oy + 13, PAL.parchment)
  } else if (cfg.accessory === 3) {
    const fx = side ? 6 : 11
    dot(ctx, ox + fx, oy + 3, '#F28CA5')
    dot(ctx, ox + fx + 1, oy + 4, '#F28CA5')
    dot(ctx, ox + fx - 1, oy + 4, '#F28CA5')
    dot(ctx, ox + fx, oy + 5, '#F28CA5')
    dot(ctx, ox + fx, oy + 4, PAL.amber)
  }
}

export const AVATAR_W = 16
export const AVATAR_H = 24

/** 9 frames: down×3, up×3, side×3. */
export function makeAvatarSheet(cfg: AvatarConfig, role: Role): HTMLCanvasElement {
  const c = makeCanvas(AVATAR_W * 9, AVATAR_H)
  const ctx = c.getContext('2d')!
  for (let d = 0; d < 3; d++)
    for (let f = 0; f < 3; f++) drawAvatar(ctx, (d * 3 + f) * AVATAR_W, 0, d as 0 | 1 | 2, f as 0 | 1 | 2, cfg, role)
  return c
}

// ------------------------------------------------------------------ pets & props

/** Simba: grey/white Siberian Husky, side view. Frames: stand, step, step. 18×14 each. */
export function makeSimbaSheet(): HTMLCanvasElement {
  const W = 18
  const c = makeCanvas(W * 3, 14)
  const ctx = c.getContext('2d')!
  const grey = '#8E97A8'
  const greyDark = '#6E7686'
  for (let f = 0; f < 3; f++) {
    const o = f * W
    const r = (x: number, y: number, w: number, h: number, col: string) => rect(ctx, o + x, y, w, h, col)
    // tail (curled up)
    r(1, 2, 2, 4, grey)
    r(2, 1, 3, 2, grey)
    r(1, 2, 1, 2, PAL.white)
    // body
    r(3, 5, 10, 5, grey)
    r(5, 8, 8, 2, PAL.white)
    r(3, 5, 10, 1, greyDark)
    // legs
    const l = f === 1 ? [0, 1, 1, 0] : f === 2 ? [1, 0, 0, 1] : [0, 0, 0, 0]
    ;[4, 6, 10, 12].forEach((x, i) => r(x, 10 - l[i], 1, 3, PAL.white))
    // head
    r(12, 2, 5, 5, grey)
    r(13, 4, 4, 3, PAL.white)
    r(12, 0, 1, 2, grey)
    r(14, 0, 1, 2, grey)
    dot(ctx, o + 14, 3, PAL.ink)
    dot(ctx, o + 17, 5, PAL.ink)
    r(15, 7, 2, 1, PAL.white)
    dot(ctx, o + 16, 8, '#F28CA5') // happy tongue
  }
  return c
}

/** Sleepy white cat loaf. Frames: asleep, one eye open. 16×11 each. */
export function makeCatSheet(): HTMLCanvasElement {
  const c = makeCanvas(32, 11)
  const ctx = c.getContext('2d')!
  for (let f = 0; f < 2; f++) {
    const o = f * 16
    const r = (x: number, y: number, w: number, h: number, col: string) => rect(ctx, o + x, y, w, h, col)
    r(2, 4, 12, 6, '#C9C3CF')
    r(3, 3, 10, 7, PAL.white)
    r(3, 9, 10, 1, '#E5E0EA')
    r(3, 1, 2, 3, PAL.white)
    r(10, 1, 2, 3, PAL.white)
    dot(ctx, o + 4, 2, '#F2B8C6')
    dot(ctx, o + 10, 2, '#F2B8C6')
    r(12, 7, 3, 2, PAL.white) // tail
    r(5, 5, 2, 1, '#9C95A3')
    if (f === 0) r(9, 5, 2, 1, '#9C95A3')
    else {
      r(9, 4, 2, 2, PAL.ink)
      dot(ctx, o + 10, 4, PAL.white)
    }
    dot(ctx, o + 7, 6, '#F2B8C6')
  }
  return c
}

export function makeScooter(): HTMLCanvasElement {
  const c = makeCanvas(24, 18)
  const ctx = c.getContext('2d')!
  rect(ctx, 3, 9, 16, 5, PAL.coral)
  rect(ctx, 15, 4, 3, 7, PAL.coralDark)
  rect(ctx, 14, 3, 6, 1, PAL.ink)
  rect(ctx, 4, 8, 7, 2, PAL.coffee)
  rect(ctx, 2, 14, 5, 4, PAL.ink)
  rect(ctx, 16, 14, 5, 4, PAL.ink)
  rect(ctx, 3, 15, 3, 2, '#77707F')
  rect(ctx, 17, 15, 3, 2, '#77707F')
  // rider
  rect(ctx, 7, 2, 5, 6, PAL.evening)
  rect(ctx, 7, 0, 5, 3, PAL.amber)
  rect(ctx, 11, 1, 2, 2, PAL.ink)
  rect(ctx, 11, 4, 4, 1, PAL.evening)
  return c
}

export function makeSparkle(): HTMLCanvasElement {
  const c = makeCanvas(18, 9)
  const ctx = c.getContext('2d')!
  for (let f = 0; f < 2; f++) {
    const o = f * 9
    const col = f ? PAL.white : PAL.amber
    rect(ctx, o + 4, 0, 1, 9, col)
    rect(ctx, o + 0, 4, 9, 1, col)
    rect(ctx, o + 3, 3, 3, 3, f ? PAL.amber : PAL.white)
  }
  return c
}

export function makeKoi(): HTMLCanvasElement {
  const c = makeCanvas(8, 4)
  const ctx = c.getContext('2d')!
  rect(ctx, 1, 1, 5, 2, '#F08A3C')
  rect(ctx, 3, 1, 2, 1, PAL.white)
  rect(ctx, 6, 0, 2, 4, '#F08A3C')
  dot(ctx, 1, 1, PAL.ink)
  return c
}

export function makePaw(): HTMLCanvasElement {
  const c = makeCanvas(7, 7)
  const ctx = c.getContext('2d')!
  rect(ctx, 2, 3, 3, 3, PAL.coffee)
  dot(ctx, 1, 1, PAL.coffee)
  dot(ctx, 3, 0, PAL.coffee)
  dot(ctx, 5, 1, PAL.coffee)
  dot(ctx, 6, 3, PAL.coffee)
  return c
}

export function makeToy(color: string = PAL.coral): HTMLCanvasElement {
  const c = makeCanvas(6, 6)
  const ctx = c.getContext('2d')!
  rect(ctx, 1, 0, 4, 6, color)
  rect(ctx, 0, 1, 6, 4, color)
  rect(ctx, 0, 2, 6, 1, PAL.white)
  return c
}

export function makeBell(): HTMLCanvasElement {
  const c = makeCanvas(6, 6)
  const ctx = c.getContext('2d')!
  rect(ctx, 1, 1, 4, 4, PAL.amber)
  rect(ctx, 0, 4, 6, 1, PAL.amberDark)
  dot(ctx, 2, 0, PAL.amberDark)
  dot(ctx, 3, 0, PAL.amberDark)
  dot(ctx, 3, 5, PAL.ink)
  return c
}

export function makePlane(): HTMLCanvasElement {
  const c = makeCanvas(10, 6)
  const ctx = c.getContext('2d')!
  rect(ctx, 0, 2, 10, 1, PAL.white)
  rect(ctx, 2, 1, 6, 1, PAL.white)
  rect(ctx, 4, 3, 4, 2, '#E4DCEB')
  rect(ctx, 8, 2, 2, 1, '#E4DCEB')
  return c
}

export function makeGlow(): HTMLCanvasElement {
  const c = makeCanvas(24, 24)
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 12)
  g.addColorStop(0, 'rgba(255,214,140,0.85)')
  g.addColorStop(1, 'rgba(255,214,140,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 24, 24)
  return c
}

export function makeHangingLantern(): HTMLCanvasElement {
  const c = makeCanvas(6, 8)
  const ctx = c.getContext('2d')!
  rect(ctx, 2, 0, 2, 1, PAL.ink)
  rect(ctx, 1, 1, 4, 6, PAL.coral)
  rect(ctx, 0, 2, 6, 4, PAL.coral)
  rect(ctx, 2, 3, 2, 2, '#FFD9A0')
  rect(ctx, 2, 7, 2, 1, PAL.amber)
  return c
}
