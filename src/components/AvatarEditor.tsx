import { useState } from 'react'
import { PLAYER_TITLE } from '../content/dialogue'
import { LIMITS, type Role } from '../content/ids'
import { ACCESSORY_NAMES, HAIR_COLOR_NAMES, HAIR_STYLE_NAMES, HAIRS, SKIN_NAMES, SKINS } from '../game/art/pixels'
import type { AvatarConfig } from '../models/types'
import { AvatarPreview } from './ui'

export const DEFAULT_AVATAR: Record<Role, AvatarConfig> = {
  ut: { hair: 1, hairColor: 0, skin: 0, outfit: 'casual', accessory: 0 },
  satyam: { hair: 0, hairColor: 0, skin: 1, outfit: 'casual', accessory: 0 },
}

function Choice<T extends string | number>({ label, value, options, onChange, swatch, locked }: {
  label: string
  value: T
  options: { v: T; name: string; color?: string; locked?: boolean }[]
  onChange: (v: T) => void
  swatch?: boolean
  locked?: string
}) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className="choice-row">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            className={`choice-btn ${value === o.v ? 'on' : ''} ${swatch ? 'swatch' : ''}`}
            aria-pressed={value === o.v}
            disabled={o.locked}
            title={o.locked ? locked : o.name}
            onClick={() => onChange(o.v)}
          >
            {swatch ? <span className="dot" style={{ background: o.color }} aria-hidden="true" /> : null}
            <span className={swatch ? 'sr-only' : ''}>{o.locked ? `🔒 ${o.name}` : o.name}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function AvatarEditor({
  role,
  initial,
  initialName,
  unlocked,
  onSave,
  onCancel,
  busy,
}: {
  role: Role
  initial: AvatarConfig
  initialName: string
  unlocked: { aodai: boolean; pawPin: boolean }
  onSave: (cfg: AvatarConfig, name: string) => void
  onCancel?: () => void
  busy?: boolean
}) {
  const [cfg, setCfg] = useState<AvatarConfig>(initial)
  const [name, setName] = useState(initialName)
  const set = (p: Partial<AvatarConfig>) => setCfg((c) => ({ ...c, ...p }))
  return (
    <div className="avatar-editor">
      <div className="avatar-stage" aria-label="Preview">
        <AvatarPreview cfg={cfg} role={role} scale={5} dir={0} />
        <AvatarPreview cfg={cfg} role={role} scale={5} dir={2} label="Side view" />
        <AvatarPreview cfg={cfg} role={role} scale={5} dir={1} label="Back view" />
      </div>
      <p className="role-title">{PLAYER_TITLE[role]}</p>
      <label className="field">
        <span>Name on the map</span>
        <input value={name} maxLength={LIMITS.displayName} onChange={(e) => setName(e.target.value)} />
      </label>
      <Choice label="Hair style" value={cfg.hair} onChange={(v) => set({ hair: v })} options={HAIR_STYLE_NAMES.map((n, i) => ({ v: i, name: n }))} />
      <Choice label="Hair colour" value={cfg.hairColor} swatch onChange={(v) => set({ hairColor: v })} options={HAIR_COLOR_NAMES.map((n, i) => ({ v: i, name: n, color: HAIRS[i] }))} />
      <Choice label="Skin tone" value={cfg.skin} swatch onChange={(v) => set({ skin: v })} options={SKIN_NAMES.map((n, i) => ({ v: i, name: n, color: SKINS[i] }))} />
      <Choice
        label="Outfit"
        value={cfg.outfit}
        locked="Finish any mini-game once to unlock the áo dài"
        onChange={(v) => set({ outfit: v })}
        options={[
          { v: 'casual', name: 'Casual' },
          { v: 'aodai', name: 'Áo dài', locked: !unlocked.aodai },
        ]}
      />
      <Choice
        label="Accessory"
        value={cfg.accessory}
        locked="Close a pawprint investigation to unlock"
        onChange={(v) => set({ accessory: v })}
        options={ACCESSORY_NAMES.map((n, i) => ({ v: i, name: n, locked: i === 2 && !unlocked.pawPin }))}
      />
      <div className="row between">
        {onCancel ? (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <span />
        )}
        <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={() => onSave(cfg, name.trim())}>
          {busy ? 'Saving…' : 'Looks good'}
        </button>
      </div>
    </div>
  )
}
