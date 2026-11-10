import { useCallback, useRef, useState, type ReactNode } from 'react'
import type { GameId } from '../../content/ids'
import { GAME_TITLE, MAX_SCORE } from '../../content/ids'
import { friendlyError } from '../../data/backend'
import { useSettings } from '../../hooks/useSettings'
import { useWorld } from '../../hooks/useWorld'
import type { ScoreResult } from '../../models/types'

export type SaveState = { s: 'idle' } | { s: 'saving' } | { s: 'saved'; r: ScoreResult } | { s: 'error'; msg: string }

/** Saves a finished round and keeps a retry handle. Never claims success early. */
export function useScoreSave(game: GameId) {
  const { recordScore, backend } = useWorld()
  const [state, setState] = useState<SaveState>({ s: 'idle' })
  const last = useRef<number | null>(null)
  const save = useCallback(
    async (score: number) => {
      last.current = score
      setState({ s: 'saving' })
      try {
        const r = await recordScore(game, score)
        setState({ s: 'saved', r })
        return r
      } catch (e) {
        setState({ s: 'error', msg: friendlyError(e) })
        return null
      }
    },
    [recordScore, game],
  )
  const retry = useCallback(() => (last.current === null ? Promise.resolve(null) : save(last.current)), [save])
  const reset = useCallback(() => setState({ s: 'idle' }), [])
  return { state, save, retry, reset, demo: backend.mode === 'demo' }
}

export function SaveLine({ state, onRetry, demo }: { state: SaveState; onRetry: () => void; demo: boolean }) {
  if (state.s === 'idle') return null
  if (state.s === 'saving') return <p className="save saving">Saving your score…</p>
  if (state.s === 'error')
    return (
      <div className="save error" role="alert">
        <p>Not saved: {state.msg}</p>
        <button className="btn btn-small" onClick={onRetry}>
          Retry
        </button>
      </div>
    )
  return (
    <p className="save saved">
      {demo ? 'Demo round — scores aren’t saved anywhere.' : state.r.isNewBest ? `New personal best: ${state.r.bestScore}! Saved.` : `Saved. Personal best is still ${state.r.bestScore}.`}
    </p>
  )
}

/** Full-screen game overlay with a title, short rules and an exit button. */
export function GameFrame({ game, onExit, children, rules }: { game: GameId; onExit: () => void; children: ReactNode; rules: string }) {
  const { play } = useSettings()
  return (
    <div className="game-overlay" role="dialog" aria-modal="true" aria-label={GAME_TITLE[game]}>
      <header className="game-top">
        <div>
          <h2>{GAME_TITLE[game]}</h2>
          <p className="rules">{rules}</p>
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            play('tap')
            onExit()
          }}
          aria-label="Leave the game"
        >
          ✕
        </button>
      </header>
      <div className="game-body">{children}</div>
      <p className="fine center">Max {MAX_SCORE[game]} points · replay anytime, no streaks, no pressure.</p>
    </div>
  )
}
