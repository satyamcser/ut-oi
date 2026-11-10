// In-world writing. Short, teasing, warm. Nothing here is attributed to Út as
// something she really said — her lines are clearly fictional game banter.
// This file ships in the public JavaScript: keep private correspondence out.
import type { Role, ZoneId } from './ids'

export const TITLE = 'Út ơi!'
export const TITLE_VI = 'Dành riêng cho Út ✨'
export const SUBTITLE = 'A little Hanoi universe, built for two very unserious people.'
export const DELIVERY = 'A very unofficial delivery for Út.'
export const FOOTER = 'Made with a little code, a little poetry, and a suspicious amount of coffee. — Satyam'
export const DISCLAIMER = 'This is a tiny private game for two. You can play, skip, or close it whenever you want.'

export const LOADING_TIPS = [
  'Professor Út is reviewing the coffee budget. This may take several lifetimes.',
  'Sleepy Cat is loading. Please do not wake Sleepy Cat.',
  'Simba is fetching the map. He has also fetched a stick nobody asked for.',
  'Translating “ơi” into English. Results: still “ơi”.',
]

export const PLAYER_TITLE: Record<Role, string> = {
  satyam: 'The Wandering Poet · English Tutor (Under Investigation)',
  ut: 'Professor Út · Vietnamese Tutor & Chief Coffee Inspector',
}

export type Speaker = 'Út' | 'Satyam' | 'Sleepy Cat' | 'Simba' | 'SYSTEM' | 'Coffee machine' | 'Reviewer' | 'Chalkboard'
export interface Line {
  who: Speaker
  text: string
}

export const ZONE_INTRO: Record<ZoneId, Line[]> = {
  cafe: [
    { who: 'Út', text: 'So, where is my coffee?' },
    { who: 'Satyam', text: 'I thought my English lesson covered the fee.' },
    { who: 'Út', text: 'That sounds like a separate invoice.' },
    { who: 'SYSTEM', text: 'Coffee Debt +1. Financial recovery unlikely.' },
  ],
  academy: [
    { who: 'Chalkboard', text: 'Lesson 01: How to say “ơi” without using it in every sentence.' },
    { who: 'Chalkboard', text: 'Teacher’s note: Challenge impossible.' },
  ],
  courtyard: [
    { who: 'Sleepy Cat', text: '…' },
    { who: 'Simba', text: 'WOOF!' },
    { who: 'Sleepy Cat', text: 'I am contacting management.' },
  ],
  auditorium: [
    { who: 'Reviewer', text: 'Confidence?' },
    { who: 'Satyam', text: 'Present.' },
    { who: 'Reviewer', text: 'Charm?' },
    { who: 'Satyam', text: 'Pending external evaluation.' },
  ],
  rooftop: [
    { who: 'SYSTEM', text: 'The rooftop is quiet. String lights, a little tea table, the city humming below.' },
    { who: 'SYSTEM', text: 'Nothing here needs finishing.' },
  ],
}

export const ZONE_BLURB: Record<ZoneId, string> = {
  cafe: 'Two tiny stools, a menu board and a cat who considers the counter her office.',
  academy: 'Sticky notes, textbooks and an alarming number of coffee invoices.',
  courtyard: 'Two pet houses, shady trees, a treat box and one deeply unproductive cat.',
  auditorium: 'A podium, a slide projector and one examiner cat in the front row.',
  rooftop: 'String lights, plants and a tea table above the old rooftops.',
}

export const FIRST_CAFE: Line[] = [
  { who: 'Coffee machine', text: 'Lesson fee overdue: 1 iced coffee.' },
  { who: 'SYSTEM', text: 'A sleepy cat has climbed onto the counter. Service is suspended.' },
  { who: 'Sleepy Cat', text: '…zzz.' },
]

export const CAT_LINES: Line[][] = [
  [
    { who: 'Sleepy Cat', text: '(opens one eye)' },
    { who: 'Sleepy Cat', text: '(closes it again. Meeting adjourned.)' },
  ],
  [
    { who: 'Sleepy Cat', text: 'Sleepy Cat declines to comment on the allegations.' },
    { who: 'SYSTEM', text: 'The investigation is suspended until after nap time.' },
  ],
  [
    { who: 'Sleepy Cat', text: '(stretches one paw, very slowly)' },
    { who: 'Sleepy Cat', text: '(this was the most work done today.)' },
  ],
]

export const SIMBA_LINES: Line[][] = [
  [
    { who: 'Simba', text: 'WOOF! (three happy spins)' },
    { who: 'SYSTEM', text: 'Simba has dropped a toy at your feet. It is slightly damp. It is a gift.' },
  ],
  [
    { who: 'SYSTEM', text: 'Simba has been formally accused of excessive enthusiasm.' },
    { who: 'Simba', text: 'WOOF. (pleads not guilty)' },
  ],
]

export const MISC = {
  bellReceipt: 'Bill: 2 smiles. Paid: in advance.',
  bellHint: ['Ding!', 'Ding! Ding!'],
  coffeeFees: 'This institution currently runs at a loss.',
  dictionary: '“Ơi” has entered the chat.',
  aodai: 'Wardrobe inspection: passed with suspiciously high marks.',
  aodaiOutfit: 'The outfit has passed an unusually strict inspection.',
  projector: 'A tiny cat has stepped into the projector beam and is now the entire presentation.',
  cloud: 'The view was worth the climb.',
  koi: 'One koi has decided you are interesting.',
  voucher: 'One imaginary coffee owed. Redeemable only in extremely good company.',
  rejected: 'Professor Út has rejected this coffee on grounds of insufficient artistic effort.',
  certificate: 'Confidence: survived the cat. Charm: under active review.',
  ending: 'Our most successful experiment was starting a conversation.',
  piece: 'You found a postcard piece!',
  ohNoCounter: 'The cat is not an ingredient. The cat agrees.',
}

/** A small poem from Satyam, found on the rooftop. Warm and ambiguous on purpose. */
export const POEM = [
  'Some cities feel familiar because we’ve walked their streets.',
  'Some conversations make familiar places feel different.',
  'This little corner is simply here whenever you feel like visiting.',
]

export const POSTCARD_PROMPTS = [
  'One tiny thing that made you smile today',
  'A place I want to photograph',
  'A word I learned',
  'A very important complaint about a pet',
  'Today’s fictional coffee review',
]
export const SECRET_PROMPT = 'If this street could keep one memory, what would it be?'

export const ECHO_LINES: Record<Role, string[]> = {
  satyam: ['Út ơi! The cat says hi.', 'Út ơi! One imaginary coffee is on its way.', 'Út ơi! Hope today was kind to you.'],
  ut: ['Satyam ơi! The coffee debt is still open.', 'Satyam ơi! The cat has reviewed your homework.', 'Satyam ơi! Hope today was kind to you.'],
}

/** The talk noticeboard. Once the date passes it becomes a memory, not a countdown. */
export const TALK = {
  date: '2026-11-14',
  label: '14 Nov 2026 · Thai Nguyen · Satyam’s Physical AI talk',
  url: 'https://pai.quanrobotics.org',
}

export function talkStatus(now = new Date()): string {
  const day = new Date(`${TALK.date}T23:59:59+07:00`)
  return now.getTime() <= day.getTime() ? 'On the noticeboard: Satyam’s Hanoi side quest.' : 'A pinned memory from Satyam’s Hanoi side quest.'
}

export const PIECE_HINTS: Record<ZoneId, string> = {
  cafe: 'Something glints under a little red stool.',
  academy: 'A corner of a postcard peeks out from the sticky-note board.',
  courtyard: 'Something is tucked behind the treat box.',
  auditorium: 'A paper corner sticks out from under the noticeboard.',
  rooftop: 'Something glows inside the plant pot by the stairs.',
}
