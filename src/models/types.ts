import type { BackgroundId, BadgeId, EggId, GameId, PieceId, Reaction, Role, StickerId, ZoneId } from '../content/ids'

export interface AvatarConfig {
  hair: number // 0..3 style
  hairColor: number // 0..3
  skin: number // 0..3
  outfit: 'casual' | 'aodai'
  accessory: number // 0 none, 1 nón lá, 2 paw pin, 3 flower clip
}

export interface PlayerDoc {
  uid: string
  role: Role
  displayName: string
  avatar: AvatarConfig
  badges: BadgeId[]
  eggs: EggId[]
  pieces: PieceId[]
  visited: ZoneId[]
  letterSeen: boolean
}

export type PlayerPatch = Partial<Omit<PlayerDoc, 'uid' | 'role'>>

export interface ScoreDoc {
  uid: string
  gameId: GameId
  bestScore: number
  lastScore: number
  totalPlays: number
}

export interface Postcard {
  id: string
  authorUid: string
  kind: 'postcard' | 'phrase' | 'echo'
  backgroundId: BackgroundId
  text: string
  stickerIds: StickerId[]
  reactions: Record<string, Reaction>
  createdAt: number | null // ms; null while the server timestamp is pending
  updatedAt: number | null
  pending: boolean // true until the server has it
}

export interface PostcardInput {
  kind: Postcard['kind']
  backgroundId: BackgroundId
  text: string
  stickerIds: StickerId[]
}

export interface LanguageChallenge {
  id: string
  authorUid: string
  targetUid: string
  prompt: string
  options: string[]
  correctIndex: number
  status: 'open' | 'answered' | 'skipped'
  answerIndex: number
  createdAt: number | null
}

export interface ChallengeInput {
  prompt: string
  options: string[]
  correctIndex: number
}

export interface FriendlyChallenge {
  id: string
  creatorUid: string
  targetUid: string
  gameId: GameId
  scoreToBeat: number
  status: 'open' | 'completed' | 'dismissed'
  createdAt: number | null
}

export interface SharedWorld {
  petArtifacts: Record<string, string>
}

export interface AuthUser {
  uid: string
  email: string | null
}

export interface ScoreResult {
  bestScore: number
  totalPlays: number
  isNewBest: boolean
}

export type SyncState = { kind: 'demo' } | { kind: 'online'; lastSynced: number | null } | { kind: 'offline'; lastSynced: number | null }
