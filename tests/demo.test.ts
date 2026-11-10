import { describe, expect, it } from 'vitest'
import type { WatchHandlers } from '../src/data/backend'
import { createDemoBackend, DEMO_UIDS } from '../src/data/demoBackend'
import type { LanguageChallenge, Postcard } from '../src/models/types'

function watchAll() {
  const state: { postcards: Postcard[]; langs: LanguageChallenge[]; world: Record<string, string> } = { postcards: [], langs: [], world: {} }
  const h: WatchHandlers = {
    players: () => {},
    scores: () => {},
    postcards: (p) => (state.postcards = p),
    languageChallenges: (l) => (state.langs = l),
    friendlyChallenges: () => {},
    world: (w) => (state.world = w.petArtifacts),
    sync: () => {},
    error: () => {},
  }
  return { state, h }
}

describe('demo backend follows the same ownership rules', () => {
  it('authors own their postcards; reactions are per person', async () => {
    const api = createDemoBackend()
    const { state, h } = watchAll()
    api.watch('x', h)
    api.demoSignIn!('ut')
    await api.addPostcard(DEMO_UIDS.ut, { kind: 'postcard', backgroundId: 'lanterns', text: 'Út ơi! hello', stickerIds: ['coffee'] })
    const id = state.postcards[0].id
    api.demoSignIn!('satyam')
    await expect(api.editPostcard(id, { backgroundId: 'lanterns', text: 'hacked', stickerIds: [] })).rejects.toThrow()
    await expect(api.deletePostcard(id)).rejects.toThrow()
    await api.setReaction(DEMO_UIDS.satyam, id, '🌙')
    await expect(api.setReaction(DEMO_UIDS.ut, id, '😂')).rejects.toThrow()
    expect(state.postcards[0].reactions).toEqual({ [DEMO_UIDS.satyam]: '🌙' })
  })

  it('rejects oversize text and empty cards', async () => {
    const api = createDemoBackend()
    api.demoSignIn!('ut')
    await expect(api.addPostcard(DEMO_UIDS.ut, { kind: 'postcard', backgroundId: 'lanterns', text: 'x'.repeat(301), stickerIds: [] })).rejects.toThrow()
    await expect(api.addPostcard(DEMO_UIDS.ut, { kind: 'postcard', backgroundId: 'lanterns', text: '', stickerIds: [] })).rejects.toThrow()
  })

  it('scores keep the best, count plays and are rate limited', async () => {
    const api = createDemoBackend()
    api.demoSignIn!('satyam')
    const a = await api.recordScore(DEMO_UIDS.satyam, 'matcha', 70)
    expect(a).toMatchObject({ bestScore: 70, totalPlays: 1, isNewBest: true })
    await expect(api.recordScore(DEMO_UIDS.satyam, 'matcha', 90)).rejects.toThrow() // within 3 s
    await expect(api.recordScore(DEMO_UIDS.satyam, 'pawprints', 61)).rejects.toThrow()
  })

  it('language challenges: only the receiver answers, only the author edits', async () => {
    const api = createDemoBackend()
    const { state, h } = watchAll()
    api.watch('x', h)
    api.demoSignIn!('satyam')
    await api.addLanguageChallenge(DEMO_UIDS.satyam, DEMO_UIDS.ut, { prompt: 'What does “Từ từ” mean?', options: ['Slowly', 'Quickly', 'Coffee'], correctIndex: 0 })
    const id = state.langs[0].id
    await expect(api.answerLanguageChallenge(id, 0)).rejects.toThrow()
    api.demoSignIn!('ut')
    await expect(api.editLanguageChallenge(id, { prompt: 'x', options: ['a', 'b', 'c'], correctIndex: 1 })).rejects.toThrow()
    await api.answerLanguageChallenge(id, 0)
    expect(state.langs[0]).toMatchObject({ status: 'answered', answerIndex: 0 })
  })

  it('the pet portrait needs both players’ objects', async () => {
    const api = createDemoBackend()
    const { state, h } = watchAll()
    api.watch('x', h)
    api.demoSignIn!('ut')
    await api.contributeArtifact(DEMO_UIDS.ut, 'ut')
    expect(Object.keys(state.world)).toHaveLength(1)
    api.demoSignIn!('satyam')
    await api.contributeArtifact(DEMO_UIDS.satyam, 'satyam')
    expect(state.world).toEqual({ [DEMO_UIDS.ut]: 'cat_bell', [DEMO_UIDS.satyam]: 'simba_ball' })
  })
})
