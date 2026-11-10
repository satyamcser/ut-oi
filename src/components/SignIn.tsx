import { useState, type FormEvent } from 'react'
import { TITLE } from '../content/dialogue'
import { friendlyError } from '../data/backend'
import { useWorld } from '../hooks/useWorld'

/** Email + password only. No sign-up: the two accounts are created by the owner. */
export function SignIn({ onBack }: { onBack: () => void }) {
  const { backend } = useWorld()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; tone: 'error' | 'info' } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await backend.signIn(email, password)
    } catch (err) {
      setMsg({ text: friendlyError(err), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setMsg({ text: 'Type your email above first, then tap “Forgot password?”.', tone: 'info' })
      return
    }
    setBusy(true)
    try {
      await backend.sendReset(email)
    } catch {
      /* stay generic: don't reveal whether an account exists */
    } finally {
      setBusy(false)
      setMsg({ text: 'If that email has an account, a reset link is on its way.', tone: 'info' })
    }
  }

  return (
    <main className="cover">
      <form className="cover-card signin" onSubmit={submit}>
        <h1 className="title-pixel small">{TITLE}</h1>
        <p className="subtitle">Sign in to the private two-person world.</p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {msg && (
          <p className={msg.tone === 'error' ? 'msg-error' : 'msg-info'} role="alert">
            {msg.text}
          </p>
        )}
        <button className="btn btn-primary btn-big" disabled={busy}>
          {busy ? 'Opening the gate…' : 'Sign in'}
        </button>
        <div className="row between">
          <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
            Forgot password?
          </button>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Back
          </button>
        </div>
        <p className="fine">There’s no sign-up here — this little world has exactly two guests.</p>
      </form>
    </main>
  )
}

export function DemoPicker({ onPick, onBack }: { onPick: (role: 'ut' | 'satyam') => void; onBack: () => void }) {
  return (
    <main className="cover">
      <div className="cover-card">
        <p className="demo-badge">DEMO · nothing is saved or shared</p>
        <h1 className="title-pixel small">Who are you today?</h1>
        <p className="subtitle">The demo is a local copy of the world. Close the tab and it’s gone.</p>
        <div className="cover-actions">
          <button className="btn btn-primary btn-big" onClick={() => onPick('ut')} data-autofocus>
            Explore as Út
          </button>
          <button className="btn btn-big" onClick={() => onPick('satyam')}>
            Explore as Satyam
          </button>
          <button className="btn btn-ghost" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </main>
  )
}
