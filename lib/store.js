import { join } from 'node:path'
import { localEmbedding } from './memory.js'
import { newId, readJson, writeJsonAtomic } from './util.js'

const VERSION = 1

function stripEmbedding(card) {
  const { embedding, ...rest } = card
  return rest
}

export function createStore(root) {
  const profilePath = join(root, 'profile.json')
  const memoryPath = join(root, 'memory.json')
  const sessionsPath = join(root, 'sessions.json')
  const personalPath = join(root, 'personal-bank.json')
  let profile = { version: VERSION, resumeText: '', resumeName: '', jdText: '', targetRole: '', notesText: '', updatedAt: 0 }
  let cards = []
  let sessions = []
  let personal = []
  let loaded
  let queue = Promise.resolve()

  async function load() {
    const loadedProfile = await readJson(profilePath, null)
    if (loadedProfile && typeof loadedProfile === 'object') profile = { ...profile, ...loadedProfile, version: VERSION }
    const loadedMemory = await readJson(memoryPath, null)
    if (loadedMemory && Array.isArray(loadedMemory.cards)) {
      cards = loadedMemory.cards.map((card) => ({
        ...card,
        embedding: card.embedding ?? [...localEmbedding(`${card.title ?? ''} ${card.text ?? ''}`)],
      }))
    }
    const loadedSessions = await readJson(sessionsPath, null)
    if (loadedSessions && Array.isArray(loadedSessions.sessions)) sessions = loadedSessions.sessions
    const loadedPersonal = await readJson(personalPath, null)
    if (loadedPersonal && Array.isArray(loadedPersonal.questions)) personal = loadedPersonal.questions
  }

  function ready() {
    loaded ??= load()
    return loaded
  }

  function persistProfile() {
    queue = queue.then(() => writeJsonAtomic(profilePath, profile))
    return queue
  }

  function persistMemory() {
    queue = queue.then(() =>
      writeJsonAtomic(memoryPath, { version: VERSION, cards: cards.map(stripEmbedding), updatedAt: Date.now() }),
    )
    return queue
  }

  function persistSessions() {
    queue = queue.then(() => writeJsonAtomic(sessionsPath, { version: VERSION, sessions }))
    return queue
  }

  function persistPersonal() {
    queue = queue.then(() => writeJsonAtomic(personalPath, { version: VERSION, questions: personal, updatedAt: Date.now() }))
    return queue
  }

  return {
    root,
    ready,
    getProfile() {
      return { ...profile }
    },
    async updateProfile(patch) {
      await ready()
      profile = {
        ...profile,
        ...patch,
        version: VERSION,
        updatedAt: Date.now(),
      }
      await persistProfile()
      return this.getProfile()
    },
    getCards() {
      return cards.slice()
    },
    async setCards(next) {
      await ready()
      cards = next
      await persistMemory()
    },
    async replaceSourceCards(source, nextCards) {
      await ready()
      cards = [...cards.filter((card) => card.source !== source), ...nextCards]
      await persistMemory()
      return cards.slice()
    },
    async addCards(nextCards) {
      await ready()
      cards = [...cards, ...nextCards]
      await persistMemory()
      return cards.slice()
    },
    async removeCard(id) {
      await ready()
      const before = cards.length
      cards = cards.filter((card) => card.id !== id)
      if (cards.length !== before) await persistMemory()
      return cards.slice()
    },
    getPersonalQuestions() {
      return personal.slice()
    },
    async setPersonalQuestions(next) {
      await ready()
      personal = Array.isArray(next) ? next : []
      await persistPersonal()
      return personal.slice()
    },
    getSessions() {
      return sessions.slice()
    },
    getSession(id) {
      return sessions.find((session) => session.id === id)
    },
    async saveSession(session) {
      await ready()
      const index = sessions.findIndex((item) => item.id === session.id)
      if (index === -1) sessions = [session, ...sessions]
      else sessions = sessions.map((item) => (item.id === session.id ? session : item))
      await persistSessions()
      return session
    },
    async createSession(session) {
      const value = { ...session, id: session.id ?? newId('mock'), createdAt: session.createdAt ?? Date.now() }
      await ready()
      sessions = [value, ...sessions.filter((item) => item.id !== value.id)]
      await persistSessions()
      return value
    },
    latestReport() {
      const withReport = sessions.filter((session) => session.report)
      return withReport.sort((left, right) => (right.report.generatedAt ?? 0) - (left.report.generatedAt ?? 0))[0]?.report ?? null
    },
  }
}
