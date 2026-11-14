import { useEffect, useRef, useState } from 'react'
import { MISC } from '../../content/dialogue'
import { useSettings } from '../../hooks/useSettings'
import { useWorld } from '../../hooks/useWorld'
import {
  addIngredient,
  currentRecipe,
  DECOYS,
  INGREDIENT_LABEL,
  MATCHA_SECONDS,
  matchaScore,
  neededIngredient,
  newMatcha,
  RECIPES,
  type Ingredient,
  type MatchaState,
} from '../../utils/games'
import { Stamp } from '../ui'
import { GameFrame, SaveLine, useScoreSave } from './GameFrame'

const ALL: Ingredient[] = ['cup', 'glass', 'mug', 'ice', 'milk', 'matcha', 'coffee', 'condensed', 'tea', 'hotwater', ...DECOYS]

export function IngredientIcon({ kind }: { kind: Ingredient }) {
  const ink = '#2B2230'
  const s = { stroke: ink, strokeWidth: 2, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 32 32" width={34} height={34} aria-hidden="true">
      {kind === 'cup' && <path d="M8 6h16l-2 22H10z" fill="#FFFFFF" {...s} />}
      {kind === 'glass' && <path d="M9 7h14l-2 20H11z" fill="#DCEFF5" {...s} />}
      {kind === 'mug' && (
        <g>
          <rect x="7" y="9" width="15" height="16" rx="3" fill="#DA887C" {...s} />
          <path d="M22 13h3a3 3 0 0 1 0 7h-3" fill="none" {...s} />
        </g>
      )}
      {kind === 'ice' && (
        <g>
          <rect x="5" y="12" width="11" height="11" rx="2" fill="#E9F7FB" {...s} />
          <rect x="15" y="7" width="11" height="11" rx="2" fill="#E9F7FB" {...s} />
        </g>
      )}
      {kind === 'milk' && (
        <g>
          <path d="M10 10l3-5h6l3 5v17H10z" fill="#FFFFFF" {...s} />
          <rect x="10" y="15" width="12" height="6" fill="#B7A9CC" />
        </g>
      )}
      {kind === 'matcha' && (
        <g>
          <ellipse cx="16" cy="20" rx="11" ry="6" fill="#779A7A" {...s} />
          <path d="M9 18q7-5 14 0" fill="none" stroke="#A9C99A" strokeWidth="2" />
        </g>
      )}
      {kind === 'coffee' && (
        <g>
          <rect x="9" y="6" width="14" height="10" rx="2" fill="#B9B3BE" {...s} />
          <path d="M13 16h6v5h-6z" fill="#5D4235" {...s} />
          <path d="M16 21v6" stroke="#5D4235" strokeWidth="3" />
        </g>
      )}
      {kind === 'condensed' && (
        <g>
          <rect x="8" y="8" width="16" height="18" rx="2" fill="#F9F1DF" {...s} />
          <rect x="8" y="13" width="16" height="7" fill="#EAA84C" />
        </g>
      )}
      {kind === 'tea' && (
        <g>
          <path d="M7 20q9-14 18-8q-6 12-18 8z" fill="#779A7A" {...s} />
          <path d="M9 19q7-3 13-6" fill="none" stroke="#2B2230" strokeWidth="1.5" />
        </g>
      )}
      {kind === 'hotwater' && (
        <g>
          <path d="M8 14h14v10a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" fill="#9CC7D6" {...s} />
          <path d="M12 10q-2-3 0-5M17 10q-2-3 0-5" fill="none" stroke="#2B2230" strokeWidth="1.5" />
        </g>
      )}
      {kind === 'cat' && (
        <g>
          <ellipse cx="16" cy="20" rx="11" ry="7" fill="#FFFFFF" {...s} />
          <path d="M8 15l1-5 4 3M24 15l-1-5-4 3" fill="#FFFFFF" {...s} />
          <path d="M12 19h3M18 19h3" stroke="#2B2230" strokeWidth="1.5" />
        </g>
      )}
      {kind === 'invoice' && (
        <g>
          <path d="M9 5h14v22l-3-2-2 2-2-2-2 2-2-2-3 2z" fill="#FFFFFF" {...s} />
          <path d="M12 11h8M12 15h8M12 19h5" stroke="#5D4235" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  )
}

interface Falling {
  id: number
  kind: Ingredient
  lane: number
  y: number // 0..100 (% of the tray height)
  speed: number
}

export function MatchaMission({ onExit, onFinished }: { onExit: () => void; onFinished: (score: number, firstTime: boolean) => void }) {
  const { play, reduced } = useSettings()
  const { scores, user } = useWorld()
  const { state: saveState, save, retry, demo } = useScoreSave('matcha')
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro')
  const [oat, setOat] = useState(false)
  const [m, setM] = useState<MatchaState>(newMatcha)
  const [items, setItems] = useState<Falling[]>([])
  const itemsRef = useRef<Falling[]>([])
  const [left, setLeft] = useState(MATCHA_SECONDS)
  const [msg, setMsg] = useState('Order up! Tap the falling ingredients in the right order.')
  const mRef = useRef(m)
  mRef.current = m
  const nextId = useRef(1)
  const firstTime = useRef(!scores.some((s) => s.uid === user?.uid && s.gameId === 'matcha'))
  const finished = useRef(false)

  const label = (k: Ingredient) => (k === 'milk' && oat ? 'Oat milk' : INGREDIENT_LABEL[k])

  useEffect(() => {
    if (phase !== 'play') return
    let raf = 0
    let last = performance.now()
    let spawnIn = 0
    const start = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const remaining = Math.max(0, MATCHA_SECONDS - (t - start) / 1000)
      setLeft(remaining)
      spawnIn -= dt
      // The loop owns the falling items (no side effects inside state updaters).
      let next = itemsRef.current.map((it) => ({ ...it, y: it.y + it.speed * dt })).filter((it) => it.y < 100)
      if (spawnIn <= 0) {
        spawnIn = 0.8
        const need = neededIngredient(mRef.current)
        const kind = need && Math.random() < 0.42 ? need : ALL[Math.floor(Math.random() * ALL.length)]
        const lanesUsed = new Set(next.filter((n) => n.y < 22).map((n) => n.lane))
        const free = [0, 1, 2, 3].filter((l) => !lanesUsed.has(l))
        if (free.length) next = [...next, { id: nextId.current++, kind, lane: free[Math.floor(Math.random() * free.length)], y: -8, speed: reduced ? 15 : 19 + Math.random() * 7 }]
      }
      itemsRef.current = next
      setItems(next)
      if (remaining <= 0 || mRef.current.done) {
        setPhase('done')
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, reduced])

  const result = matchaScore(m, left)
  useEffect(() => {
    if (phase !== 'done' || finished.current) return
    finished.current = true
    play(result.total >= 60 ? 'win' : 'bad')
    void save(result.total).then((r) => {
      if (r) onFinished(result.total, firstTime.current)
    })
  }, [phase, result.total, save, onFinished, play])

  const tap = (it: Falling) => {
    itemsRef.current = itemsRef.current.filter((x) => x.id !== it.id)
    setItems(itemsRef.current)
    const next = addIngredient(mRef.current, it.kind)
    mRef.current = next
    setM(next)
    if (next.last?.ok) {
      play('good')
      setMsg(next.done ? 'All three orders served!' : next.step === 0 ? 'Order complete! Next customer…' : `${label(it.kind)} ✓`)
    } else {
      play('bad')
      setMsg(it.kind === 'cat' ? MISC.ohNoCounter : it.kind === 'invoice' ? 'That’s the lesson invoice. It is not dissolvable.' : `Not yet — this order needs ${label(neededIngredient(mRef.current)!)}.`)
    }
  }

  const recipe = currentRecipe(m)
  const rules = 'Tap the falling ingredients in recipe order to serve three drinks in 60 seconds. Wrong taps cost style points, never the game.'

  if (phase === 'intro')
    return (
      <GameFrame game="matcha" onExit={onExit} rules={rules}>
        <div className="matcha-intro">
          <div className="recipe-cards">
            {RECIPES.map((r) => (
              <div key={r.id} className="recipe-card">
                <strong>{r.name}</strong>
                <em lang="vi">{r.vi}</em>
                <ol>
                  {r.steps.map((s) => (
                    <li key={s}>{label(s)}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={oat} onChange={(e) => setOat(e.target.checked)} /> Use oat milk (non-dairy)
          </label>
          <button className="btn btn-primary btn-big" onClick={() => setPhase('play')} data-autofocus>
            Open the café
          </button>
        </div>
      </GameFrame>
    )

  if (phase === 'done')
    return (
      <GameFrame game="matcha" onExit={onExit} rules={rules}>
        <div className="result-card">
          <Stamp text={`${result.total}/100`} tone={result.total >= 60 ? 'jasmine' : 'coral'} />
          <h3>{m.done ? 'All drinks served!' : 'Closing time!'}</h3>
          <ul className="breakdown">
            <li>Technique: {result.technique}/60</li>
            <li>Timing: {result.timing}/20</li>
            <li>Style: {result.style}/20</li>
          </ul>
          <p className="npc">{result.total >= 70 ? 'Professor Út has inspected this coffee. It passes. Barely. Suspiciously.' : MISC.rejected}</p>
          {firstTime.current && (
            <div className="voucher">
              <strong>Voucher</strong>
              <span>{MISC.voucher}</span>
            </div>
          )}
          <SaveLine state={saveState} onRetry={() => void retry()} demo={demo} />
          <div className="row">
            <button
              className="btn btn-primary"
              onClick={() => {
                finished.current = false
                firstTime.current = false
                setM(newMatcha())
                itemsRef.current = []
                setItems([])
                setLeft(MATCHA_SECONDS)
                setMsg('Order up!')
                setPhase('play')
              }}
            >
              Play again
            </button>
            <button className="btn" onClick={onExit}>
              Back to the street
            </button>
          </div>
        </div>
      </GameFrame>
    )

  return (
    <GameFrame game="matcha" onExit={onExit} rules={rules}>
      <div className="matcha">
        <div className="ticket" aria-live="polite">
          <span className="ticket-label">Order {m.current + 1}/3</span>
          <strong>{recipe?.name}</strong>
          <em lang="vi">{recipe?.vi}</em>
          <ol className="steps">
            {recipe?.steps.map((s, i) => (
              <li key={s} className={i < m.step ? 'done' : i === m.step ? 'now' : ''}>
                {label(s)}
              </li>
            ))}
          </ol>
        </div>
        <div className="timer" role="meter" aria-label="Time left" aria-valuemin={0} aria-valuemax={60} aria-valuenow={Math.round(left)}>
          <div style={{ width: `${(left / MATCHA_SECONDS) * 100}%` }} />
        </div>
        <div className="tray" aria-label="Falling ingredients">
          {items.map((it) => (
            <button
              key={it.id}
              className={`falling ${it.kind}`}
              style={{ left: `${it.lane * 25 + 2}%`, top: `${it.y}%` }}
              onPointerDown={() => tap(it)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && tap(it)}
              aria-label={label(it.kind)}
            >
              <IngredientIcon kind={it.kind} />
              <span>{label(it.kind)}</span>
            </button>
          ))}
          <div className="counter-top" aria-hidden="true" />
        </div>
        <p className="feedback" aria-live="polite">
          {msg}
        </p>
      </div>
    </GameFrame>
  )
}
