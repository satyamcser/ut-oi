import { useEffect, useRef, useState } from 'react'
import { MISC } from '../../content/dialogue'
import { useSettings } from '../../hooks/useSettings'
import { useWorld } from '../../hooks/useWorld'
import {
  DISTRACTION_LABEL,
  emptyTally,
  ICON_LABEL,
  OPENING_FACT,
  PRESENTATION_SECONDS,
  presentationScore,
  SLIDE_SECONDS,
  SLIDES,
  slideOptions,
  type DistractionKind,
  type Icon,
  type PresentationTally,
} from '../../utils/games'
import { Stamp } from '../ui'
import { GameFrame, SaveLine, useScoreSave } from './GameFrame'

const ICON_GLYPH: Record<Icon, string> = { eye: '👁', brain: '🧠', arm: '🦾', battery: '🔋', chart: '📈', shield: '🛡' }
const DISTRACTION_GLYPH: Record<DistractionKind, string> = { cat: '🐈', plane: '✈️', phone: '📳', spill: '☕', cable: '🔌' }
const KINDS: DistractionKind[] = ['cat', 'plane', 'phone', 'spill', 'cable']
const OPENING = 6

interface Popup {
  id: number
  kind: 'distraction' | 'charm'
  d?: DistractionKind
  x: number
  y: number
  until: number
}

function Robot({ mood }: { mood: 'calm' | 'nervous' | 'proud' }) {
  return (
    <svg viewBox="0 0 64 64" width={92} height={92} className={`robot robot-${mood}`} aria-label={`The presenter robot looks ${mood}`} role="img">
      <rect x="18" y="8" width="28" height="22" rx="6" fill="#B7A9CC" stroke="#2B2230" strokeWidth="2.5" />
      <rect x="22" y="12" width="20" height="13" rx="4" fill="#2B2230" />
      {mood === 'nervous' ? (
        <g stroke="#EAA84C" strokeWidth="2">
          <path d="M25 17l4 3M29 17l-4 3M35 17l4 3M39 17l-4 3" />
        </g>
      ) : (
        <g fill="#EAA84C">
          <rect x="26" y="15" width="3" height={mood === 'proud' ? 2 : 5} rx="1" />
          <rect x="35" y="15" width="3" height={mood === 'proud' ? 2 : 5} rx="1" />
        </g>
      )}
      <path d="M32 8V3" stroke="#2B2230" strokeWidth="2.5" />
      <circle cx="32" cy="3" r="2.5" fill="#DA887C" />
      <rect x="14" y="34" width="36" height="24" rx="4" fill="#5D4235" stroke="#2B2230" strokeWidth="2.5" />
      <rect x="22" y="38" width="20" height="6" rx="2" fill="#F9F1DF" />
      {mood === 'nervous' && <path d="M50 12q3 3 0 6q-3-3 0-6z" fill="#9CC7D6" />}
    </svg>
  )
}

export function PresentationRescue({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number) => void }) {
  const { play, reduced } = useSettings()
  const { role, unlock } = useWorld()
  const { state: saveState, save, retry, demo } = useScoreSave('presentation')
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [elapsed, setElapsed] = useState(0)
  const [tally, setTally] = useState<PresentationTally>(emptyTally)
  const [answered, setAnswered] = useState<Record<number, Icon>>({})
  const [options, setOptions] = useState<Icon[][]>(() => SLIDES.map((s) => slideOptions(s.icon)))
  const [popups, setPopups] = useState<Popup[]>([])
  const [beamCat, setBeamCat] = useState(false)
  const [msg, setMsg] = useState('')
  const nextId = useRef(1)
  const finished = useRef(false)

  const slideIdx = elapsed < OPENING ? -1 : Math.min(SLIDES.length - 1, Math.floor((elapsed - OPENING) / SLIDE_SECONDS))

  useEffect(() => {
    if (phase !== 'play') return
    const start = performance.now()
    let nextDistraction = 3
    let nextCharm = 5
    let lastSlide = -1
    const id = setInterval(() => {
      const t = (performance.now() - start) / 1000
      setElapsed(t)
      const s = t < OPENING ? -1 : Math.min(SLIDES.length - 1, Math.floor((t - OPENING) / SLIDE_SECONDS))
      if (s !== lastSlide && s >= 0) {
        lastSlide = s
        setTally((x) => ({ ...x, slidesShown: Math.max(x.slidesShown, s + 1) }))
      }
      // expire popups (missed distractions shake the presenter's confidence)
      setPopups((list) => list.filter((p) => p.until > t))
      if (t >= nextDistraction) {
        nextDistraction = t + 3.2 + Math.random() * 1.6
        const d = KINDS[Math.floor(Math.random() * KINDS.length)]
        const pop: Popup = { id: nextId.current++, kind: 'distraction', d, x: 8 + Math.random() * 76, y: 38 + Math.random() * 30, until: t + 3.6 }
        setTally((x) => ({ ...x, distractions: x.distractions + 1 }))
        setPopups((l) => [...l, pop])
      }
      if (t >= nextCharm) {
        nextCharm = t + 5 + Math.random() * 2
        const pop: Popup = { id: nextId.current++, kind: 'charm', x: 10 + Math.random() * 74, y: 84, until: t + 3.2 }
        setTally((x) => ({ ...x, charmPrompts: x.charmPrompts + 1 }))
        setPopups((l) => [...l, pop])
      }
      if (t >= PRESENTATION_SECONDS) {
        clearInterval(id)
        setPhase('done')
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase])

  const result = presentationScore(tally)
  useEffect(() => {
    if (phase !== 'done' || finished.current) return
    finished.current = true
    play('win')
    void save(result.total).then((r) => r && onFinished(result.total))
  }, [phase, result.total, save, onFinished, play])

  const answer = (icon: Icon) => {
    if (slideIdx < 0 || answered[slideIdx]) return
    const ok = icon === SLIDES[slideIdx].icon
    setAnswered((a) => ({ ...a, [slideIdx]: icon }))
    if (ok) setTally((x) => ({ ...x, slidesCorrect: x.slidesCorrect + 1 }))
    play(ok ? 'good' : 'bad')
    setMsg(ok ? 'Clear as a sunny morning. Clarity +' : 'The audience tilts its head. Next slide will go better.')
  }

  const clear = (p: Popup) => {
    setPopups((l) => l.filter((x) => x.id !== p.id))
    if (p.kind === 'distraction') {
      setTally((x) => ({ ...x, handled: x.handled + 1 }))
      play('tap')
      setMsg(p.d === 'cat' ? 'The examiner cat was escorted back to the front row. Confidence +' : 'Distraction handled. Confidence +')
    } else {
      setTally((x) => ({ ...x, charmed: x.charmed + 1 }))
      play('good')
      setMsg('You waved back. The audience is charmed. Charm +')
    }
  }

  const missed = tally.distractions - tally.handled - popups.filter((p) => p.kind === 'distraction').length
  const mood: 'calm' | 'nervous' | 'proud' = missed > 2 ? 'nervous' : tally.handled > 3 ? 'proud' : 'calm'
  const rules =
    role === 'ut'
      ? 'You are the guest examiner rescuing this presentation: tap the icon that matches each slide, clear distractions, and wave back at the audience.'
      : 'You are the nervous presenter: tap the icon that matches each slide, clear distractions, and wave back at the audience.'

  if (phase === 'intro')
    return (
      <GameFrame game="presentation" onExit={onExit} rules={rules}>
        <div className="pres-intro">
          <div className="projector-row">
            <button
              className="projector"
              onClick={() => {
                setBeamCat(true)
                play('meow')
                void unlock({ egg: 'projector_cat' })
              }}
              aria-label="Check the projector"
            >
              📽
            </button>
            <div className={`beam ${beamCat ? 'with-cat' : ''}`} aria-live="polite">
              {beamCat ? (
                <>
                  <span className="beam-cat" aria-hidden="true">
                    🐈
                  </span>
                  <span>{MISC.projector}</span>
                </>
              ) : (
                <span>Psst — check the projector before you start.</span>
              )}
            </div>
          </div>
          <Robot mood="calm" />
          <button className="btn btn-primary btn-big" onClick={() => setPhase('play')} data-autofocus>
            Start the talk
          </button>
        </div>
      </GameFrame>
    )

  if (phase === 'done')
    return (
      <GameFrame game="presentation" onExit={onExit} rules={rules}>
        <div className="result-card certificate">
          <p className="cert-title">Unofficial Review Certificate</p>
          <Stamp text={`${result.total}/100`} tone="evening" />
          <ul className="breakdown">
            <li>Clarity: {result.clarity}/34</li>
            <li>Confidence: {result.confidence}/33</li>
            <li>Charm: {result.charm}/33</li>
          </ul>
          <p className="npc">{MISC.certificate}</p>
          <p className="fine">A fictional performance review for a fictional robot. No real grades were harmed.</p>
          <SaveLine state={saveState} onRetry={() => void retry()} demo={demo} />
          <div className="row">
            <button
              className="btn btn-primary"
              onClick={() => {
                finished.current = false
                setTally(emptyTally())
                setAnswered({})
                setOptions(SLIDES.map((s) => slideOptions(s.icon)))
                setPopups([])
                setElapsed(0)
                setMsg('')
                setPhase('play')
              }}
            >
              Present again
            </button>
            <button className="btn" onClick={onExit}>
              Back to the street
            </button>
          </div>
        </div>
      </GameFrame>
    )

  return (
    <GameFrame game="presentation" onExit={onExit} rules={rules}>
      <div className="stage">
        <div className="timer" role="meter" aria-label="Time left" aria-valuemin={0} aria-valuemax={60} aria-valuenow={Math.round(PRESENTATION_SECONDS - elapsed)}>
          <div style={{ width: `${Math.max(0, 1 - elapsed / PRESENTATION_SECONDS) * 100}%` }} />
        </div>
        <div className="screen" aria-live="polite">
          <p className="slide-no">{slideIdx < 0 ? 'Opening' : `Slide ${slideIdx + 1}/${SLIDES.length}`}</p>
          <p className="fact">{slideIdx < 0 ? OPENING_FACT : SLIDES[slideIdx].fact}</p>
          {slideIdx >= 0 && (
            <div className="icon-row" role="group" aria-label="Which icon matches this slide?">
              {options[slideIdx].map((icon) => {
                const picked = answered[slideIdx]
                const cls = picked ? (icon === SLIDES[slideIdx].icon ? 'right' : picked === icon ? 'wrong' : '') : ''
                return (
                  <button key={icon} className={`icon-btn-big ${cls}`} onClick={() => answer(icon)} disabled={Boolean(picked)}>
                    <span aria-hidden="true">{ICON_GLYPH[icon]}</span>
                    <small>{ICON_LABEL[icon]}</small>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className={`podium ${reduced ? '' : 'sway'}`}>
          <Robot mood={mood} />
        </div>
        {popups.map((p) => (
          <button
            key={p.id}
            className={`popup popup-${p.kind}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => clear(p)}
            aria-label={p.kind === 'charm' ? 'An audience member waves — wave back' : `${DISTRACTION_LABEL[p.d!]} — tap to clear it`}
          >
            {p.kind === 'charm' ? '👋' : DISTRACTION_GLYPH[p.d!]}
          </button>
        ))}
        <div className="audience" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className={i === 3 ? 'seat examiner' : 'seat'}>
              {i === 3 ? '🐈' : ''}
            </span>
          ))}
        </div>
        <p className="feedback" aria-live="polite">
          {msg}
        </p>
      </div>
    </GameFrame>
  )
}
