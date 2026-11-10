import { useEffect, useRef, type ReactNode } from 'react'
import type { Role } from '../content/ids'
import { drawAvatar } from '../game/art/pixels'
import { useSettings } from '../hooks/useSettings'
import type { AvatarConfig } from '../models/types'

/** Accessible overlay panel: focus moves in, Escape closes, focus returns. */
export function Sheet({
  title,
  onClose,
  children,
  wide,
  tone = 'paper',
  closeLabel = 'Close',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  tone?: 'paper' | 'night'
  closeLabel?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button, input, textarea, [href]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div ref={ref} className={`sheet sheet-${tone} ${wide ? 'sheet-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function Toasts() {
  const { toasts, caption } = useSettings()
  return (
    <>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
      {caption && (
        <div className="caption" aria-live="polite">
          {caption}
        </div>
      )}
    </>
  )
}

export function Stamp({ text, tone = 'coral' }: { text: string; tone?: 'coral' | 'jasmine' | 'amber' | 'evening' }) {
  return (
    <span className={`stamp stamp-${tone}`} role="img" aria-label={`Stamp: ${text}`}>
      {text}
    </span>
  )
}

/** Renders the pixel avatar crisply at any size. */
export function AvatarPreview({ cfg, role, scale = 5, dir = 0, label }: { cfg: AvatarConfig; role: Role; scale?: number; dir?: 0 | 1 | 2; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, 16, 24)
    drawAvatar(ctx, 0, 0, dir, 0, cfg, role)
  }, [cfg, role, dir])
  return (
    <canvas
      ref={ref}
      width={16}
      height={24}
      className="pixel"
      style={{ width: 16 * scale, height: 24 * scale }}
      role="img"
      aria-label={label ?? `${role === 'ut' ? 'Út' : 'Satyam'}’s avatar`}
    />
  )
}

export function timeAgo(ms: number | null): string {
  if (!ms) return 'just now'
  const s = Math.round((Date.now() - ms) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="spinner" role="status">
      <span />
      <span />
      <span />
      <em className="sr-only">{label}</em>
    </div>
  )
}
