import { useEffect, useState } from 'react'
import { AvatarEditor, DEFAULT_AVATAR } from './components/AvatarEditor'
import { Cover } from './components/Cover'
import { GameView } from './components/GameView'
import { DemoPicker, SignIn } from './components/SignIn'
import { Spinner, Toasts } from './components/ui'
import { PLAYER_TITLE, TITLE } from './content/dialogue'
import type { Backend } from './data/backend'
import { firebaseConfigured } from './data/config'
import { createDemoBackend } from './data/demoBackend'
import { SettingsProvider, useSettings } from './hooks/useSettings'
import { nameOf, useWorld, WorldProvider } from './hooks/useWorld'

type Phase = 'cover' | 'signin' | 'demo-pick' | 'world'

const COVER_SEEN = 'ut-oi.cover-seen'

function Gate({ phase, setPhase, onDemo, onLeaveDemo }: { phase: Phase; setPhase: (p: Phase) => void; onDemo: () => void; onLeaveDemo: () => void }) {
  const w = useWorld()
  const { toast } = useSettings()
  const [saving, setSaving] = useState(false)

  // Signing out (or leaving the demo) returns to the cover.
  useEffect(() => {
    if (w.authReady && !w.user && phase === 'world') {
      if (w.backend.mode === 'demo') onLeaveDemo()
      else setPhase('cover')
    }
    if (w.user && (phase === 'signin' || phase === 'demo-pick')) setPhase('world')
  }, [w.authReady, w.user, phase, setPhase, w.backend.mode, onLeaveDemo])

  if (phase === 'cover' || !w.authReady)
    return (
      <Cover
        signedIn={Boolean(w.user) && w.backend.mode === 'firebase'}
        canSignIn={w.backend.mode === 'firebase'}
        onEnter={() => {
          try {
            sessionStorage.setItem(COVER_SEEN, '1')
          } catch {
            /* ignore */
          }
          setPhase(w.user ? 'world' : 'signin')
        }}
        onDemo={onDemo}
        onSignIn={() => setPhase('signin')}
      />
    )
  if (phase === 'signin') return <SignIn onBack={() => setPhase('cover')} />
  if (phase === 'demo-pick')
    return (
      <DemoPicker
        onPick={(r) => {
          w.backend.demoSignIn?.(r)
          setPhase('world')
        }}
        onBack={onLeaveDemo}
      />
    )
  if (!w.user) return <SignIn onBack={() => setPhase('cover')} />

  if (!w.role || w.denied)
    return (
      <main className="cover">
        <div className="cover-card">
          <h1 className="title-pixel small">{TITLE}</h1>
          <p className="subtitle">This little world is only for two people, and this account isn’t one of them.</p>
          <p className="fine">If you think that’s wrong, the owner needs to add this account’s UID in the setup (see README).</p>
          <button className="btn btn-primary" onClick={() => void w.backend.signOut()}>
            Sign out
          </button>
        </div>
      </main>
    )

  if (!w.meLoaded)
    return (
      <main className="cover">
        <div className="cover-card">
          <Spinner label="Loading" />
          <p className="tip">Professor Út is reviewing the coffee budget. This may take several lifetimes.</p>
        </div>
      </main>
    )

  if (!w.me)
    return (
      <main className="cover">
        <div className="cover-card wide">
          <p className="eyebrow">Welcome, {nameOf(w.role)}!</p>
          <h1 className="title-pixel small">Choose your look</h1>
          <p className="fine">{PLAYER_TITLE[w.role]} · You can change this anytime in Settings.</p>
          <AvatarEditor
            role={w.role}
            initial={DEFAULT_AVATAR[w.role]}
            initialName={nameOf(w.role)}
            unlocked={{ aodai: false, pawPin: false }}
            busy={saving}
            onSave={async (cfg, name) => {
              setSaving(true)
              try {
                await w.updateMe({ avatar: cfg, displayName: name })
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Could not save.', 'error')
              } finally {
                setSaving(false)
              }
            }}
          />
        </div>
      </main>
    )

  return <GameView />
}

function Root() {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [demo, setDemo] = useState<Backend | null>(null)
  const [phase, setPhase] = useState<Phase>(() => {
    try {
      return sessionStorage.getItem(COVER_SEEN) ? 'world' : 'cover'
    } catch {
      return 'cover'
    }
  })

  useEffect(() => {
    if (!firebaseConfigured) {
      setBackend(createDemoBackend())
      return
    }
    let alive = true
    void import('./data/firebaseBackend').then((m) => {
      if (alive) setBackend(m.createFirebaseBackend())
    })
    return () => {
      alive = false
    }
  }, [])

  const active = demo ?? backend
  if (!active)
    return (
      <main className="cover">
        <div className="cover-card">
          <Spinner label="Loading" />
        </div>
      </main>
    )

  // Without Firebase config only the demo exists; make that obvious instead of pretending to sync.
  const startDemo = () => {
    setDemo(firebaseConfigured ? createDemoBackend() : active)
    setPhase('demo-pick')
  }
  const leaveDemo = () => {
    setDemo(null)
    if (!firebaseConfigured) setBackend(createDemoBackend())
    setPhase('cover')
  }

  return (
    <WorldProvider key={demo ? 'demo' : 'main'} backend={active}>
      <Gate phase={phase} setPhase={setPhase} onDemo={startDemo} onLeaveDemo={leaveDemo} />
    </WorldProvider>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <Root />
      <Toasts />
    </SettingsProvider>
  )
}
