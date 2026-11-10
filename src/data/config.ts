import type { Role } from '../content/ids'

const env = import.meta.env

export const firebaseConfig = {
  apiKey: (env.VITE_FIREBASE_API_KEY ?? '').trim(),
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim(),
  projectId: (env.VITE_FIREBASE_PROJECT_ID ?? '').trim(),
  storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim(),
  messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim(),
  appId: (env.VITE_FIREBASE_APP_ID ?? '').trim(),
}

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId && !firebaseConfig.projectId.includes('your-project'),
)

/** UI labels only — the security boundary is the allowlist in firestore.rules. */
export const PLAYER_UIDS: Record<Role, string> = {
  satyam: (env.VITE_SATYAM_UID ?? '').trim(),
  ut: (env.VITE_UT_UID ?? '').trim(),
}

export function roleFromUid(uid: string): Role | null {
  if (uid && uid === PLAYER_UIDS.satyam) return 'satyam'
  if (uid && uid === PLAYER_UIDS.ut) return 'ut'
  return null
}
