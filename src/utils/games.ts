// Pure, unit-tested rules for the React mini-games and Coffee Points.
import type { GameId } from '../content/ids'
import { MAX_SCORE } from '../content/ids'
import type { ScoreDoc } from '../models/types'

// ------------------------------------------------------------- Matcha Mission

export type Ingredient =
  | 'cup'
  | 'glass'
  | 'mug'
  | 'ice'
  | 'milk'
  | 'matcha'
  | 'coffee'
  | 'condensed'
  | 'tea'
  | 'hotwater'
  | 'cat'
  | 'chili'
  | 'invoice'

export const INGREDIENT_LABEL: Record<Ingredient, string> = {
  cup: 'Tall cup',
  glass: 'Glass',
  mug: 'Mug',
  ice: 'Ice',
  milk: 'Milk',
  matcha: 'Matcha',
  coffee: 'Phin coffee',
  condensed: 'Condensed milk',
  tea: 'Tea leaves',
  hotwater: 'Hot water',
  cat: 'Sleepy Cat',
  chili: 'Chili sauce',
  invoice: 'Lesson invoice',
}

export const DECOYS: Ingredient[] = ['cat', 'chili', 'invoice']

export interface Recipe {
  id: string
  name: string
  vi: string
  steps: Ingredient[]
}

export const RECIPES: Recipe[] = [
  { id: 'matcha_latte', name: 'Matcha latte', vi: 'Matcha latte', steps: ['cup', 'ice', 'milk', 'matcha'] },
  { id: 'iced_coffee', name: 'Iced coffee', vi: 'Cà phê sữa đá', steps: ['glass', 'ice', 'coffee', 'condensed'] },
  { id: 'warm_tea', name: 'Warm tea', vi: 'Trà nóng', steps: ['mug', 'tea', 'hotwater'] },
]
export const TOTAL_STEPS = RECIPES.reduce((n, r) => n + r.steps.length, 0)
export const MATCHA_SECONDS = 60

export interface MatchaState {
  order: number[]
  current: number
  step: number
  correctSteps: number
  wrong: number
  done: boolean
  last: { ok: boolean; ingredient: Ingredient } | null
}

export function newMatcha(rand: () => number = Math.random): MatchaState {
  const order = [0, 1, 2]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { order, current: 0, step: 0, correctSteps: 0, wrong: 0, done: false, last: null }
}

export function currentRecipe(s: MatchaState): Recipe | null {
  return s.done ? null : RECIPES[s.order[s.current]]
}

export function neededIngredient(s: MatchaState): Ingredient | null {
  const r = currentRecipe(s)
  return r ? r.steps[s.step] : null
}

export function addIngredient(s: MatchaState, ing: Ingredient): MatchaState {
  if (s.done) return s
  const need = neededIngredient(s)
  if (ing !== need) return { ...s, wrong: s.wrong + 1, last: { ok: false, ingredient: ing } }
  const recipe = currentRecipe(s)!
  let step = s.step + 1
  let current = s.current
  let done = false
  if (step >= recipe.steps.length) {
    step = 0
    current += 1
    done = current >= s.order.length
  }
  return { ...s, step, current, done, correctSteps: s.correctSteps + 1, last: { ok: true, ingredient: ing } }
}

export function recipesDone(s: MatchaState): number {
  return s.done ? s.order.length : s.current
}

/** technique (60) + timing (20) + style (20) = 0..100 */
export function matchaScore(s: MatchaState, secondsLeft: number) {
  const technique = Math.round((60 * s.correctSteps) / TOTAL_STEPS)
  const t = Math.max(0, Math.min(MATCHA_SECONDS, secondsLeft)) / MATCHA_SECONDS
  const timing = Math.round(20 * (recipesDone(s) / RECIPES.length) * (0.5 + 0.5 * t))
  const style = Math.max(0, 20 - 4 * s.wrong)
  return { technique, timing, style, total: Math.max(0, Math.min(100, technique + timing + style)) }
}

// ------------------------------------------------------------- Presentation Rescue

export type Icon = 'eye' | 'brain' | 'arm' | 'battery' | 'chart' | 'shield'
export const ICON_LABEL: Record<Icon, string> = {
  eye: 'Sensors',
  brain: 'Decisions',
  arm: 'Motors & arms',
  battery: 'Battery',
  chart: 'Practice & data',
  shield: 'Safety',
}

export const SLIDES: { fact: string; icon: Icon }[] = [
  { fact: 'Sensors are a robot’s eyes and ears.', icon: 'eye' },
  { fact: 'A controller decides what to do next.', icon: 'brain' },
  { fact: 'Motors and arms let a robot act.', icon: 'arm' },
  { fact: 'Batteries keep everything running.', icon: 'battery' },
  { fact: 'Robots get better with data and practice.', icon: 'chart' },
  { fact: 'Good robots stop when they’re unsure.', icon: 'shield' },
]
export const OPENING_FACT = 'A robot senses, decides and acts.'
export const PRESENTATION_SECONDS = 60
export const SLIDE_SECONDS = 9

export type DistractionKind = 'cat' | 'plane' | 'phone' | 'spill' | 'cable'
export const DISTRACTION_LABEL: Record<DistractionKind, string> = {
  cat: 'The examiner cat walked on stage',
  plane: 'A paper airplane flew in',
  phone: 'A phone is buzzing',
  spill: 'Coffee spilled on the podium',
  cable: 'The projector cable is tangled',
}

export interface PresentationTally {
  slidesShown: number
  slidesCorrect: number
  distractions: number
  handled: number
  charmPrompts: number
  charmed: number
}

export const emptyTally = (): PresentationTally => ({ slidesShown: 0, slidesCorrect: 0, distractions: 0, handled: 0, charmPrompts: 0, charmed: 0 })

/** clarity (34) + confidence (33) + charm (33) = 0..100 */
export function presentationScore(t: PresentationTally) {
  const ratio = (a: number, b: number) => (b <= 0 ? 1 : Math.max(0, Math.min(1, a / b)))
  const clarity = Math.round(34 * ratio(t.slidesCorrect, Math.max(t.slidesShown, 1)))
  const confidence = Math.round(33 * ratio(t.handled, t.distractions))
  const charm = Math.round(33 * ratio(t.charmed, t.charmPrompts))
  return { clarity, confidence, charm, total: Math.min(100, clarity + confidence + charm) }
}

export function slideOptions(correct: Icon, rand: () => number = Math.random): Icon[] {
  const others = (Object.keys(ICON_LABEL) as Icon[]).filter((i) => i !== correct)
  const picks: Icon[] = []
  while (picks.length < 2) {
    const c = others[Math.floor(rand() * others.length)]
    if (!picks.includes(c)) picks.push(c)
  }
  const all = [correct, ...picks]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  return all
}

// ------------------------------------------------------------- Language & points

/** +10 per correct answer, +2 per attempted question; capped by the quiz length. */
export function languageScore(correct: number, attempted: number): number {
  return Math.max(0, Math.min(MAX_SCORE.language, correct * 10 + attempted * 2))
}

/** Coffee Points: a tenth of your best scores, plus 25 once for all five postcard pieces. */
export function coffeePoints(scores: ScoreDoc[], uid: string, piecesFound: number): number {
  const best = scores.filter((s) => s.uid === uid).reduce((n, s) => n + s.bestScore, 0)
  return Math.round(best / 10) + (piecesFound >= 5 ? 25 : 0)
}

export function clampScore(game: GameId, score: number): number {
  return Math.max(0, Math.min(MAX_SCORE[game], Math.round(score)))
}
