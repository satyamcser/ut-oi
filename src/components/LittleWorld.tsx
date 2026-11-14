import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { Role } from '../content/ids'
import {
  isExpired,
  LITTLE_WORLD_INTRO,
  MOMENT_LIMITS,
  momentDef,
  MOMENTS,
  SCENES,
  SIMBA_EVENTS,
  TEASE_LINES,
  type MomentType,
  type SceneId,
} from '../content/moments'
import { friendlyError } from '../data/backend'
import { drawAvatar, makeSimbaSheet } from '../game/art/pixels'
import { useSettings } from '../hooks/useSettings'
import { nameOf, useWorld } from '../hooks/useWorld'
import type { AvatarConfig, Moment } from '../models/types'
import { DEFAULT_AVATAR } from './AvatarEditor'
import { CafeBoardPanel, EXTRAS, MiniStory, PhotoCorner, QuestionJar, type Extra } from './Together'
import { Sheet, timeAgo } from './ui'
import '../styles/littleworld.css'

// ------------------------------------------------------------------ "seen" (per device, per viewer)

const seenKey = (uid: string) => `ut-oi.moments-seen.${uid}`
const SEEN_EVENT = 'ut-oi:moments-seen'
function readSeen(uid: string): string {
  try {
    return localStorage.getItem(seenKey(uid)) ?? ''
  } catch {
    return ''
  }
}
function markSeen(uid: string, ids: string[]) {
  try {
    const cur = new Set(readSeen(uid).split(',').filter(Boolean))
    ids.forEach((i) => cur.add(i))
    localStorage.setItem(seenKey(uid), [...cur].slice(-300).join(','))
  } catch {
    /* private mode: news just stays visible */
  }
  window.dispatchEvent(new Event(SEEN_EVENT))
}
function useSeen(uid: string | undefined): Set<string> {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener(SEEN_EVENT, cb)
      window.addEventListener('storage', cb)
      return () => {
        window.removeEventListener(SEEN_EVENT, cb)
        window.removeEventListener('storage', cb)
      }
    },
    () => (uid ? readSeen(uid) : ''),
  )
  return useMemo(() => new Set(raw.split(',').filter(Boolean)), [raw])
}

/** Invitations waiting for me, and answers to my invitations I haven't looked at yet. */
export function useMomentNews() {
  const { moments, user } = useWorld()
  const seen = useSeen(user?.uid)
  return useMemo(() => {
    const uid = user?.uid
    const incoming = moments.filter((m) => m.toUid === uid && m.status === 'pending' && !isExpired(m.createdAt))
    const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    const answers = moments.filter((m) => m.fromUid === uid && m.status !== 'pending' && !seen.has(m.id) && (m.updatedAt ?? Date.now()) > recentCutoff)
    return { incoming, answers, count: incoming.length + answers.length }
  }, [moments, user, seen])
}

// ------------------------------------------------------------------ art

function Sprite({ cfg, role, dir, walking, reduced }: { cfg: AvatarConfig; role: Role; dir: 0 | 1 | 2; walking: boolean; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    if (!walking || reduced) {
      setFrame(0)
      return
    }
    const t = setInterval(() => setFrame((f) => (f === 1 ? 2 : 1)), 230)
    return () => clearInterval(t)
  }, [walking, reduced])
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 16, 24)
    drawAvatar(ctx, 0, 0, dir, frame, cfg, role)
  }, [cfg, role, dir, frame])
  return <canvas ref={ref} width={16} height={24} className="pixel lw-sprite" aria-hidden="true" />
}

function SimbaSprite() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (ctx) ctx.drawImage(makeSimbaSheet(), 18, 0, 18, 14, 0, 0, 18, 14)
  }, [])
  return <canvas ref={ref} width={18} height={14} className="pixel lw-simba-sprite" aria-hidden="true" />
}

function Backdrop({ scene }: { scene: SceneId }) {
  const uid = useId().replace(/:/g, '')
  const g = (n: string) => `${uid}-${n}`
  const lamps = [0, 80, 160, 240, 320, 400, 480, 560]
  if (scene === 'riverside')
    return (
      <svg className="lw-bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3B4A7A" />
            <stop offset="0.45" stopColor="#B7A9CC" />
            <stop offset="0.78" stopColor="#F2B8A0" />
            <stop offset="1" stopColor="#F6D49A" />
          </linearGradient>
        </defs>
        <rect width="320" height="112" fill={`url(#${g('sky')})`} />
        <rect className="lw-dusk" width="320" height="112" fill="#E8806A" opacity="0" />
        <circle className="lw-sun" cx="236" cy="96" r="17" fill="#FCE3A8" />
        <path d="M0 102 L18 98 L30 100 L52 95 L70 99 L96 97 L120 100 L150 96 L180 99 L210 97 L240 101 L270 96 L300 99 L320 97 V112 H0Z" fill="#5B5577" />
        {[14, 40, 66, 150, 172, 274, 296].map((x, i) => (
          <rect key={x} x={x} y={88 - (i % 3) * 5} width="12" height={20 + (i % 3) * 5} fill="#4A4563" />
        ))}
        <rect y="108" width="320" height="28" fill="#6F86B5" />
        {[20, 70, 130, 190, 250, 290].map((x, i) => (
          <rect key={x} className="lw-shimmer" x={x} y={114 + (i % 3) * 6} width={18 + (i % 2) * 10} height="2" fill="#F6D49A" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
        <rect y="134" width="320" height="46" fill="#8DA67E" />
        <rect y="148" width="320" height="20" fill="#D8C3A0" />
        <g className="lw-scroll">
          {lamps.map((x) => (
            <g key={x} transform={`translate(${x} 0)`}>
              <rect x="10" y="104" width="3" height="44" fill="#2B2230" />
              <rect x="6" y="100" width="11" height="6" rx="2" fill="#EAA84C" />
              <circle cx="46" cy="128" r="12" fill="#5E7D5F" />
              <rect x="44" y="132" width="4" height="16" fill="#5D4235" />
            </g>
          ))}
        </g>
        <rect x="128" y="140" width="64" height="6" rx="2" fill="#7B5A47" />
        <rect x="134" y="146" width="4" height="8" fill="#5D4235" />
        <rect x="182" y="146" width="4" height="8" fill="#5D4235" />
      </svg>
    )
  if (scene === 'cafe')
    return (
      <svg className="lw-bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="320" height="140" fill="#F3E3C7" />
        <rect y="112" width="320" height="28" fill="#C98F6B" />
        <rect x="118" y="18" width="84" height="62" fill="#2E3A63" stroke="#5D4235" strokeWidth="4" />
        <circle cx="182" cy="36" r="9" fill="#F9F1DF" />
        <circle cx="186" cy="33" r="8" fill="#2E3A63" />
        {[[134, 30], [150, 52], [170, 62], [140, 66], [192, 58]].map(([x, y]) => (
          <rect key={`${x}${y}`} className="lw-twinkle" x={x} y={y} width="2" height="2" fill="#F9F1DF" style={{ animationDelay: `${(x % 7) * 0.3}s` }} />
        ))}
        <line x1="160" y1="18" x2="160" y2="80" stroke="#5D4235" strokeWidth="3" />
        <path d="M0 8 Q80 26 160 10 T320 10" fill="none" stroke="#2B2230" strokeWidth="1.5" />
        {[16, 46, 78, 110, 210, 242, 274, 304].map((x, i) => (
          <circle key={x} className="lw-twinkle" cx={x} cy={i < 4 ? 14 + (i % 2) * 4 : 12 + (i % 2) * 3} r="3.5" fill={i % 2 ? '#DA887C' : '#EAA84C'} style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
        <rect x="18" y="30" width="78" height="54" rx="3" fill="#2F3B33" stroke="#7B5A47" strokeWidth="4" />
        <text x="57" y="46" textAnchor="middle" fontSize="9" fill="#F9F1DF" fontFamily="monospace">
          MENU · chay
        </text>
        <rect x="28" y="54" width="44" height="2" fill="#F9F1DF" opacity="0.6" />
        <rect x="28" y="62" width="54" height="2" fill="#F9F1DF" opacity="0.6" />
        <rect x="28" y="70" width="36" height="2" fill="#F9F1DF" opacity="0.6" />
        <rect x="228" y="40" width="70" height="8" fill="#7B5A47" />
        <circle cx="240" cy="34" r="6" fill="#779A7A" />
        <rect x="236" y="34" width="8" height="6" fill="#DA887C" />
        <circle cx="282" cy="32" r="8" fill="#779A7A" />
        <rect x="277" y="32" width="10" height="8" fill="#EAA84C" />
        <rect y="140" width="320" height="40" fill="#A06F52" />
        {[0, 40, 80, 120, 160, 200, 240, 280].map((x) => (
          <rect key={x} x={x} y="140" width="1.5" height="40" fill="#8A5E44" />
        ))}
        <rect x="132" y="116" width="56" height="6" rx="2" fill="#7B5A47" />
        <rect x="157" y="122" width="6" height="30" fill="#5D4235" />
        <path d="M144 106h9l-1 10h-7z" fill="#F9F1DF" stroke="#2B2230" strokeWidth="1" />
        <path d="M167 106h9l-1 10h-7z" fill="#779A7A" stroke="#2B2230" strokeWidth="1" />
        <path className="lw-steam" d="M148 103q-2-4 1-8M171 103q-2-4 1-8" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
        <rect x="76" y="140" width="30" height="7" rx="2" fill="#D9534F" />
        <rect x="79" y="147" width="4" height="16" fill="#D9534F" />
        <rect x="99" y="147" width="4" height="16" fill="#D9534F" />
        <rect x="214" y="140" width="30" height="7" rx="2" fill="#D9534F" />
        <rect x="217" y="147" width="4" height="16" fill="#D9534F" />
        <rect x="237" y="147" width="4" height="16" fill="#D9534F" />
      </svg>
    )
  if (scene === 'bookshop')
    return (
      <svg className="lw-bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="320" height="180" fill="#4A3A35" />
        {[0, 1, 2, 3].map((row) => (
          <g key={row}>
            <rect x="0" y={36 + row * 30} width="190" height="4" fill="#2E2220" />
            {Array.from({ length: 22 }, (_, i) => {
              const h = 14 + ((i * 7 + row * 3) % 9)
              return <rect key={i} x={4 + i * 8.4} y={36 + row * 30 - h} width="7" height={h} fill={['#DA887C', '#779A7A', '#EAA84C', '#B7A9CC', '#9C6B54', '#F9F1DF', '#5E7DA6'][(i + row * 2) % 7]} opacity="0.9" />
            })}
          </g>
        ))}
        <rect x="204" y="14" width="104" height="96" fill="#3A4870" stroke="#2E2220" strokeWidth="5" />
        <line x1="256" y1="14" x2="256" y2="110" stroke="#2E2220" strokeWidth="3" />
        <line x1="204" y1="62" x2="308" y2="62" stroke="#2E2220" strokeWidth="3" />
        <g className="lw-rain">
          {Array.from({ length: 24 }, (_, i) => (
            <rect key={i} x={208 + ((i * 37) % 98)} y={((i * 53) % 120) - 30} width="1" height="8" fill="#B9C7E6" opacity="0.7" />
          ))}
        </g>
        <rect x="200" y="108" width="112" height="8" fill="#7B5A47" />
        <circle className="lw-glow-soft" cx="176" cy="96" r="40" fill="#FCE3A8" opacity="0.16" />
        <rect x="170" y="70" width="12" height="9" fill="#EAA84C" />
        <rect x="175" y="79" width="2" height="34" fill="#2B2230" />
        <rect y="140" width="320" height="40" fill="#6B4A3A" />
        <rect x="70" y="148" width="180" height="22" rx="4" fill="#A0535A" opacity="0.8" />
        <rect x="64" y="122" width="40" height="22" rx="5" fill="#779A7A" />
        <rect x="216" y="122" width="40" height="22" rx="5" fill="#B7A9CC" />
        <rect x="146" y="124" width="28" height="5" fill="#7B5A47" />
        <rect x="150" y="117" width="14" height="7" fill="#F9F1DF" />
        <path className="lw-steam" d="M155 114q-2-4 1-8" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
      </svg>
    )
  if (scene === 'airport')
    return (
      <svg className="lw-bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={g('day')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7FA6D6" />
            <stop offset="0.7" stopColor="#F2C6A8" />
            <stop offset="1" stopColor="#F6D49A" />
          </linearGradient>
        </defs>
        <rect width="320" height="120" fill={`url(#${g('day')})`} />
        <g className="lw-plane-fly">
          <path d="M0 0 l22 4 l8 -6 l3 1 l-5 7 l10 2 l3 -3 l2 1 l-2 4 l-41 -2 z" fill="#FFFAF0" stroke="#2B2230" strokeWidth="1" />
        </g>
        <ellipse cx="60" cy="40" rx="22" ry="6" fill="#FFFFFF" opacity="0.7" />
        <ellipse cx="250" cy="56" rx="28" ry="7" fill="#FFFFFF" opacity="0.6" />
        <rect y="96" width="320" height="24" fill="#8A93A6" />
        <rect y="106" width="320" height="2" fill="#F9F1DF" opacity="0.7" />
        {[0, 64, 128, 192, 256].map((x) => (
          <rect key={x} x={x} y="0" width="4" height="120" fill="#5B6478" />
        ))}
        <rect y="118" width="320" height="6" fill="#5B6478" />
        <rect x="10" y="8" width="96" height="30" rx="3" fill="#232A3E" />
        <text x="16" y="20" fontSize="7" fill="#EAA84C" fontFamily="monospace">
          HAN ✈ ICN · ON TIME
        </text>
        <text x="16" y="31" fontSize="7" fill="#9CD9A0" fontFamily="monospace">
          SAME SKY · ALWAYS
        </text>
        <rect y="124" width="320" height="56" fill="#D9D2C6" />
        {[0, 40, 80, 120, 160, 200, 240, 280].map((x) => (
          <rect key={x} x={x} y="124" width="1.5" height="56" fill="#C4BBAE" />
        ))}
        {[110, 134, 158, 182].map((x) => (
          <g key={x}>
            <rect x={x} y="130" width="20" height="12" rx="2" fill="#5E7DA6" />
            <rect x={x + 8} y="142" width="4" height="10" fill="#3B4A68" />
          </g>
        ))}
      </svg>
    )
  return (
    <svg className="lw-bg" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={g('night')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F2747" />
          <stop offset="1" stopColor="#3E4A78" />
        </linearGradient>
        <radialGradient id={g('glow')}>
          <stop offset="0" stopColor="#FCE3A8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FCE3A8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${g('night')})`} />
      {[[20, 12], [64, 30], [110, 8], [200, 24], [250, 10], [300, 34], [150, 40]].map(([x, y], i) => (
        <rect key={i} className="lw-twinkle" x={x} y={y} width="2" height="2" fill="#F9F1DF" style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
      <path d="M0 46 Q80 70 160 50 T320 52" fill="none" stroke="#151A30" strokeWidth="1.5" />
      <path d="M0 74 Q100 96 200 78 T320 84" fill="none" stroke="#151A30" strokeWidth="1.5" />
      {[[24, 54], [70, 62], [118, 60], [176, 50], [228, 58], [286, 54], [44, 82], [96, 88], [150, 88], [206, 80], [262, 84], [306, 86]].map(([x, y], i) => (
        <g key={i}>
          <circle className="lw-glow" cx={x} cy={y + 8} r="16" fill={`url(#${g('glow')})`} style={{ animationDelay: `${i * 0.3}s` }} />
          <line x1={x} y1={y - 4} x2={x} y2={y} stroke="#151A30" strokeWidth="1" />
          <ellipse cx={x} cy={y + 8} rx="6" ry="8" fill={i % 3 === 0 ? '#DA887C' : i % 3 === 1 ? '#EAA84C' : '#B7A9CC'} />
          <rect x={x - 3} y={y} width="6" height="2" fill="#2B2230" />
        </g>
      ))}
      <rect y="132" width="320" height="48" fill="#2F4A3A" />
      <rect y="150" width="320" height="18" fill="#4A4560" />
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={8 + i * 14.5} cy={138 + (i % 3) * 4} r="2.6" fill={['#F2B8C6', '#F9F1DF', '#EAA84C', '#DA887C'][i % 4]} />
      ))}
      {[[60, 120], [140, 104], [230, 116], [290, 100], [30, 98]].map(([x, y], i) => (
        <circle key={i} className="lw-firefly" cx={x} cy={y} r="1.6" fill="#F9E79F" style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
    </svg>
  )
}

// ------------------------------------------------------------------ the stage

export interface Play {
  type: MomentType
  variant: string
  scene: SceneId
  line: string
  reply: string
  fromRole: Role
  preview: boolean
}

type Pose = 'idle' | 'walk' | 'hand' | 'sunset' | 'face' | 'apart' | 'hug' | 'dance' | 'kiss'
const POSE: Record<MomentType, Pose> = {
  walk: 'walk',
  hand: 'hand',
  sunset: 'sunset',
  talk: 'face',
  tease: 'face',
  comfort: 'face',
  hug: 'hug',
  dance: 'dance',
  kiss: 'kiss',
  poem: 'face',
  thinking: 'apart',
}
const EMOTE: Record<string, string> = { grin: '😏', eyeroll: '🙄', outrage: '😤', quiet: '…', joke: '😂' }

export function Stage({
  scene,
  play,
  avatars,
  still,
  simba,
}: {
  scene: SceneId
  play: Play | null
  avatars: Record<Role, AvatarConfig>
  still?: boolean
  simba?: string | null
}) {
  const { reduced: sysReduced } = useSettings()
  const reduced = sysReduced || Boolean(still)
  const pose: Pose = play ? POSE[play.type] : 'idle'
  const walking = pose === 'walk' || pose === 'hand'
  const dirFor = (r: Role): { dir: 0 | 1 | 2; flip: boolean } => {
    if (pose === 'idle' || pose === 'apart') return { dir: 0, flip: false }
    if (pose === 'sunset') return { dir: 1, flip: false }
    if (walking) return { dir: 2, flip: false }
    return { dir: 2, flip: r === 'ut' } // face each other
  }
  const recipient: Role | null = play ? (play.fromRole === 'satyam' ? 'ut' : 'satyam') : null
  const emote = play ? EMOTE[play.variant] : undefined
  const caption = play ? momentDef(play.type).caption[play.variant] : null
  const hearts = play && (pose === 'hand' || pose === 'hug' || pose === 'kiss' || (pose === 'dance' && play.variant === 'slow'))
  const variantClass = play ? `v-${play.variant}` : ''
  const showSimba = simba || (play && play.type === 'dance' && play.variant === 'silly')

  return (
    <figure className="lw-figure" key={play ? `${play.type}-${play.variant}-${play.line}` : 'idle'}>
    <div className={`lw-stage scene-${scene} pose-${pose} ${variantClass} ${reduced ? 'still' : ''}`}>
      <Backdrop scene={scene} />
      {(['satyam', 'ut'] as Role[]).map((r) => {
        const { dir, flip } = dirFor(r)
        return (
          <div key={r} className={`lw-av av-${r} ${flip ? 'flip' : ''}`}>
            <div className="lw-av-inner">
              <Sprite cfg={avatars[r]} role={r} dir={dir} walking={walking && !still} reduced={reduced} />
            </div>
            {play && play.fromRole === r && play.line && <p className="lw-bubble from">{play.line}</p>}
            {play && recipient === r && (play.reply || emote) && (
              <p className="lw-bubble to">
                {emote && <span className="lw-emote">{emote} </span>}
                {play.reply}
              </p>
            )}
          </div>
        )
      })}
      {hearts && (
        <div className="lw-hearts" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.5}s`, left: `${44 + (i % 3) * 4}%` }}>
              ♥
            </span>
          ))}
        </div>
      )}
      {scene === 'lanterns' && !reduced && (
        <div className="lw-petals" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} style={{ left: `${8 + i * 16}%`, animationDelay: `${i * 1.3}s` }} />
          ))}
        </div>
      )}
      {showSimba && (
        <div className="lw-simba" aria-hidden="true">
          <SimbaSprite />
        </div>
      )}
      {play?.preview && <p className="lw-preview-tag">Preview · story mode — not a real reply</p>}
    </div>
      {(caption || simba) && (
        <figcaption className={`lw-caption ${reduced ? 'still' : ''}`} role="status">
          {simba ?? caption}
        </figcaption>
      )}
    </figure>
  )
}

export function MemoryCard({ m, avatars }: { m: Moment; avatars: Record<Role, AvatarConfig> }) {
  const { backend } = useWorld()
  const fromRole = backend.roleOf(m.fromUid) ?? 'satyam'
  const def = momentDef(m.type)
  return (
    <article className="lw-memory">
      <Stage scene={m.scene} still avatars={avatars} play={{ type: m.type, variant: m.variant, scene: m.scene, line: m.line, reply: m.reply, fromRole, preview: false }} />
      <footer className="by">
        {def.label} · {nameOf(fromRole)} & {nameOf(fromRole === 'satyam' ? 'ut' : 'satyam')} · {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'just now'}
      </footer>
    </article>
  )
}

export function useAvatars(): Record<Role, AvatarConfig> {
  const { players } = useWorld()
  return useMemo(
    () => ({
      satyam: players.find((p) => p.role === 'satyam')?.avatar ?? DEFAULT_AVATAR.satyam,
      ut: players.find((p) => p.role === 'ut')?.avatar ?? DEFAULT_AVATAR.ut,
    }),
    [players],
  )
}

// ------------------------------------------------------------------ the panel

const SCENE_KEY = 'ut-oi.lw-scene'
const INTRO_KEY = 'ut-oi.lw-intro-seen'
const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* fine */
    }
  },
}

export function LittleWorld({ onClose, onSettings, initialScene }: { onClose: () => void; onSettings: () => void; initialScene?: SceneId }) {
  const { backend, user, role, me, partner, partnerUid, moments, extrasError } = useWorld()
  const { toast, play: sfx, reduced } = useSettings()
  const avatars = useAvatars()
  const news = useMomentNews()
  const [scene, setScene] = useState<SceneId>(() => initialScene ?? (SCENES.some((s) => s.id === store.get(SCENE_KEY)) ? (store.get(SCENE_KEY) as SceneId) : 'riverside'))
  const [play, setPlay] = useState<Play | null>(null)
  const [composing, setComposing] = useState<MomentType | null>(null)
  const [line, setLine] = useState('')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [simba, setSimba] = useState<string | null>(null)
  const [intro, setIntro] = useState(() => !store.get(INTRO_KEY))
  const [extra, setExtra] = useState<Extra | null>(null)
  const simbaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => store.set(SCENE_KEY, scene), [scene])
  useEffect(() => () => void (simbaTimer.current && clearTimeout(simbaTimer.current)), [])

  if (!user || !role || !me) return null
  const partnerRole: Role = role === 'satyam' ? 'ut' : 'satyam'
  const partnerName = partner?.displayName ?? nameOf(partnerRole)
  const romanceOn = !me.romanceOff && !partner?.romanceOff
  const sharedReady = !extrasError && Boolean(partnerUid)
  const sceneDef = SCENES.find((s) => s.id === scene)!
  const here = MOMENTS.filter((m) => m.scenes.includes(scene))
  const together = here.filter((m) => !m.romantic)
  const closer = here.filter((m) => m.romantic)
  const waiting = moments.filter((m) => m.fromUid === user.uid && m.status === 'pending')
  const recent = moments.filter((m) => m.status === 'accepted' && (m.fromUid === user.uid || m.toUid === user.uid)).slice(0, 8)

  const show = (p: Play) => {
    setSimba(null)
    setScene(p.scene)
    setPlay(p)
    setComposing(null)
    sfx('good')
    stageRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
  }
  const playMoment = (m: Moment, preview = false) =>
    show({ type: m.type, variant: m.variant, scene: m.scene, line: m.line, reply: m.reply, fromRole: backend.roleOf(m.fromUid) ?? 'satyam', preview })

  const callSimba = () => {
    setPlay(null)
    setSimba(SIMBA_EVENTS[Math.floor(Math.random() * SIMBA_EVENTS.length)])
    sfx('woof')
    if (simbaTimer.current) clearTimeout(simbaTimer.current)
    simbaTimer.current = setTimeout(() => setSimba(null), 4200)
  }

  const startCompose = (t: MomentType) => {
    setComposing(t)
    setLine(t === 'tease' ? TEASE_LINES[role][0] : momentDef(t).ask)
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
      return true
    } catch (e) {
      toast(`Not saved: ${friendlyError(e)}`, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    if (!composing || !partnerUid) return
    const type = composing
    if (waiting.some((m) => m.type === type && !isExpired(m.createdAt))) {
      toast('That invitation is already on its way. No need to send it twice.')
      return
    }
    const ok = await run(() => backend.inviteMoment(user.uid, partnerUid, { type, scene, line: line.trim().slice(0, MOMENT_LIMITS.line) }))
    if (ok) {
      sfx('paper')
      toast(`Invitation left for ${partnerName}. They’ll see it next time they visit — no rush.`, 'good')
      setComposing(null)
    }
  }

  const answer = async (m: Moment, variant: string | null) => {
    const reply = variant ? (replies[m.id] ?? '').trim().slice(0, MOMENT_LIMITS.reply) : ''
    const ok = await run(() => backend.answerMoment(m.id, variant ? { status: 'accepted', variant, reply } : { status: 'declined', variant: '', reply: '' }))
    if (!ok) return
    markSeen(user.uid, [m.id])
    if (variant) playMoment({ ...m, variant, reply, status: 'accepted' })
    else toast('Okay. No worries at all.')
  }

  const previewFor = (t: MomentType, variant: string) =>
    show({ type: t, variant, scene, line: line.trim() || momentDef(t).ask, reply: '', fromRole: role, preview: true })

  const dismissIntro = () => {
    store.set(INTRO_KEY, '1')
    setIntro(false)
  }

  const composer = composing && (() => {
    const def = momentDef(composing)
    return (
      <div className="lw-card lw-composer">
        <p className="lw-card-title">
          {def.label} <span className="fine">· an invitation for {partnerName}</span>
        </p>
        {composing === 'tease' && (
          <div className="prompts">
            {TEASE_LINES[role].map((t) => (
              <button key={t} type="button" className={`chip ${line === t ? 'on' : ''}`} onClick={() => setLine(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        <label className="field">
          <span>
            Your line <em className="fine">{line.length}/{MOMENT_LIMITS.line}</em>
          </span>
          <textarea rows={2} value={line} maxLength={MOMENT_LIMITS.line} onChange={(e) => setLine(e.target.value)} />
        </label>
        <p className="fine">
          {partnerName} can say yes or “{def.decline.toLowerCase()}” — both are completely fine. Nothing plays as a shared moment unless they say yes.
        </p>
        <div className="row">
          <button className="btn btn-primary" disabled={busy || !sharedReady} onClick={() => void send()}>
            Leave the invitation
          </button>
          {def.variants.map((v) => (
            <button key={v.id} className="btn btn-small" onClick={() => previewFor(composing, v.id)}>
              Preview{def.variants.length > 1 ? `: ${v.label}` : ''}
            </button>
          ))}
          <button className="btn btn-ghost btn-small" onClick={() => setComposing(null)}>
            Cancel
          </button>
        </div>
      </div>
    )
  })()

  if (extra)
    return (
      <Sheet title={EXTRAS.find((x) => x.id === extra)!.label} onClose={onClose} wide tone="night">
        <div className="lw">
          <button className="btn btn-small lw-back" onClick={() => setExtra(null)} data-autofocus>
            ← Back to Our Little World
          </button>
          {extrasError ? (
            <p className="lw-note">This is resting for now — the private database needs its rules update.</p>
          ) : extra === 'jar' ? (
            <QuestionJar />
          ) : extra === 'story' ? (
            <MiniStory />
          ) : extra === 'photos' ? (
            <PhotoCorner />
          ) : (
            <CafeBoardPanel />
          )}
        </div>
      </Sheet>
    )

  return (
    <Sheet title="Our Little World" onClose={onClose} wide tone="night">
      <div className="lw">
        {intro && (
          <div className="lw-card lw-intro">
            {LITTLE_WORLD_INTRO.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <button className="btn btn-primary" onClick={dismissIntro} data-autofocus>
              Got it
            </button>
          </div>
        )}

        {extrasError && (
          <p className="lw-note" role="status">
            Shared moments are resting for now — the private database needs its small rules update (see README → “Updating the rules”). Previews still work.
          </p>
        )}
        {!partnerUid && <p className="lw-note">{partnerName} hasn’t joined this little world yet. You can still look around and preview.</p>}

        {(news.incoming.length > 0 || news.answers.length > 0) && (
          <section className="lw-inbox" aria-label="For you">
            {news.incoming.map((m) => {
              const def = momentDef(m.type)
              return (
                <div key={m.id} className="lw-card lw-invite">
                  <p className="lw-card-title">
                    💌 {partnerName} · {def.label} <span className="fine">· {SCENES.find((s) => s.id === m.scene)?.name} · {timeAgo(m.createdAt)}</span>
                  </p>
                  {m.line && <p className="lw-quote">“{m.line}”</p>}
                  {def.replyPrompt && (
                    <label className="field">
                      <span>{def.replyPrompt}</span>
                      <input value={replies[m.id] ?? ''} maxLength={MOMENT_LIMITS.reply} onChange={(e) => setReplies((r) => ({ ...r, [m.id]: e.target.value }))} />
                    </label>
                  )}
                  <div className="row">
                    {def.variants.map((v) => (
                      <button key={v.id} className="btn btn-primary btn-small" disabled={busy} onClick={() => void answer(m, v.id)}>
                        {v.label}
                      </button>
                    ))}
                    <button className="btn btn-small" disabled={busy} onClick={() => void answer(m, null)}>
                      {def.decline}
                    </button>
                  </div>
                </div>
              )
            })}
            {news.answers.map((m) => {
              const def = momentDef(m.type)
              return (
                <div key={m.id} className="lw-card">
                  {m.status === 'accepted' ? (
                    <>
                      <p className="lw-card-title">✨ {partnerName} said yes to “{def.label}”</p>
                      <div className="row">
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => {
                            markSeen(user.uid, [m.id])
                            playMoment(m)
                          }}
                        >
                          ▶ Watch it
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="lw-card-title">🌙 {def.label}: maybe another time</p>
                      <p className="fine">{def.declined}</p>
                      <button
                        className="btn btn-small"
                        onClick={() => {
                          markSeen(user.uid, [m.id])
                          // Nothing to keep from a "maybe another time": tidy it away.
                          backend.deleteMoment(m.id).catch(() => undefined)
                        }}
                      >
                        Okay
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </section>
        )}

        <div className="tabs" role="tablist" aria-label="Places">
          {SCENES.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={scene === s.id}
              className={`tab ${scene === s.id ? 'on' : ''}`}
              onClick={() => {
                setScene(s.id)
                setPlay(null)
                setComposing(null)
                setSimba(null)
              }}
            >
              {s.glyph} {s.name}
            </button>
          ))}
        </div>

        <div ref={stageRef}>
          <Stage scene={scene} play={play && play.scene === scene ? play : null} avatars={avatars} simba={simba} />
        </div>
        <p className="fine lw-blurb">{sceneDef.blurb}</p>
        {play && (
          <div className="row">
            <button className="btn btn-small" onClick={() => setPlay(null)}>
              Back to the scene
            </button>
          </div>
        )}

        {composer}

        <section aria-label="Do something together">
          <h3 className="lw-h">Together</h3>
          <div className="lw-actions">
            {together.map((m) => (
              <button key={m.type} className="btn" onClick={() => startCompose(m.type)}>
                {m.label}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={callSimba}>
              🐾 Call Simba
            </button>
          </div>
        </section>

        {closer.length > 0 && (
          <details className="lw-closer">
            <summary>💗 A little closer (optional)</summary>
            {romanceOn ? (
              <>
                <p className="fine">Only ever an invitation. A “no” or “not now” changes nothing — no points, no penalties.</p>
                <div className="lw-actions">
                  {closer.map((m) => (
                    <button key={m.type} className="btn" onClick={() => startCompose(m.type)}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="fine">
                Romantic gestures are switched off right now.
                {me.romanceOff && (
                  <>
                    {' '}
                    <button className="linkish" onClick={onSettings}>
                      Change in Settings
                    </button>
                  </>
                )}
              </p>
            )}
          </details>
        )}

        <section aria-label="More to do together">
          <h3 className="lw-h">Little things to share</h3>
          <div className="lw-actions">
            {EXTRAS.map((x) => (
              <button key={x.id} className="btn" onClick={() => setExtra(x.id)}>
                {x.label}
              </button>
            ))}
          </div>
        </section>


        {waiting.length > 0 && (
          <section aria-label="Waiting">
            <h3 className="lw-h">Left for {partnerName}</h3>
            {waiting.map((m) => (
              <div key={m.id} className="lw-row">
                <span>
                  {momentDef(m.type).label} · {isExpired(m.createdAt) ? 'drifted away quietly' : `waiting, no rush · ${timeAgo(m.createdAt)}`}
                </span>
                <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => void run(() => backend.deleteMoment(m.id))}>
                  {isExpired(m.createdAt) ? 'Clear' : 'Take back'}
                </button>
              </div>
            ))}
          </section>
        )}

        {recent.length > 0 && (
          <section aria-label="Recent moments">
            <h3 className="lw-h">Recent moments</h3>
            {recent.map((m) => {
              const kept = m.saved[user.uid] === true
              return (
                <div key={m.id} className="lw-row">
                  <span>
                    {SCENES.find((s) => s.id === m.scene)?.glyph} {momentDef(m.type).label} · {timeAgo(m.updatedAt)}
                  </span>
                  <span className="row">
                    <button className="btn btn-small" onClick={() => playMoment(m)}>
                      ▶ Replay
                    </button>
                    <label className="toggle lw-keep">
                      <input type="checkbox" checked={kept} disabled={busy} onChange={(e) => void run(() => backend.keepMoment(user.uid, m.id, e.target.checked))} /> Keep in our album
                    </label>
                  </span>
                </div>
              )
            })}
            <p className="fine">A moment goes into the shared “Our moments” album only if you both choose to keep it.</p>
          </section>
        )}
      </div>
    </Sheet>
  )
}
