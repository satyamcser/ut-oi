import { useState } from 'react'
import { MISC, PLAYER_TITLE, TALK, talkStatus } from '../content/dialogue'
import { BADGES, EGGS, GAME_IDS, GAME_TITLE, MAX_SCORE, PIECE_IDS, ZONES, type GameId } from '../content/ids'
import { friendlyError } from '../data/backend'
import { useSettings } from '../hooks/useSettings'
import { nameOf, useWorld } from '../hooks/useWorld'
import { coffeePoints } from '../utils/games'
import { AvatarPreview, Sheet, Stamp } from './ui'

export function PetPortrait({ complete }: { complete: boolean }) {
  return (
    <svg viewBox="0 0 160 110" className={`portrait ${complete ? 'complete' : 'sketch'}`} role="img" aria-label={complete ? 'Shared pet portrait of Simba and Sleepy Cat, finished together' : 'Pencil sketch of Simba and Sleepy Cat'}>
      <rect width="160" height="110" rx="8" fill={complete ? '#F9F1DF' : '#FFFFFF'} stroke="#5D4235" strokeWidth="5" />
      <g stroke="#2B2230" strokeWidth="2" strokeLinejoin="round">
        <path d="M30 88 q6-28 30-30 q12-14 26 0 l-4 30z" fill={complete ? '#8E97A8' : 'none'} />
        <path d="M60 56 l4-14 l8 10 l8-10 l4 14" fill={complete ? '#8E97A8' : 'none'} />
        <path d="M62 66 q10 12 20 0" fill={complete ? '#FFFFFF' : 'none'} />
        <ellipse cx="114" cy="84" rx="24" ry="12" fill={complete ? '#FFFFFF' : 'none'} />
        <path d="M98 76 l2-8 l6 5 M124 73 l6-5 l2 8" fill={complete ? '#FFFFFF' : 'none'} />
        <path d="M106 82 h5 M118 82 h5" />
      </g>
      {complete && (
        <>
          <circle cx="72" cy="94" r="5" fill="#EAA84C" />
          <circle cx="100" cy="96" r="3.5" fill="#EAA84C" stroke="#2B2230" />
          <text x="80" y="22" textAnchor="middle" fontSize="11" fontFamily="Tiny5, monospace" fill="#5D4235">
            THE INVESTIGATION BUREAU
          </text>
        </>
      )}
    </svg>
  )
}

export function Passport({ onClose, onOpenEnding, onPlay }: { onClose: () => void; onOpenEnding: () => void; onPlay: (g: GameId) => void }) {
  const { me, partner, role, scores, friendly, world, backend, user, partnerUid, players } = useWorld()
  const { toast } = useSettings()
  const [busy, setBusy] = useState(false)
  if (!me || !role || !user) return null

  const best = (uid: string | undefined, g: GameId) => scores.find((s) => s.uid === uid && s.gameId === g)
  const myPoints = coffeePoints(scores, user.uid, me.pieces.length)
  const partnerPoints = partner ? coffeePoints(scores, partner.uid, partner.pieces.length) : 0
  const portraitDone = players.length === 2 && players.every((p) => world.petArtifacts[p.uid])
  const incoming = friendly.filter((c) => c.targetUid === user.uid)
  const outgoing = friendly.filter((c) => c.creatorUid === user.uid)
  const partnerName = nameOf(role === 'ut' ? 'satyam' : 'ut')

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast(ok, 'good')
    } catch (e) {
      toast(friendlyError(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Passport & Scorebook" onClose={onClose} wide>
      <section className="passport-head">
        <div className="pp-person">
          <AvatarPreview cfg={me.avatar} role={role} scale={4} />
          <div>
            <strong>{me.displayName}</strong>
            <span className="fine">{PLAYER_TITLE[role]}</span>
            <span className="points">☕ {myPoints} coffee points</span>
          </div>
        </div>
        {partner && (
          <div className="pp-person">
            <AvatarPreview cfg={partner.avatar} role={partner.role} scale={4} />
            <div>
              <strong>{partner.displayName}</strong>
              <span className="fine">{PLAYER_TITLE[partner.role]}</span>
              <span className="points">☕ {partnerPoints} coffee points</span>
            </div>
          </div>
        )}
      </section>
      <p className="fine">Coffee points = a tenth of your best scores (+25 once for all five postcard pieces). A game record, not a measure of anything else.</p>

      <h3>Best scores</h3>
      <table className="scores">
        <thead>
          <tr>
            <th scope="col">Game</th>
            <th scope="col">{me.displayName}</th>
            <th scope="col">{partner?.displayName ?? partnerName}</th>
          </tr>
        </thead>
        <tbody>
          {GAME_IDS.map((g) => {
            const a = best(user.uid, g)
            const b = best(partner?.uid, g)
            return (
              <tr key={g}>
                <th scope="row">{GAME_TITLE[g]}</th>
                <td>{a ? `${a.bestScore}/${MAX_SCORE[g]}` : '—'}</td>
                <td>{b ? `${b.bestScore}/${MAX_SCORE[g]}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h3>Friendly challenges</h3>
      <p className="fine">Optional, never expire, and ignoring them is completely fine.</p>
      {incoming.filter((c) => c.status === 'open').map((c) => {
        const mine = best(user.uid, c.gameId)?.bestScore ?? -1
        return (
          <div key={c.id} className="challenge">
            <span>
              {partnerName} challenges you: beat <strong>{c.scoreToBeat}</strong> in {GAME_TITLE[c.gameId]}.
            </span>
            <span className="row">
              {mine >= c.scoreToBeat ? (
                <button className="btn btn-small btn-primary" disabled={busy} onClick={() => void run(() => backend.resolveFriendlyChallenge(c.id, 'completed'), 'Challenge completed! 🎉')}>
                  Claim it
                </button>
              ) : (
                <button className="btn btn-small" onClick={() => onPlay(c.gameId)}>
                  Play
                </button>
              )}
              <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => void run(() => backend.resolveFriendlyChallenge(c.id, 'dismissed'), 'Dismissed — no hard feelings.')}>
                Dismiss
              </button>
            </span>
          </div>
        )
      })}
      {partnerUid ? (
        <div className="challenge-make">
          {/* No "beat my score" on phrase flashcards: language is never a contest here. */}
          {GAME_IDS.filter((g) => g !== 'language' && best(user.uid, g)).map((g) => (
            <button
              key={g}
              className="btn btn-small"
              disabled={busy || outgoing.some((c) => c.gameId === g && c.status === 'open')}
              onClick={() => void run(() => backend.addFriendlyChallenge(user.uid, partnerUid, g, Math.max(1, best(user.uid, g)!.bestScore)), `Challenge posted for ${partnerName}.`)}
            >
              Challenge {partnerName}: beat my {best(user.uid, g)!.bestScore} in {GAME_TITLE[g]}
            </button>
          ))}
          {GAME_IDS.every((g) => !best(user.uid, g)) && <p className="fine">Play a game first, then you can post a “beat my score”.</p>}
        </div>
      ) : (
        <p className="fine">Challenges unlock once {partnerName} has joined.</p>
      )}
      {outgoing.map((c) => (
        <div key={c.id} className="challenge sent">
          <span>
            You → {partnerName}: beat {c.scoreToBeat} in {GAME_TITLE[c.gameId]} · {c.status === 'open' ? 'open' : c.status}
          </span>
          <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => void run(() => backend.deleteFriendlyChallenge(c.id), 'Removed.')}>
            Remove
          </button>
        </div>
      ))}

      <h3>Badges</h3>
      <div className="badge-grid">
        {BADGES.map((b) => {
          const got = me.badges.includes(b.id)
          return (
            <div key={b.id} className={`badge ${got ? 'got' : ''}`} title={b.how}>
              <span className="badge-stamp">{got ? b.stamp : '?'}</span>
              <strong>{b.title}</strong>
              <small>{got ? 'Earned' : b.how}</small>
            </div>
          )
        })}
      </div>

      <h3>
        Discoveries ({me.eggs.length}/{EGGS.length})
      </h3>
      <div className="egg-grid">
        {EGGS.map((e) => {
          const got = me.eggs.includes(e.id)
          return (
            <div key={e.id} className={`egg ${got ? 'got' : ''}`}>
              <strong>{got ? e.title : '???'}</strong>
              <small>{e.hint}</small>
            </div>
          )
        })}
      </div>

      <h3>Postcard pieces ({me.pieces.length}/5)</h3>
      <div className="pieces">
        {PIECE_IDS.map((p, i) => (
          <span key={p} className={`piece ${me.pieces.includes(p) ? 'got' : ''}`} title={ZONES[i].short}>
            {me.pieces.includes(p) ? ZONES[i].glyph : '·'}
          </span>
        ))}
      </div>
      {me.pieces.length === 5 ? (
        <button className="btn btn-primary" onClick={onOpenEnding}>
          Put the postcard together
        </button>
      ) : (
        <p className="fine">One piece hides near each of the five places. Look for something sparkling.</p>
      )}

      <h3>Shared pet portrait</h3>
      <PetPortrait complete={portraitDone} />
      <p className="fine">
        {portraitDone
          ? 'Finished together: Simba’s ball and the cat’s tiny bell are both in the bureau’s evidence box.'
          : 'A pencil sketch for now. It fills in once each of you finds your special object in the pawprint investigation.'}
      </p>

      {scores.some((s) => s.uid === user.uid && s.gameId === 'matcha') && (
        <div className="voucher">
          <strong>Voucher</strong>
          <span>{MISC.voucher}</span>
        </div>
      )}

      <div className="pinned">
        <strong>📌 {TALK.label}</strong>
        <span>{talkStatus()}</span>
        <a href={TALK.url} target="_blank" rel="noopener noreferrer">
          Visit event page
        </a>
      </div>
      <Stamp text="Út ơi!" tone="coral" />
    </Sheet>
  )
}
