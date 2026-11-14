// Small shared activities inside Our Little World: question jar, two-player
// mini-story, photo stories and the imaginary café board. None of them keep
// score, none of them need an answer.
import { useEffect, useState } from 'react'
import { CAFE_COLORS, CAFE_LIMITS, JAR_QUESTIONS, PHOTO_LIMITS, STORY_LIMITS, STORY_MODES, type CafeColor, type StoryMode } from '../content/moments'
import { LIMITS } from '../content/ids'
import { friendlyError } from '../data/backend'
import { useSettings } from '../hooks/useSettings'
import { nameOf, useWorld } from '../hooks/useWorld'
import type { PhotoStory, Story } from '../models/types'
import { timeAgo } from './ui'

export type Extra = 'jar' | 'story' | 'photos' | 'cafe'
export const EXTRAS: { id: Extra; label: string }[] = [
  { id: 'jar', label: '🫙 Question jar' },
  { id: 'story', label: '📖 Mini-story' },
  { id: 'photos', label: '📷 Photo stories' },
  { id: 'cafe', label: '🍲 Our café board' },
]

function useRun() {
  const { toast } = useSettings()
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast(ok, 'good')
      return true
    } catch (e) {
      toast(`Not saved: ${friendlyError(e)}`, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

function usePartnerName() {
  const { role, partner } = useWorld()
  return partner?.displayName ?? nameOf(role === 'ut' ? 'satyam' : 'ut')
}

// ------------------------------------------------------------------ question jar

export function QuestionJar() {
  const { backend, user } = useWorld()
  const { play } = useSettings()
  const partnerName = usePartnerName()
  const { busy, run } = useRun()
  const pick = (not?: string) => {
    const pool = JAR_QUESTIONS.filter((q) => q !== not)
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const [q, setQ] = useState(() => pick())
  const [answer, setAnswer] = useState('')
  if (!user) return null
  const head = `🫙 ${q}`
  const max = LIMITS.postcardText - head.length - 1
  const send = (withAnswer: boolean) =>
    run(
      () => backend.addPostcard(user.uid, { kind: 'postcard', backgroundId: 'lanterns', text: withAnswer ? `${head}\n${answer.trim()}` : `${head}\n(${partnerName}, your turn — if you like)`, stickerIds: [] }),
      'Pinned to the shared album.',
    ).then((ok) => ok && (setAnswer(''), setQ(pick(q))))

  return (
    <div className="lw-card">
      <p className="lw-card-title">Pull a question out of the jar</p>
      <p className="lw-jar-q">{q}</p>
      <div className="row">
        <button
          className="btn btn-small"
          onClick={() => {
            play('paper')
            setQ(pick(q))
          }}
        >
          Shake the jar
        </button>
      </div>
      <label className="field">
        <span>
          Your answer <em className="fine">(optional · {answer.length}/{max})</em>
        </span>
        <textarea rows={2} value={answer} maxLength={max} onChange={(e) => setAnswer(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn btn-primary" disabled={busy || !answer.trim()} onClick={() => void send(true)}>
          Answer on a postcard
        </button>
        <button className="btn" disabled={busy} onClick={() => void send(false)}>
          Just ask {partnerName}
        </button>
      </div>
      <p className="fine">Answers land in the shared album, where either of you can reply underneath. Skip any question you like.</p>
    </div>
  )
}

// ------------------------------------------------------------------ mini-story

function StoryCard({ s }: { s: Story }) {
  const { backend, user, players } = useWorld()
  const partnerName = usePartnerName()
  const { busy, run } = useRun()
  const [line, setLine] = useState('')
  if (!user) return null
  const nameFor = (uid: string) => players.find((p) => p.uid === uid)?.displayName ?? nameOf(backend.roleOf(uid))
  const myTurn = s.status === 'open' && s.lines[s.lines.length - 1]?.uid !== user.uid && s.lines.length < STORY_LIMITS.lines
  const mode = STORY_MODES.find((m) => m.id === s.mode)
  return (
    <article className="lw-card lw-story">
      <p className="lw-card-title">
        {mode?.label} story <span className="fine">· {s.status === 'finished' ? 'finished' : `${s.lines.length} lines`} · {timeAgo(s.updatedAt)}</span>
      </p>
      <ol className="lw-story-lines">
        {s.lines.map((l, i) => (
          <li key={i} className={l.uid === user.uid ? 'mine' : ''}>
            <span className="fine">{nameFor(l.uid)}:</span> {l.text}
          </li>
        ))}
      </ol>
      {s.status === 'open' &&
        (myTurn ? (
          <form
            className="reply-form"
            onSubmit={(e) => {
              e.preventDefault()
              void run(() => backend.addStoryLine(user.uid, s.id, line.trim())).then((ok) => ok && setLine(''))
            }}
          >
            <input value={line} maxLength={STORY_LIMITS.line} onChange={(e) => setLine(e.target.value)} placeholder="Your next line…" aria-label="Your next line" />
            <button className="btn btn-small btn-primary" disabled={busy || !line.trim()}>
              Add
            </button>
          </form>
        ) : (
          <p className="fine">{s.lines.length >= STORY_LIMITS.lines ? 'The story is full — time for a new one.' : `${partnerName}’s turn. No rush at all.`}</p>
        ))}
      <div className="row">
        {s.status === 'open' && (
          <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => void run(() => backend.finishStory(s.id), 'The end. ✨')}>
            Call it finished
          </button>
        )}
        {s.creatorUid === user.uid && (
          <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => window.confirm('Delete this story for both of you?') && void run(() => backend.deleteStory(s.id))}>
            Delete
          </button>
        )}
      </div>
    </article>
  )
}

export function MiniStory() {
  const { backend, user, stories } = useWorld()
  const { busy, run } = useRun()
  const [mode, setMode] = useState<StoryMode>('funny')
  const [first, setFirst] = useState('')
  if (!user) return null
  const starter = STORY_MODES.find((m) => m.id === mode)!.starter
  return (
    <div className="lw">
      <div className="lw-card">
        <p className="lw-card-title">Start a story together</p>
        <p className="fine">You write one line, the other person writes the next. Funny, cozy or poetic — no wrong answers.</p>
        <div className="row">
          {STORY_MODES.map((m) => (
            <button key={m.id} className={`chip ${mode === m.id ? 'on' : ''}`} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>First line</span>
          <input value={first} maxLength={STORY_LIMITS.line} placeholder={starter} onChange={(e) => setFirst(e.target.value)} />
        </label>
        <div className="row">
          <button className="btn btn-small" onClick={() => setFirst(starter)}>
            Use the starter
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || !first.trim()}
            onClick={() => void run(() => backend.startStory(user.uid, mode, first.trim()), 'Story started.').then((ok) => ok && setFirst(''))}
          >
            Start
          </button>
        </div>
      </div>
      {stories.map((s) => (
        <StoryCard key={s.id} s={s} />
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ photo stories

/** Resize and re-encode on the device. Re-encoding also drops EXIF data such as GPS location. */
async function toJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('That file doesn’t look like a photo.'))
      i.src = url
    })
    let side = PHOTO_LIMITS.maxSide
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(img.naturalWidth * scale))
      c.height = Math.max(1, Math.round(img.naturalHeight * scale))
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      for (const q of [0.82, 0.7, 0.58]) {
        const data = c.toDataURL('image/jpeg', q)
        if (data.length <= PHOTO_LIMITS.maxChars) return data
      }
      side = Math.round(side * 0.75)
    }
    throw new Error('That photo is too large, even after shrinking.')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PhotoCorner() {
  const { backend, user, players } = useWorld()
  const { toast } = useSettings()
  const partnerName = usePartnerName()
  const { busy, run } = useRun()
  const [list, setList] = useState<PhotoStory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [preparing, setPreparing] = useState(false)

  useEffect(() => backend.watchPhotos(setList, setError), [backend])
  if (!user) return null
  const nameFor = (uid: string) => players.find((p) => p.uid === uid)?.displayName ?? nameOf(backend.roleOf(uid))

  return (
    <div className="lw">
      <div className="lw-card">
        <p className="lw-card-title">Share a photo and why it mattered</p>
        <p className="fine">
          Only you and {partnerName} can see these. Photos are shrunk on your device first, and location data inside the photo is removed. Please only share photos that are yours to share.
        </p>
        <label className="btn lw-file">
          {preparing ? 'Preparing…' : draft ? 'Choose a different photo' : 'Choose a photo'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={preparing}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              setPreparing(true)
              try {
                setDraft(await toJpeg(f))
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Could not read that photo.', 'error')
              } finally {
                setPreparing(false)
              }
            }}
          />
        </label>
        {draft && (
          <>
            <img className="lw-photo" src={draft} alt="Preview of the photo you chose" />
            <label className="field">
              <span>
                A few sentences <em className="fine">{caption.length}/{PHOTO_LIMITS.caption}</em>
              </span>
              <textarea rows={2} value={caption} maxLength={PHOTO_LIMITS.caption} onChange={(e) => setCaption(e.target.value)} placeholder="Why this moment mattered…" />
            </label>
            <div className="row">
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() =>
                  void run(() => backend.addPhoto(user.uid, draft, caption.trim()), `Shared with ${partnerName}.`).then((ok) => {
                    if (ok) {
                      setDraft(null)
                      setCaption('')
                    }
                  })
                }
              >
                Share with {partnerName}
              </button>
              <button className="btn btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      {error && <p className="lw-note">Photo stories are resting for now — the database rules need their update (see the setup notes).</p>}
      {!error && list === null && <p className="fine">Loading photos…</p>}
      {list?.length === 0 && <p className="empty">No photo stories yet. Sunsets, rivers, ordinary moments — all welcome.</p>}
      <div className="lw-photos">
        {list?.map((p) => (
          <figure key={p.id} className="lw-photo-card">
            <img className="lw-photo" src={p.data} alt={p.caption || `A photo from ${nameFor(p.authorUid)}`} loading="lazy" />
            {p.caption && <figcaption>{p.caption}</figcaption>}
            <footer className="row between">
              <span className="by">
                {nameFor(p.authorUid)} · {p.pending ? 'sending…' : timeAgo(p.createdAt)}
              </span>
              {p.authorUid === user.uid && (
                <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => window.confirm('Delete this photo for both of you?') && void run(() => backend.deletePhoto(p.id))}>
                  Delete
                </button>
              )}
            </footer>
          </figure>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ café board

export function CafeBoardPanel() {
  const { backend, user, cafe, players } = useWorld()
  const { busy, run } = useRun()
  const [name, setName] = useState(cafe?.name ?? '')
  const [tagline, setTagline] = useState(cafe?.tagline ?? '')
  const [color, setColor] = useState<CafeColor>(cafe?.color ?? 'amber')
  const [dishes, setDishes] = useState<string[]>(cafe?.dishes.length ? cafe.dishes : [''])
  if (!user) return null
  const c = CAFE_COLORS.find((x) => x.id === color)!
  const clean = dishes.map((d) => d.trim()).filter(Boolean)
  const editor = cafe?.updatedBy ? players.find((p) => p.uid === cafe.updatedBy)?.displayName ?? nameOf(backend.roleOf(cafe.updatedBy)) : null
  return (
    <div className="lw">
      <div className="lw-menu" style={{ background: c.bg, color: c.ink }}>
        <p className="lw-menu-name">{name.trim() || 'Our Imaginary Café'}</p>
        <p className="lw-menu-tag">{tagline.trim() || 'Vegetarian. Cozy. Prices under negotiation.'}</p>
        <ul>
          {(clean.length ? clean : ['Something delicious', 'Phở chay (vegetarian phở)', 'Iced coffee (the debt continues)']).map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>
      <p className="fine">
        Design it together — either of you can change anything. Just for fun; nobody has to open a real restaurant. 😉
        {editor && cafe?.updatedAt ? ` Last touched by ${editor}, ${timeAgo(cafe.updatedAt)}.` : ''}
      </p>
      <label className="field">
        <span>Café name</span>
        <input value={name} maxLength={CAFE_LIMITS.name} onChange={(e) => setName(e.target.value)} placeholder="Our Imaginary Café" />
      </label>
      <label className="field">
        <span>Tagline</span>
        <input value={tagline} maxLength={CAFE_LIMITS.tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Vegetarian. Cozy. Prices under negotiation." />
      </label>
      <fieldset className="choice">
        <legend>Colour</legend>
        <div className="choice-row">
          {CAFE_COLORS.map((x) => (
            <button key={x.id} type="button" className={`choice-btn swatch ${color === x.id ? 'on' : ''}`} aria-pressed={color === x.id} onClick={() => setColor(x.id)} title={x.name}>
              <span className="dot" style={{ background: x.bg }} aria-hidden="true" />
              <span className="sr-only">{x.name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="choice">
        <legend>Menu (up to {CAFE_LIMITS.dishes})</legend>
        {dishes.map((d, i) => (
          <div key={i} className="opt-row">
            <input value={d} maxLength={CAFE_LIMITS.dish} onChange={(e) => setDishes(dishes.map((x, j) => (j === i ? e.target.value : x)))} placeholder="A dish" aria-label={`Dish ${i + 1}`} />
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setDishes(dishes.length > 1 ? dishes.filter((_, j) => j !== i) : [''])} aria-label={`Remove dish ${i + 1}`}>
              ✕
            </button>
          </div>
        ))}
        {dishes.length < CAFE_LIMITS.dishes && (
          <button type="button" className="btn btn-small" onClick={() => setDishes([...dishes, ''])}>
            + dish
          </button>
        )}
      </fieldset>
      <button className="btn btn-primary" disabled={busy} onClick={() => void run(() => backend.saveCafe(user.uid, { name: name.trim(), tagline: tagline.trim(), color, dishes: clean }), 'Café board saved.')}>
        Save the café board
      </button>
    </div>
  )
}
