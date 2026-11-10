import { join } from 'node:path'
import { newId, readJson, writeJsonAtomic } from './util.js'

/** Isolated storage for the interviewer workspace; never reads candidate memory/session files. */
export function createInterviewerStore(baseRoot) {
  const root = join(baseRoot, 'interviewer')
  const candidatesDir = join(root, 'candidates')
  const plansDir = join(root, 'plans')
  const sessionsDir = join(root, 'sessions')
  const currentPath = join(root, 'current.json')

  let current = { candidateId: '', planId: '', sessionId: '' }
  let candidate = null
  let plan = null
  let session = null
  let loaded
  let queue = Promise.resolve()

  async function readById(dir, id) {
    if (!id) return null
    const value = await readJson(join(dir, `${id}.json`), null)
    return value && typeof value === 'object' ? value : null
  }

  async function load() {
    const pointer = await readJson(currentPath, null)
    if (pointer && typeof pointer === 'object') {
      current = {
        candidateId: typeof pointer.candidateId === 'string' ? pointer.candidateId : '',
        planId: typeof pointer.planId === 'string' ? pointer.planId : '',
        sessionId: typeof pointer.sessionId === 'string' ? pointer.sessionId : '',
      }
    }
    candidate = await readById(candidatesDir, current.candidateId)
    plan = await readById(plansDir, current.planId)
    session = await readById(sessionsDir, current.sessionId)
    if (candidate && !current.candidateId) current.candidateId = candidate.id
    if (plan && !current.planId) current.planId = plan.id
    if (session && !current.sessionId) current.sessionId = session.id
  }

  function ready() {
    loaded ??= load()
    return loaded
  }

  function persistCurrent() {
    queue = queue.then(() => writeJsonAtomic(currentPath, current))
    return queue
  }

  async function saveCandidate(patch = {}) {
    await ready()
    const now = Date.now()
    const id = candidate?.id || newId('c')
    candidate = {
      ...(candidate ?? {}),
      ...patch,
      id,
      createdAt: candidate?.createdAt ?? now,
      updatedAt: now,
    }
    current.candidateId = id
    await writeJsonAtomic(join(candidatesDir, `${id}.json`), candidate)
    await persistCurrent()
    return candidate
  }

  async function savePlan(patch = {}) {
    await ready()
    const now = Date.now()
    const id = plan?.id || newId('p')
    plan = {
      ...(plan ?? {}),
      ...patch,
      id,
      candidateId: patch.candidateId ?? plan?.candidateId ?? candidate?.id ?? '',
      status: ['draft', 'ready', 'done'].includes(patch.status) ? patch.status : plan?.status ?? 'draft',
      questions: Array.isArray(patch.questions) ? patch.questions : plan?.questions ?? [],
      createdAt: plan?.createdAt ?? now,
      updatedAt: now,
    }
    current.planId = id
    await writeJsonAtomic(join(plansDir, `${id}.json`), plan)
    await persistCurrent()
    return plan
  }

  async function saveSession(value = {}) {
    await ready()
    const now = Date.now()
    const id = value.id || session?.id || newId('s')
    session = {
      ...(session ?? {}),
      ...value,
      id,
      mode: 'interview',
      createdAt: session?.createdAt ?? value.createdAt ?? now,
      answers: Array.isArray(value.answers) ? value.answers : session?.answers ?? [],
    }
    current.sessionId = id
    await writeJsonAtomic(join(sessionsDir, `${id}.json`), session)
    await persistCurrent()
    return session
  }

  return {
    root,
    ready,
    getCandidate() {
      return candidate
    },
    saveCandidate,
    getPlan() {
      return plan
    },
    savePlan,
    getSession() {
      return session
    },
    saveSession,
  }
}
