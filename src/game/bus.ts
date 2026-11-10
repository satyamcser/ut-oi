// Tiny typed event bus between the Phaser canvas and the React overlays.
import type { PieceId, Role, ZoneId } from '../content/ids'
import type { AvatarConfig } from '../models/types'

export interface BusEvents {
  ready: void
  near: { id: string; label: string } | null
  interact: { id: string }
  dpad: { dx: number; dy: number }
  press: void
  pause: boolean
  avatar: { cfg: AvatarConfig; role: Role }
  other: { cfg: AvatarConfig; role: Role } | null
  pieces: PieceId[]
  goto: ZoneId
  reduced: boolean
  pawStart: { role: Role; reduced: boolean }
  pawProgress: { found: number; seconds: number; artifact: boolean }
  pawEnd: { found: number; artifact: boolean; quit: boolean }
  pawCat: void
  pawQuit: void
}

type Handler<K extends keyof BusEvents> = (payload: BusEvents[K]) => void

class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<keyof BusEvents>>>()
  on<K extends keyof BusEvents>(event: K, fn: Handler<K>): () => void {
    const set = this.handlers.get(event) ?? new Set()
    set.add(fn as Handler<keyof BusEvents>)
    this.handlers.set(event, set)
    return () => set.delete(fn as Handler<keyof BusEvents>)
  }
  emit<K extends keyof BusEvents>(event: K, ...payload: BusEvents[K] extends void ? [] : [BusEvents[K]]) {
    this.handlers.get(event)?.forEach((fn) => fn(payload[0] as BusEvents[keyof BusEvents]))
  }
  clear() {
    this.handlers.clear()
  }
}

export const bus = new Bus()

/** True while the user is typing in a form field — the game must not steal keys. */
export function typingInForm(): boolean {
  const el = document.activeElement
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable)
}
