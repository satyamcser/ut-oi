// "Try demo": a complete local copy of the world that lives only in this tab's
// memory. Nothing is saved, nothing is shared, nobody else can see it.
// It applies the same ownership rules as firestore.rules so the UI behaves the same.
import { ARTIFACT_FOR, LIMITS, MAX_SCORE, type GameId, type Role } from '../content/ids'
import { isExpired, momentDef, MOMENT_LIMITS } from '../content/moments'
import type { AuthUser, FriendlyChallenge, LanguageChallenge, Moment, PlayerDoc, Postcard, Reply, ScoreDoc } from '../models/types'
import type { Backend, WatchHandlers } from './backend'

export const DEMO_UIDS: Record<Role, string> = { satyam: 'demo-satyam', ut: 'demo-ut' }

let seq = 0
const id = () => `demo-${Date.now().toString(36)}-${(seq++).toString(36)}`
const tick = () => new Promise((r) => setTimeout(r, 60))

export function createDemoBackend(): Backend {
  let user: AuthUser | null = null
  const authListeners = new Set<(u: AuthUser | null) => void>()
  const players = new Map<string, PlayerDoc>()
  const scores = new Map<string, ScoreDoc & { at: number }>()
  let postcards: Postcard[] = []
  let langs: LanguageChallenge[] = []
  let friendly: FriendlyChallenge[] = []
  const petArtifacts: Record<string, string> = {}
  let moments: Moment[] = []
  let replies: Reply[] = []
  const watchers = new Set<WatchHandlers>()

  const emit = () => {
    for (const h of watchers) {
      h.players([...players.values()])
      h.scores([...scores.values()].map(({ at: _at, ...s }) => s))
      h.postcards([...postcards])
      h.languageChallenges([...langs])
      h.friendlyChallenges([...friendly])
      h.world({ petArtifacts: { ...petArtifacts } })
      h.moments([...moments])
      h.replies([...replies])
      h.sync({ kind: 'demo' })
    }
  }
  const me = () => {
    if (!user) throw new Error('Not signed in.')
    return user.uid
  }
  const other = () => (me() === DEMO_UIDS.satyam ? DEMO_UIDS.ut : DEMO_UIDS.satyam)
  const romanceOn = () => ![...players.values()].some((p) => p.romanceOff)
  const checkText = (t: string, max: number, min = 0) => {
    if (t.length < min || t.length > max) throw new Error(`Please keep it between ${min} and ${max} characters.`)
  }

  return {
    mode: 'demo',
    onAuth(cb) {
      authListeners.add(cb)
      cb(user)
      return () => authListeners.delete(cb)
    },
    demoSignIn(role) {
      user = { uid: DEMO_UIDS[role], email: null }
      authListeners.forEach((l) => l(user))
    },
    async signIn() {
      throw new Error('The demo has no accounts. Pick who to explore as instead.')
    },
    async sendReset() {
      throw new Error('The demo has no accounts.')
    },
    async signOut() {
      user = null
      authListeners.forEach((l) => l(null))
    },
    roleOf(uid) {
      return uid === DEMO_UIDS.satyam ? 'satyam' : uid === DEMO_UIDS.ut ? 'ut' : null
    },
    watch(_uid, h) {
      watchers.add(h)
      setTimeout(emit, 0)
      return () => watchers.delete(h)
    },

    async savePlayer(uid, role, patch, existing) {
      await tick()
      if (uid !== me()) throw new Error('permission-denied')
      const base: PlayerDoc = existing ?? {
        uid,
        role,
        displayName: role === 'ut' ? 'Út' : 'Satyam',
        avatar: { hair: 0, hairColor: 0, skin: 1, outfit: 'casual', accessory: 0 },
        badges: [],
        eggs: [],
        pieces: [],
        visited: [],
        letterSeen: false,
        romanceOff: false,
      }
      players.set(uid, { ...base, ...patch, uid, role })
      emit()
    },

    async recordScore(uid, gameId: GameId, score) {
      await tick()
      if (uid !== me()) throw new Error('permission-denied')
      if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE[gameId]) throw new Error('That score is out of range.')
      const key = `${uid}_${gameId}`
      const old = scores.get(key)
      if (old && Date.now() - old.at < 3000) throw new Error('permission-denied')
      const bestScore = Math.max(old?.bestScore ?? 0, score)
      const totalPlays = (old?.totalPlays ?? 0) + 1
      scores.set(key, { uid, gameId, bestScore, lastScore: score, totalPlays, at: Date.now() })
      emit()
      return { bestScore, totalPlays, isNewBest: !old || score > old.bestScore }
    },

    async addPostcard(uid, input) {
      await tick()
      if (uid !== me()) throw new Error('permission-denied')
      checkText(input.text, input.kind === 'echo' ? LIMITS.echoText : LIMITS.postcardText)
      if (!input.text.trim() && input.stickerIds.length === 0) throw new Error('Add a few words or a sticker first.')
      const now = Date.now()
      postcards = [{ id: id(), authorUid: uid, ...input, reactions: {}, createdAt: now, updatedAt: now, pending: false }, ...postcards]
      emit()
    },
    async editPostcard(pid, input) {
      await tick()
      const p = postcards.find((x) => x.id === pid)
      if (!p || p.authorUid !== me()) throw new Error('permission-denied')
      checkText(input.text, p.kind === 'echo' ? LIMITS.echoText : LIMITS.postcardText)
      postcards = postcards.map((x) => (x.id === pid ? { ...x, ...input, updatedAt: Date.now() } : x))
      emit()
    },
    async deletePostcard(pid) {
      await tick()
      const p = postcards.find((x) => x.id === pid)
      if (!p || p.authorUid !== me()) throw new Error('permission-denied')
      postcards = postcards.filter((x) => x.id !== pid)
      emit()
    },
    async deleteMyPostcards(uid) {
      await tick()
      const before = postcards.length
      postcards = postcards.filter((x) => x.authorUid !== uid)
      emit()
      return before - postcards.length
    },
    async setReaction(uid, pid, emoji) {
      await tick()
      if (uid !== me()) throw new Error('permission-denied')
      postcards = postcards.map((x) => {
        if (x.id !== pid) return x
        const reactions = { ...x.reactions }
        if (emoji) reactions[uid] = emoji
        else delete reactions[uid]
        return { ...x, reactions }
      })
      emit()
    },

    async addLanguageChallenge(uid, targetUid, input) {
      await tick()
      if (uid !== me() || targetUid !== other()) throw new Error('permission-denied')
      langs = [{ id: id(), authorUid: uid, targetUid, ...input, status: 'open', answerIndex: -1, createdAt: Date.now() }, ...langs]
      emit()
    },
    async editLanguageChallenge(cid, input) {
      await tick()
      const c = langs.find((x) => x.id === cid)
      if (!c || c.authorUid !== me() || c.status !== 'open') throw new Error('permission-denied')
      langs = langs.map((x) => (x.id === cid ? { ...x, ...input } : x))
      emit()
    },
    async answerLanguageChallenge(cid, answerIndex) {
      await tick()
      const c = langs.find((x) => x.id === cid)
      if (!c || c.targetUid !== me() || c.status !== 'open') throw new Error('permission-denied')
      langs = langs.map((x) => (x.id === cid ? { ...x, status: answerIndex === null ? 'skipped' : 'answered', answerIndex: answerIndex ?? -1 } : x))
      emit()
    },
    async deleteLanguageChallenge(cid) {
      await tick()
      const c = langs.find((x) => x.id === cid)
      if (!c || c.authorUid !== me()) throw new Error('permission-denied')
      langs = langs.filter((x) => x.id !== cid)
      emit()
    },

    async addFriendlyChallenge(uid, targetUid, gameId, scoreToBeat) {
      await tick()
      if (uid !== me() || targetUid !== other()) throw new Error('permission-denied')
      friendly = [{ id: id(), creatorUid: uid, targetUid, gameId, scoreToBeat, status: 'open', createdAt: Date.now() }, ...friendly]
      emit()
    },
    async resolveFriendlyChallenge(cid, status) {
      await tick()
      const c = friendly.find((x) => x.id === cid)
      if (!c || c.targetUid !== me() || c.status !== 'open') throw new Error('permission-denied')
      if (status === 'completed' && (scores.get(`${me()}_${c.gameId}`)?.bestScore ?? -1) < c.scoreToBeat) {
        throw new Error('Beat the score first — then it counts!')
      }
      friendly = friendly.map((x) => (x.id === cid ? { ...x, status } : x))
      emit()
    },
    async deleteFriendlyChallenge(cid) {
      await tick()
      const c = friendly.find((x) => x.id === cid)
      if (!c || c.creatorUid !== me()) throw new Error('permission-denied')
      friendly = friendly.filter((x) => x.id !== cid)
      emit()
    },

    async contributeArtifact(uid, role) {
      await tick()
      if (uid !== me()) throw new Error('permission-denied')
      petArtifacts[uid] = ARTIFACT_FOR[role]
      emit()
    },

    async inviteMoment(uid, toUid, input) {
      await tick()
      if (uid !== me() || toUid !== other()) throw new Error('permission-denied')
      checkText(input.line, MOMENT_LIMITS.line)
      if (momentDef(input.type).romantic && !romanceOn()) throw new Error('Romantic gestures are switched off right now.')
      const now = Date.now()
      moments = [{ id: id(), fromUid: uid, toUid, ...input, status: 'pending', variant: '', reply: '', saved: {}, createdAt: now, updatedAt: now }, ...moments]
      emit()
    },
    async answerMoment(mid, answer) {
      await tick()
      const m = moments.find((x) => x.id === mid)
      if (!m || m.toUid !== me() || m.status !== 'pending' || isExpired(m.createdAt)) throw new Error('permission-denied')
      checkText(answer.reply, MOMENT_LIMITS.reply)
      if (answer.status === 'accepted') {
        if (!momentDef(m.type).variants.some((v) => v.id === answer.variant)) throw new Error('permission-denied')
        if (momentDef(m.type).romantic && !romanceOn()) throw new Error('Romantic gestures are switched off right now.')
      } else if (answer.variant || answer.reply) throw new Error('permission-denied')
      moments = moments.map((x) => (x.id === mid ? { ...x, ...answer, updatedAt: Date.now() } : x))
      emit()
    },
    async keepMoment(uid, mid, keep) {
      await tick()
      const m = moments.find((x) => x.id === mid)
      if (uid !== me() || !m || m.status !== 'accepted' || (m.fromUid !== uid && m.toUid !== uid)) throw new Error('permission-denied')
      moments = moments.map((x) => (x.id === mid ? { ...x, saved: { ...x.saved, [uid]: keep } } : x))
      emit()
    },
    async deleteMoment(mid) {
      await tick()
      const m = moments.find((x) => x.id === mid)
      const mine = m && (m.fromUid === me() || m.toUid === me())
      const ok = m && ((m.fromUid === me() && m.status !== 'accepted') || (mine && m.status === 'accepted' && !Object.values(m.saved).some(Boolean)))
      if (!ok) throw new Error('permission-denied')
      moments = moments.filter((x) => x.id !== mid)
      emit()
    },

    async addReply(uid, postId, text) {
      await tick()
      if (uid !== me() || !postcards.some((p) => p.id === postId)) throw new Error('permission-denied')
      checkText(text, MOMENT_LIMITS.postcardReply, 1)
      replies = [...replies, { id: id(), postId, authorUid: uid, text, createdAt: Date.now(), pending: false }]
      emit()
    },
    async deleteReply(rid) {
      await tick()
      const r = replies.find((x) => x.id === rid)
      if (!r || r.authorUid !== me()) throw new Error('permission-denied')
      replies = replies.filter((x) => x.id !== rid)
      emit()
    },
  }
}
