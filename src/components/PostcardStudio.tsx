import { useEffect, useState } from 'react'
import { POSTCARD_PROMPTS, SECRET_PROMPT } from '../content/dialogue'
import { BACKGROUNDS, LIMITS, REACTIONS, STICKERS, type BackgroundId, type Reaction, type StickerId } from '../content/ids'
import { friendlyError } from '../data/backend'
import { useSettings } from '../hooks/useSettings'
import { nameOf, useWorld } from '../hooks/useWorld'
import type { Postcard } from '../models/types'
import { PostcardArt } from './PostcardArt'
import { Sheet, timeAgo } from './ui'

interface LocalCard {
  id: string
  backgroundId: BackgroundId
  text: string
  stickerIds: StickerId[]
  at: number
}

const localKey = (uid: string) => `ut-oi.just-for-me.${uid}`
function loadLocal(uid: string): LocalCard[] {
  try {
    return JSON.parse(localStorage.getItem(localKey(uid)) ?? '[]') as LocalCard[]
  } catch {
    return []
  }
}

const glyph = (id: StickerId) => STICKERS.find((s) => s.id === id)?.glyph ?? ''

export function CardView({
  bg,
  text,
  stickers,
  interactive,
  onEgg,
}: {
  bg: BackgroundId
  text: string
  stickers: StickerId[]
  interactive?: boolean
  onEgg?: (e: 'origami_lantern') => void
}) {
  return (
    <div className="card-view">
      <PostcardArt id={bg} interactive={interactive} onEgg={onEgg} />
      {stickers.length > 0 && (
        <div className="card-stickers" aria-label="Stickers">
          {stickers.map((s) => (
            <span key={s}>{glyph(s)}</span>
          ))}
        </div>
      )}
      {text && <p className="card-text">{text}</p>}
    </div>
  )
}

export function PostcardStudio({ onClose, startTab = 'compose' }: { onClose: () => void; startTab?: 'compose' | 'album' }) {
  const { backend, user, role, postcards, players, unlock } = useWorld()
  const { toast, play } = useSettings()
  const [tab, setTab] = useState<'compose' | 'album'>(startTab)
  const [bg, setBg] = useState<BackgroundId>('moonlit_rooftop')
  const [text, setText] = useState('')
  const [stickers, setStickers] = useState<StickerId[]>([])
  const [shared, setShared] = useState(true)
  const [busy, setBusy] = useState(false)
  const [secret, setSecret] = useState(false)
  const [local, setLocal] = useState<LocalCard[]>(() => (user ? loadLocal(user.uid) : []))
  const [editing, setEditing] = useState<Postcard | null>(null)

  useEffect(() => {
    if (!user) return
    try {
      localStorage.setItem(localKey(user.uid), JSON.stringify(local))
    } catch {
      /* ignore */
    }
  }, [local, user])

  useEffect(() => {
    if (bg === 'winter_snow') void unlock({ egg: 'snow_postcard' })
  }, [bg, unlock])

  if (!user || !role) return null

  const toggleSticker = (s: StickerId) =>
    setStickers((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= LIMITS.stickers ? cur : [...cur, s]))

  const send = async () => {
    if (!text.trim() && stickers.length === 0) return
    if (!shared) {
      setLocal((l) => [{ id: `local-${Date.now()}`, backgroundId: bg, text: text.trim(), stickerIds: stickers, at: Date.now() }, ...l])
      toast('Kept just for you, on this device.', 'good')
      setText('')
      setStickers([])
      setTab('album')
      return
    }
    const write = backend.addPostcard(user.uid, { kind: 'postcard', backgroundId: bg, text: text.trim(), stickerIds: stickers })
    if (!navigator.onLine) {
      // Firestore queues offline writes; the album marks it "sending…" until the server confirms.
      write.catch((e) => toast(`Not sent: ${friendlyError(e)}`, 'error'))
      toast('You’re offline — it’s queued and will send when you’re back. Not delivered yet.', 'info')
      setText('')
      setStickers([])
      setTab('album')
      return
    }
    setBusy(true)
    try {
      await write
      play('paper')
      toast('Sent to our little universe.', 'good')
      setText('')
      setStickers([])
      setTab('album')
    } catch (e) {
      toast(`Not sent: ${friendlyError(e)}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const react = async (p: Postcard, emoji: Reaction) => {
    const mine = p.reactions[user.uid]
    try {
      await backend.setReaction(user.uid, p.id, mine === emoji ? null : emoji)
      play('tap')
    } catch (e) {
      toast(`Reaction not saved: ${friendlyError(e)}`, 'error')
    }
  }

  const remove = async (p: Postcard) => {
    if (!window.confirm('Delete this postcard for both of you? This can’t be undone.')) return
    try {
      await backend.deletePostcard(p.id)
      toast('Postcard removed.')
    } catch (e) {
      toast(`Not deleted: ${friendlyError(e)}`, 'error')
    }
  }

  const authorName = (uid: string) => {
    const pl = players.find((x) => x.uid === uid)
    return pl?.displayName ?? nameOf(backend.roleOf(uid))
  }

  const album = postcards.filter((p) => p.kind !== 'echo' || p.text)

  return (
    <Sheet title="The Moonlit Postcard Studio" onClose={onClose} wide tone="night">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'compose'} className={`tab ${tab === 'compose' ? 'on' : ''}`} onClick={() => setTab('compose')}>
          Write a postcard
        </button>
        <button role="tab" aria-selected={tab === 'album'} className={`tab ${tab === 'album' ? 'on' : ''}`} onClick={() => setTab('album')}>
          Shared album ({album.length})
        </button>
      </div>

      {tab === 'compose' ? (
        <div className="studio">
          <div className="bg-grid" role="radiogroup" aria-label="Background">
            {BACKGROUNDS.map((b) => (
              <button key={b.id} role="radio" aria-checked={bg === b.id} className={`bg-thumb ${bg === b.id ? 'on' : ''}`} onClick={() => setBg(b.id)} title={b.name}>
                <PostcardArt id={b.id} />
                <span>{b.name}</span>
              </button>
            ))}
          </div>
          <div className="prompts">
            {POSTCARD_PROMPTS.map((p) => (
              <button key={p} className="chip" onClick={() => setText((t) => (t ? t : `${p}: `))}>
                {p}
              </button>
            ))}
            <button className="chip chip-secret" onClick={() => setSecret((s) => !s)} aria-expanded={secret} aria-label="A secret prompt">
              ✦
            </button>
          </div>
          {secret && (
            <p className="secret-prompt">
              {SECRET_PROMPT} <em>(No pressure to answer.)</em>
            </p>
          )}
          <label className="field">
            <span>
              Your words <em className="fine">{text.length}/{LIMITS.postcardText}</em>
            </span>
            <textarea value={text} maxLength={LIMITS.postcardText} rows={3} onChange={(e) => setText(e.target.value)} placeholder="One tiny thing that made you smile today…" />
          </label>
          <div className="stickers" role="group" aria-label={`Stickers (up to ${LIMITS.stickers})`}>
            {STICKERS.map((s) => (
              <button key={s.id} className={`sticker ${stickers.includes(s.id) ? 'on' : ''}`} aria-pressed={stickers.includes(s.id)} aria-label={s.label} onClick={() => toggleSticker(s.id)}>
                {s.glyph}
              </button>
            ))}
          </div>
          <fieldset className="visibility">
            <legend>Who sees it?</legend>
            <label>
              <input type="radio" checked={shared} onChange={() => setShared(true)} /> Share with our little universe <span className="fine">(both of us)</span>
            </label>
            <label>
              <input type="radio" checked={!shared} onChange={() => setShared(false)} /> Just for me <span className="fine">(stays on this device, never uploaded)</span>
            </label>
          </fieldset>
          <p className="preview-label">Preview</p>
          <CardView bg={bg} text={text} stickers={stickers} interactive onEgg={(egg) => void unlock({ egg })} />
          <button className="btn btn-primary btn-big" disabled={busy || (!text.trim() && stickers.length === 0)} onClick={() => void send()}>
            {busy ? 'Sending…' : shared ? 'Send to the shared album' : 'Keep it just for me'}
          </button>
        </div>
      ) : (
        <div className="album">
          {album.length === 0 && local.length === 0 && <p className="empty">The album is empty — the first postcard can be anything at all.</p>}
          {album.map((p) => {
            const mine = p.authorUid === user.uid
            return (
              <article key={p.id} className={`album-card ${p.kind}`}>
                {editing?.id === p.id ? (
                  <EditCard card={p} onDone={() => setEditing(null)} />
                ) : (
                  <CardView bg={p.backgroundId} text={p.kind === 'phrase' ? `Teach me one thing · ${p.text}` : p.text} stickers={p.stickerIds} />
                )}
                <footer>
                  <span className="by">
                    {p.kind === 'echo' ? '✈ ' : ''}
                    {authorName(p.authorUid)} · {p.pending ? 'sending…' : timeAgo(p.createdAt)}
                    {p.updatedAt && p.createdAt && p.updatedAt - p.createdAt > 2000 ? ' · edited' : ''}
                  </span>
                  <span className="reactions" role="group" aria-label="Reactions">
                    {REACTIONS.map((r) => {
                      const count = Object.values(p.reactions).filter((x) => x === r).length
                      const on = p.reactions[user.uid] === r
                      return (
                        <button key={r} className={`react ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`React ${r}`} onClick={() => void react(p, r)}>
                          {r}
                          {count > 0 && <small>{count}</small>}
                        </button>
                      )
                    })}
                  </span>
                  {mine && editing?.id !== p.id && (
                    <span className="row">
                      {p.kind !== 'echo' && (
                        <button className="btn btn-small" onClick={() => setEditing(p)}>
                          Edit
                        </button>
                      )}
                      <button className="btn btn-small btn-ghost" onClick={() => void remove(p)}>
                        Delete
                      </button>
                    </span>
                  )}
                </footer>
              </article>
            )
          })}
          {local.length > 0 && (
            <>
              <h3>Just for me (this device only)</h3>
              {local.map((c) => (
                <article key={c.id} className="album-card local">
                  <CardView bg={c.backgroundId} text={c.text} stickers={c.stickerIds} />
                  <footer>
                    <span className="by">Only you · {timeAgo(c.at)}</span>
                    <button className="btn btn-small btn-ghost" onClick={() => setLocal((l) => l.filter((x) => x.id !== c.id))}>
                      Delete
                    </button>
                  </footer>
                </article>
              ))}
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}

function EditCard({ card, onDone }: { card: Postcard; onDone: () => void }) {
  const { backend } = useWorld()
  const { toast } = useSettings()
  const [text, setText] = useState(card.text)
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="composer"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        try {
          await backend.editPostcard(card.id, { backgroundId: card.backgroundId, text: text.trim(), stickerIds: card.stickerIds })
          toast('Postcard updated.', 'good')
          onDone()
        } catch (err) {
          toast(`Not saved: ${friendlyError(err)}`, 'error')
        } finally {
          setBusy(false)
        }
      }}
    >
      <textarea value={text} maxLength={LIMITS.postcardText} rows={3} onChange={(e) => setText(e.target.value)} aria-label="Edit postcard text" />
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy || (!text.trim() && card.stickerIds.length === 0)}>
          Save
        </button>
      </div>
    </form>
  )
}
