// The little Hanoi street, painted tile by tile. Pure data (unit-tested): a
// tile grid, a walkability grid, interactable spots and a few labels.
import type { PieceId, Role, ZoneId } from '../../content/ids'
import { BLOCKING, T } from '../art/pixels'
import type { Grid, Pt } from '../systems/movement'

export const MAP_W = 46
export const MAP_H = 30

export type SpotKind = 'zone' | 'bell' | 'chalkboard' | 'cat' | 'koi' | 'notice' | 'piece' | 'simba' | 'questmap'

export interface SpotDef {
  id: string
  kind: SpotKind
  tx: number
  ty: number
  label: string
  zone?: ZoneId
  piece?: PieceId
}

export interface MapLabel {
  text: string
  tx: number // tile x of the label's centre
  ty: number
}

export interface HanoiMap {
  tiles: number[][]
  walk: Grid
  spots: SpotDef[]
  labels: MapLabel[]
  lanternPosts: Pt[]
  hangingLanterns: Pt[] // tile coords (fractional allowed)
  start: Pt
  npcSpot: Record<Role, Pt>
  catSpot: Pt
  simbaArea: { x0: number; y0: number; x1: number; y1: number }
  koiPond: { x0: number; y0: number; x1: number; y1: number }
}

export function buildHanoiMap(): HanoiMap {
  const tiles: number[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(T.GRASS))
  const set = (x: number, y: number, id: number) => {
    if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) tiles[y][x] = id
  }
  const fill = (x: number, y: number, w: number, h: number, id: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(xx, yy, id)
  }

  // A row of buildings: two roof rows, eaves, then façade with windows and a door.
  const building = (x: number, w: number, wallId: number, winId: number, doorX: number, top = 1, floors = 1) => {
    fill(x, top, w, 2, T.ROOF)
    fill(x, top + 2, w, 1, T.EAVE)
    const wallTop = top + 3
    const wallRows = 3 + (floors - 1) * 2
    fill(x, wallTop, w, wallRows, wallId)
    for (let row = wallTop; row < wallTop + wallRows - 1; row += 2)
      for (let wx = x + 1; wx < x + w - 1; wx += 3) set(wx, row, winId)
    set(doorX, wallTop + wallRows - 1, T.DOOR)
    for (const wx of [doorX - 3, doorX + 3]) if (wx > x && wx < x + w - 1) set(wx, wallTop + wallRows - 1, winId)
  }

  // ---- frame of trees
  fill(0, 0, MAP_W, 1, T.TREE)
  fill(0, MAP_H - 1, MAP_W, 1, T.TREE)
  fill(0, 0, 1, MAP_H, T.TREE)
  fill(MAP_W - 1, 0, 1, MAP_H, T.TREE)

  // ---- top street: café, academy, auditorium
  building(2, 11, T.WALL_YELLOW, T.WINDOW_YELLOW, 7)
  fill(3, 5, 9, 1, T.AWNING) // the café’s striped awning
  set(7, 5, T.WALL_YELLOW)
  building(16, 11, T.WALL_CREAM, T.WINDOW_CREAM, 21)
  building(30, 14, T.WALL_LAV, T.WINDOW_LAV, 36)
  for (const x of [13, 14, 15, 27, 28, 29, 44]) fill(x, 1, 1, 5, T.TREE)
  set(14, 6, T.PLANTER)
  set(28, 6, T.PLANTER)

  // pavement in front, with a sidewalk café (cà phê cóc)
  fill(1, 7, MAP_W - 2, 3, T.PAVE)
  set(3, 8, T.STOOL)
  set(4, 8, T.TABLE)
  set(5, 8, T.STOOL)
  set(9, 8, T.STOOL)
  set(10, 8, T.TABLE)
  set(11, 8, T.STOOL)
  set(12, 7, T.CHALKBOARD)
  set(17, 8, T.BIKE)
  set(25, 7, T.STICKY_BOARD)
  set(32, 8, T.SCOOTER_PARKED)
  set(33, 8, T.SCOOTER_PARKED)
  set(40, 7, T.NOTICEBOARD)
  for (const x of [14, 28, 43]) set(x, 9, T.LANTERN_POST)

  // ---- the road
  fill(1, 10, MAP_W - 2, 4, T.ROAD)
  for (let x = 2; x < MAP_W - 2; x += 3) set(x, 11, T.ROAD_DASH)

  // ---- lower pavement
  fill(1, 14, MAP_W - 2, 2, T.PAVE)
  for (const x of [6, 18, 38]) set(x, 14, T.LANTERN_POST)
  set(24, 14, T.CHALKBOARD) // side quest map board

  // ---- pet courtyard (fenced)
  fill(2, 17, 18, 11, T.FENCE)
  fill(3, 18, 16, 9, T.COURT)
  set(10, 17, T.GATE)
  set(10, 16, T.PAVE)
  set(4, 19, T.PETHOUSE)
  set(17, 19, T.PETHOUSE)
  fill(12, 23, 3, 2, T.WATER)
  set(7, 24, T.TREATBOX)
  set(3, 23, T.PLANTER)
  set(17, 25, T.TREE)
  set(3, 26, T.TREE)
  set(6, 21, T.LEAVES)
  set(15, 22, T.LEAVES)

  // ---- little park
  for (const [x, y] of [[22, 18], [25, 21], [21, 23], [24, 25], [22, 27], [26, 27]]) set(x, y, T.GRASS_FLOWER)
  set(23, 19, T.BENCH)
  set(24, 19, T.BENCH)
  set(21, 25, T.TREE)
  set(25, 26, T.TREE)

  // ---- the rooftop building (three storeys) with an outside staircase
  building(28, 12, T.WALL_CREAM, T.WINDOW_CREAM, 34, 17, 3)
  fill(40, 20, 1, 7, T.STAIRS)
  set(41, 26, T.PLANTER)
  fill(27, 16, 1, 11, T.PAVE)
  fill(27, 27, 15, 1, T.PAVE)
  fill(42, 17, 2, 4, T.TREE)

  const walk: Grid = tiles.map((row) => row.map((id) => !BLOCKING.includes(id)))

  const spots: SpotDef[] = [
    { id: 'zone:cafe', kind: 'zone', zone: 'cafe', tx: 7, ty: 7, label: 'Enter the café' },
    { id: 'zone:academy', kind: 'zone', zone: 'academy', tx: 21, ty: 7, label: 'Enter the academy' },
    { id: 'zone:auditorium', kind: 'zone', zone: 'auditorium', tx: 36, ty: 7, label: 'Enter the auditorium' },
    { id: 'zone:courtyard', kind: 'zone', zone: 'courtyard', tx: 10, ty: 17, label: 'Open the courtyard' },
    { id: 'zone:rooftop', kind: 'zone', zone: 'rooftop', tx: 34, ty: 27, label: 'Climb to the rooftop' },
    { id: 'bell', kind: 'bell', tx: 8, ty: 7, label: 'Ring the café bell' },
    { id: 'chalkboard', kind: 'chalkboard', tx: 12, ty: 7, label: 'Read the chalkboard' },
    { id: 'cat', kind: 'cat', tx: 6, ty: 7, label: 'Disturb the cat' },
    { id: 'koi', kind: 'koi', tx: 13, ty: 23, label: 'Look at the koi' },
    { id: 'notice', kind: 'notice', tx: 40, ty: 7, label: 'Read the noticeboard' },
    { id: 'questmap', kind: 'questmap', tx: 24, ty: 14, label: 'Open the side quest map' },
    { id: 'piece:cafe', kind: 'piece', piece: 'piece_cafe', tx: 5, ty: 8, label: 'Look under the stool' },
    { id: 'piece:academy', kind: 'piece', piece: 'piece_academy', tx: 25, ty: 7, label: 'Check the sticky notes' },
    { id: 'piece:courtyard', kind: 'piece', piece: 'piece_courtyard', tx: 7, ty: 24, label: 'Peek behind the treat box' },
    { id: 'piece:auditorium', kind: 'piece', piece: 'piece_auditorium', tx: 41, ty: 8, label: 'Pick up the paper corner' },
    { id: 'piece:rooftop', kind: 'piece', piece: 'piece_rooftop', tx: 41, ty: 26, label: 'Look in the plant pot' },
  ]

  return {
    tiles,
    walk,
    spots,
    labels: [
      { text: 'CÀ PHÊ CÓC', tx: 7.5, ty: 3.5 },
      { text: 'LANGUAGE ACADEMY', tx: 21.5, ty: 3.5 },
      { text: 'CONFIDENCE TEST', tx: 37, ty: 3.5 },
      { text: 'PET BUREAU', tx: 10.5, ty: 16.4 },
      { text: 'ROOFTOP ↑', tx: 34.5, ty: 19.5 },
      { text: 'MAP', tx: 24.5, ty: 13.6 },
    ],
    lanternPosts: [
      { x: 14, y: 9 },
      { x: 28, y: 9 },
      { x: 43, y: 9 },
      { x: 6, y: 14 },
      { x: 18, y: 14 },
      { x: 38, y: 14 },
    ],
    hangingLanterns: [3.5, 5.5, 7.5, 9.5, 11.5, 17.5, 19.5, 22.5, 24.5, 31.5, 34.5, 38.5, 41.5].map((x) => ({ x, y: 6.9 })),
    start: { x: 22, y: 15 },
    npcSpot: { ut: { x: 22, y: 8 }, satyam: { x: 37, y: 8 } },
    catSpot: { x: 6, y: 7 },
    simbaArea: { x0: 21, y0: 17, x1: 26, y1: 27 },
    koiPond: { x0: 12, y0: 23, x1: 14, y1: 24 },
  }
}
