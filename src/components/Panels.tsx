import { useState } from 'react'
import { DISCLAIMER, ECHO_LINES, FOOTER, MISC, POEM, TALK, talkStatus, ZONE_BLURB } from '../content/dialogue'
import { ZONES, type GameId, type ZoneId } from '../content/ids'
import { LETTER } from '../content/letter'
import { GLOSSARY } from '../content/phrases'
import { friendlyError } from '../data/backend'
import { useSettings } from '../hooks/useSettings'
import { useWorld } from '../hooks/useWorld'
import { PetPortrait } from './Passport'
import { Sheet, timeAgo } from './ui'

export function QuestMap({ onClose, onGo }: { onClose: () => void; onGo: (z: ZoneId) => void }) {
  const { me } = useWorld()
  return (
    <Sheet title="Side Quest Map" onClose={onClose}>
      <p className="fine">Every place is open from the start. Wander in any order — or not at all.</p>
      <ol className="quest-list">
        {ZONES.map((z) => {
          const visited = me?.visited.includes(z.id)
          const piece = me?.pieces.includes(`piece_${z.id}` as never)
          return (
            <li key={z.id}>
              <button className="quest" onClick={() => onGo(z.id)}>
                <span className="q-glyph" aria-hidden="true">
                  {z.glyph}
                </span>
                <span className="q-text">
                  <strong>{z.name}</strong>
                  <small>
                    {visited ? 'Visited' : 'Not visited yet'} · {piece ? 'postcard piece found' : 'a piece is hiding nearby'}
                  </small>
                </span>
                <span className="q-go">Walk there →</span>
              </button>
            </li>
          )
        })}
      </ol>
    </Sheet>
  )
}

export function ZonePanel({
  zone,
  onClose,
  onPlay,
  onStudio,
  onAlbum,
  onWorld,
  onAcademy,
  onPawprints,
  onLetter,
}: {
  zone: ZoneId
  onClose: () => void
  onPlay: (g: GameId) => void
  onStudio: () => void
  onAlbum: () => void
  onWorld: () => void
  onAcademy: () => void
  onPawprints: () => void
  onLetter: () => void
}) {
  const { me, scores, world, players, backend, user, role, unlock } = useWorld()
  const { play, toast, reduced } = useSettings()
  const [poem, setPoem] = useState(false)
  const [mountain, setMountain] = useState(false)
  const [plane, setPlane] = useState(false)
  const [echoBusy, setEchoBusy] = useState(false)
  const def = ZONES.find((z) => z.id === zone)!
  const coffeeOwed = scores.filter((s) => s.gameId === 'matcha').reduce((n, s) => n + s.totalPlays, 0)
  const portraitDone = players.length === 2 && players.every((p) => world.petArtifacts[p.uid])

  const sendEcho = async () => {
    if (!user || !role) return
    const lines = ECHO_LINES[role]
    const text = lines[Math.floor(Math.random() * lines.length)]
    setEchoBusy(true)
    try {
      await backend.addPostcard(user.uid, { kind: 'echo', backgroundId: 'moonlit_rooftop', text, stickerIds: ['plane'] })
      setPlane(true)
      play('paper')
      setTimeout(() => setPlane(false), reduced ? 600 : 2600)
      toast(`Sent: “${text}”`, 'good')
      void unlock({ egg: 'oi_echo' }).then(() => unlock({ badge: 'paper_airplane_pilot' }))
    } catch (e) {
      toast(`Not sent: ${friendlyError(e)}`, 'error')
    } finally {
      setEchoBusy(false)
    }
  }

  return (
    <Sheet title={def.name} onClose={onClose} tone={zone === 'rooftop' ? 'night' : 'paper'}>
      <p className="zone-blurb">{ZONE_BLURB[zone]}</p>
      <div className="zone-actions">
        {zone === 'cafe' && (
          <>
            <button className="btn btn-primary btn-big" onClick={() => onPlay('matcha')} data-autofocus>
              Play Matcha Mission
            </button>
            <div className="ledger">
              <strong>Coffee Debt Ledger</strong>
              <span>
                Imaginary coffees owed: {coffeeOwed}. Financial recovery unlikely. <em>(A joke. No real money, ever.)</em>
              </span>
            </div>
          </>
        )}
        {zone === 'academy' && (
          <button className="btn btn-primary btn-big" onClick={onAcademy} data-autofocus>
            Enter the classroom
          </button>
        )}
        {zone === 'courtyard' && (
          <>
            <button className="btn btn-primary btn-big" onClick={onPawprints} data-autofocus>
              Start the pawprint investigation
            </button>
            <PetPortrait complete={portraitDone} />
            <p className="fine">Find four pawprints under the leaf piles. Each of you also has one special object to find for the shared portrait.</p>
          </>
        )}
        {zone === 'auditorium' && (
          <>
            <button className="btn btn-primary btn-big" onClick={() => onPlay('presentation')} data-autofocus>
              Rescue the presentation
            </button>
            <div className="pinned">
              <strong>📌 {TALK.label}</strong>
              <span>{talkStatus()}</span>
              <a href={TALK.url} target="_blank" rel="noopener noreferrer">
                Visit event page
              </a>
            </div>
          </>
        )}
        {zone === 'rooftop' && (
          <>
            <div className="rooftop-scene" aria-label="The rooftop at night">
              <button className="moon-btn" onClick={() => setPoem((p) => !p)} aria-expanded={poem} aria-label="The moon">
                ☾
              </button>
              <button
                className="cloud-btn"
                onClick={() => {
                  setMountain(true)
                  void unlock({ egg: 'cloud_mountain' })
                }}
                aria-label="A drifting cloud"
              >
                ☁
              </button>
              {mountain && (
                <div className="mountain-pop" role="status">
                  <span aria-hidden="true">⛰</span> {MISC.cloud}
                </div>
              )}
              {plane && <span className="paper-plane" aria-hidden="true">✈</span>}
            </div>
            {poem && (
              <blockquote className="poem">
                {POEM.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                <cite>— Satyam</cite>
              </blockquote>
            )}
            <button className="btn btn-primary btn-big" onClick={onStudio} data-autofocus>
              Write a postcard
            </button>
            <button className="btn" onClick={onAlbum}>
              Open the shared album
            </button>
            <button className="btn" onClick={onWorld}>
              💞 Our Little World
            </button>
            <button className="btn" disabled={echoBusy} onClick={() => void sendEcho()}>
              Send a little “{role === 'ut' ? 'Satyam ơi' : 'Út ơi'}” ✈
            </button>
            {me && me.visited.length >= 5 && (
              <button className="btn btn-letter" onClick={onLetter}>
                ✉ A folded letter is on the tea table
              </button>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}

export function LetterView({ onClose }: { onClose: () => void }) {
  const { role } = useWorld()
  return (
    <Sheet title={LETTER.title} onClose={onClose}>
      {role === 'satyam' && <p className="fine">Preview — this is what Út sees after exploring all five places. Edit it in src/content/letter.ts.</p>}
      <article className="letter-paper">
        {LETTER.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="sig">{LETTER.signature}</p>
      </article>
      <p className="fine center">No reply needed. Come back whenever you like — or don’t. The cat won’t notice either way.</p>
    </Sheet>
  )
}

export function EndingView({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Five pieces, one postcard" onClose={onClose}>
      <svg viewBox="0 0 300 170" className="ending-art" role="img" aria-label="An illustrated café table for two under hanging lanterns">
        <rect width="300" height="170" rx="10" fill="#323E64" />
        {[40, 100, 160, 220, 270].map((x, i) => (
          <g key={x}>
            <line x1={x} y1="0" x2={x} y2={26 + (i % 2) * 8} stroke="#2B2230" strokeWidth="2" />
            <ellipse cx={x} cy={34 + (i % 2) * 8} rx="9" ry="11" fill={i % 2 ? '#DA887C' : '#EAA84C'} />
          </g>
        ))}
        <rect x="95" y="100" width="110" height="10" rx="3" fill="#7B5A47" />
        <rect x="108" y="110" width="6" height="40" fill="#5D4235" />
        <rect x="186" y="110" width="6" height="40" fill="#5D4235" />
        <rect x="60" y="120" width="30" height="8" rx="2" fill="#D9534F" />
        <rect x="64" y="128" width="4" height="22" fill="#D9534F" />
        <rect x="82" y="128" width="4" height="22" fill="#D9534F" />
        <rect x="210" y="120" width="30" height="8" rx="2" fill="#D9534F" />
        <rect x="214" y="128" width="4" height="22" fill="#D9534F" />
        <rect x="232" y="128" width="4" height="22" fill="#D9534F" />
        <path d="M128 86h16l-2 14h-12z" fill="#F9F1DF" />
        <path d="M156 86h16l-2 14h-12z" fill="#779A7A" />
        <path d="M134 80q-2-5 1-9M162 80q-2-5 1-9" stroke="#F9F1DF" strokeWidth="1.5" fill="none" />
      </svg>
      <p className="ending-text">{MISC.ending}</p>
    </Sheet>
  )
}

export function SettingsPanel({
  onClose,
  onAvatar,
  onLetter,
}: {
  onClose: () => void
  onAvatar: () => void
  onLetter: () => void
}) {
  const { settings, setSettings, toast } = useSettings()
  const { backend, user, sync, role, me, updateMe } = useWorld()
  const [busy, setBusy] = useState(false)
  const [romanceBusy, setRomanceBusy] = useState(false)
  return (
    <Sheet title="Settings" onClose={onClose}>
      <p className="disclaimer">{DISCLAIMER}</p>
      <label className="toggle">
        <input type="checkbox" checked={settings.sound} onChange={(e) => setSettings({ sound: e.target.checked })} /> Sound effects (tiny original blips, with captions)
      </label>
      <fieldset className="choice">
        <legend>Motion</legend>
        <div className="choice-row">
          {(
            [
              ['system', 'Match device'],
              ['reduce', 'Reduced'],
              ['full', 'Full'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={`choice-btn ${settings.motion === v ? 'on' : ''}`} aria-pressed={settings.motion === v} onClick={() => setSettings({ motion: v })}>
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      {me && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={!me.romanceOff}
            disabled={romanceBusy}
            onChange={async (e) => {
              setRomanceBusy(true)
              try {
                await updateMe({ romanceOff: !e.target.checked })
              } catch (err) {
                toast(friendlyError(err), 'error')
              } finally {
                setRomanceBusy(false)
              }
            }}
          />{' '}
          Romantic gestures in Our Little World (hand, hug, dance, kiss) <span className="fine">— always invitations; turning this off hides them for both of you</span>
        </label>
      )}
      <button className="btn" onClick={onAvatar}>
        Change my look
      </button>
      {role === 'satyam' && (
        <button className="btn" onClick={onLetter}>
          Preview Út’s folded letter
        </button>
      )}

      <h3>Controls</h3>
      <ul className="controls">
        <li>Walk: arrow keys or WASD · or tap anywhere on the map · or the on-screen pad</li>
        <li>Interact: E, Enter or Space · or the Interact button · or tap the object</li>
        <li>Esc closes any panel</li>
      </ul>

      <h3>Vietnamese phrase glossary</h3>
      <dl className="glossary">
        {GLOSSARY.map((g) => (
          <div key={g.vi}>
            <dt lang="vi">{g.vi}</dt>
            <dd>
              {g.en}
              {g.note ? ` — ${g.note}` : ''}
            </dd>
          </div>
        ))}
      </dl>

      <h3>About this little world</h3>
      <ul className="controls">
        <li>A small private web game made by Satyam, just for the two of you. No ads, no downloads, no tracking, no extra permissions.</li>
        <li>It runs entirely in this browser tab. The only outside services are GitHub Pages (hosts the page), Google Fonts (the two typefaces) and Google Firebase (sign-in and the private shared data).</li>
        <li>In Our Little World, every shared moment is an invitation. Saying “maybe another time” is always fine, and nothing in the game is a real-life promise.</li>
      </ul>

      <h3>Your data</h3>
      <ul className="controls">
        <li>Saved for both of you to see: avatar, best scores, shared postcards, replies, reactions, questions, challenges and Our Little World invitations.</li>
        <li>Saved only on this device: sound/motion settings and “just for me” postcards.</li>
        <li>Never collected: photos, location, contacts, camera, microphone, online status or visit times.</li>
        <li>
          Connection:{' '}
          {sync.kind === 'demo' ? 'demo — nothing leaves this tab' : sync.kind === 'offline' ? 'offline — changes wait until you’re back' : `online · last synced ${timeAgo(sync.lastSynced)}`}
        </li>
      </ul>
      <div className="row">
        <button
          className="btn btn-ghost danger"
          disabled={busy || !user}
          onClick={async () => {
            if (!user || !window.confirm('Delete every shared postcard you wrote? This can’t be undone.')) return
            setBusy(true)
            try {
              const n = await backend.deleteMyPostcards(user.uid)
              toast(`Deleted ${n} postcard${n === 1 ? '' : 's'}.`, 'good')
            } catch (e) {
              toast(friendlyError(e), 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          Delete all my postcards
        </button>
        <button className="btn" onClick={() => void backend.signOut()}>
          {backend.mode === 'demo' ? 'Leave the demo' : 'Sign out'}
        </button>
      </div>
      <p className="footer-note">{FOOTER}</p>
    </Sheet>
  )
}
