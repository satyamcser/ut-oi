import { describe, expect, it } from 'vitest'
import type { WatchHandlers } from '../src/data/backend'
import { createDemoBackend, DEMO_UIDS } from '../src/data/demoBackend'
import type { LanguageChallenge, Moment, PlayerDoc, Postcard, Reply } from '../src/models/types'

function watchAll() {
  const state: { postcards: Postcard[]; langs: LanguageChallenge[]; world: Record<string, string>; moments: Moment[]; replies: Reply[]; players: PlayerDoc[] } = {
    postcards: [],
    langs: [],
    world: {},
    moments: [],
    replies: [],
    players: [],
  }
  const h: WatchHandlers = {
    players: (p) => (state.players = p),
    scores: () => {},
    postcards: (p) => (state.postcards = p),
    languageChallenges: (l) => (state.langs = l),
    friendlyChallenges: () => {},
    world: (w) => (state.world = w.petArtifacts),
    moments: (m) => (state.moments = m),
    replies: (r) => (state.replies = r),
    sync: () => {},
    error: () => {},
    extrasError: () => {},
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

  it('moments: only the invited person answers; a no carries nothing; each keeps only for themselves', async () => {
    const api = createDemoBackend()
    const { state, h } = watchAll()
    api.watch('x', h)
    api.demoSignIn!('satyam')
    await expect(api.inviteMoment(DEMO_UIDS.satyam, DEMO_UIDS.satyam, { type: 'walk', scene: 'riverside', line: 'hi' })).rejects.toThrow()
    await api.inviteMoment(DEMO_UIDS.satyam, DEMO_UIDS.ut, { type: 'dance', scene: 'lanterns', line: 'One dance?' })
    await api.inviteMoment(DEMO_UIDS.satyam, DEMO_UIDS.ut, { type: 'walk', scene: 'riverside', line: '' })
    const [walk, dance] = state.moments
    await expect(api.answerMoment(dance.id, { status: 'accepted', variant: 'slow', reply: '' })).rejects.toThrow() // sender can't accept
    await expect(api.keepMoment(DEMO_UIDS.satyam, dance.id, true)).rejects.toThrow() // nothing to keep yet
    api.demoSignIn!('ut')
    await expect(api.answerMoment(dance.id, { status: 'accepted', variant: 'gentle', reply: '' })).rejects.toThrow() // not a dance variant
    await expect(api.answerMoment(walk.id, { status: 'declined', variant: '', reply: 'sneaky' })).rejects.toThrow()
    await api.answerMoment(walk.id, { status: 'declined', variant: '', reply: '' })
    await api.answerMoment(dance.id, { status: 'accepted', variant: 'silly', reply: 'Merciful? Never.' })
    await expect(api.answerMoment(dance.id, { status: 'declined', variant: '', reply: '' })).rejects.toThrow() // answered once
    await api.keepMoment(DEMO_UIDS.ut, dance.id, true)
    await expect(api.keepMoment(DEMO_UIDS.satyam, dance.id, true)).rejects.toThrow() // can't decide for the other person
    expect(state.moments.find((m) => m.id === dance.id)).toMatchObject({ status: 'accepted', variant: 'silly', saved: { [DEMO_UIDS.ut]: true } })
    await expect(api.deleteMoment(dance.id)).rejects.toThrow() // kept by someone
    api.demoSignIn!('satyam')
    await api.deleteMoment(walk.id)
    expect(state.moments).toHaveLength(1)
  })

  it('romantic invitations respect the off switch', async () => {
    const api = createDemoBackend()
    const { state, h } = watchAll()
    api.watch('x', h)
    api.demoSignIn!('ut')
    await api.savePlayer(DEMO_UIDS.ut, 'ut', { romanceOff: true }, null)
    api.demoSignIn!('satyam')
    await expect(api.inviteMoment(DEMO_UIDS.satyam, DEMO_UIDS.ut, { type: 'kiss', scene: 'lanterns', line: '' })).rejects.toThrow()
    await api.inviteMoment(DEMO_UIDS.satyam, DEMO_UIDS.ut, { type: 'talk', scene: 'cafe', line: 'Long day?' })
    expect(state.moments).toHaveLength(1)
  })

  it('postcard replies belong to their author and need a real postcard', async () => {
    const api = createDemoBackend()
    const { state, h } = watchAll()
    api.watch('x', h)
    api.demoSignIn!('ut')
    await api.addPostcard(DEMO_UIDS.ut, { kind: 'postcard', backgroundId: 'lanterns', text: 'Safe flight!', stickerIds: [] })
    const pid = state.postcards[0].id
    api.demoSignIn!('satyam')
    await expect(api.addReply(DEMO_UIDS.satyam, 'nope', 'hi')).rejects.toThrow()
    await expect(api.addReply(DEMO_UIDS.satyam, pid, '')).rejects.toThrow()
    await api.addReply(DEMO_UIDS.satyam, pid, 'Landed. Coffee next?')
    api.demoSignIn!('ut')
    await expect(api.deleteReply(state.replies[0].id)).rejects.toThrow()
    expect(state.replies[0]).toMatchObject({ postId: pid, authorUid: DEMO_UIDS.satyam })
  })
})
