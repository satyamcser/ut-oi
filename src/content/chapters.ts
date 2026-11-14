// Chapters of the little world. They grow with things you've shared — postcards,
// replies, moments you both said yes to, story lines — counted for BOTH of you
// together, so nobody is ever "behind". Chapters only go up, never down, and
// they open new places on the map. They never measure feelings, never reward
// saying yes to a romantic gesture, and never unlock romance.
import type { ZoneId } from './ids'
import type { SceneId } from './moments'
import type { Moment, PlayerDoc, Postcard, Reply, Story } from '../models/types'

export interface Chapter {
  n: number
  title: string
  place: string
  needs: number // shared memories needed to open it
  blurb: string
  scene: SceneId | null // the Our Little World scene that lives in this district
}

export const CHAPTERS: Chapter[] = [
  { n: 1, title: 'The Little Street', place: 'Five places and a sleepy cat', needs: 0, blurb: 'Where it all started: coffee debts and postcards.', scene: null },
  { n: 2, title: 'The Riverside', place: 'A promenade and a wooden bridge', needs: 3, blurb: 'A path by the water, for slow walks and loud sunsets.', scene: 'riverside' },
  { n: 3, title: 'The Rainy Bookshop', place: 'Old books, one window seat', needs: 8, blurb: 'Rain on the glass and a good line in every book.', scene: 'bookshop' },
  { n: 4, title: 'The Lantern Garden', place: 'Flowers, lanterns, fireflies', needs: 15, blurb: 'Lanterns that light up when people walk by.', scene: 'lanterns' },
  { n: 5, title: 'The Postcard Corner', place: 'The Sky Gate and a red postbox', needs: 25, blurb: 'Two cities, one sky. Postcards travel fast here.', scene: 'airport' },
]

export interface Shared {
  postcards: Postcard[]
  replies: Reply[]
  moments: Moment[]
  stories: Story[]
}

/** Shared memories: everything either of you added to the little world. */
export function sharedMemories(d: Shared): number {
  const posts = new Set(d.postcards.map((p) => p.id))
  return (
    d.postcards.length +
    d.replies.filter((r) => posts.has(r.postId)).length +
    d.moments.filter((m) => m.status === 'accepted').length * 2 +
    d.stories.reduce((n, s) => n + s.lines.length, 0)
  )
}

/** Highest chapter reached. `floor` keeps a chapter open even if old cards were deleted later. */
export function chapterFor(memories: number, floor = 1): number {
  const reached = CHAPTERS.filter((c) => memories >= c.needs).reduce((n, c) => Math.max(n, c.n), 1)
  return Math.max(reached, Math.min(floor, CHAPTERS.length))
}

export function nextChapter(chapter: number): Chapter | null {
  return CHAPTERS.find((c) => c.n === chapter + 1) ?? null
}

export interface QuestContext extends Shared {
  me: PlayerDoc
  uid: string
}

export interface Quest {
  id: string
  chapter: number
  title: string
  hint: string
  done: (c: QuestContext) => boolean
}

const ZONES_ALL: ZoneId[] = ['cafe', 'academy', 'courtyard', 'auditorium', 'rooftop']
const accepted = (c: QuestContext, t: Moment['type']) => c.moments.some((m) => m.status === 'accepted' && m.type === t)
const posted = (c: QuestContext, prefix: string) => c.postcards.some((p) => p.text.startsWith(prefix))

/** Optional side quests. None of them involve a romantic gesture, and none are required. */
export const QUESTS: Quest[] = [
  { id: 'visit5', chapter: 1, title: 'Visit all five places', hint: 'Walk into every door on the little street.', done: (c) => ZONES_ALL.every((z) => c.me.visited.includes(z)) },
  { id: 'pieces', chapter: 1, title: 'Find the five postcard pieces', hint: 'Look under stools, behind boxes, in plant pots.', done: (c) => c.me.pieces.length >= 5 },
  { id: 'firstcard', chapter: 1, title: 'Send a postcard', hint: 'The rooftop studio is open all night.', done: (c) => c.postcards.some((p) => p.authorUid === c.uid && p.kind === 'postcard') },

  { id: 'walk', chapter: 2, title: 'A walk by the river', hint: 'Invite each other for a walk — only if you both feel like it.', done: (c) => accepted(c, 'walk') },
  { id: 'sunset', chapter: 2, title: 'Watch one sunset together', hint: 'The riverside bench has the best view.', done: (c) => accepted(c, 'sunset') },
  { id: 'jar', chapter: 2, title: 'Pull a question from the jar', hint: 'Our Little World → Question jar.', done: (c) => posted(c, '🫙') },

  { id: 'poem', chapter: 3, title: 'Share a line from a book', hint: 'The bookshop window seat.', done: (c) => accepted(c, 'poem') },
  { id: 'story4', chapter: 3, title: 'Write a 4-line story together', hint: 'Our Little World → Mini-story.', done: (c) => c.stories.some((s) => s.lines.length >= 4) },
  { id: 'reply', chapter: 3, title: 'Reply under a postcard', hint: 'Any postcard in the shared album.', done: (c) => c.replies.some((r) => r.authorUid === c.uid) },

  { id: 'talk', chapter: 4, title: 'Sit and talk at the café', hint: '“Tell me one small thing about your day.”', done: (c) => accepted(c, 'talk') },
  { id: 'storydone', chapter: 4, title: 'Finish a story', hint: 'Every story deserves an ending (even a silly one).', done: (c) => c.stories.some((s) => s.status === 'finished') },
  { id: 'tease', chapter: 4, title: 'Win (or lose) a teasing match', hint: 'The café, of course.', done: (c) => accepted(c, 'tease') },

  { id: 'thinking', chapter: 5, title: '“Thinking of you” from the Sky Gate', hint: 'Different cities, same sky.', done: (c) => accepted(c, 'thinking') },
  { id: 'scorecard', chapter: 5, title: 'Pin an unofficial scorecard', hint: 'The auditorium. Strictly non-academic.', done: (c) => posted(c, '📋') },
  { id: 'keep', chapter: 5, title: 'Keep a moment in the album', hint: 'Both choose “Keep in our album”.', done: (c) => c.moments.some((m) => m.status === 'accepted' && Object.values(m.saved).filter(Boolean).length >= 2) },
]
