import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type Phaser from 'phaser'
import { CAT_LINES, FIRST_CAFE, MISC, SIMBA_LINES, TITLE, ZONE_INTRO, type Line } from '../content/dialogue'
import { PIECE_IDS, type GameId, type PieceId, type ZoneId } from '../content/ids'
import type { Direction } from '../content/phrases'
import { friendlyError } from '../data/backend'
import { bus } from '../game/bus'
import { pawprintScore } from '../game/map/courtyardMaze'
import { useSettings } from '../hooks/useSettings'
import { nameOf, useWorld } from '../hooks/useWorld'
import { coffeePoints } from '../utils/games'
import { AvatarEditor } from './AvatarEditor'
import { LanguageAcademy } from './games/LanguageAcademy'
import { MatchaMission } from './games/MatchaMission'
import { PresentationRescue } from './games/PresentationRescue'
import { SaveLine, useScoreSave } from './games/GameFrame'
import { EndingView, LetterView, QuestMap, SettingsPanel, ZonePanel } from './Panels'
import { Passport } from './Passport'
import { PostcardStudio } from './PostcardStudio'
import { Sheet, Stamp, timeAgo } from './ui'

type Overlay =
  | { k: 'zone'; zone: ZoneId }
  | { k: 'game'; game: Exclude<GameId, 'language' | 'pawprints'> }
  | { k: 'academy' }
  | { k: 'studio'; tab: 'compose' | 'album' }
  | { k: 'passport' }
  | { k: 'settings' }
  | { k: 'map' }
  | { k: 'letter' }
  | { k: 'ending' }
  | { k: 'avatar' }
  | { k: 'notice' }
  | { k: 'paw' }
  | null

type GameModule = typeof import('../game/createGame')

export function GameView() {
  const world = useWorld()
  const { me, partner, role, user, scores, sync, backend, unlock, updateMe } = world
  const { play, reduced, toast } = useSettings()
  const host = useRef<HTMLDivElement>(null)
  const game = useRef<{ g: Phaser.Game; mod: GameModule } | null>(null)
  const [ready, setReady] = useState(false)
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [dialogue, setDialogue] = useState<{ lines: Line[]; i: number; then?: () => void } | null>(null)
  const [near, setNear] = useState<{ id: string; label: string } | null>(null)
  const [paw, setPaw] = useState<{ found: number; seconds: number; artifact: boolean; ended: boolean; quit: boolean }>({ found: 0, seconds: 75, artifact: false, ended: false, quit: false })
  const [avatarBusy, setAvatarBusy] = useState(false)
  const pawSave = useScoreSave('pawprints')
  const bellCount = useRef(0)
  const catLine = useRef(0)
  const simbaLine = useRef(0)
  const firstVisit = useRef(Boolean(me && me.visited.length === 0))
  const [showTutorial, setShowTutorial] = useState(firstVisit.current)

  const say = useCallback((lines: Line[], then?: () => void) => setDialogue({ lines, i: 0, then }), [])

  // ---- mount Phaser (lazy) ----
  useEffect(() => {
    let cancelled = false
    let created: Phaser.Game | null = null
    void (async () => {
      try {
        await Promise.race([document.fonts.load('16px "Tiny5"'), new Promise((r) => setTimeout(r, 1500))])
      } catch {
        /* fonts are optional */
      }
      const mod = await import('../game/createGame')
      if (cancelled || !host.current || !me || !role) return
      created = mod.createGame(host.current, {
        avatar: me.avatar,
        role,
        other: partner ? { cfg: partner.avatar, role: partner.role } : null,
        pieces: me.pieces,
        reduced,
        firstVisit: firstVisit.current,
      })
      game.current = { g: created, mod }
    })()
    const off = bus.on('ready', () => setReady(true))
    // Resize the canvas the moment the screen changes (rotation, window resize).
    const ro = new ResizeObserver(() => {
      const el = host.current
      if (created && el && el.clientWidth > 0) created.scale.resize(el.clientWidth, el.clientHeight)
    })
    if (host.current) ro.observe(host.current)
    return () => {
      cancelled = true
      off()
      ro.disconnect()
      created?.destroy(true)
      game.current = null
    }
    // Created once; later changes are pushed through the bus below.
  }, [])

  useEffect(() => {
    if (ready && me && role) bus.emit('avatar', { cfg: me.avatar, role })
  }, [ready, me?.avatar, role])
  useEffect(() => {
    if (ready) bus.emit('other', partner ? { cfg: partner.avatar, role: partner.role } : null)
  }, [ready, partner?.avatar, partner?.role])
  useEffect(() => {
    if (ready && me) bus.emit('pieces', me.pieces)
  }, [ready, me?.pieces])
  useEffect(() => {
    if (ready) bus.emit('reduced', reduced)
  }, [ready, reduced])

  const paused = overlay !== null || dialogue !== null
  useEffect(() => {
    bus.emit('pause', paused && overlay?.k !== 'paw')
  }, [paused, overlay])

  // ---- interactions from the canvas ----
  const openZone = useCallback(
    async (zone: ZoneId) => {
      const firstTime = me ? !me.visited.includes(zone) : false
      void unlock({ zone })
      if (zone === 'cafe') setShowTutorial(false)
      if (firstTime) say(zone === 'cafe' ? [...FIRST_CAFE, ...ZONE_INTRO.cafe] : ZONE_INTRO[zone], () => setOverlay({ k: 'zone', zone }))
      else setOverlay({ k: 'zone', zone })
    },
    [me, unlock, say],
  )

  useEffect(() => {
    const offs = [
      bus.on('near', setNear),
      bus.on('interact', ({ id }) => {
        play('tap')
        if (id.startsWith('zone:')) return void openZone(id.slice(5) as ZoneId)
        if (id.startsWith('piece:')) {
          const piece = `piece_${id.slice(6)}` as PieceId
          play('good')
          void unlock({ piece }).then((isNew) => {
            if (!isNew) return
            const count = (me?.pieces.filter((p) => p !== piece).length ?? 0) + 1
            toast(`${MISC.piece} (${count}/5)`, 'good')
            if (count >= 5) {
              void unlock({ badge: 'postcard_collector' })
              setOverlay({ k: 'ending' })
            }
          })
          return
        }
        switch (id) {
          case 'bell': {
            play('bell')
            bellCount.current = (bellCount.current + 1) % 3
            if (bellCount.current === 0) {
              say([{ who: 'SYSTEM', text: 'A receipt prints itself, very slowly.' }, { who: 'SYSTEM', text: MISC.bellReceipt }])
              void unlock({ egg: 'bell_receipt' })
            }
            return
          }
          case 'chalkboard':
            say([
              { who: 'Chalkboard', text: 'COFFEE FEES: one lesson = one iced coffee. Lessons given: many. Coffees paid: 0.' },
              { who: 'SYSTEM', text: MISC.coffeeFees },
            ])
            void unlock({ egg: 'coffee_fees' })
            return
          case 'cat':
            play('meow')
            say(CAT_LINES[catLine.current++ % CAT_LINES.length])
            void unlock({ egg: 'sleepy_cat' }).then(() => unlock({ badge: 'certified_cat_inspector' }))
            return
          case 'simba':
            play('woof')
            say(SIMBA_LINES[simbaLine.current++ % SIMBA_LINES.length])
            void unlock({ egg: 'simba_spins' })
            return
          case 'koi':
            toast(MISC.koi)
            void unlock({ egg: 'koi_follow' })
            return
          case 'notice':
            setOverlay({ k: 'notice' })
            return
          case 'questmap':
            setOverlay({ k: 'map' })
            return
        }
      }),
      bus.on('pawProgress', (p) => setPaw((s) => ({ ...s, ...p }))),
      bus.on('pawCat', () => {
        play('meow')
        say(CAT_LINES[catLine.current++ % CAT_LINES.length])
      }),
      bus.on('pawEnd', ({ found, artifact, quit }) => {
        setPaw((s) => ({ ...s, found, artifact, ended: true, quit }))
        if (quit) return
        play('win')
        void pawSave.save(pawprintScore(found))
        void unlock({ badge: 'cat_union_rep' })
        if (artifact && user && role) backend.contributeArtifact(user.uid, role).catch((e) => toast(friendlyError(e), 'error'))
      }),
    ]
    return () => offs.forEach((o) => o())
  }, [play, openZone, unlock, me, say, toast, backend, user, role, pawSave])

  const startPawprints = () => {
    if (!game.current || !role) return
    setPaw({ found: 0, seconds: 75, artifact: false, ended: false, quit: false })
    pawSave.reset()
    setOverlay({ k: 'paw' })
    game.current.mod.startPawprints(game.current.g, { role, reduced })
  }
  const endPawprints = () => {
    if (game.current) game.current.mod.endPawprints(game.current.g)
    setOverlay(null)
  }

  // ---- D-pad ----
  const dpad = (dx: number, dy: number) => (e: RPointerEvent) => {
    e.preventDefault()
    bus.emit('dpad', { dx, dy })
    try {
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    } catch {
      /* some browsers refuse capture; movement still works */
    }
  }
  const dpadUp = () => bus.emit('dpad', { dx: 0, dy: 0 })

  if (!me || !role || !user) return null
  const points = coffeePoints(scores, user.uid, me.pieces.length)
  const letterReady = me.visited.length >= 5 && !me.letterSeen
  const advance = () => {
    if (!dialogue) return
    play('tap')
    if (dialogue.i + 1 < dialogue.lines.length) setDialogue({ ...dialogue, i: dialogue.i + 1 })
    else {
      const then = dialogue.then
      setDialogue(null)
      then?.()
    }
  }

  return (
    <div className="world">
      <div ref={host} className="canvas-host" aria-label="The little Hanoi street. Use arrow keys or WASD to walk, E to interact." />
      {!ready && (
        <div className="loading-world" role="status">
          Sweeping the street and waking (gently) the cat…
        </div>
      )}

      <header className="hud">
        <span className="hud-title">{TITLE}</span>
        <span className="hud-points" title="Coffee points">
          ☕ {points}
        </span>
        <span className={`sync sync-${sync.kind}`} role="status">
          {sync.kind === 'demo' ? 'DEMO · not saved' : sync.kind === 'offline' ? 'Offline · not syncing' : `Synced ${timeAgo(sync.lastSynced)}`}
        </span>
        <span className="hud-actions" hidden={overlay?.k === 'paw'}>
          <button className="hud-btn" onClick={() => setOverlay({ k: 'map' })} aria-label="Side quest map">
            🗺
          </button>
          <button className="hud-btn" onClick={() => setOverlay({ k: 'passport' })} aria-label="Passport and scorebook">
            📒
          </button>
          <button className="hud-btn" onClick={() => setOverlay({ k: 'settings' })} aria-label="Settings">
            ⚙
          </button>
        </span>
      </header>

      {letterReady && !paused && (
        <button className="letter-flag" onClick={() => void updateMe({ letterSeen: true }).finally(() => setOverlay({ k: 'letter' }))}>
          ✉ A folded letter appeared
        </button>
      )}
      {showTutorial && !paused && ready && (
        <p className="tutorial" role="status">
          Walk to the glowing café sign and press <kbd>Enter</kbd> — or just tap it.
        </p>
      )}

      {overlay?.k !== 'paw' && (
        <div className="controls" aria-hidden={paused}>
          <div className="dpad" aria-label="Movement pad">
            <button className="d up" onPointerDown={dpad(0, -1)} onPointerUp={dpadUp} onPointerCancel={dpadUp} aria-label="Walk up">
              ▲
            </button>
            <button className="d left" onPointerDown={dpad(-1, 0)} onPointerUp={dpadUp} onPointerCancel={dpadUp} aria-label="Walk left">
              ◀
            </button>
            <button className="d right" onPointerDown={dpad(1, 0)} onPointerUp={dpadUp} onPointerCancel={dpadUp} aria-label="Walk right">
              ▶
            </button>
            <button className="d down" onPointerDown={dpad(0, 1)} onPointerUp={dpadUp} onPointerCancel={dpadUp} aria-label="Walk down">
              ▼
            </button>
          </div>
          <button className={`interact ${near ? 'on' : ''}`} disabled={!near} onClick={() => bus.emit('press')}>
            {near ? near.label : 'Walk closer to something'}
          </button>
        </div>
      )}

      {overlay?.k === 'paw' && (
        <div className="paw-hud" role="status">
          <span>⏱ {paw.seconds}s</span>
          <span>🐾 {paw.found}/4</span>
          <span>{paw.artifact ? (role === 'satyam' ? '🎾 found!' : '🔔 found!') : role === 'satyam' ? '🎾 ?' : '🔔 ?'}</span>
          {!paw.ended && (
            <>
              <button className="btn btn-small" onClick={() => bus.emit('press')}>
                Nudge the cat
              </button>
              <button className="btn btn-small btn-ghost" onClick={() => bus.emit('pawQuit')}>
                Stop
              </button>
            </>
          )}
        </div>
      )}
      {overlay?.k === 'paw' && paw.ended && (
        <Sheet title={paw.quit ? 'Investigation paused' : 'Case closed'} onClose={endPawprints}>
          {paw.quit ? (
            <p>The investigation is suspended until after nap time. Nothing was lost — come back whenever.</p>
          ) : (
            <div className="result-card">
              <Stamp text={`${pawprintScore(paw.found)}/60`} tone="jasmine" />
              <p>
                {paw.found} of 4 pawprints found{paw.found === 4 ? ' (+20 completion bonus)' : ''}.
              </p>
              {paw.artifact && <p>{role === 'satyam' ? 'You found Simba’s lost ball for the shared portrait!' : 'You found the cat’s tiny bell for the shared portrait!'}</p>}
              <p className="npc">Simba has been formally accused of excessive enthusiasm. Sleepy Cat declines to comment.</p>
              <SaveLine state={pawSave.state} onRetry={() => void pawSave.retry()} demo={pawSave.demo} />
            </div>
          )}
          <div className="row">
            <button className="btn btn-primary" onClick={startPawprints}>
              Investigate again
            </button>
            <button className="btn" onClick={endPawprints}>
              Back to the street
            </button>
          </div>
        </Sheet>
      )}

      {dialogue && (
        <div className="dialogue" role="dialog" aria-live="polite" onClick={advance}>
          <p className="speaker">{dialogue.lines[dialogue.i].who}</p>
          <p className="line">{dialogue.lines[dialogue.i].text}</p>
          <button className="btn btn-small" onClick={(e) => (e.stopPropagation(), advance())} autoFocus>
            {dialogue.i + 1 < dialogue.lines.length ? 'Next ▸' : 'OK'}
          </button>
        </div>
      )}

      {overlay?.k === 'zone' && (
        <ZonePanel
          zone={overlay.zone}
          onClose={() => setOverlay(null)}
          onPlay={(g) => setOverlay({ k: 'game', game: g as 'matcha' | 'presentation' })}
          onStudio={() => setOverlay({ k: 'studio', tab: 'compose' })}
          onAlbum={() => setOverlay({ k: 'studio', tab: 'album' })}
          onAcademy={() => setOverlay({ k: 'academy' })}
          onPawprints={startPawprints}
          onLetter={() => void updateMe({ letterSeen: true }).finally(() => setOverlay({ k: 'letter' }))}
        />
      )}
      {overlay?.k === 'game' && overlay.game === 'matcha' && (
        <MatchaMission
          onExit={() => setOverlay(null)}
          onFinished={(score) => {
            if (score >= 80) void unlock({ badge: 'chief_coffee_inspector' })
          }}
        />
      )}
      {overlay?.k === 'game' && overlay.game === 'presentation' && (
        <PresentationRescue onExit={() => setOverlay(null)} onFinished={() => void unlock({ badge: 'survived_the_cat' })} />
      )}
      {overlay?.k === 'academy' && (
        <LanguageAcademy
          onExit={() => setOverlay(null)}
          onQuizDone={(score: number, dir: Direction) => {
            void unlock({ badge: dir === 'vi-en' ? 'professor_of_oi' : 'tutor_under_investigation' }).then(() => (score >= 80 ? unlock({ badge: 'coffee_funded_diploma' }) : false))
          }}
        />
      )}
      {overlay?.k === 'studio' && <PostcardStudio startTab={overlay.tab} onClose={() => setOverlay(null)} />}
      {overlay?.k === 'passport' && (
        <Passport
          onClose={() => setOverlay(null)}
          onOpenEnding={() => setOverlay({ k: 'ending' })}
          onPlay={(g) => {
            if (g === 'language') setOverlay({ k: 'academy' })
            else if (g === 'pawprints') startPawprints()
            else setOverlay({ k: 'game', game: g })
          }}
        />
      )}
      {overlay?.k === 'settings' && <SettingsPanel onClose={() => setOverlay(null)} onAvatar={() => setOverlay({ k: 'avatar' })} onLetter={() => setOverlay({ k: 'letter' })} />}
      {overlay?.k === 'map' && (
        <QuestMap
          onClose={() => setOverlay(null)}
          onGo={(z) => {
            setOverlay(null)
            setTimeout(() => bus.emit('goto', z), 50)
          }}
        />
      )}
      {overlay?.k === 'letter' && <LetterView onClose={() => setOverlay(null)} />}
      {overlay?.k === 'ending' && <EndingView onClose={() => setOverlay(null)} />}
      {overlay?.k === 'notice' && (
        <Sheet title="Noticeboard" onClose={() => setOverlay(null)}>
          <div className="pinned big">
            <strong>📌 14 Nov 2026 · Thai Nguyen · Satyam’s Physical AI talk</strong>
            <span>Satyam’s Hanoi side quest. A robot senses, decides and acts; the researcher mostly drinks coffee.</span>
            <a href="https://pai.quanrobotics.org" target="_blank" rel="noopener noreferrer">
              Visit event page
            </a>
          </div>
        </Sheet>
      )}
      {overlay?.k === 'avatar' && (
        <Sheet title="Wardrobe" onClose={() => setOverlay(null)}>
          <AvatarEditor
            role={role}
            initial={me.avatar}
            initialName={me.displayName}
            busy={avatarBusy}
            unlocked={{ aodai: scores.some((s) => s.uid === user.uid), pawPin: me.badges.includes('cat_union_rep') }}
            onCancel={() => setOverlay(null)}
            onSave={async (cfg, name) => {
              setAvatarBusy(true)
              try {
                await updateMe({ avatar: cfg, displayName: name })
                if (cfg.outfit === 'aodai') {
                  say([
                    { who: 'SYSTEM', text: MISC.aodai },
                    { who: 'SYSTEM', text: MISC.aodaiOutfit },
                  ])
                  void unlock({ egg: 'aodai_inspection' }).then(() => unlock({ badge: 'wardrobe_inspection' }))
                }
                setOverlay(null)
              } catch (e) {
                toast(friendlyError(e), 'error')
              } finally {
                setAvatarBusy(false)
              }
            }}
          />
        </Sheet>
      )}
      <p className="sr-only" aria-live="polite">
        {near ? `Near: ${near.label}. Press E to interact.` : ''}
      </p>
      <span className="sr-only">{`Playing as ${nameOf(role)}. Pieces found: ${me.pieces.length} of ${PIECE_IDS.length}.`}</span>
    </div>
  )
}
