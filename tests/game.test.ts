import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BACKGROUND_IDS_FOR_TEST, BADGE_IDS_FOR_TEST } from './helpers'
import { EGG_IDS, GAME_IDS, MAX_SCORE, PIECE_IDS, REACTIONS, STICKERS, ZONES } from '../src/content/ids'
import { buildQuiz, ENGLISH_ITEMS, GLOSSARY, QUIZ_LENGTH } from '../src/content/phrases'
import { talkStatus } from '../src/content/dialogue'
import { isExpired, MOMENT_TTL_MS, MOMENT_TYPES, MOMENTS, SCENE_IDS } from '../src/content/moments'
import { BLOCKING, T } from '../src/game/art/pixels'
import { buildMaze, hideClues, MAZE, MAZE_START, pawprintScore } from '../src/game/map/courtyardMaze'
import { buildHanoiMap, MAP_H, MAP_W } from '../src/game/map/hanoiMap'
import { findPath, nearestSpot, nearestWalkable, type Grid } from '../src/game/systems/movement'
import {
  addIngredient,
  coffeePoints,
  languageScore,
  matchaScore,
  neededIngredient,
  newMatcha,
  presentationScore,
  RECIPES,
  slideOptions,
  SLIDES,
  TOTAL_STEPS,
} from '../src/utils/games'

const seq = (vals: number[]) => {
  let i = 0
  return () => vals[i++ % vals.length]
}

function reachable(g: Grid, from: { x: number; y: number }) {
  const seen = new Set<string>([`${from.x},${from.y}`])
  const q = [from]
  while (q.length) {
    const c = q.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: c.x + dx, y: c.y + dy }
      const k = `${n.x},${n.y}`
      if (!seen.has(k) && g[n.y]?.[n.x]) {
        seen.add(k)
        q.push(n)
      }
    }
  }
  return seen
}

describe('Hanoi street map', () => {
  const m = buildHanoiMap()
  it('has the right size and a walkable start', () => {
    expect(m.tiles).toHaveLength(MAP_H)
    m.tiles.forEach((row) => expect(row).toHaveLength(MAP_W))
    expect(m.walk[m.start.y][m.start.x]).toBe(true)
  })
  it('every interactable can be reached from the start', () => {
    const r = reachable(m.walk, m.start)
    for (const s of m.spots) {
      const stand = nearestWalkable(m.walk, { x: s.tx, y: s.ty })!
      const neighbours = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `${s.tx + dx},${s.ty + dy}`)
      expect(neighbours.some((k) => r.has(k)) || r.has(`${stand.x},${stand.y}`), `spot ${s.id}`).toBe(true)
    }
  })
  it('has one zone door per zone and one postcard piece per zone', () => {
    expect(m.spots.filter((s) => s.kind === 'zone').map((s) => s.zone).sort()).toEqual(ZONES.map((z) => z.id).sort())
    expect(m.spots.filter((s) => s.kind === 'piece').map((s) => s.piece).sort()).toEqual([...PIECE_IDS].sort())
  })
  it('the cat, NPC spots and Simba’s park are walkable', () => {
    expect(m.walk[m.catSpot.y][m.catSpot.x]).toBe(true)
    expect(m.walk[m.npcSpot.ut.y][m.npcSpot.ut.x]).toBe(true)
    expect(m.walk[m.npcSpot.satyam.y][m.npcSpot.satyam.x]).toBe(true)
  })
  it('the border is solid', () => {
    expect(m.tiles[0].every((t) => BLOCKING.includes(t))).toBe(true)
    expect(m.tiles[MAP_H - 1].every((t) => BLOCKING.includes(t))).toBe(true)
  })
})

describe('movement', () => {
  const g: Grid = [
    [true, true, true],
    [false, false, true],
    [true, true, true],
  ]
  it('finds the shortest path around walls', () => {
    const p = findPath(g, { x: 0, y: 0 }, { x: 0, y: 2 })!
    expect(p).toHaveLength(6)
    expect(p[p.length - 1]).toEqual({ x: 0, y: 2 })
  })
  it('snaps blocked goals to the nearest walkable tile', () => {
    const p = findPath(g, { x: 0, y: 0 }, { x: 0, y: 1 })!
    expect(p.length).toBeGreaterThan(0)
  })
  it('picks the closest interactable in reach', () => {
    const spots = [
      { id: 'a', x: 10, y: 10 },
      { id: 'b', x: 30, y: 10 },
    ]
    expect(nearestSpot(spots, 14, 10)?.id).toBe('a')
    expect(nearestSpot(spots, 100, 100)).toBeNull()
  })
})

describe('pawprint maze', () => {
  const maze = buildMaze()
  it('is rectangular and fully connected', () => {
    MAZE.forEach((row) => expect(row).toHaveLength(MAZE[0].length))
    const r = reachable(maze.walk, MAZE_START)
    const walkable = maze.walk.flatMap((row, y) => row.map((w, x) => (w ? `${x},${y}` : null))).filter(Boolean)
    expect(walkable.every((k) => r.has(k!))).toBe(true)
  })
  it('hides 4 pawprints and 1 special object in different leaf piles', () => {
    expect(maze.leaves.length).toBeGreaterThanOrEqual(5)
    expect(maze.tiles[maze.leaves[0].y][maze.leaves[0].x]).toBe(T.LEAVES)
    const { paws, artifact } = hideClues(maze.leaves, seq([0.1, 0.7, 0.3, 0.9, 0.5]))
    expect(paws).toHaveLength(4)
    expect(paws.some((p) => p.x === artifact.x && p.y === artifact.y)).toBe(false)
  })
  it('scores +10 per pawprint and +20 for all four', () => {
    expect(pawprintScore(0)).toBe(0)
    expect(pawprintScore(3)).toBe(30)
    expect(pawprintScore(4)).toBe(60)
    expect(pawprintScore(9)).toBe(60)
  })
})

describe('Matcha Mission', () => {
  it('serves all three recipes and scores 100 with no mistakes at full time', () => {
    let s = newMatcha(seq([0.1, 0.5]))
    let guard = 0
    while (!s.done && guard++ < 50) s = addIngredient(s, neededIngredient(s)!)
    expect(s.done).toBe(true)
    expect(s.correctSteps).toBe(TOTAL_STEPS)
    expect(matchaScore(s, 60).total).toBe(100)
  })
  it('wrong ingredients cost style, not progress', () => {
    let s = newMatcha()
    s = addIngredient(s, 'cat')
    s = addIngredient(s, 'invoice')
    expect(s.wrong).toBe(2)
    expect(s.step).toBe(0)
    expect(matchaScore(s, 30).style).toBe(12)
  })
  it('recipes are vegetarian-friendly and egg-free', () => {
    for (const r of RECIPES) expect(r.steps.join(',')).not.toMatch(/egg/)
  })
})

describe('Presentation Rescue', () => {
  it('is out of 100 across clarity, confidence and charm', () => {
    const perfect = presentationScore({ slidesShown: 6, slidesCorrect: 6, distractions: 10, handled: 10, charmPrompts: 8, charmed: 8 })
    expect(perfect).toMatchObject({ clarity: 34, confidence: 33, charm: 33, total: 100 })
    const half = presentationScore({ slidesShown: 6, slidesCorrect: 3, distractions: 10, handled: 5, charmPrompts: 4, charmed: 2 })
    expect(half.total).toBe(17 + 17 + 17)
  })
  it('always offers the correct icon among three distinct options', () => {
    for (const s of SLIDES) {
      const o = slideOptions(s.icon)
      expect(o).toContain(s.icon)
      expect(new Set(o).size).toBe(3)
    }
  })
})

describe('language quiz', () => {
  it('builds 8 questions with the right answer present', () => {
    for (const dir of ['vi-en', 'en-vi'] as const) {
      const q = buildQuiz(dir)
      expect(q).toHaveLength(QUIZ_LENGTH)
      q.forEach((x) => {
        expect(x.options[x.correct]).toBeDefined()
        expect(new Set(x.options).size).toBe(x.options.length)
      })
    }
  })
  it('scores +10 correct, +2 attempted, capped at the max', () => {
    expect(languageScore(8, 8)).toBe(MAX_SCORE.language)
    expect(languageScore(3, 8)).toBe(46)
  })
  it('contains the starter phrases from the brief, with Vietnamese diacritics intact', () => {
    const vi = GLOSSARY.map((g) => g.vi)
    for (const p of ['Xin chào', 'Cảm ơn', 'Ngủ ngon', 'Hẹn gặp lại', 'Chúc một ngày tốt lành', 'Satyam ơi!', 'Út ơi!']) expect(vi).toContain(p)
    expect(ENGLISH_ITEMS.map((e) => e.en)).toEqual(expect.arrayContaining(['I owe you a coffee', 'You passed the confidence test', 'The cat has stolen the homework', 'One question at a time, Professor']))
  })
})

describe('coffee points & talk noticeboard', () => {
  it('derives coffee points from best scores and pieces', () => {
    const scores = [
      { uid: 'a', gameId: 'matcha' as const, bestScore: 80, lastScore: 80, totalPlays: 2 },
      { uid: 'a', gameId: 'language' as const, bestScore: 46, lastScore: 46, totalPlays: 1 },
      { uid: 'b', gameId: 'matcha' as const, bestScore: 100, lastScore: 100, totalPlays: 1 },
    ]
    expect(coffeePoints(scores, 'a', 2)).toBe(13)
    expect(coffeePoints(scores, 'a', 5)).toBe(38)
  })
  it('stops being “upcoming” after 14 Nov 2026 (no broken countdown)', () => {
    expect(talkStatus(new Date('2026-11-10T10:00:00+07:00'))).toMatch(/noticeboard/)
    expect(talkStatus(new Date('2026-11-20T10:00:00+07:00'))).toMatch(/memory/)
  })
})

describe('database allowlists match the app', () => {
  const rules = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8')
  const listIn = (fn: string) => {
    const m = rules.match(new RegExp(`function ${fn}\\(\\) \\{\\s*return \\[([^\\]]*)\\]`))
    return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort() : []
  }
  it('games, zones, pieces, eggs, badges, backgrounds, stickers and reactions agree', () => {
    expect(listIn('gameIds')).toEqual([...GAME_IDS].sort())
    expect(listIn('zoneIds')).toEqual(ZONES.map((z) => z.id).sort())
    expect(listIn('pieceIds')).toEqual([...PIECE_IDS].sort())
    expect(listIn('eggIds')).toEqual([...EGG_IDS].sort())
    expect(listIn('badgeIds')).toEqual([...BADGE_IDS_FOR_TEST].sort())
    expect(listIn('backgroundIds')).toEqual([...BACKGROUND_IDS_FOR_TEST].sort())
    expect(listIn('stickerIds')).toEqual(STICKERS.map((s) => s.id).sort())
    expect(listIn('reactionEmojis')).toEqual([...REACTIONS].sort())
  })
  it('moment types, scenes, romantic types and answer choices agree', () => {
    expect(listIn('momentTypes')).toEqual([...MOMENT_TYPES].sort())
    expect(listIn('sceneIds')).toEqual([...SCENE_IDS].sort())
    expect(listIn('romanticTypes')).toEqual(MOMENTS.filter((m) => m.romantic).map((m) => m.type).sort())
    const fn = rules.match(/function variantsFor\(t\) \{([\s\S]*?)\r?\n {4}\}/)![1]
    for (const m of MOMENTS) {
      const ids = m.variants.map((v) => v.id)
      if (ids.length === 1) expect(ids).toEqual(['yes'])
      else expect(fn).toContain(`t == '${m.type}' ? [${ids.map((i) => `'${i}'`).join(', ')}]`)
    }
  })
  it('every moment has a caption for each way of saying yes, and invitations expire after a week', () => {
    for (const m of MOMENTS) {
      for (const v of m.variants) expect(m.caption[v.id], `${m.type}/${v.id}`).toBeTruthy()
      expect(m.scenes.length).toBeGreaterThan(0)
    }
    const now = Date.now()
    expect(isExpired(now - MOMENT_TTL_MS - 1, now)).toBe(true)
    expect(isExpired(now - 1000, now)).toBe(false)
    expect(isExpired(null, now)).toBe(false)
  })
  it('max scores agree', () => {
    expect(rules).toContain(`gameId == 'pawprints' ? ${MAX_SCORE.pawprints} : (gameId == 'language' ? ${MAX_SCORE.language} : 100)`)
  })
  it('ships with placeholder UIDs, never real ones', () => {
    expect(rules).toContain("return 'SATYAM_UID_GOES_HERE'")
    expect(rules).toContain("return 'UT_UID_GOES_HERE'")
  })
})

describe('this gift has its own identity', () => {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(ts|tsx|css|html|json|md)$/.test(f)) files.push(p)
    }
  }
  walk(join(process.cwd(), 'src'))
  files.push(join(process.cwd(), 'index.html'))
  it('never mentions another pen pal’s game', () => {
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      expect(text, f).not.toMatch(/\bLily\b|DUBOT|Tofu|Professor Lily|flower water/i)
    }
  })
})
