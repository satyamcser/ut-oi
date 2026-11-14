// The real two-player world: Firebase Auth (email/password, accounts created by
// the owner in the console) + Cloud Firestore with real-time listeners.
// Security is enforced by firestore.rules, not by anything in this file.
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  getDocs,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore'
import { ARTIFACT_FOR, type BackgroundId, type BadgeId, type EggId, type GameId, type PieceId, type Reaction, type StickerId, type ZoneId } from '../content/ids'
import type { MomentType, SceneId } from '../content/moments'
import type { FriendlyChallenge, LanguageChallenge, Moment, Postcard, Reply, ScoreDoc } from '../models/types'
import { friendlyError, type Backend } from './backend'
import { firebaseConfig, roleFromUid } from './config'

const ms = (v: unknown): number | null => (v instanceof Timestamp ? v.toMillis() : null)
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

export function createFirebaseBackend(): Backend {
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  // Local cache keeps the world on refresh and while briefly offline.
  const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })

  return {
    mode: 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, email: u.email } : null))
    },
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    },
    async sendReset(email) {
      await sendPasswordResetEmail(auth, email.trim())
    },
    async signOut() {
      await signOut(auth)
    },
    roleOf: roleFromUid,

    watch(_uid, h) {
      let lastSynced: number | null = null
      const touch = (snap: { metadata: { fromCache: boolean } }) => {
        if (!snap.metadata.fromCache) lastSynced = Date.now()
        h.sync({ kind: navigator.onLine ? 'online' : 'offline', lastSynced })
      }
      const fail = (e: unknown) => h.error(friendlyError(e))
      const list = (snap: QuerySnapshot<DocumentData>) => snap.docs.map((d) => ({ id: d.id, data: d.data({ serverTimestamps: 'estimate' }), pending: d.metadata.hasPendingWrites }))

      const unsubs = [
        onSnapshot(collection(db, 'players'), { includeMetadataChanges: true }, (snap) => {
          touch(snap)
          h.players(
            list(snap).map(({ id, data }) => ({
              uid: id,
              role: data.role,
              displayName: String(data.displayName ?? ''),
              avatar: data.avatar,
              badges: arr<BadgeId>(data.badges),
              eggs: arr<EggId>(data.eggs),
              pieces: arr<PieceId>(data.pieces),
              visited: arr<ZoneId>(data.visited),
              letterSeen: Boolean(data.letterSeen),
              romanceOff: data.romanceOff === true,
            })),
          )
        }, fail),
        onSnapshot(collection(db, 'scores'), (snap) => {
          touch(snap)
          h.scores(list(snap).map(({ data }) => ({ uid: data.uid, gameId: data.gameId, bestScore: data.bestScore, lastScore: data.lastScore, totalPlays: data.totalPlays }) as ScoreDoc))
        }, fail),
        onSnapshot(query(collection(db, 'postcards'), orderBy('createdAt', 'desc'), limit(200)), { includeMetadataChanges: true }, (snap) => {
          touch(snap)
          h.postcards(
            list(snap).map(({ id, data, pending }) => ({
              id,
              authorUid: data.authorUid,
              kind: data.kind,
              backgroundId: data.backgroundId as BackgroundId,
              text: String(data.text ?? ''),
              stickerIds: arr<StickerId>(data.stickerIds),
              reactions: (data.reactions ?? {}) as Record<string, Reaction>,
              createdAt: ms(data.createdAt),
              updatedAt: ms(data.updatedAt),
              pending,
            }) as Postcard),
          )
        }, fail),
        onSnapshot(query(collection(db, 'languageChallenges'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
          touch(snap)
          h.languageChallenges(
            list(snap).map(({ id, data }) => ({
              id,
              authorUid: data.authorUid,
              targetUid: data.targetUid,
              prompt: String(data.prompt ?? ''),
              options: arr<string>(data.options),
              correctIndex: data.correctIndex,
              status: data.status,
              answerIndex: data.answerIndex,
              createdAt: ms(data.createdAt),
            }) as LanguageChallenge),
          )
        }, fail),
        onSnapshot(query(collection(db, 'friendlyChallenges'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
          touch(snap)
          h.friendlyChallenges(
            list(snap).map(({ id, data }) => ({
              id,
              creatorUid: data.creatorUid,
              targetUid: data.targetUid,
              gameId: data.gameId,
              scoreToBeat: data.scoreToBeat,
              status: data.status,
              createdAt: ms(data.createdAt),
            }) as FriendlyChallenge),
          )
        }, fail),
        onSnapshot(doc(db, 'sharedWorld', 'main'), (snap) => {
          touch(snap)
          h.world({ petArtifacts: (snap.data()?.petArtifacts ?? {}) as Record<string, string> })
        }, fail),
        // Newer collections: if the published rules don't know them yet, only these features pause.
        onSnapshot(query(collection(db, 'moments'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
          h.moments(
            list(snap).map(({ id, data }) => ({
              id,
              fromUid: data.fromUid,
              toUid: data.toUid,
              type: data.type as MomentType,
              scene: data.scene as SceneId,
              line: String(data.line ?? ''),
              status: data.status,
              variant: String(data.variant ?? ''),
              reply: String(data.reply ?? ''),
              saved: (data.saved ?? {}) as Record<string, boolean>,
              createdAt: ms(data.createdAt),
              updatedAt: ms(data.updatedAt),
            }) as Moment),
          )
        }, (e) => h.extrasError(friendlyError(e))),
        onSnapshot(query(collection(db, 'replies'), orderBy('createdAt', 'asc'), limit(500)), { includeMetadataChanges: true }, (snap) => {
          h.replies(
            list(snap).map(({ id, data, pending }) => ({
              id,
              postId: String(data.postId ?? ''),
              authorUid: data.authorUid,
              text: String(data.text ?? ''),
              createdAt: ms(data.createdAt),
              pending,
            }) as Reply),
          )
        }, (e) => h.extrasError(friendlyError(e))),
      ]
      const onLine = () => h.sync({ kind: navigator.onLine ? 'online' : 'offline', lastSynced })
      window.addEventListener('online', onLine)
      window.addEventListener('offline', onLine)
      return () => {
        unsubs.forEach((u) => u())
        window.removeEventListener('online', onLine)
        window.removeEventListener('offline', onLine)
      }
    },

    async savePlayer(uid, role, patch, existing) {
      const ref = doc(db, 'players', uid)
      if (!existing) {
        await setDoc(ref, {
          role,
          displayName: patch.displayName ?? (role === 'ut' ? 'Út' : 'Satyam'),
          avatar: patch.avatar,
          badges: patch.badges ?? [],
          eggs: patch.eggs ?? [],
          pieces: patch.pieces ?? [],
          visited: patch.visited ?? [],
          letterSeen: patch.letterSeen ?? false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      } else {
        await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() })
      }
    },

    async recordScore(uid, gameId: GameId, score) {
      const ref = doc(db, 'scores', `${uid}_${gameId}`)
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(ref)
        if (!snap.exists()) {
          tx.set(ref, { uid, gameId, bestScore: score, lastScore: score, totalPlays: 1, updatedAt: serverTimestamp() })
          return { bestScore: score, totalPlays: 1, isNewBest: true }
        }
        const d = snap.data()
        const bestScore = Math.max(d.bestScore, score)
        tx.update(ref, { lastScore: score, bestScore, totalPlays: d.totalPlays + 1, updatedAt: serverTimestamp() })
        return { bestScore, totalPlays: d.totalPlays + 1, isNewBest: score > d.bestScore }
      })
    },

    async addPostcard(uid, input) {
      await addDoc(collection(db, 'postcards'), {
        authorUid: uid,
        kind: input.kind,
        backgroundId: input.backgroundId,
        text: input.text,
        stickerIds: input.stickerIds,
        visibility: 'shared',
        reactions: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    async editPostcard(id, input) {
      await updateDoc(doc(db, 'postcards', id), { ...input, updatedAt: serverTimestamp() })
    },
    async deletePostcard(id) {
      await deleteDoc(doc(db, 'postcards', id))
    },
    async deleteMyPostcards(uid) {
      const snap = await getDocs(query(collection(db, 'postcards'), where('authorUid', '==', uid)))
      const batch = writeBatch(db)
      snap.docs.forEach((d) => batch.delete(d.ref))
      await batch.commit()
      return snap.size
    },
    async setReaction(uid, postId, emoji) {
      await updateDoc(doc(db, 'postcards', postId), new FieldPath('reactions', uid), emoji ?? deleteField())
    },

    async addLanguageChallenge(uid, targetUid, input) {
      await addDoc(collection(db, 'languageChallenges'), {
        authorUid: uid,
        targetUid,
        prompt: input.prompt,
        options: input.options,
        correctIndex: input.correctIndex,
        status: 'open',
        answerIndex: -1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    async editLanguageChallenge(id, input) {
      await updateDoc(doc(db, 'languageChallenges', id), { ...input, updatedAt: serverTimestamp() })
    },
    async answerLanguageChallenge(id, answerIndex) {
      await updateDoc(doc(db, 'languageChallenges', id), {
        status: answerIndex === null ? 'skipped' : 'answered',
        answerIndex: answerIndex ?? -1,
        updatedAt: serverTimestamp(),
      })
    },
    async deleteLanguageChallenge(id) {
      await deleteDoc(doc(db, 'languageChallenges', id))
    },

    async addFriendlyChallenge(uid, targetUid, gameId, scoreToBeat) {
      await addDoc(collection(db, 'friendlyChallenges'), {
        creatorUid: uid,
        targetUid,
        gameId,
        scoreToBeat,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    async resolveFriendlyChallenge(id, status) {
      await updateDoc(doc(db, 'friendlyChallenges', id), { status, updatedAt: serverTimestamp() })
    },
    async deleteFriendlyChallenge(id) {
      await deleteDoc(doc(db, 'friendlyChallenges', id))
    },

    async contributeArtifact(uid, role) {
      await setDoc(doc(db, 'sharedWorld', 'main'), { petArtifacts: { [uid]: ARTIFACT_FOR[role] }, updatedAt: serverTimestamp() }, { merge: true })
    },

    async inviteMoment(uid, toUid, input) {
      await addDoc(collection(db, 'moments'), {
        fromUid: uid,
        toUid,
        type: input.type,
        scene: input.scene,
        line: input.line,
        status: 'pending',
        variant: '',
        reply: '',
        saved: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    async answerMoment(id, answer) {
      await updateDoc(doc(db, 'moments', id), { status: answer.status, variant: answer.variant, reply: answer.reply, updatedAt: serverTimestamp() })
    },
    async keepMoment(uid, id, keep) {
      await updateDoc(doc(db, 'moments', id), new FieldPath('saved', uid), keep)
    },
    async deleteMoment(id) {
      await deleteDoc(doc(db, 'moments', id))
    },

    async addReply(uid, postId, text) {
      await addDoc(collection(db, 'replies'), { postId, authorUid: uid, text, createdAt: serverTimestamp() })
    },
    async deleteReply(id) {
      await deleteDoc(doc(db, 'replies', id))
    },
  }
}
