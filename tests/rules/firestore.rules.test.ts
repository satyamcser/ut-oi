/**
 * Firestore security rules tests. Run with:  npm run test:rules
 * (starts the Firestore emulator via firebase-tools; needs Java 11+).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const SATYAM = 'satyam-uid'
const UT = 'ut-uid'
const STRANGER = 'stranger-uid'

let env: RulesTestEnvironment

function rulesWithTestUids(): string {
  const src = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8')
  return src
    .replace(/function satyamUid\(\) \{ return '[^']*'; \}/, `function satyamUid() { return '${SATYAM}'; }`)
    .replace(/function utUid\(\) \{ return '[^']*'; \}/, `function utUid() { return '${UT}'; }`)
}

const db = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore())

const player = (role: 'satyam' | 'ut', extra: Record<string, unknown> = {}) => ({
  role,
  displayName: role === 'satyam' ? 'Satyam' : 'Út',
  avatar: { hair: 1, hairColor: 0, skin: 2, outfit: 'casual', accessory: 0 },
  badges: [],
  eggs: [],
  pieces: [],
  visited: [],
  letterSeen: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const postcard = (authorUid: string, extra: Record<string, unknown> = {}) => ({
  authorUid,
  kind: 'postcard',
  backgroundId: 'lanterns',
  text: 'A word I learned: ơi',
  stickerIds: ['coffee'],
  visibility: 'shared',
  reactions: {},
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

const challenge = (authorUid: string, targetUid: string, extra: Record<string, unknown> = {}) => ({
  authorUid,
  targetUid,
  prompt: 'What does "Ngủ ngon" mean?',
  options: ['Sleep well', 'Good morning', 'Delicious'],
  correctIndex: 0,
  status: 'open',
  answerIndex: -1,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data)
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-ut-oi', firestore: { rules: rulesWithTestUids() } })
})
afterAll(async () => {
  await env?.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
})

describe('strangers get nothing', () => {
  it('unauthenticated visitors cannot read or write anything', async () => {
    await seed('players/' + SATYAM, { role: 'satyam' })
    await assertFails(getDoc(doc(db(null), 'players', SATYAM)))
    await assertFails(getDocs(collection(db(null), 'postcards')))
    await assertFails(setDoc(doc(db(null), 'players', 'x'), player('ut')))
  })
  it('a signed-in account outside the allowlist cannot read or write', async () => {
    await seed('postcards/p1', { authorUid: UT, text: 'hi' })
    await assertFails(getDoc(doc(db(STRANGER), 'postcards', 'p1')))
    await assertFails(getDocs(collection(db(STRANGER), 'scores')))
    await assertFails(setDoc(doc(db(STRANGER), 'players', STRANGER), player('ut')))
    await assertFails(addDoc(collection(db(STRANGER), 'postcards'), postcard(STRANGER)))
  })
  it('unknown collections are denied even for players', async () => {
    await assertFails(setDoc(doc(db(SATYAM), 'secrets', 'x'), { a: 1 }))
  })
})

describe('players', () => {
  it('can create only their own profile with the role their UID implies', async () => {
    await assertSucceeds(setDoc(doc(db(SATYAM), 'players', SATYAM), player('satyam')))
    await assertFails(setDoc(doc(db(UT), 'players', UT), player('satyam')))
    await assertFails(setDoc(doc(db(UT), 'players', SATYAM), player('satyam')))
    await assertSucceeds(setDoc(doc(db(UT), 'players', UT), player('ut')))
    await assertSucceeds(getDoc(doc(db(UT), 'players', SATYAM)))
  })
  it('rejects unknown fields, bad avatars and unknown badges', async () => {
    await assertFails(setDoc(doc(db(UT), 'players', UT), player('ut', { isAdmin: true })))
    await assertFails(setDoc(doc(db(UT), 'players', UT), player('ut', { avatar: { hair: 9, hairColor: 0, skin: 0, outfit: 'casual', accessory: 0 } })))
    await assertFails(setDoc(doc(db(UT), 'players', UT), player('ut', { badges: ['made_up_badge'] })))
    await assertFails(setDoc(doc(db(UT), 'players', UT), player('ut', { displayName: 'x'.repeat(25) })))
  })
  it('cannot edit the other player', async () => {
    await assertSucceeds(setDoc(doc(db(UT), 'players', UT), player('ut')))
    await assertFails(updateDoc(doc(db(SATYAM), 'players', UT), { displayName: 'hacked', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db(UT), 'players', UT), { eggs: ['sleepy_cat'], updatedAt: serverTimestamp() }))
  })
})

describe('scores', () => {
  const score = (uid: string, extra: Record<string, unknown> = {}) => ({
    uid,
    gameId: 'matcha',
    bestScore: 70,
    lastScore: 70,
    totalPlays: 1,
    updatedAt: serverTimestamp(),
    ...extra,
  })
  it('a first score is accepted only in range and with an honest best', async () => {
    await assertFails(setDoc(doc(db(UT), 'scores', `${UT}_matcha`), score(UT, { lastScore: 101, bestScore: 101 })))
    await assertFails(setDoc(doc(db(UT), 'scores', `${UT}_matcha`), score(UT, { bestScore: 100 })))
    await assertFails(setDoc(doc(db(UT), 'scores', `${UT}_matcha`), score(UT, { totalPlays: 50 })))
    await assertFails(setDoc(doc(db(SATYAM), 'scores', `${UT}_matcha`), score(UT)))
    await assertFails(setDoc(doc(db(UT), 'scores', `${UT}_matcha`), score(UT, { gameId: 'pawprints' })))
    await assertSucceeds(setDoc(doc(db(UT), 'scores', `${UT}_matcha`), score(UT)))
  })
  it('updates add exactly one play, keep the max, and are rate limited', async () => {
    await seed(`scores/${UT}_matcha`, { uid: UT, gameId: 'matcha', bestScore: 70, lastScore: 70, totalPlays: 1, updatedAt: Timestamp.fromMillis(Date.now() - 60_000) })
    const ref = doc(db(UT), 'scores', `${UT}_matcha`)
    await assertFails(updateDoc(ref, { lastScore: 40, bestScore: 40, totalPlays: 2, updatedAt: serverTimestamp() })) // best went down
    await assertFails(updateDoc(ref, { lastScore: 90, bestScore: 90, totalPlays: 5, updatedAt: serverTimestamp() })) // +4 plays
    await assertSucceeds(updateDoc(ref, { lastScore: 90, bestScore: 90, totalPlays: 2, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { lastScore: 50, bestScore: 90, totalPlays: 3, updatedAt: serverTimestamp() })) // within 3 s
  })
})

describe('postcards', () => {
  it('only the author can create, edit and delete', async () => {
    await assertFails(addDoc(collection(db(SATYAM), 'postcards'), postcard(UT)))
    await assertFails(addDoc(collection(db(UT), 'postcards'), postcard(UT, { text: 'x'.repeat(301) })))
    await assertFails(addDoc(collection(db(UT), 'postcards'), postcard(UT, { backgroundId: 'nope' })))
    await assertFails(addDoc(collection(db(UT), 'postcards'), postcard(UT, { visibility: 'private' })))
    await assertSucceeds(setDoc(doc(db(UT), 'postcards', 'p1'), postcard(UT)))
    await assertFails(updateDoc(doc(db(SATYAM), 'postcards', 'p1'), { text: 'edited by the wrong person', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(db(SATYAM), 'postcards', 'p1')))
    await assertSucceeds(updateDoc(doc(db(UT), 'postcards', 'p1'), { text: 'edited', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(doc(db(UT), 'postcards', 'p1')))
  })
  it('each player can set only their own reaction', async () => {
    await assertSucceeds(setDoc(doc(db(UT), 'postcards', 'p1'), postcard(UT)))
    const asSatyam = doc(db(SATYAM), 'postcards', 'p1')
    await assertSucceeds(updateDoc(asSatyam, { [`reactions.${SATYAM}`]: '🐾' }))
    await assertFails(updateDoc(asSatyam, { [`reactions.${UT}`]: '😂' }))
    await assertFails(updateDoc(asSatyam, { [`reactions.${SATYAM}`]: '💀' }))
    await assertFails(updateDoc(asSatyam, { [`reactions.${SATYAM}`]: '☕', text: 'sneaky edit' }))
  })
})

describe('language challenges', () => {
  it('go to the other player, who may only answer or skip', async () => {
    await assertFails(setDoc(doc(db(SATYAM), 'languageChallenges', 'c0'), challenge(SATYAM, SATYAM)))
    await assertFails(setDoc(doc(db(SATYAM), 'languageChallenges', 'c0'), challenge(UT, SATYAM)))
    await assertFails(setDoc(doc(db(SATYAM), 'languageChallenges', 'c0'), challenge(SATYAM, UT, { options: ['a', 'b'] })))
    await assertSucceeds(setDoc(doc(db(SATYAM), 'languageChallenges', 'c1'), challenge(SATYAM, UT)))
    const asUt = doc(db(UT), 'languageChallenges', 'c1')
    await assertFails(updateDoc(asUt, { prompt: 'changed', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(asUt, { status: 'answered', answerIndex: 7, updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(asUt, { status: 'answered', answerIndex: 0, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(asUt, { status: 'skipped', answerIndex: -1, updatedAt: serverTimestamp() })) // already answered
    await assertFails(deleteDoc(asUt))
    await assertSucceeds(deleteDoc(doc(db(SATYAM), 'languageChallenges', 'c1')))
  })
})

describe('friendly challenges', () => {
  const fc = { creatorUid: SATYAM, targetUid: UT, gameId: 'matcha', scoreToBeat: 80, status: 'open', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
  it('can be dismissed freely but completed only with a real best score', async () => {
    await assertSucceeds(setDoc(doc(db(SATYAM), 'friendlyChallenges', 'f1'), fc))
    const asUt = doc(db(UT), 'friendlyChallenges', 'f1')
    await assertFails(updateDoc(asUt, { status: 'completed', updatedAt: serverTimestamp() })) // no score yet
    await seed(`scores/${UT}_matcha`, { uid: UT, gameId: 'matcha', bestScore: 85, lastScore: 85, totalPlays: 1, updatedAt: Timestamp.now() })
    await assertFails(updateDoc(doc(db(SATYAM), 'friendlyChallenges', 'f1'), { status: 'completed', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(asUt, { status: 'completed', updatedAt: serverTimestamp() }))
  })
})

describe('shared world', () => {
  it('each player contributes only their own pet artifact', async () => {
    const asSatyam = doc(db(SATYAM), 'sharedWorld', 'main')
    await assertFails(setDoc(asSatyam, { petArtifacts: { [SATYAM]: 'cat_bell' }, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(asSatyam, { petArtifacts: { [UT]: 'cat_bell' }, updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(asSatyam, { petArtifacts: { [SATYAM]: 'simba_ball' }, updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(db(UT), 'sharedWorld', 'main'), { petArtifacts: { [UT]: 'cat_bell' }, updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(setDoc(doc(db(UT), 'sharedWorld', 'other'), { petArtifacts: { [UT]: 'cat_bell' }, updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(asSatyam))
  })
})

const moment = (fromUid: string, toUid: string, extra: Record<string, unknown> = {}) => ({
  fromUid,
  toUid,
  type: 'walk',
  scene: 'riverside',
  line: 'Walk with me for a while?',
  status: 'pending',
  variant: '',
  reply: '',
  saved: {},
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
})

describe('moments (invitations)', () => {
  it('are sent only to the other player, start pending, and carry nothing pre-filled', async () => {
    await assertFails(setDoc(doc(db(SATYAM), 'moments', 'm0'), moment(SATYAM, SATYAM)))
    await assertFails(setDoc(doc(db(SATYAM), 'moments', 'm0'), moment(UT, SATYAM)))
    await assertFails(setDoc(doc(db(SATYAM), 'moments', 'm0'), moment(SATYAM, UT, { status: 'accepted', variant: 'yes' })))
    await assertFails(setDoc(doc(db(SATYAM), 'moments', 'm0'), moment(SATYAM, UT, { saved: { [SATYAM]: true } })))
    await assertFails(setDoc(doc(db(SATYAM), 'moments', 'm0'), moment(SATYAM, UT, { type: 'propose' })))
    await assertFails(setDoc(doc(db(STRANGER), 'moments', 'm0'), moment(STRANGER, UT)))
    await assertSucceeds(setDoc(doc(db(SATYAM), 'moments', 'm1'), moment(SATYAM, UT)))
  })

  it('only the invited person answers, once, with an allowed choice; a no carries nothing', async () => {
    await assertSucceeds(setDoc(doc(db(SATYAM), 'moments', 'm1'), moment(SATYAM, UT, { type: 'dance', scene: 'lanterns' })))
    const asSatyam = doc(db(SATYAM), 'moments', 'm1')
    const asUt = doc(db(UT), 'moments', 'm1')
    await assertFails(updateDoc(asSatyam, { status: 'accepted', variant: 'slow', reply: '', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(asUt, { status: 'accepted', variant: 'gentle', reply: '', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(asUt, { status: 'declined', variant: '', reply: 'sneaky', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(asUt, { status: 'accepted', variant: 'slow', reply: '', line: 'rewritten', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(asUt, { status: 'accepted', variant: 'silly', reply: 'Merciful? Never.', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(asUt, { status: 'declined', variant: '', reply: '', updatedAt: serverTimestamp() }))
  })

  it('cannot be answered after a week', async () => {
    await seed('moments/old', { ...moment(SATYAM, UT), createdAt: Timestamp.fromMillis(Date.now() - 8 * 86400000), updatedAt: Timestamp.now() })
    await assertFails(updateDoc(doc(db(UT), 'moments', 'old'), { status: 'accepted', variant: 'yes', reply: '', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(doc(db(SATYAM), 'moments', 'old')))
  })

  it('each person keeps a moment only for themselves; kept moments can’t be deleted', async () => {
    await seed('moments/m1', { ...moment(SATYAM, UT), status: 'accepted', variant: 'yes', createdAt: Timestamp.now(), updatedAt: Timestamp.now() })
    await assertFails(updateDoc(doc(db(SATYAM), 'moments', 'm1'), { [`saved.${UT}`]: true }))
    await assertFails(updateDoc(doc(db(SATYAM), 'moments', 'm1'), { [`saved.${SATYAM}`]: 'yes' }))
    await assertSucceeds(updateDoc(doc(db(SATYAM), 'moments', 'm1'), { [`saved.${SATYAM}`]: true }))
    await assertSucceeds(updateDoc(doc(db(UT), 'moments', 'm1'), { [`saved.${UT}`]: true }))
    await assertFails(deleteDoc(doc(db(SATYAM), 'moments', 'm1')))
    await assertFails(deleteDoc(doc(db(STRANGER), 'moments', 'm1')))
    await assertSucceeds(updateDoc(doc(db(SATYAM), 'moments', 'm1'), { [`saved.${SATYAM}`]: false }))
    await assertSucceeds(updateDoc(doc(db(UT), 'moments', 'm1'), { [`saved.${UT}`]: false }))
    await assertSucceeds(deleteDoc(doc(db(UT), 'moments', 'm1')))
  })

  it('romantic invitations need both players to have romance switched on', async () => {
    await assertSucceeds(setDoc(doc(db(UT), 'players', UT), player('ut', { romanceOff: true })))
    await assertFails(setDoc(doc(db(UT), 'players', UT), player('ut', { romanceOff: 'maybe' })))
    await assertFails(setDoc(doc(db(SATYAM), 'moments', 'k1'), moment(SATYAM, UT, { type: 'kiss' })))
    await assertSucceeds(setDoc(doc(db(SATYAM), 'moments', 'k2'), moment(SATYAM, UT, { type: 'talk', scene: 'cafe' })))
    await assertSucceeds(updateDoc(doc(db(UT), 'players', UT), { romanceOff: false, updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(db(SATYAM), 'moments', 'k1'), moment(SATYAM, UT, { type: 'kiss' })))
    // switching off again also blocks saying yes to an older romantic invitation
    await assertSucceeds(updateDoc(doc(db(UT), 'players', UT), { romanceOff: true, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db(UT), 'moments', 'k1'), { status: 'accepted', variant: 'gentle', reply: '', updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db(UT), 'moments', 'k1'), { status: 'declined', variant: '', reply: '', updatedAt: serverTimestamp() }))
  })
})

describe('postcard replies', () => {
  const reply = (authorUid: string, postId: string, extra: Record<string, unknown> = {}) => ({ postId, authorUid, text: 'Landed safely!', createdAt: serverTimestamp(), ...extra })
  it('need a real postcard, belong to their author, and can’t be edited', async () => {
    await assertSucceeds(setDoc(doc(db(UT), 'postcards', 'p1'), postcard(UT)))
    await assertFails(setDoc(doc(db(SATYAM), 'replies', 'r0'), reply(SATYAM, 'missing')))
    await assertFails(setDoc(doc(db(SATYAM), 'replies', 'r0'), reply(UT, 'p1')))
    await assertFails(setDoc(doc(db(SATYAM), 'replies', 'r0'), reply(SATYAM, 'p1', { text: '' })))
    await assertFails(setDoc(doc(db(SATYAM), 'replies', 'r0'), reply(SATYAM, 'p1', { text: 'x'.repeat(201) })))
    await assertFails(setDoc(doc(db(STRANGER), 'replies', 'r0'), reply(STRANGER, 'p1')))
    await assertSucceeds(setDoc(doc(db(SATYAM), 'replies', 'r1'), reply(SATYAM, 'p1')))
    await assertFails(updateDoc(doc(db(SATYAM), 'replies', 'r1'), { text: 'edited' }))
    await assertFails(deleteDoc(doc(db(UT), 'replies', 'r1')))
    await assertSucceeds(deleteDoc(doc(db(SATYAM), 'replies', 'r1')))
    await assertSucceeds(getDocs(collection(db(UT), 'replies')))
    await assertFails(getDocs(collection(db(STRANGER), 'replies')))
  })
})

describe('stories', () => {
  const story = (uid: string, extra: Record<string, unknown> = {}) => ({
    creatorUid: uid,
    mode: 'cozy',
    lines: [{ uid, text: 'It started raining…' }],
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  })
  it('take turns adding exactly one line, without rewriting earlier lines', async () => {
    await assertFails(setDoc(doc(db(UT), 'stories', 's0'), story(SATYAM)))
    await assertFails(setDoc(doc(db(UT), 'stories', 's0'), story(UT, { mode: 'spicy' })))
    await assertSucceeds(setDoc(doc(db(UT), 'stories', 's1'), story(UT)))
    const first = { uid: UT, text: 'It started raining…' }
    // Út can't add two lines in a row
    await assertFails(updateDoc(doc(db(UT), 'stories', 's1'), { lines: [first, { uid: UT, text: 'again' }], updatedAt: serverTimestamp() }))
    // Satyam can't rewrite her line or write as her
    await assertFails(updateDoc(doc(db(SATYAM), 'stories', 's1'), { lines: [{ uid: UT, text: 'changed' }, { uid: SATYAM, text: 'hi' }], updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db(SATYAM), 'stories', 's1'), { lines: [first, { uid: UT, text: 'hi' }], updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db(SATYAM), 'stories', 's1'), { lines: [first, { uid: SATYAM, text: '…so we found a bookshop.' }], updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(db(UT), 'stories', 's1'), { status: 'finished', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db(SATYAM), 'stories', 's1'), { status: 'open', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(db(SATYAM), 'stories', 's1')))
    await assertSucceeds(deleteDoc(doc(db(UT), 'stories', 's1')))
  })
})

describe('café board', () => {
  const board = (uid: string, extra: Record<string, unknown> = {}) => ({ name: 'Út’s Kitchen', tagline: '', color: 'amber', dishes: ['Phở chay'], updatedBy: uid, updatedAt: serverTimestamp(), ...extra })
  it('either player edits main, honestly signed, within limits', async () => {
    await assertFails(setDoc(doc(db(SATYAM), 'cafeBoard', 'other'), board(SATYAM)))
    await assertFails(setDoc(doc(db(SATYAM), 'cafeBoard', 'main'), board(UT)))
    await assertFails(setDoc(doc(db(SATYAM), 'cafeBoard', 'main'), board(SATYAM, { dishes: ['', 'x'] })))
    await assertFails(setDoc(doc(db(SATYAM), 'cafeBoard', 'main'), board(SATYAM, { dishes: ['1', '2', '3', '4', '5', '6', '7'] })))
    await assertFails(setDoc(doc(db(SATYAM), 'cafeBoard', 'main'), board(SATYAM, { color: 'neon' })))
    await assertSucceeds(setDoc(doc(db(SATYAM), 'cafeBoard', 'main'), board(SATYAM)))
    await assertSucceeds(setDoc(doc(db(UT), 'cafeBoard', 'main'), board(UT, { name: 'No Salary Café' })))
    await assertFails(setDoc(doc(db(STRANGER), 'cafeBoard', 'main'), board(STRANGER)))
    await assertFails(deleteDoc(doc(db(UT), 'cafeBoard', 'main')))
  })
})

describe('photos', () => {
  const photo = (uid: string, extra: Record<string, unknown> = {}) => ({ authorUid: uid, data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', caption: 'Sunset', createdAt: serverTimestamp(), ...extra })
  it('are JPEG data only, size-limited, readable only by the two players, deletable only by the author', async () => {
    await assertFails(setDoc(doc(db(UT), 'photos', 'x0'), photo(SATYAM)))
    await assertFails(setDoc(doc(db(UT), 'photos', 'x0'), photo(UT, { data: 'data:text/html;base64,PHNjcmlwdD4=' })))
    await assertFails(setDoc(doc(db(UT), 'photos', 'x0'), photo(UT, { data: 'data:image/jpeg;base64,' + 'A'.repeat(900000) })))
    await assertSucceeds(setDoc(doc(db(UT), 'photos', 'x1'), photo(UT)))
    await assertSucceeds(getDoc(doc(db(SATYAM), 'photos', 'x1')))
    await assertFails(getDoc(doc(db(STRANGER), 'photos', 'x1')))
    await assertFails(updateDoc(doc(db(UT), 'photos', 'x1'), { caption: 'edited' }))
    await assertFails(deleteDoc(doc(db(SATYAM), 'photos', 'x1')))
    await assertSucceeds(deleteDoc(doc(db(UT), 'photos', 'x1')))
  })
})

describe('new scenes', () => {
  it('accept the bookshop and postcard corner moments', async () => {
    await assertSucceeds(setDoc(doc(db(SATYAM), 'moments', 'b1'), moment(SATYAM, UT, { type: 'poem', scene: 'bookshop' })))
    await assertSucceeds(setDoc(doc(db(UT), 'moments', 'a1'), moment(UT, SATYAM, { type: 'thinking', scene: 'airport' })))
    await assertFails(setDoc(doc(db(UT), 'moments', 'a2'), moment(UT, SATYAM, { type: 'thinking', scene: 'moon' })))
  })
})

describe('presence (live walking together)', () => {
  const pres = (extra: Record<string, unknown> = {}) => ({ share: true, here: true, x: 360, y: 250, dir: 0, emote: '', emoteAt: 0, updatedAt: serverTimestamp(), ...extra })
  it('is reciprocal: you see the other person only while you both share', async () => {
    await assertFails(setDoc(doc(db(SATYAM), 'presence', UT), pres()))
    await assertFails(setDoc(doc(db(UT), 'presence', UT), pres({ emote: '💀' })))
    await assertFails(setDoc(doc(db(UT), 'presence', UT), pres({ x: 5000 })))
    await assertSucceeds(setDoc(doc(db(UT), 'presence', UT), pres()))
    // Satyam isn't sharing yet: can't see her
    await assertFails(getDoc(doc(db(SATYAM), 'presence', UT)))
    await seed(`presence/${SATYAM}`, { share: true, here: true, x: 1, y: 1, dir: 0, emote: '', emoteAt: 0, updatedAt: Timestamp.fromMillis(Date.now() - 5000) })
    await assertSucceeds(getDoc(doc(db(SATYAM), 'presence', UT)))
    await assertFails(getDoc(doc(db(STRANGER), 'presence', UT)))
    // she switches it off: hidden again
    await seed(`presence/${UT}`, { share: false, here: false, x: 1, y: 1, dir: 0, emote: '', emoteAt: 0, updatedAt: Timestamp.fromMillis(Date.now() - 5000) })
    await assertFails(getDoc(doc(db(SATYAM), 'presence', UT)))
    await assertSucceeds(getDoc(doc(db(UT), 'presence', UT)))
  })
})
