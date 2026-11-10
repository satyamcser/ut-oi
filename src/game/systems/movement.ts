// Pure grid helpers shared by the overworld and the pawprint maze (unit-tested).

export interface Pt {
  x: number
  y: number
}

export type Grid = boolean[][] // [y][x] true = walkable

export function inBounds(g: Grid, p: Pt): boolean {
  return p.y >= 0 && p.y < g.length && p.x >= 0 && p.x < g[0].length
}

export function walkable(g: Grid, p: Pt): boolean {
  return inBounds(g, p) && g[p.y][p.x]
}

const DIRS: Pt[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/** Nearest walkable tile to `p` (itself if walkable), by BFS ring search. */
export function nearestWalkable(g: Grid, p: Pt): Pt | null {
  if (walkable(g, p)) return p
  const seen = new Set<string>([`${p.x},${p.y}`])
  const q: Pt[] = [p]
  while (q.length) {
    const c = q.shift()!
    for (const d of DIRS) {
      const n = { x: c.x + d.x, y: c.y + d.y }
      const k = `${n.x},${n.y}`
      if (!inBounds(g, n) || seen.has(k)) continue
      if (g[n.y][n.x]) return n
      seen.add(k)
      q.push(n)
    }
  }
  return null
}

/** Shortest 4-connected path (excluding start). Unwalkable goals snap to the nearest walkable tile. */
export function findPath(g: Grid, start: Pt, goal: Pt): Pt[] | null {
  const target = nearestWalkable(g, goal)
  if (!target || !walkable(g, start)) return null
  if (target.x === start.x && target.y === start.y) return []
  const key = (p: Pt) => p.y * g[0].length + p.x
  const prev = new Map<number, number>()
  const q: Pt[] = [start]
  prev.set(key(start), -1)
  while (q.length) {
    const c = q.shift()!
    if (c.x === target.x && c.y === target.y) break
    for (const d of DIRS) {
      const n = { x: c.x + d.x, y: c.y + d.y }
      if (!walkable(g, n) || prev.has(key(n))) continue
      prev.set(key(n), key(c))
      q.push(n)
    }
  }
  if (!prev.has(key(target))) return null
  const path: Pt[] = []
  let k = key(target)
  const w = g[0].length
  while (k !== key(start)) {
    path.push({ x: k % w, y: Math.floor(k / w) })
    k = prev.get(k)!
  }
  return path.reverse()
}

export interface Spot {
  id: string
  x: number // world px
  y: number
  r?: number
}

/** The closest interactable within reach, or null. */
export function nearestSpot<T extends Spot>(spots: T[], px: number, py: number, reach = 20): T | null {
  let best: T | null = null
  let bestD = Infinity
  for (const s of spots) {
    const d = Math.hypot(s.x - px, s.y - py)
    if (d <= (s.r ?? reach) && d < bestD) {
      best = s
      bestD = d
    }
  }
  return best
}

/** Converts a direction vector into a facing: 0 down, 1 up, 2 right, 3 left. */
export function facingOf(dx: number, dy: number, current: number): number {
  if (dx === 0 && dy === 0) return current
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 2 : 3
  return dy > 0 ? 0 : 1
}
