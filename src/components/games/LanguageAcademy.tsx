import { useMemo, useState } from 'react'
import { MISC } from '../../content/dialogue'
import { LIMITS } from '../../content/ids'
import { buildQuiz, QUIZ_LENGTH, type Direction, type QuizQuestion } from '../../content/phrases'
import { friendlyError } from '../../data/backend'
import { useSettings } from '../../hooks/useSettings'
import { nameOf, useWorld } from '../../hooks/useWorld'
import type { LanguageChallenge } from '../../models/types'
import { languageScore } from '../../utils/games'
import { GameFrame, SaveLine, useScoreSave } from './GameFrame'

type Tab = 'quiz' | 'inbox' | 'ask' | 'teach'

function Quiz({ onFinished }: { onFinished: (score: number, dir: Direction) => void }) {
  const { play } = useSettings()
  const { state: saveState, save, retry, demo } = useScoreSave('language')
  const [dir, setDir] = useState<Direction | null>(null)
  const [qs, setQs] = useState<QuizQuestion[]>([])
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)

  const start = (d: Direction) => {
    setDir(d)
    setQs(buildQuiz(d))
    setI(0)
    setPicked(null)
    setCorrect(0)
    setDone(false)
  }

  if (!dir)
    return (
      <div className="quiz-pick">
        <p>Totally optional — a few phrase flashcards, just for fun. No grades, nothing to prove. Close it anytime.</p>
        <button className="btn btn-primary btn-big" onClick={() => start('vi-en')} data-autofocus>
          Vietnamese → English
        </button>
        <button className="btn btn-big" onClick={() => start('en-vi')}>
          English → Vietnamese
        </button>
      </div>
    )

  if (done) {
    return (
      <div className="result-card">
        <h3>That’s the round. Thanks for flipping through.</h3>
        <p className="fine">
          {correct} of {QUIZ_LENGTH} matched. Just for fun — the cat isn’t keeping score, and neither are we.
        </p>
        <SaveLine state={saveState} onRetry={() => void retry()} demo={demo} />
        <button className="btn btn-primary" onClick={() => setDir(null)}>
          Another round
        </button>
      </div>
    )
  }

  const q = qs[i]
  const choose = (k: number) => {
    if (picked !== null) return
    setPicked(k)
    const ok = k === q.correct
    if (ok) setCorrect((c) => c + 1)
    play(ok ? 'good' : 'bad')
  }
  const next = () => {
    if (i + 1 >= qs.length) {
      setDone(true)
      const score = languageScore(correct, QUIZ_LENGTH)
      void save(score).then((r) => r && onFinished(score, dir))
      return
    }
    setI(i + 1)
    setPicked(null)
  }

  return (
    <div className="quiz">
      <p className="quiz-progress">
        Card {i + 1}/{qs.length} · {dir === 'vi-en' ? 'What does this mean?' : 'How would you say this in Vietnamese?'}
      </p>
      <p className="quiz-prompt" lang={dir === 'vi-en' ? 'vi' : 'en'}>
        {q.prompt}
      </p>
      <div className="options">
        {q.options.map((o, k) => (
          <button
            key={o}
            className={`option ${picked === null ? '' : k === q.correct ? 'right' : k === picked ? 'wrong' : ''}`}
            onClick={() => choose(k)}
            disabled={picked !== null}
            lang={dir === 'vi-en' ? 'en' : 'vi'}
          >
            {o}
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="explain" aria-live="polite">
          <p>
            {picked === q.correct ? 'Yes!' : 'Here it is:'} <strong lang={dir === 'vi-en' ? 'vi' : 'en'}>{q.prompt}</strong> →{' '}
            <strong lang={dir === 'vi-en' ? 'en' : 'vi'}>{q.options[q.correct]}</strong>
          </p>
          {q.note && <p className="fine">{q.note}</p>}
          <button className="btn btn-primary" onClick={next} autoFocus>
            {i + 1 >= qs.length ? 'See results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}

function ChallengeComposer({ initial, onSubmit, onCancel, busy }: { initial?: LanguageChallenge; onSubmit: (p: string, o: string[], c: number) => void; onCancel?: () => void; busy: boolean }) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [opts, setOpts] = useState<string[]>(initial?.options ?? ['', '', ''])
  const [correct, setCorrect] = useState(initial?.correctIndex ?? 0)
  const filled = opts.filter((o) => o.trim()).length === opts.length
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        if (prompt.trim() && filled) onSubmit(prompt.trim(), opts.map((o) => o.trim()), correct)
      }}
    >
      <label className="field">
        <span>Your question</span>
        <input value={prompt} maxLength={LIMITS.prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What does “từ từ” mean?" />
      </label>
      {opts.map((o, k) => (
        <div key={k} className="opt-row">
          <input type="radio" name="correct" checked={correct === k} onChange={() => setCorrect(k)} aria-label={`Option ${k + 1} is correct`} />
          <input value={o} maxLength={LIMITS.option} onChange={(e) => setOpts(opts.map((x, j) => (j === k ? e.target.value : x)))} placeholder={`Option ${k + 1}`} aria-label={`Option ${k + 1}`} />
        </div>
      ))}
      <div className="row between">
        <span className="fine">Pick the correct answer with the circle. 3–4 options, 140 characters each.</span>
        {opts.length < 4 ? (
          <button type="button" className="btn btn-small" onClick={() => setOpts([...opts, ''])}>
            + option
          </button>
        ) : (
          <button type="button" className="btn btn-small" onClick={() => setOpts(opts.slice(0, 3))}>
            − option
          </button>
        )}
      </div>
      <div className="row">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" disabled={busy || !prompt.trim() || !filled}>
          {initial ? 'Save changes' : 'Send question'}
        </button>
      </div>
    </form>
  )
}

export function LanguageAcademy({ onExit, onQuizDone }: { onExit: () => void; onQuizDone: (score: number, dir: Direction) => void }) {
  const { backend, user, role, langs, partnerUid, unlock } = useWorld()
  const { toast, play } = useSettings()
  const [tab, setTab] = useState<Tab>('teach')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [dictionary, setDictionary] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [why, setWhy] = useState('')
  const partnerName = nameOf(role === 'ut' ? 'satyam' : 'ut')
  const inbox = useMemo(() => langs.filter((c) => c.targetUid === user?.uid), [langs, user])
  const mine = useMemo(() => langs.filter((c) => c.authorUid === user?.uid), [langs, user])

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast(ok, 'good')
      return true
    } catch (e) {
      toast(`Not saved: ${friendlyError(e)}`, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <GameFrame game="language" onExit={onExit} rules="A tiny two-way phrase swap: share a phrase you like, send a fun question, or flip some flashcards if you feel like it. Nothing here is a test.">
      <div className="academy">
        <div className="chalk" aria-label="Chalkboard">
          <p>Lesson 01: How to say “ơi” without using it in every sentence.</p>
          <p className="chalk-note">Teacher’s note: Challenge impossible.</p>
          <button
            className="dictionary"
            onClick={() => {
              setDictionary(true)
              play('paper')
              void unlock({ egg: 'oi_dictionary' })
            }}
          >
            📖 Open the dictionary
          </button>
          {dictionary && <p className="dict-pop">{MISC.dictionary}</p>}
        </div>
        <div className="tabs" role="tablist">
          {(
            [
              ['teach', 'Swap a phrase'],
              ['inbox', `From ${partnerName}${inbox.some((c) => c.status === 'open') ? ' •' : ''}`],
              ['ask', `Ask ${partnerName}`],
              ['quiz', 'Flashcards (optional)'],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {l}
            </button>
          ))}
        </div>

        {tab === 'quiz' && <Quiz onFinished={onQuizDone} />}

        {tab === 'inbox' && (
          <div className="inbox">
            {inbox.length === 0 && <p className="empty">No questions from {partnerName} yet. The chalkboard is patiently waiting.</p>}
            {inbox.map((c) => (
              <article key={c.id} className="q-card">
                <p className="q-prompt">{c.prompt}</p>
                <div className="options">
                  {c.options.map((o, k) => {
                    const cls = c.status === 'answered' ? (k === c.correctIndex ? 'right' : k === c.answerIndex ? 'wrong' : '') : ''
                    return (
                      <button key={k} className={`option ${cls}`} disabled={c.status !== 'open' || busy} onClick={() => void run(() => backend.answerLanguageChallenge(c.id, k), k === c.correctIndex ? 'Correct! ✨' : 'Answer sent. Friendly correction shown.')}>
                        {o}
                      </button>
                    )
                  })}
                </div>
                {c.status === 'open' ? (
                  <button className="btn btn-ghost btn-small" disabled={busy} onClick={() => void run(() => backend.answerLanguageChallenge(c.id, null), 'Skipped. No hard feelings, ever.')}>
                    Skip this one
                  </button>
                ) : (
                  <p className="fine">{c.status === 'skipped' ? 'Skipped.' : c.answerIndex === c.correctIndex ? 'You got it right.' : `Answer: ${c.options[c.correctIndex]}`}</p>
                )}
              </article>
            ))}
          </div>
        )}

        {tab === 'ask' && (
          <div className="ask">
            {!partnerUid ? (
              <p className="empty">{partnerName} hasn’t joined this little world yet — questions will be possible once they do.</p>
            ) : (
              <ChallengeComposer busy={busy} onSubmit={(p, o, c) => void run(() => backend.addLanguageChallenge(user!.uid, partnerUid, { prompt: p, options: o, correctIndex: c }), `Question sent to ${partnerName}.`)} />
            )}
            {mine.length > 0 && <h3>Your questions</h3>}
            {mine.map((c) =>
              editing === c.id ? (
                <ChallengeComposer
                  key={c.id}
                  initial={c}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSubmit={(p, o, k) =>
                    void run(() => backend.editLanguageChallenge(c.id, { prompt: p, options: o, correctIndex: k }), 'Updated.').then((ok) => ok && setEditing(null))
                  }
                />
              ) : (
                <article key={c.id} className="q-card mine">
                  <p className="q-prompt">{c.prompt}</p>
                  <p className="fine">
                    {c.status === 'open' ? 'Waiting (no rush).' : c.status === 'skipped' ? `${partnerName} skipped it.` : `${partnerName} answered: ${c.options[c.answerIndex]} ${c.answerIndex === c.correctIndex ? '✓' : ''}`}
                  </p>
                  <div className="row">
                    {c.status === 'open' && (
                      <button className="btn btn-small" onClick={() => setEditing(c.id)}>
                        Edit
                      </button>
                    )}
                    <button className="btn btn-small btn-ghost" disabled={busy} onClick={() => window.confirm('Delete this question?') && void run(() => backend.deleteLanguageChallenge(c.id), 'Deleted.')}>
                      Delete
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {tab === 'teach' && (
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              const text = `${phrase.trim()} — ${why.trim()}`.slice(0, LIMITS.postcardText)
              void run(() => backend.addPostcard(user!.uid, { kind: 'phrase', backgroundId: 'lanterns', text, stickerIds: [] }), 'Pinned to the shared album.').then((ok) => {
                if (ok) {
                  setPhrase('')
                  setWhy('')
                }
              })
            }}
          >
            <p>Leave one phrase you like and why. It goes to the shared album on the rooftop.</p>
            <label className="field">
              <span>The phrase</span>
              <input value={phrase} maxLength={80} onChange={(e) => setPhrase(e.target.value)} placeholder="Từ từ" />
            </label>
            <label className="field">
              <span>Why you like it</span>
              <textarea value={why} maxLength={200} rows={3} onChange={(e) => setWhy(e.target.value)} placeholder="Because it’s good advice for most of life." />
            </label>
            <button className="btn btn-primary" disabled={busy || !phrase.trim() || !why.trim()}>
              Pin it
            </button>
          </form>
        )}
      </div>
    </GameFrame>
  )
}
