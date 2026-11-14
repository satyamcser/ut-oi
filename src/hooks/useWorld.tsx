import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BadgeId, EggId, GameId, PieceId, Role, ZoneId } from '../content/ids'
import { friendlyError, type Backend } from '../data/backend'
import type {
  AuthUser,
  FriendlyChallenge,
  LanguageChallenge,
  Moment,
  PlayerDoc,
  PlayerPatch,
  Postcard,
  Reply,
  ScoreDoc,
  ScoreResult,
  SharedWorld,
  SyncState,
} from '../models/types'

interface WorldValue {
  backend: Backend
  user: AuthUser | null
  authReady: boolean
  role: Role | null
  me: PlayerDoc | null
  partner: PlayerDoc | null
  meLoaded: boolean
  players: PlayerDoc[]
  scores: ScoreDoc[]
  postcards: Postcard[]
  langs: LanguageChallenge[]
  friendly: FriendlyChallenge[]
  world: SharedWorld
  moments: Moment[]
  replies: Reply[]
  /** Set when the newer shared features (moments, replies) can't sync. */
  extrasError: string | null
  sync: SyncState
  error: string | null
  denied: boolean
  partnerUid: string | null
  updateMe: (patch: PlayerPatch) => Promise<void>
  unlock: (u: { egg?: EggId; badge?: BadgeId; piece?: PieceId; zone?: ZoneId }) => Promise<boolean>
  recordScore: (game: GameId, score: number) => Promise<ScoreResult>
}

const Ctx = createContext<WorldValue | null>(null)

export function WorldProvider({ backend, children }: { backend: Backend; children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  const [meLoaded, setMeLoaded] = useState(false)
  const [scores, setScores] = useState<ScoreDoc[]>([])
  const [postcards, setPostcards] = useState<Postcard[]>([])
  const [langs, setLangs] = useState<LanguageChallenge[]>([])
  const [friendly, setFriendly] = useState<FriendlyChallenge[]>([])
  const [world, setWorld] = useState<SharedWorld>({ petArtifacts: {} })
  const [moments, setMoments] = useState<Moment[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [extrasError, setExtrasError] = useState<string | null>(null)
  const [sync, setSync] = useState<SyncState>({ kind: backend.mode === 'demo' ? 'demo' : 'online', lastSynced: null } as SyncState)
  const [error, setError] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(
    () =>
      backend.onAuth((u) => {
        setUser(u)
        setAuthReady(true)
        setMeLoaded(false)
        setDenied(false)
        setPlayers([])
      }),
    [backend],
  )

  const role = user ? backend.roleOf(user.uid) : null

  useEffect(() => {
    if (!user) return
    return backend.watch(user.uid, {
      players: (l) => {
        setPlayers(l)
        setMeLoaded(true)
        setDenied(false)
      },
      scores: setScores,
      postcards: setPostcards,
      languageChallenges: setLangs,
      friendlyChallenges: setFriendly,
      world: setWorld,
      moments: (l) => {
        setMoments(l)
        setExtrasError(null)
      },
      replies: setReplies,
      extrasError: setExtrasError,
      sync: setSync,
      error: (m) => {
        if (/said no/i.test(m)) setDenied(true)
        setError(m)
      },
    })
  }, [backend, user])

  const me = players.find((p) => p.uid === user?.uid) ?? null
  const partner = players.find((p) => p.uid !== user?.uid) ?? null
  const meRef = useRef(me)
  meRef.current = me

  const updateMe = useCallback(
    async (patch: PlayerPatch) => {
      if (!user || !role) throw new Error('Not signed in.')
      await backend.savePlayer(user.uid, role, patch, meRef.current)
    },
    [backend, user, role],
  )

  /** Adds discoveries once; returns true if something new was saved. */
  const unlock = useCallback(
    async (u: { egg?: EggId; badge?: BadgeId; piece?: PieceId; zone?: ZoneId }) => {
      const cur = meRef.current
      if (!cur) return false
      const patch: PlayerPatch = {}
      if (u.egg && !cur.eggs.includes(u.egg)) patch.eggs = [...cur.eggs, u.egg]
      if (u.badge && !cur.badges.includes(u.badge)) patch.badges = [...cur.badges, u.badge]
      if (u.piece && !cur.pieces.includes(u.piece)) patch.pieces = [...cur.pieces, u.piece]
      if (u.zone && !cur.visited.includes(u.zone)) patch.visited = [...cur.visited, u.zone]
      if (Object.keys(patch).length === 0) return false
      meRef.current = { ...cur, ...patch }
      try {
        await updateMe(patch)
        return true
      } catch (e) {
        setError(friendlyError(e))
        return false
      }
    },
    [updateMe],
  )

  const recordScore = useCallback(
    (game: GameId, score: number) => {
      if (!user) return Promise.reject(new Error('Not signed in.'))
      return backend.recordScore(user.uid, game, score)
    },
    [backend, user],
  )

  const partnerUid = useMemo(() => {
    if (partner) return partner.uid
    if (!user || !role) return null
    // Before the partner has ever signed in we still know their UID from config.
    if (backend.mode === 'demo') return role === 'ut' ? 'demo-satyam' : 'demo-ut'
    const other = role === 'ut' ? import.meta.env.VITE_SATYAM_UID : import.meta.env.VITE_UT_UID
    return (other ?? '').trim() || null
  }, [partner, user, role, backend.mode])

  const value: WorldValue = {
    backend,
    user,
    authReady,
    role,
    me,
    partner,
    meLoaded,
    players,
    scores,
    postcards,
    langs,
    friendly,
    world,
    moments,
    replies,
    extrasError,
    sync,
    error,
    denied,
    partnerUid,
    updateMe,
    unlock,
    recordScore,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorld(): WorldValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWorld outside provider')
  return v
}

export function nameOf(role: Role | null | undefined): string {
  return role === 'satyam' ? 'Satyam' : 'Út'
}
