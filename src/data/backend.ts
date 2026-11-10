import type { GameId, Reaction, Role } from '../content/ids'
import type {
  AuthUser,
  ChallengeInput,
  FriendlyChallenge,
  LanguageChallenge,
  PlayerDoc,
  PlayerPatch,
  Postcard,
  PostcardInput,
  ScoreDoc,
  ScoreResult,
  SharedWorld,
  SyncState,
} from '../models/types'

export interface WatchHandlers {
  players(list: PlayerDoc[]): void
  scores(list: ScoreDoc[]): void
  postcards(list: Postcard[]): void
  languageChallenges(list: LanguageChallenge[]): void
  friendlyChallenges(list: FriendlyChallenge[]): void
  world(w: SharedWorld): void
  sync(s: SyncState): void
  error(message: string): void
}

/**
 * Everything the game needs from storage. Two implementations:
 *  - firebaseBackend: the real private two-player world (Auth + Firestore).
 *  - demoBackend: "Try demo" — in memory only, never saved or shared.
 */
export interface Backend {
  readonly mode: 'firebase' | 'demo'
  onAuth(cb: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  sendReset(email: string): Promise<void>
  signOut(): Promise<void>
  /** Role comes from the account's UID, never from anything the user picks. */
  roleOf(uid: string): Role | null
  watch(uid: string, h: WatchHandlers): () => void

  savePlayer(uid: string, role: Role, patch: PlayerPatch, existing: PlayerDoc | null): Promise<void>
  recordScore(uid: string, gameId: GameId, score: number): Promise<ScoreResult>

  addPostcard(uid: string, input: PostcardInput): Promise<void>
  editPostcard(id: string, input: Omit<PostcardInput, 'kind'>): Promise<void>
  deletePostcard(id: string): Promise<void>
  deleteMyPostcards(uid: string): Promise<number>
  setReaction(uid: string, postId: string, emoji: Reaction | null): Promise<void>

  addLanguageChallenge(uid: string, targetUid: string, input: ChallengeInput): Promise<void>
  editLanguageChallenge(id: string, input: ChallengeInput): Promise<void>
  answerLanguageChallenge(id: string, answerIndex: number | null): Promise<void>
  deleteLanguageChallenge(id: string): Promise<void>

  addFriendlyChallenge(uid: string, targetUid: string, gameId: GameId, scoreToBeat: number): Promise<void>
  resolveFriendlyChallenge(id: string, status: 'completed' | 'dismissed'): Promise<void>
  deleteFriendlyChallenge(id: string): Promise<void>

  contributeArtifact(uid: string, role: Role): Promise<void>

  /** Demo only. */
  demoSignIn?(role: Role): void
}

/** Short, honest, non-technical messages. Auth errors stay generic on purpose. */
export function friendlyError(err: unknown): string {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
  const msg = err instanceof Error ? err.message : String(err ?? '')
  if (code.startsWith('auth/')) {
    if (code === 'auth/too-many-requests') return 'Too many attempts. Take a short break and try again.'
    if (code === 'auth/network-request-failed') return 'No connection. Check your internet and try again.'
    return 'That email and password didn’t work. Check both and try again.'
  }
  if (code === 'permission-denied' || /permission/i.test(msg)) {
    return 'The little world said no to that change. If you just saved, wait a few seconds and retry.'
  }
  if (code === 'unavailable' || /offline|network|unavailable/i.test(msg)) {
    return 'You seem to be offline. Nothing new was saved — try again when you’re connected.'
  }
  if (code === 'failed-precondition') return 'Something got out of sync. Refresh the page and try again.'
  return msg.length > 140 ? msg.slice(0, 137) + '…' : msg || 'Something went wrong.'
}
