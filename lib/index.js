import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { loadBank, bankSummary, publicQuestion, revealedQuestion, selectQuestions } from './bank.js'
import { aggregateReport, generateDrillFeedback, generateFeedback, generateProbe, generateSupplement, MAX_DRILL_LEVEL } from './coach.js'
import { buildProfileCards, memoryStats, retrieve } from './memory.js'
import { createStore } from './store.js'
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
  const settings = publicSettings(config)
  const ready = Promise.all([store.ready(), loadBank()])
  let bank = []
  ready
    .then(([, rows]) => {
      bank = rows
      ctx.logger?.info?.(`interview-coach: ready with ${bank.length} questions`)
    })
    .catch((error) => ctx.logger?.warn?.(`interview-coach: init failed: ${String(error)}`))

  async function state() {
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
      session: activeView,
      lastSession: active ? null : sessionView(latestFinished),
      report: store.latestReport(),
    }
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

  async function startMock(body) {
    await ready
    for (const stale of store.getSessions().filter((item) => item.status === 'active')) {
      stale.status = 'abandoned'
      stale.finishedAt = Date.now()
      await store.saveSession(stale)
    }
    const profile = store.getProfile()
    const count = Math.max(1, Math.min(20, Number(body?.count) || settings.mockQuestionCount))
    const questions = selectQuestions(bank, { count, level: body?.level, topic: body?.topic })
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
    session.answers = [...session.answers, { questionId, question: question.question, answer, submittedAt: Date.now(), feedback }]
    session.currentIndex = Math.min(session.questionIds.length, session.currentIndex + 1)
    await store.saveSession(session)
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
        improved_answer: feedback.improved_answer ?? '',
        source: feedback.source ?? 'llm',
      },
    }
    drill.probes = [...(drill.probes ?? []), entry]
    drill.level = probe.level
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

  const routes = [
    {
      path: '/interview-coach/state',
      methods: ['GET', 'HEAD'],
      async handle(req, res) {
        sendJson(res, 200, await state(), req.method)
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
        sendJson(res, 200, { summary: bankSummary(bank), questions: bank.map(publicQuestion) }, req.method)
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
