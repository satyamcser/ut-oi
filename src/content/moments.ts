// "Our Little World": small shared moments. Every two-person moment is an
// invitation that the other person may accept or decline — both are fine.
// Nothing here is something Út actually said; lines are picked or written by
// whoever sends them. Keep in sync with momentTypes()/sceneIds()/variantsFor()
// in firestore.rules (a unit test checks).
import type { Role } from './ids'

export type SceneId = 'riverside' | 'cafe' | 'lanterns' | 'bookshop' | 'airport'
export type MomentType = 'walk' | 'sunset' | 'talk' | 'tease' | 'comfort' | 'poem' | 'thinking' | 'hand' | 'hug' | 'dance' | 'kiss'

export const SCENES: { id: SceneId; name: string; glyph: string; blurb: string }[] = [
  { id: 'riverside', name: 'Riverside walk', glyph: '🌅', blurb: 'A slow path by the water. The sky is doing something nice again.' },
  { id: 'cafe', name: 'Moonlit café', glyph: '☕', blurb: 'Two stools, warm lights, and a vegetarian menu that is still “in negotiation”.' },
  { id: 'lanterns', name: 'Lantern garden', glyph: '🏮', blurb: 'Paper lanterns, flowers, fireflies. Simba is somewhere nearby. Probably.' },
  { id: 'bookshop', name: 'Rainy bookshop', glyph: '📚', blurb: 'Rain on the window, old books, one very comfortable window seat.' },
  { id: 'airport', name: 'Postcard corner', glyph: '✈️', blurb: 'Two cities, one sky. A little plane goes by now and then.' },
]

export interface Variant {
  id: string
  label: string
}

export interface MomentDef {
  type: MomentType
  scenes: SceneId[]
  romantic: boolean
  /** The button that starts an invitation. */
  label: string
  /** Default invitation line (editable). */
  ask: string
  /** Choices for the person who says yes. One choice = a simple yes. */
  variants: Variant[]
  decline: string
  /** Shown after a "maybe another time". Never sad, never a penalty. */
  declined: string
  /** Shown while the moment plays. */
  caption: Record<string, string>
  /** The person saying yes may add a short line. */
  replyPrompt?: string
}

const YES: Variant[] = [{ id: 'yes', label: 'I’d like that' }]

export const MOMENTS: MomentDef[] = [
  {
    type: 'walk',
    scenes: ['riverside', 'lanterns'],
    romantic: false,
    label: 'Walk with me',
    ask: 'Walk with me for a while?',
    variants: YES,
    decline: 'Maybe another time',
    declined: 'No worries. The walk will still be here.',
    caption: { yes: 'A slow walk together. Nothing to rush.' },
  },
  {
    type: 'sunset',
    scenes: ['riverside'],
    romantic: false,
    label: 'Watch the sunset',
    ask: 'You always notice the sky. Show me what I’m missing?',
    variants: YES,
    decline: 'Maybe another time',
    declined: 'The sun will set again tomorrow. It’s very reliable.',
    caption: { yes: 'The sky does most of the talking.' },
    replyPrompt: 'Something you noticed (optional)',
  },
  {
    type: 'talk',
    scenes: ['cafe', 'bookshop'],
    romantic: false,
    label: 'Sit and talk',
    ask: 'Sit with me? Tell me one small thing about your day.',
    variants: YES,
    decline: 'Maybe another time',
    declined: 'The seat is saved for later.',
    caption: { yes: 'Two drinks, one small story.' },
    replyPrompt: 'One small thing about your day (optional)',
  },
  {
    type: 'tease',
    scenes: ['cafe'],
    romantic: false,
    label: 'Tease a little',
    ask: 'Does the website developer at least get one free meal?',
    variants: [
      { id: 'grin', label: '😏 Grin back' },
      { id: 'eyeroll', label: '🙄 Roll my eyes' },
      { id: 'outrage', label: '😤 Mock outrage' },
    ],
    decline: 'Ignore, gracefully',
    declined: 'Ignored with great elegance.',
    caption: {
      grin: '😏 Challenge accepted.',
      eyeroll: '🙄 An eye roll, delivered with care.',
      outrage: '😤 A formal complaint has been filed with Simba.',
    },
    replyPrompt: 'Your comeback (optional)',
  },
  {
    type: 'comfort',
    scenes: ['cafe', 'riverside', 'bookshop', 'airport'],
    romantic: false,
    label: 'Long day?',
    ask: 'Long day? I’m here if you want company.',
    variants: [
      { id: 'quiet', label: 'Sit quietly' },
      { id: 'talk', label: 'Tell you about it' },
      { id: 'joke', label: 'A silly joke, please' },
    ],
    decline: 'I’m okay, thanks',
    declined: 'Okay. The offer stays open.',
    caption: {
      quiet: 'Sitting quietly. Nothing needs explaining.',
      talk: 'Listening. Take your time.',
      joke: 'Why did the robot drink coffee? It needed a re-boot. …Sorry.',
    },
    replyPrompt: 'Anything you want to say (optional)',
  },
  {
    type: 'poem',
    scenes: ['bookshop'],
    romantic: false,
    label: 'Share a line',
    ask: 'Found this line in an old book and thought of you.',
    variants: YES,
    decline: 'Maybe another time',
    declined: 'The book will stay on the shelf for later.',
    caption: { yes: 'Rain, old pages, and one good line.' },
    replyPrompt: 'A line back (optional)',
  },
  {
    type: 'thinking',
    scenes: ['airport'],
    romantic: false,
    label: 'Thinking of you',
    ask: 'Different cities, same sky. Thinking of you from here.',
    variants: [{ id: 'yes', label: 'Thinking of you too' }],
    decline: 'Just wave back',
    declined: 'A wave from far away. Received.',
    caption: { yes: 'Far apart, under the same sky.' },
    replyPrompt: 'A few words back (optional)',
  },
  {
    type: 'hand',
    scenes: ['riverside', 'lanterns'],
    romantic: true,
    label: 'Offer my hand',
    ask: 'Can I hold your hand for a bit?',
    variants: YES,
    decline: 'Maybe another time',
    declined: 'No worries. The walk is still nice.',
    caption: { yes: 'Some moments don’t need many words.' },
  },
  {
    type: 'hug',
    scenes: ['riverside', 'cafe', 'lanterns', 'bookshop', 'airport'],
    romantic: true,
    label: 'Ask for a hug',
    ask: 'Can I hug you?',
    variants: YES,
    decline: 'Maybe another time',
    declined: 'That’s okay. Still glad you’re here.',
    caption: { yes: 'A warm, unhurried hug.' },
  },
  {
    type: 'dance',
    scenes: ['lanterns'],
    romantic: true,
    label: 'Dance with me?',
    ask: 'One dance? I can’t promise I’m good. Please be a merciful examiner.',
    variants: [
      { id: 'slow', label: 'Slow dance' },
      { id: 'silly', label: 'Silly dance' },
    ],
    decline: 'Another time',
    declined: 'The lanterns will wait. So will the questionable dance moves.',
    caption: {
      slow: 'One slow dance under the lanterns.',
      silly: 'A dance that will not be reviewed by any examiner.',
    },
  },
  {
    type: 'kiss',
    scenes: ['riverside', 'lanterns'],
    romantic: true,
    label: 'May I kiss you?',
    ask: 'Can I kiss you?',
    variants: [
      { id: 'forehead', label: 'Forehead kiss' },
      { id: 'gentle', label: 'Gentle kiss' },
    ],
    decline: 'Not now',
    declined: 'We can just stay here a little longer.',
    caption: { forehead: 'A soft forehead kiss.', gentle: 'A gentle kiss, and a little blush.' },
  },
]

export const MOMENT_TYPES: MomentType[] = MOMENTS.map((m) => m.type)
export const SCENE_IDS: SceneId[] = SCENES.map((s) => s.id)
export const momentDef = (t: MomentType): MomentDef => MOMENTS.find((m) => m.type === t)!

/** An unanswered invitation quietly drifts away after a week. */
export const MOMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const isExpired = (createdAt: number | null, now = Date.now()) => createdAt !== null && now - createdAt > MOMENT_TTL_MS

export const MOMENT_LIMITS = { line: 140, reply: 140, postcardReply: 200 }

/** Ready-made teasing lines; anyone can also write their own. */
export const TEASE_LINES: Record<Role, string[]> = {
  satyam: [
    'Does the website developer at least get one free meal?',
    'Strict examiner, how many points for this smile?',
    'I brought coffee. Is my debt forgiven now?',
    'Your sarcasm deserves a promotion.',
  ],
  ut: [
    'That depends on your negotiation skills.',
    'Một điều nhịn, chín điều lành — so you be the one to yield. 😏',
    'No salary for the engineer. Final offer.',
    'Your joke has been reviewed. Result: questionable.',
  ],
}

/** Little Simba interruptions. Pure fun, nothing saved. */
export const SIMBA_EVENTS = [
  'Simba stole a flower and is now very proud of himself.',
  'Simba is lying on the bench. The bench is Simba’s now.',
  'Simba demands treats. Negotiations have started.',
  'Simba ran through at full speed for no reason at all.',
  'Simba sat exactly between you two. Coincidence? No.',
]

export const LITTLE_WORLD_INTRO = [
  'A small place to spend a few minutes together, even from different cities.',
  'Every shared moment is an invitation. The other person can say yes, or “maybe another time” — both are completely fine.',
  'Some invitations are romantic (hand, hug, dance, kiss). You can switch those off anytime in Settings.',
  'It’s a game: a click here is not a promise or a decision about anything in real life.',
]

// ------------------------------------------------------------------ little extras

/** Cozy questions. Never a relationship interrogation. */
export const JAR_QUESTIONS = [
  'What was one good thing today?',
  'A quiet walk or a noisy market?',
  'What made you smile today?',
  'What would our imaginary café serve first?',
  'Sunrise or sunset?',
  'Which food could you eat every day?',
  'A song stuck in your head right now?',
  'Rainy day plan: book, film, or nap?',
  'A place you want to see one day?',
  'Your most dramatic pet opinion?',
  'Tea, coffee, or “depends on the weather”?',
  'A small thing that always makes a day better?',
  'Mountains or the sea?',
  'What did you eat today? Please rate it.',
  'One word for this week?',
  'Something you learned recently, big or small?',
]

export type StoryMode = 'funny' | 'cozy' | 'poetic'
export const STORY_MODES: { id: StoryMode; label: string; starter: string }[] = [
  { id: 'funny', label: '😂 Funny', starter: 'Simba walked into the café and ordered…' },
  { id: 'cozy', label: '☕ Cozy', starter: 'It started raining, so we found a little bookshop…' },
  { id: 'poetic', label: '🌙 Poetic', starter: 'The river kept a secret for the moon…' },
]
export const STORY_LIMITS = { line: 140, lines: 30 }

export type CafeColor = 'rose' | 'lilac' | 'jasmine' | 'amber' | 'evening'
export const CAFE_COLORS: { id: CafeColor; name: string; bg: string; ink: string }[] = [
  { id: 'rose', name: 'Dusty rose', bg: '#DA887C', ink: '#2B2230' },
  { id: 'lilac', name: 'Lilac', bg: '#B7A9CC', ink: '#2B2230' },
  { id: 'jasmine', name: 'Jasmine green', bg: '#779A7A', ink: '#FFFAF0' },
  { id: 'amber', name: 'Lantern amber', bg: '#EAA84C', ink: '#2B2230' },
  { id: 'evening', name: 'Moonlit navy', bg: '#323E64', ink: '#F9F1DF' },
]
export const CAFE_LIMITS = { name: 40, tagline: 80, dish: 40, dishes: 6 }

/** A joke scorecard: never academic, never about English. */
export const SCORECARD: { label: string; options: string[] }[] = [
  { label: 'Smile', options: ['Excellent', 'Suspiciously excellent', 'Blinding, please tone it down'] },
  { label: 'Jokes', options: ['Questionable', 'Under review', 'Surprisingly okay'] },
  { label: 'Punctuality', options: ['Legendary', 'Flexible', 'Vietnamese time'] },
  { label: 'Final note', options: ['Must eat dinner', 'Must drink water', 'Must sleep early'] },
]

export const PHOTO_LIMITS = { caption: 300, maxChars: 900_000, maxSide: 1280 }
