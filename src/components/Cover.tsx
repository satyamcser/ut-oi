import { useEffect, useState } from 'react'
import { DELIVERY, FOOTER, LOADING_TIPS, SUBTITLE, TITLE, TITLE_VI } from '../content/dialogue'
import { useSettings } from '../hooks/useSettings'

/** First screen: an envelope falls in, opens, and reveals the title. */
export function Cover({
  signedIn,
  canSignIn,
  onEnter,
  onDemo,
  onSignIn,
}: {
  signedIn: boolean
  canSignIn: boolean
  onEnter: () => void
  onDemo: () => void
  onSignIn: () => void
}) {
  const { reduced, play } = useSettings()
  const [open, setOpen] = useState(false)
  const [tip, setTip] = useState(() => Math.floor(Math.random() * LOADING_TIPS.length))

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % LOADING_TIPS.length), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <main className="cover">
      <div className="cover-sky" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className="lantern-dot" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 23) % 55}%`, animationDelay: `${(i % 7) * 0.4}s` }} />
        ))}
      </div>
      {!open ? (
        <div className="cover-stage">
          <p className="delivery">{DELIVERY}</p>
          <button
            className={`envelope ${reduced ? '' : 'envelope-fall'}`}
            onClick={() => {
              play('paper')
              setOpen(true)
            }}
            aria-label="Open the envelope"
            autoFocus
          >
            <svg viewBox="0 0 300 200" className="env-svg" aria-hidden="true">
              <rect x="4" y="4" width="292" height="192" rx="10" fill="#F9F1DF" stroke="#2B2230" strokeWidth="8" />
              <path d="M8 190 L120 104 M292 190 L180 104" stroke="#D9C9A6" strokeWidth="6" />
              <path d="M8 8 L150 118 L292 8 Z" fill="#F2E6CC" stroke="#2B2230" strokeWidth="8" strokeLinejoin="round" />
              <circle cx="150" cy="118" r="26" fill="#DA887C" stroke="#2B2230" strokeWidth="6" />
              <text x="150" y="130" textAnchor="middle" fontFamily="Tiny5, monospace" fontSize="34" fill="#FFFAF0">
                Ú
              </text>
            </svg>
          </button>
          <p className="tap-hint">Tap the envelope</p>
        </div>
      ) : (
        <div className={`cover-card ${reduced ? '' : 'rise'}`}>
          <p className="eyebrow">{TITLE_VI}</p>
          <h1 className="title-pixel">{TITLE}</h1>
          <p className="subtitle">{SUBTITLE}</p>
          <div className="cover-actions">
            <button className="btn btn-primary btn-big" onClick={signedIn ? onEnter : canSignIn ? onSignIn : onDemo} data-autofocus>
              Enter the little world
            </button>
            <div className="row">
              <button className="btn" onClick={onDemo}>
                Try demo
              </button>
              {canSignIn && !signedIn && (
                <button className="btn" onClick={onSignIn}>
                  Sign in
                </button>
              )}
            </div>
          </div>
          <p className="tip" aria-live="polite">
            {LOADING_TIPS[tip]}
          </p>
          <p className="footer-note">{FOOTER}</p>
        </div>
      )}
    </main>
  )
}
