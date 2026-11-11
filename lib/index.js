import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { loadBank, bankSummary, publicQuestion, revealedQuestion, selectQuestions } from './bank.js'
import { aggregateReport, fallbackPersonalQuestions, generateDrillFeedback, generateFeedback, generatePersonalQuestions, generateProbe, generateSupplement, normalizePersonalQuestions, MAX_DRILL_LEVEL, MAX_PERSONAL_QUESTIONS } from './coach.js'
import { buildProfileCards, memoryStats, retrieve } from './memory.js'
import { createStore } from './store.js'
import { generateInterviewPlan, generateInterviewReport, normalizePlan, normalizeReport } from './interviewer.js'
import { createInterviewerStore } from './interviewer-store.js'
import {
  assertMethod,
  cleanText,
  newId,
  readBody,
  sendError,
  sendJson,
  storageRoot,
} from './util.js'

const execFileAsync = promisify(execFile)
const PROFILE_SOURCES = new Set(['resume', 'jd', 'manual'])
const PERSONAL_GENERATE_TIMEOUT_MS = 70_000

export const name = 'interview-coach'
export const inject = ['webServer', 'connection', 'llm']

function sessionView(session) {
  if (!session) return null
  const answers = session.answers ?? []
  const scored = answers.filter((item) => Number.isFinite(item.feedback?.score))
  const average = scored.length > 0 ? Math.round(scored.reduce((sum, item) => sum + item.feedback.score, 0) / scored.length) : 0
  const active = session.status === 'active'
  return {
    id: session.id,
    mode: session.mode ?? 'mock',
    status: session.status ?? 'active',
    scope: session.scope ?? 'mixed',
    createdAt: session.createdAt ?? 0,
    startedAt: session.startedAt ?? 0,
    finishedAt: session.finishedAt ?? 0,
    questionCount: session.questionIds?.length ?? 0,
    currentIndex: session.currentIndex ?? 0,
    averageScore: average,
    answers: answers.map((item) => ({
      questionId: item.questionId,
      question: item.question,
      score: item.feedback?.score ?? 0,
      submittedAt: item.submittedAt ?? 0,
    })),
    skipped: (session.skipped ?? []).map((item) => ({
      questionId: item.questionId,
      skippedAt: item.skippedAt ?? 0,
    })),
    skippedCount: (session.skipped ?? []).length,
    currentQuestionId: active ? session.questionIds?.[session.currentIndex] : undefined,
  }
}

function publicSettings(config) {
  return {
    provider: config?.provider ?? 'deepseek-account',
    model: config?.model ?? 'deepseek-flash',
    mockQuestionCount: Number(config?.mockQuestionCount) || 10,
    embeddingProvider: config?.embeddingProvider ?? 'local',
    ttsEnabled: Boolean(config?.ttsEnabled),
    overlay: { alwaysOn: true, hideWhenSpeaking: false, shortcut: '⌘⇧H' },
  }
}

function routeAuth(connection, req, res) {
  const rejection = typeof connection?.requestRejection === 'function' ? connection.requestRejection(req) : 'connection-unavailable'
  if (rejection === undefined) return true
  res.writeHead(403)
  res.end()
  return false
}

async function readImportedText({ filename, base64 }) {
  const name = String(filename ?? '').toLowerCase()
  const data = Buffer.from(String(base64 ?? ''), 'base64')
  if (data.length === 0) throw Object.assign(new Error('empty file'), { code: 'EMPTY_FILE' })
  if (data.length > 8 * 1024 * 1024) throw Object.assign(new Error('file too large (max 8MB)'), { code: 'FILE_TOO_LARGE' })
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) return data.toString('utf8')
  if (!name.endsWith('.docx')) {
    throw Object.assign(new Error('only .txt/.md/.docx can be imported; paste PDF text instead'), { code: 'UNSUPPORTED_FILE' })
  }
  const dir = await mkdtemp(join(tmpdir(), 'interview-coach-'))
  const file = join(dir, 'resume.docx')
  try {
    await writeFile(file, data)
    const { stdout } = await execFileAsync('/usr/bin/textutil', ['-convert', 'txt', '-stdout', file], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 15_000,
    })
    return Buffer.isBuffer(stdout) ? stdout.toString('utf8') : String(stdout)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

function findDrillAnswer(session, questionId) {
  const id = String(questionId ?? session.answers?.[session.answers.length - 1]?.questionId ?? '')
  return { id, answer: (session.answers ?? []).find((item) => item.questionId === id) ?? null }
}

function answerStats(records) {
  const items = records ?? []
  return {
    total: items.length,
    favorites: items.filter((item) => item.favorite).length,
    latestAt: items.reduce((latest, item) => Math.max(latest, item.createdAt ?? 0), 0),
  }
}

function mainAnswerRecord(session, answer, question) {
  return {
    id: `${session.id}:${answer.questionId}:main`,
    sessionId: session.id,
    questionId: answer.questionId,
    kind: 'main',
    question: answer.question ?? question?.question ?? '',
    parentQuestion: '',
    answer: answer.answer ?? '',
    level: question?.level ?? '',
    topic: question?.topic ?? '',
    score: Number.isFinite(answer.feedback?.score) ? answer.feedback.score : null,
    feedback: answer.feedback ?? null,
    createdAt: answer.submittedAt ?? Date.now(),
    favorite: false,
  }
}

function drillAnswerRecord(session, answer, probe, question) {
  return {
    id: `${session.id}:${answer.questionId}:drill:${probe.level}`,
    sessionId: session.id,
    questionId: answer.questionId,
    kind: 'drill',
    question: probe.question ?? '',
    parentQuestion: answer.question ?? '',
    answer: probe.answer ?? '',
    level: question?.level ?? '',
    topic: question?.topic ?? '',
    focus: probe.focus ?? '',
    score: Number.isFinite(probe.feedback?.score) ? probe.feedback.score : null,
    feedback: probe.feedback ?? null,
    createdAt: probe.submittedAt ?? Date.now(),
    favorite: false,
  }
}

function summarizeDrill(drill) {
  const probes = drill.probes ?? []
  const scored = probes.filter((probe) => Number.isFinite(probe.feedback?.score))
  const average = scored.length > 0 ? Math.round(scored.reduce((sum, probe) => sum + probe.feedback.score, 0) / scored.length) : 0
  let weighted = 0
  let weight = 0
  for (const probe of scored) {
    const scale = Math.max(1, Number(probe.level) || 1)
    weighted += probe.feedback.score * scale
    weight += scale
  }
  const gapCounts = new Map()
  for (const probe of probes) {
    for (const gap of probe.feedback?.gaps ?? []) {
      const key = cleanText(gap, 160)
      gapCounts.set(key, (gapCounts.get(key) ?? 0) + 1)
    }
  }
  return {
    average,
    depthScore: weight > 0 ? Math.round(weighted / weight) : average,
    count: scored.length,
    gaps: [...gapCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([gap, count]) => ({ gap, count })),
  }
}

export function apply(ctx, config) {
  const store = createStore(storageRoot())
  const interviewerStore = createInterviewerStore(storageRoot())
  const settings = publicSettings(config)
  const ready = Promise.all([store.ready(), loadBank()]).then(async ([, rows]) => {
    presetBank = rows
    rebuildBank()
    await backfillAnswerBank()
  })
  let presetBank = []
  let bank = []
  const rebuildBank = () => {
    bank = [...presetBank, ...store.getPersonalQuestions()]
  }
  ready
    .then(() => {
      ctx.logger?.info?.(`interview-coach: ready with ${bank.length} questions`)
    })
    .catch((error) => ctx.logger?.warn?.(`interview-coach: init failed: ${String(error)}`))

  async function backfillAnswerBank() {
    const existing = new Set(store.getAnswerRecords().map((item) => item.id))
    const records = []
    for (const session of store.getSessions()) {
      for (const answer of session.answers ?? []) {
        const question = bank.find((item) => item.id === answer.questionId) ?? null
        const main = mainAnswerRecord(session, answer, question)
        if (!existing.has(main.id)) {
          records.push(main)
          existing.add(main.id)
        }
        for (const probe of answer.drill?.probes ?? []) {
          const drill = drillAnswerRecord(session, answer, probe, question)
          if (!existing.has(drill.id)) {
            records.push(drill)
            existing.add(drill.id)
          }
        }
      }
    }
    if (records.length > 0) await store.upsertAnswerRecords(records)
  }

  function candidateView(candidate) {
    if (!candidate) return null
    return {
      id: candidate.id,
      name: candidate.name ?? '',
      targetRole: candidate.targetRole ?? '',
      level: candidate.level ?? '',
      round: candidate.round ?? '',
      durationMin: Number(candidate.durationMin) || 45,
      resumeName: candidate.resumeName ?? '',
      resumeText: candidate.resumeText ?? '',
      resumeChars: candidate.resumeText?.length ?? 0,
      jdText: candidate.jdText ?? '',
      jdChars: candidate.jdText?.length ?? 0,
      memory: memoryStats(candidate.cards ?? []),
      createdAt: candidate.createdAt ?? 0,
      updatedAt: candidate.updatedAt ?? 0,
    }
  }

  function interviewerQuestion(session, plan) {
    if (!session || session.status !== 'active') return null
    return plan?.questions?.[session.currentIndex] ?? null
  }

  function interviewerSessionView(session, plan) {
    if (!session) return null
    return {
      id: session.id,
      mode: 'interview',
      status: session.status ?? 'active',
      candidateId: session.candidateId ?? '',
      planId: session.planId ?? '',
      questionCount: plan?.questions?.length ?? 0,
      currentIndex: session.currentIndex ?? 0,
      currentQuestion: interviewerQuestion(session, plan),
      answers: (session.answers ?? []).map((answer) => ({
        questionId: answer.questionId,
        question: answer.question,
        answer: answer.answer ?? '',
        notes: answer.notes ?? '',
        signal: answer.signal ?? 'neutral',
        submittedAt: answer.submittedAt ?? 0,
      })),
      report: session.report ?? null,
      createdAt: session.createdAt ?? 0,
      finishedAt: session.finishedAt ?? 0,
    }
  }

  function planView(plan) {
    if (!plan) return null
    const totalTimeMin = (plan.questions ?? []).reduce((sum, question) => sum + (Number(question.timeBoxMin) || 0), 0)
    return {
      id: plan.id,
      candidateId: plan.candidateId ?? '',
      status: plan.status ?? 'draft',
      questions: plan.questions ?? [],
      totalTimeMin,
      createdAt: plan.createdAt ?? 0,
      updatedAt: plan.updatedAt ?? 0,
    }
  }

  async function interviewerState() {
    await ready
    await interviewerStore.ready()
    const candidate = interviewerStore.getCandidate()
    const plan = interviewerStore.getPlan()
    const session = interviewerStore.getSession()
    const role = store.getProfile().role === 'interviewer' ? 'interviewer' : store.getProfile().role === 'candidate' ? 'candidate' : null
    return {
      role,
      settings,
      interviewer: {
        candidate: candidateView(candidate),
        plan: planView(plan),
        session: interviewerSessionView(session, plan),
        report: session?.report ?? null,
        bank: bankSummary(presetBank),
      },
    }
  }

  async function candidateState(role) {
    await ready
    const profile = store.getProfile()
    const cards = store.getCards()
    const sessions = store.getSessions()
    const active = sessions.find((session) => session.status === 'active') ?? null
    const latestFinished = sessions.find((session) => session.status === 'finished') ?? null
    const activeView = sessionView(active)
    if (activeView && active) {
      activeView.currentQuestion = publicQuestion(bank.find((question) => question.id === active.questionIds?.[active.currentIndex]))
    }
    return {
      role,
      settings,
      profile: {
        resumeName: profile.resumeName,
        resumeChars: profile.resumeText?.length ?? 0,
        jdChars: profile.jdText?.length ?? 0,
        notesChars: profile.notesText?.length ?? 0,
        targetRole: profile.targetRole,
        updatedAt: profile.updatedAt,
      },
      memory: memoryStats(cards),
      bank: bankSummary(bank),
      answers: answerStats(store.getAnswerRecords()),
      session: activeView,
      lastSession: active ? null : sessionView(latestFinished),
      report: store.latestReport(),
    }
  }

  async function state() {
    const profile = store.getProfile()
    if (profile.role === 'interviewer') return interviewerState()
    const role = profile.role === 'candidate' ? 'candidate' : null
    return candidateState(role)
  }

  async function setRole(body) {
    const role = body?.role === 'candidate' || body?.role === 'interviewer' ? body.role : null
    if (!role) throw Object.assign(new Error('role must be candidate or interviewer'), { code: 'ROLE_INVALID', status: 400 })
    const profile = store.getProfile()
    await store.updateProfile({ ...profile, role })
    return { role }
  }

  async function saveInterviewerCandidate(body) {
    await ready
    const targetRole = cleanText(body?.targetRole, 200)
    if (!targetRole) throw Object.assign(new Error('targetRole is required'), { code: 'TARGET_ROLE_REQUIRED', status: 400 })
    const resumeText = cleanText(body?.resumeText, 200_000)
    const jdText = cleanText(body?.jdText, 100_000)
    const durationRaw = Number(body?.durationMin)
    const durationMin = Number.isFinite(durationRaw) ? Math.max(15, Math.min(120, Math.round(durationRaw))) : 45
    const cards = buildProfileCards({ resumeText, jdText, notesText: '', targetRole }).map(({ embedding, ...card }) => card)
    const candidate = await interviewerStore.saveCandidate({
      name: cleanText(body?.name, 120) || targetRole,
      targetRole,
      level: cleanText(body?.level, 60) || '未指定',
      round: cleanText(body?.round, 60) || '技术面',
      durationMin,
      jdText,
      resumeName: cleanText(body?.resumeName, 200),
      resumeText,
      cards,
    })
    return { candidate: candidateView(candidate), memory: memoryStats(cards) }
  }

  async function generateInterviewerPlan(body) {
    await ready
    await interviewerStore.ready()
    const candidate = interviewerStore.getCandidate()
    if (!candidate) throw Object.assign(new Error('candidate is required'), { code: 'CANDIDATE_REQUIRED', status: 409 })
    const count = Math.max(1, Math.min(20, Number(body?.count) || 8))
    const result = await generateInterviewPlan(ctx, settings, { candidate, count, bank: presetBank })
    const totalTimeMin = result.questions.reduce((sum, question) => sum + (Number(question.timeBoxMin) || 0), 0)
    return {
      questions: result.questions,
      source: result.source,
      totalTimeMin,
      warning: totalTimeMin > (Number(candidate.durationMin) || 45) ? '计划总时长超过设定时长，请删减或调整。' : '',
    }
  }

  async function saveInterviewerPlan(body) {
    await ready
    await interviewerStore.ready()
    const candidate = interviewerStore.getCandidate()
    if (!candidate) throw Object.assign(new Error('candidate is required'), { code: 'CANDIDATE_REQUIRED', status: 409 })
    const questions = normalizePlan(body?.questions, { count: 20 })
    if (questions.length === 0) throw Object.assign(new Error('plan is empty'), { code: 'PLAN_EMPTY', status: 400 })
    const plan = await interviewerStore.savePlan({ candidateId: candidate.id, status: 'ready', questions })
    return { plan: planView(plan) }
  }

  async function startInterview() {
    await ready
    await interviewerStore.ready()
    const candidate = interviewerStore.getCandidate()
    const plan = interviewerStore.getPlan()
    if (!candidate) throw Object.assign(new Error('candidate is required'), { code: 'CANDIDATE_REQUIRED', status: 409 })
    if (!plan || !Array.isArray(plan.questions) || plan.questions.length === 0) {
      throw Object.assign(new Error('plan is required'), { code: 'PLAN_REQUIRED', status: 409 })
    }
    const existing = interviewerStore.getSession()
    if (existing?.status === 'active') {
      return { session: interviewerSessionView(existing, plan), question: interviewerQuestion(existing, plan), resumed: true }
    }
    const session = await interviewerStore.saveSession({
      candidateId: candidate.id,
      planId: plan.id,
      status: 'active',
      currentIndex: 0,
      answers: [],
      report: null,
      finishedAt: 0,
    })
    return { session: interviewerSessionView(session, plan), question: interviewerQuestion(session, plan), resumed: false }
  }

  async function answerInterview(body) {
    await ready
    await interviewerStore.ready()
    const session = interviewerStore.getSession()
    const plan = interviewerStore.getPlan()
    if (!session || session.status !== 'active') throw Object.assign(new Error('interview is not active'), { code: 'INTERVIEW_NOT_ACTIVE', status: 409 })
    const questionId = String(body?.questionId ?? '')
    const already = (session.answers ?? []).find((answer) => answer.questionId === questionId)
    if (already) {
      const next = plan?.questions?.[session.currentIndex] ?? null
      return { session: interviewerSessionView(session, plan), nextQuestion: next, done: !next }
    }
    const current = plan?.questions?.[session.currentIndex]
    if (!current || current.id !== questionId) {
      throw Object.assign(new Error('question is out of order'), { code: 'QUESTION_OUT_OF_ORDER', status: 409 })
    }
    const text = cleanText(body?.answer, 30_000)
    if (!text) throw Object.assign(new Error('answer is required'), { code: 'ANSWER_REQUIRED', status: 400 })
    const signal = ['strong', 'neutral', 'weak'].includes(body?.signal) ? body.signal : null
    if (!signal) throw Object.assign(new Error('signal must be strong, neutral, or weak'), { code: 'SIGNAL_INVALID', status: 400 })
    const answer = {
      questionId: current.id,
      question: current.question,
      answer: text,
      notes: cleanText(body?.notes, 5000),
      signal,
      submittedAt: Date.now(),
    }
    const next = {
      ...session,
      answers: [...(session.answers ?? []), answer],
      currentIndex: (session.currentIndex ?? 0) + 1,
    }
    await interviewerStore.saveSession(next)
    const nextQuestion = plan?.questions?.[next.currentIndex] ?? null
    return { session: interviewerSessionView(next, plan), nextQuestion, done: !nextQuestion }
  }

  async function finishInterview(body) {
    await ready
    await interviewerStore.ready()
    const session = interviewerStore.getSession()
    const plan = interviewerStore.getPlan()
    const candidate = interviewerStore.getCandidate()
    if (!session || session.status !== 'active') throw Object.assign(new Error('interview is not active'), { code: 'INTERVIEW_NOT_ACTIVE', status: 409 })
    if (session.report) return { session: interviewerSessionView(session, plan), report: session.report }
    const result = await generateInterviewReport(ctx, settings, { candidate, plan: plan?.questions ?? [], answers: session.answers ?? [] })
    const finished = { ...session, status: 'finished', finishedAt: Date.now(), report: result.report }
    await interviewerStore.saveSession(finished)
    if (plan) await interviewerStore.savePlan({ ...plan, status: 'done' })
    return { session: interviewerSessionView(finished, plan), report: result.report, source: result.source }
  }

  async function saveInterviewerReport(body) {
    await ready
    await interviewerStore.ready()
    const session = interviewerStore.getSession()
    if (!session) throw Object.assign(new Error('interview not found'), { code: 'INTERVIEW_NOT_FOUND', status: 404 })
    const report = normalizeReport(body?.report, { answers: session.answers ?? [] })
    report.source = 'manual'
    report.editedAt = Date.now()
    const saved = { ...session, report }
    await interviewerStore.saveSession(saved)
    return { report, session: interviewerSessionView(saved, interviewerStore.getPlan()) }
  }

  async function readInterviewerReport(sessionId) {
    await ready
    await interviewerStore.ready()
    const session = interviewerStore.getSession()
    if (!session || (sessionId && session.id !== sessionId)) throw Object.assign(new Error('interview not found'), { code: 'INTERVIEW_NOT_FOUND', status: 404 })
    if (!session.report) throw Object.assign(new Error('report not found'), { code: 'REPORT_NOT_FOUND', status: 404 })
    return { report: session.report, session: interviewerSessionView(session, interviewerStore.getPlan()) }
  }

  async function saveProfile(patch) {
    await ready
    const current = store.getProfile()
    const next = {
      ...current,
      ...patch,
      resumeText: patch.resumeText !== undefined ? cleanText(patch.resumeText) : current.resumeText,
      jdText: patch.jdText !== undefined ? cleanText(patch.jdText) : current.jdText,
      notesText: patch.notesText !== undefined ? cleanText(patch.notesText) : current.notesText,
      targetRole: patch.targetRole !== undefined ? cleanText(patch.targetRole, 200) : current.targetRole,
      resumeName: patch.resumeName !== undefined ? cleanText(patch.resumeName, 200) : current.resumeName,
    }
    await store.updateProfile(next)
    const cards = store.getCards()
    const other = cards.filter((card) => !PROFILE_SOURCES.has(card.source))
    const rebuilt = buildProfileCards(next)
    await store.setCards([...rebuilt, ...other])
    return { profile: store.getProfile(), memory: memoryStats(store.getCards()) }
  }

  function filterBank(pool, level, topic) {
    let rows = pool
    if (level && level !== 'all') rows = rows.filter((question) => question.level === level)
    if (topic && topic !== 'all') rows = rows.filter((question) => question.topic === topic)
    return rows
  }

  function selectForMock(scope, count, level, topic) {
    const preset = filterBank(presetBank, level, topic)
    const personal = filterBank(store.getPersonalQuestions(), level, topic)
    if (scope === 'personal') {
      if (personal.length === 0) throw Object.assign(new Error('personal bank is empty; generate questions first'), { code: 'NO_PERSONAL_QUESTIONS', status: 409 })
      return selectQuestions(personal, { count, level, topic })
    }
    if (scope === 'preset' || personal.length === 0) {
      return selectQuestions(preset.length > 0 ? preset : presetBank, { count, level, topic })
    }
    const personalCount = Math.min(personal.length, Math.max(1, Math.round(count * 0.3)), count)
    const chosenPersonal = selectQuestions(personal, { count: personalCount, level, topic })
    const remaining = count - chosenPersonal.length
    if (remaining <= 0) return chosenPersonal.slice(0, count)
    const chosenPreset = selectQuestions(preset.length > 0 ? preset : presetBank, { count: remaining, level, topic })
    const out = []
    const max = Math.max(chosenPersonal.length, chosenPreset.length)
    for (let index = 0; index < max; index += 1) {
      if (chosenPersonal[index]) out.push(chosenPersonal[index])
      if (chosenPreset[index]) out.push(chosenPreset[index])
    }
    return out.slice(0, count)
  }

  async function startMock(body) {
    await ready
    for (const stale of store.getSessions().filter((item) => item.status === 'active')) {
      stale.status = 'abandoned'
      stale.finishedAt = Date.now()
      await store.saveSession(stale)
    }
    const profile = store.getProfile()
    const count = Math.max(1, Math.min(20, Number(body?.count) || settings.mockQuestionCount))
    const scope = ['mixed', 'preset', 'personal'].includes(body?.scope) ? body.scope : 'mixed'
    const questions = selectForMock(scope, count, body?.level, body?.topic)
    if (questions.length === 0) throw Object.assign(new Error('question bank is empty'), { code: 'BANK_EMPTY' })
    const session = {
      id: newId('mock'),
      mode: 'mock',
      status: 'active',
      createdAt: Date.now(),
      startedAt: Date.now(),
      questionIds: questions.map((question) => question.id),
      currentIndex: 0,
      answers: [],
      skipped: [],
      scope,
      targetRole: profile.targetRole,
    }
    await store.createSession(session)
    return {
      session: sessionView(session),
      question: publicQuestion(questions[0]),
      total: questions.length,
    }
  }

  async function answerMock(body) {
    await ready
    const session = store.getSession(String(body?.sessionId ?? ''))
    if (!session) throw Object.assign(new Error('session not found'), { code: 'SESSION_NOT_FOUND', status: 404 })
    if (session.status !== 'active') throw Object.assign(new Error('session is finished'), { code: 'SESSION_FINISHED', status: 409 })
    const currentId = session.questionIds[session.currentIndex]
    if (!currentId) throw Object.assign(new Error('mock session is complete'), { code: 'SESSION_COMPLETE', status: 409 })
    const questionId = String(body?.questionId ?? currentId)
    const existing = session.answers.find((item) => item.questionId === questionId)
    if (existing) {
      return {
        question: revealedQuestion(bank.find((question) => question.id === questionId)),
        feedback: existing.feedback,
        nextQuestion: publicQuestion(bank.find((question) => question.id === currentId)),
        session: sessionView(session),
        done: session.currentIndex >= session.questionIds.length,
        idempotent: true,
      }
    }
    if (questionId !== currentId) {
      throw Object.assign(new Error('question is not the current one'), { code: 'QUESTION_OUT_OF_ORDER', status: 409 })
    }
    const question = bank.find((item) => item.id === questionId)
    if (!question) throw Object.assign(new Error('question not found'), { code: 'QUESTION_NOT_FOUND', status: 404 })
    const answer = cleanText(body?.answer, 8000)
    const profile = store.getProfile()
    const query = `${question.question}\n${question.topic}\n${answer}`.slice(0, 4000)
    const memories = retrieve(store.getCards(), query, 8)
    const feedback = await generateFeedback(
      ctx,
      settings,
      { question: question.question, answer, memories, bankQuestion: question, profile, mode: 'mock' },
      undefined,
    )
    const submitted = { questionId, question: question.question, answer, submittedAt: Date.now(), feedback }
    session.answers = [...session.answers, submitted]
    session.currentIndex = Math.min(session.questionIds.length, session.currentIndex + 1)
    await store.saveSession(session)
    try {
      await store.upsertAnswerRecords([mainAnswerRecord(session, submitted, question)])
    } catch (error) {
      ctx.logger?.warn?.(`interview-coach: answer bank write failed: ${String(error)}`)
    }
    const next = bank.find((item) => item.id === session.questionIds[session.currentIndex])
    return {
      question: revealedQuestion(question),
      feedback,
      nextQuestion: publicQuestion(next),
      session: sessionView(session),
      done: session.currentIndex >= session.questionIds.length,
    }
  }

  async function startDrill(body) {
    await ready
    const session = store.getSession(String(body?.sessionId ?? ''))
    if (!session) throw Object.assign(new Error('session not found'), { code: 'SESSION_NOT_FOUND', status: 404 })
    if (session.status !== 'active') throw Object.assign(new Error('session is finished'), { code: 'SESSION_FINISHED', status: 409 })
    const { id, answer } = findDrillAnswer(session, body?.questionId)
    if (!answer) throw Object.assign(new Error('answer the main question before drilling'), { code: 'DRILL_NEEDS_ANSWER', status: 409 })
    if (answer.drill) {
      return {
        session: sessionView(session),
        question: publicQuestion(bank.find((item) => item.id === id)),
        drill: answer.drill,
        idempotent: true,
      }
    }
    const question = bank.find((item) => item.id === id)
    if (!question) throw Object.assign(new Error('question not found'), { code: 'QUESTION_NOT_FOUND', status: 404 })
    const probe = await generateProbe(
      ctx,
      settings,
      {
        question: answer.question,
        answer: answer.answer,
        feedback: answer.feedback,
        bankQuestion: question,
        level: 1,
      },
      undefined,
    )
    answer.drill = {
      status: 'active',
      level: 1,
      maxLevel: MAX_DRILL_LEVEL,
      startedAt: Date.now(),
      probes: [],
      current: { level: 1, focus: probe.focus, question: probe.question },
    }
    await store.saveSession(session)
    return {
      session: sessionView(session),
      question: publicQuestion(question),
      drill: answer.drill,
    }
  }

  async function answerDrill(body) {
    await ready
    const session = store.getSession(String(body?.sessionId ?? ''))
    if (!session) throw Object.assign(new Error('session not found'), { code: 'SESSION_NOT_FOUND', status: 404 })
    if (session.status !== 'active') throw Object.assign(new Error('session is finished'), { code: 'SESSION_FINISHED', status: 409 })
    const { id, answer } = findDrillAnswer(session, body?.questionId)
    if (!answer?.drill) throw Object.assign(new Error('start the drill before answering it'), { code: 'DRILL_NOT_STARTED', status: 409 })
    const drill = answer.drill
    if (drill.status === 'done') {
      return { drill, feedback: null, nextQuestion: null, done: true, summary: drill.summary ?? null, session: sessionView(session), idempotent: true }
    }
    const probe = drill.current
    if (!probe) throw Object.assign(new Error('drill has no current question'), { code: 'DRILL_COMPLETE', status: 409 })
    const text = cleanText(body?.answer, 4000)
    if (!text) throw Object.assign(new Error('answer is required'), { code: 'ANSWER_REQUIRED', status: 400 })
    const question = bank.find((item) => item.id === id)
    if (!question) throw Object.assign(new Error('question not found'), { code: 'QUESTION_NOT_FOUND', status: 404 })
    const query = `${answer.question}\n${probe.question}\n${text}`.slice(0, 4000)
    const memories = retrieve(store.getCards(), query, 6)
    const feedback = await generateDrillFeedback(
      ctx,
      settings,
      {
        mainQuestion: answer.question,
        mainAnswer: answer.answer,
        probe,
        answer: text,
        history: drill.probes,
        level: probe.level,
        memories,
        bankQuestion: question,
        profile: store.getProfile(),
      },
      undefined,
    )
    const entry = {
      level: probe.level,
      focus: probe.focus,
      question: probe.question,
      answer: text,
      submittedAt: Date.now(),
      feedback: {
        score: feedback.score,
        strengths: feedback.strengths ?? [],
        gaps: feedback.gaps ?? [],
        suggestions: feedback.suggestions ?? [],
        reference_answer: feedback.reference_answer ?? '',
        improved_answer: feedback.improved_answer ?? '',
        source: feedback.source ?? 'llm',
      },
    }
    drill.probes = [...(drill.probes ?? []), entry]
    drill.level = probe.level
    try {
      await store.upsertAnswerRecords([drillAnswerRecord(session, answer, entry, question)])
    } catch (error) {
      ctx.logger?.warn?.(`interview-coach: drill answer bank write failed: ${String(error)}`)
    }
    if (probe.level < MAX_DRILL_LEVEL && feedback.nextQuestion?.question) {
      drill.current = {
        level: probe.level + 1,
        focus: feedback.nextQuestion.focus || '边界与权衡',
        question: feedback.nextQuestion.question,
      }
      drill.status = 'active'
    } else {
      drill.current = null
      drill.status = 'done'
      drill.completedAt = Date.now()
      drill.summary = summarizeDrill(drill)
    }
    await store.saveSession(session)
    return {
      drill,
      feedback: entry.feedback,
      nextQuestion: drill.current,
      done: drill.status === 'done',
      summary: drill.summary ?? null,
      session: sessionView(session),
    }
  }

  async function askSupplement(body) {
    await ready
    const session = store.getSession(String(body?.sessionId ?? ''))
    if (!session) throw Object.assign(new Error('session not found'), { code: 'SESSION_NOT_FOUND', status: 404 })
    if (session.status !== 'active') throw Object.assign(new Error('session is finished'), { code: 'SESSION_FINISHED', status: 409 })
    const { id, answer } = findDrillAnswer(session, body?.questionId)
    if (!answer) throw Object.assign(new Error('answer the main question before asking a supplement'), { code: 'SUPPLEMENT_NEEDS_ANSWER', status: 409 })
    const questionText = cleanText(body?.question, 300)
    if (!questionText) throw Object.assign(new Error('question is required'), { code: 'QUESTION_REQUIRED', status: 400 })
    const question = bank.find((item) => item.id === id)
    if (!question) throw Object.assign(new Error('question not found'), { code: 'QUESTION_NOT_FOUND', status: 404 })
    const reference = answer.feedback?.full_answer || question.sampleAnswer || ''
    const query = `${answer.question}\n${reference}\n${questionText}`.slice(0, 4000)
    const memories = retrieve(store.getCards(), query, 6)
    const result = await generateSupplement(
      ctx,
      settings,
      {
        mainQuestion: answer.question,
        reference,
        candidateAnswer: answer.answer,
        question: questionText,
        memories,
        bankQuestion: question,
        profile: store.getProfile(),
      },
      undefined,
    )
    const entry = {
      question: questionText,
      reference_answer: result.reference_answer ?? '',
      answer: result.answer,
      evidence: result.evidence ?? [],
      source: result.source ?? 'llm',
      createdAt: Date.now(),
    }
    answer.supplements = [...(answer.supplements ?? []), entry]
    await store.saveSession(session)
    return {
      question: entry.question,
      reference_answer: entry.reference_answer,
      answer: entry.answer,
      evidence: entry.evidence,
      questions: result.next_questions ?? [],
      source: entry.source,
      session: sessionView(session),
    }
  }


  async function generatePersonal(body) {
    await ready
    const cards = store.getCards()
    if (cards.length === 0) throw Object.assign(new Error('import resume or notes before generating personal questions'), { code: 'NO_MEMORY', status: 409 })
    const count = Math.max(1, Math.min(MAX_PERSONAL_QUESTIONS, Number(body?.count) || 10))
    const configuredTimeout = Number(config?.personalTimeoutMs)
    const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? Math.min(120_000, configuredTimeout)
      : PERSONAL_GENERATE_TIMEOUT_MS
    const controller = new AbortController()
    const marker = Symbol('personal-generation-timeout')
    let timer = null
    const watchdog = new Promise((resolve) => {
      timer = setTimeout(() => {
        controller.abort()
        resolve(marker)
      }, timeoutMs)
    })
    const startedAt = Date.now()
    try {
      const generation = generatePersonalQuestions(ctx, config, { cards, profile: store.getProfile(), count }, controller.signal)
      generation.catch(() => {})
      const result = await Promise.race([generation, watchdog])
      const timedOut = result === marker || controller.signal.aborted || result.source === 'personal-fallback-timeout'
      if (result === marker) {
        const fallback = normalizePersonalQuestions(
          fallbackPersonalQuestions({ cards, profile: store.getProfile(), count }).questions,
          [],
          count,
        )
        ctx.logger?.warn?.(`interview-coach: personal questions timed out after ${Date.now() - startedAt}ms`)
        return {
          questions: fallback,
          source: 'personal-fallback-timeout',
          timedOut: true,
          timeoutMs,
          count: fallback.length,
          memory: memoryStats(cards),
        }
      }
      ctx.logger?.info?.(`interview-coach: personal questions count=${count} source=${result.source} elapsed=${Date.now() - startedAt}ms${timedOut ? ' timeout=true' : ''}`)
      return {
        questions: result.questions,
        source: result.source,
        timedOut,
        timeoutMs,
        count: result.questions.length,
        memory: memoryStats(cards),
      }
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  async function adoptPersonal(body) {
    await ready
    const incoming = Array.isArray(body?.questions) ? body.questions : []
    const current = store.getPersonalQuestions()
    const normalized = normalizePersonalQuestions(incoming, [], MAX_PERSONAL_QUESTIONS)
    const existing = new Set(current.map((question) => question.question))
    let nextNumber = current.reduce((max, question) => {
      const match = /^P-(\d+)$/.exec(String(question.id ?? ''))
      return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    const added = normalized
      .filter((question) => !existing.has(question.question))
      .slice(0, Math.max(0, 60 - current.length))
      .map((question) => {
        nextNumber += 1
        return { ...question, id: `P-${String(nextNumber).padStart(3, '0')}`, createdAt: Date.now() }
      })
    if (added.length > 0) await store.setPersonalQuestions([...current, ...added])
    rebuildBank()
    return { added: added.length, questions: store.getPersonalQuestions(), bank: bankSummary(bank) }
  }

  async function deletePersonal(body) {
    await ready
    const id = String(body?.id ?? '')
    const active = store.getSessions().find((session) => session.status === 'active')
    if (active?.questionIds?.includes(id)) throw Object.assign(new Error('this question is used by the active mock'), { code: 'PERSONAL_IN_USE', status: 409 })
    const current = store.getPersonalQuestions()
    const next = current.filter((question) => question.id !== id)
    await store.setPersonalQuestions(next)
    rebuildBank()
    return { removed: current.length - next.length, questions: store.getPersonalQuestions(), bank: bankSummary(bank) }
  }

  async function skipMock(body) {
    await ready
    const session = store.getSession(String(body?.sessionId ?? ''))
    if (!session) throw Object.assign(new Error('session not found'), { code: 'SESSION_NOT_FOUND', status: 404 })
    if (session.status !== 'active') throw Object.assign(new Error('session is finished'), { code: 'SESSION_FINISHED', status: 409 })
    const currentId = session.questionIds?.[session.currentIndex]
    if (!currentId) throw Object.assign(new Error('mock session is complete'), { code: 'SESSION_COMPLETE', status: 409 })
    if ((session.answers ?? []).some((item) => item.questionId === currentId)) {
      throw Object.assign(new Error('current question is already answered'), { code: 'QUESTION_ALREADY_ANSWERED', status: 409 })
    }
    const skipped = Array.isArray(session.skipped) ? session.skipped : []
    if (!skipped.some((item) => item.questionId === currentId)) {
      skipped.push({ questionId: currentId, skippedAt: Date.now() })
    }
    session.skipped = skipped
    session.currentIndex = (session.currentIndex ?? 0) + 1
    await store.saveSession(session)
    const next = bank.find((question) => question.id === session.questionIds?.[session.currentIndex]) ?? null
    return {
      session: sessionView(session),
      question: next ? publicQuestion(next) : null,
      nextQuestion: next ? publicQuestion(next) : null,
      done: !next,
    }
  }

  async function finishMock(body) {
    await ready
    const session = store.getSession(String(body?.sessionId ?? ''))
    if (!session) throw Object.assign(new Error('session not found'), { code: 'SESSION_NOT_FOUND', status: 404 })
    if (session.report) return { report: session.report, session: sessionView(session) }
    if ((session.answers ?? []).length === 0) throw Object.assign(new Error('answer at least one question'), { code: 'NO_ANSWERS', status: 409 })
    const report = aggregateReport(session)
    session.status = 'finished'
    session.finishedAt = Date.now()
    session.report = report
    await store.saveSession(session)
    return { report, session: sessionView(session) }
  }

  async function listAnswers(params) {
    await ready
    const all = store.getAnswerRecords()
    const q = cleanText(params?.get('q') ?? '', 200).toLowerCase()
    const level = String(params?.get('level') ?? '')
    const scoreBand = String(params?.get('score') ?? '')
    const onlyFavorites = ['1', 'true'].includes(String(params?.get('favorite') ?? ''))
    const matches = all.filter((item) => {
      if (onlyFavorites && !item.favorite) return false
      if (level && level !== 'all' && item.level !== level) return false
      if (scoreBand === 'high' && !(Number.isFinite(item.score) && item.score >= 80)) return false
      if (scoreBand === 'mid' && !(Number.isFinite(item.score) && item.score >= 60 && item.score < 80)) return false
      if (scoreBand === 'low' && !(Number.isFinite(item.score) && item.score < 60)) return false
      if (!q) return true
      return [
        item.question,
        item.answer,
        item.parentQuestion,
        item.topic,
        item.focus,
        item.feedback?.short_answer,
        item.feedback?.full_answer,
        ...(item.feedback?.gaps ?? []),
        ...(item.feedback?.strengths ?? []),
      ]
        .join('\n')
        .toLowerCase()
        .includes(q)
    })
    return {
      items: matches.slice(0, 100),
      total: matches.length,
      all: all.length,
      favorites: all.filter((item) => item.favorite).length,
      limit: 100,
    }
  }

  async function favoriteAnswer(body) {
    await ready
    const item = await store.setAnswerFavorite(String(body?.id ?? ''), Boolean(body?.favorite))
    if (!item) throw Object.assign(new Error('answer not found'), { code: 'ANSWER_NOT_FOUND', status: 404 })
    return { item, answers: answerStats(store.getAnswerRecords()) }
  }

  const routes = [
    {
      path: '/interview-coach/role',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await setRole(body))
      },
    },
    {
      path: '/interview-coach/state',
      methods: ['GET', 'HEAD'],
      async handle(req, res) {
        sendJson(res, 200, await state(), req.method)
      },
    },
    {
      path: '/interview-coach/answers',
      methods: ['GET', 'HEAD'],
      async handle(req, res) {
        const url = new URL(req.url ?? '/', 'http://localhost')
        sendJson(res, 200, await listAnswers(url.searchParams), req.method)
      },
    },
    {
      path: '/interview-coach/answers/favorite',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await favoriteAnswer(body))
      },
    },
    {
      path: '/interview-coach/setup',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        const result = await saveProfile({
          resumeText: body?.resumeText,
          resumeName: body?.resumeName,
          jdText: body?.jdText,
          notesText: body?.notesText,
          targetRole: body?.targetRole,
        })
        sendJson(res, 200, {
          ok: true,
          profile: {
            resumeName: result.profile.resumeName,
            resumeChars: result.profile.resumeText.length,
            jdChars: result.profile.jdText.length,
            notesChars: result.profile.notesText.length,
            targetRole: result.profile.targetRole,
          },
          memory: result.memory,
        })
      },
    },
    {
      path: '/interview-coach/setup/import',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req, 12 * 1024 * 1024)
        const text = await readImportedText({ filename: body?.filename, base64: body?.base64 })
        sendJson(res, 200, { ok: true, name: body?.filename ?? 'resume.txt', text: text.slice(0, 200_000), chars: text.length })
      },
    },
    {
      path: '/interview-coach/memory',
      methods: ['GET', 'HEAD'],
      async handle(req, res) {
        await ready
        const cards = store.getCards().map(({ embedding, ...card }) => card)
        sendJson(res, 200, { cards, stats: memoryStats(cards) }, req.method)
      },
    },
    {
      path: '/interview-coach/memory/delete',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        const cards = await store.removeCard(String(body?.id ?? ''))
        sendJson(res, 200, { ok: true, stats: memoryStats(cards) })
      },
    },
    {
      path: '/interview-coach/bank',
      methods: ['GET', 'HEAD'],
      async handle(req, res) {
        await ready
        const ordered = [...bank.filter((question) => question.personal), ...bank.filter((question) => !question.personal)]
        sendJson(res, 200, { summary: bankSummary(bank), questions: ordered.map(publicQuestion) }, req.method)
      },
    },
    {
      path: '/interview-coach/personal/generate',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await generatePersonal(body))
      },
    },
    {
      path: '/interview-coach/personal/adopt',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await adoptPersonal(body))
      },
    },
    {
      path: '/interview-coach/personal/delete',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await deletePersonal(body))
      },
    },
    {
      path: '/interview-coach/interviewer/candidate',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await saveInterviewerCandidate(body))
      },
    },
    {
      path: '/interview-coach/interviewer/plan/generate',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await generateInterviewerPlan(body))
      },
    },
    {
      path: '/interview-coach/interviewer/plan',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await saveInterviewerPlan(body))
      },
    },
    {
      path: '/interview-coach/interviewer/start',
      methods: ['POST'],
      async handle(req, res) {
        sendJson(res, 200, await startInterview())
      },
    },
    {
      path: '/interview-coach/interviewer/answer',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await answerInterview(body))
      },
    },
    {
      path: '/interview-coach/interviewer/finish',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await finishInterview(body))
      },
    },
    {
      path: '/interview-coach/interviewer/report',
      methods: ['GET', 'HEAD', 'POST'],
      async handle(req, res) {
        if (req.method === 'POST') {
          const body = await readBody(req)
          return sendJson(res, 200, await saveInterviewerReport(body))
        }
        const url = new URL(req.url ?? '/', 'http://localhost')
        sendJson(res, 200, await readInterviewerReport(url.searchParams.get('sessionId')), req.method)
      },
    },
    {
      path: '/interview-coach/mock/start',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await startMock(body))
      },
    },
    {
      path: '/interview-coach/mock/answer',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await answerMock(body))
      },
    },
    {
      path: '/interview-coach/mock/drill/start',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await startDrill(body))
      },
    },
    {
      path: '/interview-coach/mock/drill/answer',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await answerDrill(body))
      },
    },
    {
      path: '/interview-coach/mock/supplement',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await askSupplement(body))
      },
    },
    {
      path: '/interview-coach/mock/skip',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await skipMock(body))
      },
    },
    {
      path: '/interview-coach/mock/finish',
      methods: ['POST'],
      async handle(req, res) {
        const body = await readBody(req)
        sendJson(res, 200, await finishMock(body))
      },
    },
    {
      path: '/interview-coach/answer',
      methods: ['POST'],
      async handle(req, res) {
        await ready
        const body = await readBody(req)
        const questionText = cleanText(body?.question, 2000)
        if (!questionText) return sendError(res, 400, 'QUESTION_REQUIRED', 'question is required')
        const question = bank.find((item) => item.question === questionText) ?? null
        const profile = store.getProfile()
        const memories = retrieve(store.getCards(), questionText, 8)
        const feedback = await generateFeedback(
          ctx,
          settings,
          { question: questionText, answer: cleanText(body?.answer, 8000), memories, bankQuestion: question, profile, mode: 'real' },
          undefined,
        )
        sendJson(res, 200, { question: questionText, feedback })
      },
    },
  ]

  ctx.inject(['webServer', 'connection'], (sctx) => {
    sctx.effect(() => {
      const disposers = []
      for (const route of routes) {
        disposers.push(
          sctx.webServer.register({
            kind: 'exact',
            path: route.path,
            handler: async (req, res) => {
              if (!routeAuth(sctx.connection, req, res)) return
              if (!assertMethod(req, res, route.methods)) return
              try {
                await route.handle(req, res)
              } catch (error) {
                const status = Number(error?.status) || (error?.code === 'BODY_TOO_LARGE' ? 413 : 500)
                ctx.logger?.warn?.(`interview-coach: ${route.path} failed: ${String(error?.stack ?? error)}`)
                sendError(res, status, error?.code ?? 'INTERNAL', String(error?.message ?? error))
              }
            },
          }),
        )
      }
      return () => {
        for (const dispose of disposers.reverse()) {
          try {
            dispose()
          } catch {
            // The route owner is already gone.
          }
        }
      }
    }, 'interview-coach: routes')
  })

  return { store, state }
}
