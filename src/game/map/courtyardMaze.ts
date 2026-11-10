// The pawprint investigation maze: potted plants, leaf piles and two pets.
import { T } from '../art/pixels'
import type { Grid, Pt } from '../systems/movement'

export const MAZE = [
  'FFFFFFFFFFFFFFFFFFFF',
  'F..........P....L..F',
  'F.PP.PPP...P..PPP..F',
  'F.P....P.......P...F',
  'F.P.LL.P.PPPP..P.L.F',
  'F......P....P......F',
  'FPPP.....L..P..PPPPF',
  'F....PP.....P......F',
  'F.L..P...PPPP..L...F',
  'F....P..........P..F',
  'F.PPPP..PP.L....P..F',
  'F......L.........L.F',
  'FFFFFFFFFFFFFFFFFFFF',
]

export const MAZE_START: Pt = { x: 1, y: 1 }
export const PAWPRINT_SECONDS = 75
export const PAWPRINT_COUNT = 4

export interface MazeData {
  tiles: number[][]
  walk: Grid
  leaves: Pt[]
}

export function buildMaze(): MazeData {
  const leaves: Pt[] = []
  const tiles = MAZE.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch === 'F') return T.FENCE
      if (ch === 'P') return T.PLANTER
      if (ch === 'L') {
        leaves.push({ x, y })
        return T.LEAVES
      }
      return T.COURT
    }),
  )
  const walk: Grid = MAZE.map((row) => [...row].map((ch) => ch === '.' || ch === 'L'))
  return { tiles, walk, leaves }
}

/** Chooses which leaf piles hide the 4 pawprints and the special object. */
export function hideClues(leaves: Pt[], rand: () => number = Math.random): { paws: Pt[]; artifact: Pt } {
  const shuffled = [...leaves]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return { paws: shuffled.slice(0, PAWPRINT_COUNT), artifact: shuffled[PAWPRINT_COUNT] }
}

/** +10 per pawprint, +20 bonus for finding all of them (max 60). */
export function pawprintScore(found: number): number {
  const f = Math.max(0, Math.min(PAWPRINT_COUNT, Math.floor(found)))
  return f * 10 + (f === PAWPRINT_COUNT ? 20 : 0)
}
