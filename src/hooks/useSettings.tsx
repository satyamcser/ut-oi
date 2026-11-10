import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

// Local-only preferences. Game data never goes in localStorage.
export interface Settings {
  sound: boolean
  motion: 'system' | 'reduce' | 'full'
}

const KEY = 'ut-oi.settings.v1'
const DEFAULTS: Settings = { sound: false, motion: 'system' }

function load(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return { sound: s.sound === true, motion: s.motion === 'reduce' || s.motion === 'full' ? s.motion : 'system' }
  } catch {
    return { ...DEFAULTS }
  }
}

function systemReduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export type Sfx = 'tap' | 'good' | 'bad' | 'win' | 'bell' | 'paper' | 'meow' | 'woof'

const CAPTION: Record<Sfx, string> = {
  tap: '[soft click]',
  good: '[cheerful chime]',
  bad: '[gentle bonk]',
  win: '[little fanfare]',
  bell: '[café bell rings]',
  paper: '[paper rustles]',
  meow: '[sleepy cat noise]',
  woof: '[happy woof]',
}

const TUNES: Record<Sfx, [number, number][]> = {
  tap: [[700, 0.05]],
  good: [[660, 0.07], [990, 0.1]],
  bad: [[260, 0.12], [200, 0.14]],
  win: [[523, 0.09], [659, 0.09], [784, 0.09], [1046, 0.18]],
  bell: [[1568, 0.25]],
  paper: [[420, 0.04], [520, 0.04]],
  meow: [[700, 0.08], [560, 0.14]],
  woof: [[220, 0.08], [180, 0.1]],
}

interface Toast {
  id: number
  text: string
  tone: 'info' | 'good' | 'error'
}

interface SettingsValue {
  settings: Settings
  setSettings: (p: Partial<Settings>) => void
  reduced: boolean
  play: (s: Sfx) => void
  caption: string | null
  toasts: Toast[]
  toast: (text: string, tone?: Toast['tone']) => void
}

const Ctx = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState<Settings>(load)
  const [caption, setCaption] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const audio = useRef<AudioContext | null>(null)
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextId = useRef(1)
  const [sysReduced, setSysReduced] = useState(systemReduced)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* private mode */
    }
  }, [settings])

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      const on = () => setSysReduced(mq.matches)
      mq.addEventListener('change', on)
      return () => mq.removeEventListener('change', on)
    } catch {
      return undefined
    }
  }, [])

  const reduced = settings.motion === 'reduce' || (settings.motion === 'system' && sysReduced)
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full'
  }, [reduced])

  const setSettings = useCallback((p: Partial<Settings>) => setState((s) => ({ ...s, ...p })), [])

  const play = useCallback(
    (s: Sfx) => {
      if (!settings.sound) return
      try {
        audio.current ??= new AudioContext()
        const ctx = audio.current
        let t = ctx.currentTime
        for (const [f, d] of TUNES[s]) {
          const o = ctx.createOscillator()
          const g = ctx.createGain()
          o.type = s === 'bad' || s === 'woof' ? 'triangle' : 'sine'
          o.frequency.value = f
          g.gain.setValueAtTime(0.0001, t)
          g.gain.exponentialRampToValueAtTime(0.1, t + 0.01)
          g.gain.exponentialRampToValueAtTime(0.0001, t + d)
          o.connect(g).connect(ctx.destination)
          o.start(t)
          o.stop(t + d + 0.02)
          t += d * 0.9
        }
        // Every sound has a caption.
        setCaption(CAPTION[s])
        if (capTimer.current) clearTimeout(capTimer.current)
        capTimer.current = setTimeout(() => setCaption(null), 1600)
      } catch {
        /* audio unavailable */
      }
    },
    [settings.sound],
  )

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6500 : 3800)
  }, [])

  const value = useMemo(() => ({ settings, setSettings, reduced, play, caption, toasts, toast }), [settings, setSettings, reduced, play, caption, toasts, toast])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings(): SettingsValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSettings outside provider')
  return v
}
