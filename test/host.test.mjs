import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { apply } from '../lib/index.js'
import { createStore } from '../lib/store.js'

function makeHarness({ hangPersonal = false, ignorePersonalAbort = false } = {}) {
  const routes = new Map()
  const disposers = []
  const ctx = {
    logger: { info() {}, warn() {} },
    inject(_services, callback) {
      callback({
        webServer: {
          register(route) {
            routes.set(route.path, route.handler)
            return () => routes.delete(route.path)
          },
        },
        connection: { requestRejection: () => undefined },
        effect(fn) {
          const dispose = fn()
          if (typeof dispose === 'function') disposers.push(dispose)
          return dispose
        },
      })
    },
    llm: {
      listProviders() {
        return ['fake']
      },
      listModels() {
        return ['fake-model']
      },
      async *stream({ messages, signal } = {}) {
        const system = messages?.[0]?.content?.[0]?.text ?? ''
        if (system.includes('个性化题库生成模块')) {
          if (hangPersonal) {
            if (ignorePersonalAbort) {
              await new Promise(() => {})
            } else {
              await new Promise((resolve, reject) => {
                const fail = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError', code: 'ABORTED' }))
                if (signal?.aborted) return fail()
                signal?.addEventListener('abort', fail, { once: true })
              })
            }
          }
          yield {
            type: 'text-delta',
            text: JSON.stringify({
              questions: [
                {
                  level: 'L2',
                  topic: '简历追问',
                  question: '你简历里的推荐系统重构，为什么先做检索层而不是重排层？',
                  intent: '验证项目取舍',
                  keyPoints: ['说清瓶颈', '说清取舍', '说清结果'],
                  sampleAnswer: '当时瓶颈在召回，先改检索层能用更低成本拿到收益。',
                  followups: ['怎么验证是召回瓶颈？'],
                  redFlags: ['只讲团队成果'],
                  provenance: ['card-1'],
                  tags: ['personal', 'resume'],
                },
                {
                  level: 'L4',
                  topic: 'JD 匹配',
                  question: '目标 JD 要求 Agent 运行时，你哪段经历能证明你处理过工具失败？',
                  intent: '验证 JD 匹配',
                  keyPoints: ['具体案例', '失败处理', '指标'],
                  sampleAnswer: '可以从工具调用失败后的重试和降级讲起。',
                  followups: ['怎么避免重试风暴？'],
                  redFlags: ['只说了解 MCP'],
                  provenance: ['card-2'],
                  tags: ['personal', 'jd'],
                },
              ],
            }),
          }
          yield { type: 'finish', kind: 'stop' }
          return
        }
        if (system.includes('只负责生成面试计划')) {
          yield {
            type: 'text-delta',
            text: JSON.stringify({
              questions: [
                {
                  level: 'L2',
                  topic: 'RAG',
                  question: '请讲一个你做过的 RAG 取舍。',
                  intent: '验证检索与重排的取舍',
                  lookFor: ['说清召回瓶颈', '说清 rerank 的收益', '有指标'],
                  followups: ['怎么评估融合有效？'],
                  redFlags: ['只讲概念'],
                  timeBoxMin: 6,
                },
                {
                  level: 'L3',
                  topic: '工具运行时',
                  question: '工具调用失败时，你怎么收敛？',
                  intent: '验证失败处理',
                  lookFor: ['重试', '降级', '停止条件'],
                  followups: ['怎么防止重试风暴？'],
                  redFlags: ['只说 try/catch'],
                  timeBoxMin: 8,
                },
              ],
            }),
          }
          yield { type: 'finish', kind: 'stop' }
          return
        }
        if (system.includes('面试记录整理助手')) {
          yield {
            type: 'text-delta',
            text: JSON.stringify({
              summary: '候选人有检索优化经验，工具失败处理讲得较浅。',
              dimensions: [
                { key: 'technical_depth', score: 4, evidence: ['召回率从 70% 提到 88%'] },
                { key: 'problem_solving', score: 3, evidence: ['能讲清指标'] },
                { key: 'communication', score: 3, evidence: ['能讲清指标'] },
                { key: 'role_match', score: 3, evidence: ['能讲清指标'] },
              ],
              strengths: ['有指标'],
              risks: ['工具失败处理缺少停止条件'],
              recommendation: 'hire',
              next_steps: ['补问重试风暴和停止条件'],
            }),
          }
          yield { type: 'finish', kind: 'stop' }
          return
        }
        if (system.includes('补充提问模块')) {
          yield {
            type: 'text-delta',
            text: JSON.stringify({
              reference_answer: '我会用 RRF 融合两路召回：它只看排名，不依赖分数绝对尺度。k 先取 60，再用验证集调。',
              answer: '参考答案选择 RRF，是因为它不依赖两路分数的绝对尺度；k 通常取 60，再用验证集调。',
              evidence: [{ source: 'bank', text: '并行召回后做 RRF 融合和 rerank' }],
              next_questions: ['如果两路分数不可比怎么办？', '怎么验证融合有效？'],
            }),
          }
          yield { type: 'finish', kind: 'stop' }
          return
        }
        yield {
          type: 'text-delta',
          text: JSON.stringify({
            cue: ['先给结论', '讲清机制', '补指标'],
            short_answer: '先给结论，再讲混合检索机制和指标。',
            full_answer: '第一段：结论。\n\n第二段：混合检索和指标。',
            evidence: [{ source: 'resume', text: 'P99 从 2s 降到 300ms' }],
            followups: ['RRF 的 k 怎么选？'],
            score: 82,
            claim_type: 'technical',
            evidence_status: 'verified',
            strengths: ['有指标'],
            gaps: ['缺少失败案例'],
            suggestions: ['补一个失败案例'],
            reference_answer: '参考口径：先讲状态与转移，再讲失败重试和退出边界。',
            improved_answer: '改进版\n\n补上失败案例和王牌指标。',
            supplement_questions: ['RRF 的 k 怎么选？', '两路分数不可比怎么办？', '怎么验证融合有效？'],
          }),
        }
        yield { type: 'finish', kind: 'stop' }
      },
    },
  }
  return { routes, ctx, disposers }
}

function request(method, body, url = '/') {
  const stream = body === undefined ? Readable.from([]) : Readable.from([Buffer.from(JSON.stringify(body))])
  stream.method = method
  stream.url = url
  return stream
}

function response() {
  const state = { status: 0, headers: {}, body: '' }
  return {
    state,
    writeHead(status, headers = {}) {
      state.status = status
      state.headers = headers
    },
    end(chunk) {
      if (chunk !== undefined) state.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
    },
  }
}

async function call(routes, path, method = 'GET', body) {
  const [pathname] = path.split('?')
  const handler = routes.get(pathname)
  assert.ok(handler, `missing route ${pathname}`)
  const res = response()
  await handler(request(method, body, path), res)
  const json = res.state.body ? JSON.parse(res.state.body) : null
  return { status: res.state.status, json }
}

test('host supports setup → mock → answer → finish → state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-test-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const { routes, ctx } = makeHarness()
    const plugin = apply(ctx, { provider: 'deepseek-account', model: 'deepseek-flash' })
    assert.ok(plugin.store)

    const initial = await call(routes, '/interview-coach/state')
    assert.equal(initial.status, 200)
    assert.equal(initial.json.bank.total, 120)
    assert.equal(initial.json.session, null)

    const imported = await call(routes, '/interview-coach/setup/import', 'POST', {
      filename: 'resume.txt',
      base64: Buffer.from('候选人做过 RAG 和 Agent 项目。').toString('base64'),
    })
    assert.equal(imported.status, 200)
    assert.equal(imported.json.name, 'resume.txt')
    assert.match(imported.json.text, /RAG/)

    const setup = await call(routes, '/interview-coach/setup', 'POST', {
      resumeText: '候选人有推荐系统和 RAG 项目经验。\n负责推荐系统重构，P99 从 2s 降到 300ms。',
      targetRole: 'Agent 开发工程师',
    })
    assert.equal(setup.status, 200)
    assert.ok(setup.json.memory.total >= 1)

    const started = await call(routes, '/interview-coach/mock/start', 'POST', { count: 2 })
    assert.equal(started.status, 200)
    assert.equal(started.json.total, 2)
    const restarted = await call(routes, '/interview-coach/mock/start', 'POST', { count: 2 })
    assert.equal(restarted.status, 200)
    const sessions = plugin.store.getSessions()
    assert.equal(sessions.filter((item) => item.status === 'active').length, 1)
    assert.equal(sessions.find((item) => item.id === started.json.session.id).status, 'abandoned')
    const session = sessions[0]
    assert.equal(session.questionIds.length, 2)
    const [firstId, secondId] = session.questionIds

    const wrong = await call(routes, '/interview-coach/mock/answer', 'POST', {
      sessionId: session.id,
      questionId: secondId,
      answer: '乱序回答',
    })
    assert.equal(wrong.status, 409)
    assert.equal(wrong.json.error.code, 'QUESTION_OUT_OF_ORDER')

    const missing = await call(routes, '/interview-coach/mock/answer', 'POST', {
      sessionId: 'mock_missing',
      questionId: firstId,
      answer: '这轮会话已经不存在了',
    })
    assert.equal(missing.status, 404)
    assert.equal(missing.json.error.code, 'SESSION_NOT_FOUND')

    const answered = await call(routes, '/interview-coach/mock/answer', 'POST', {
      sessionId: session.id,
      questionId: firstId,
      answer: '先给结论，我们用混合检索和 rerank，P99 从 2s 降到 300ms。',
    })
    assert.equal(answered.status, 200)
    assert.equal(answered.json.feedback.score, 82)
    assert.equal(answered.json.feedback.source, 'llm')
    assert.equal(answered.json.feedback.claim_type, 'technical')
    assert.equal(answered.json.feedback.evidence_status, 'verified')
    assert.equal(answered.json.feedback.full_answer.includes('\n\n'), true)
    assert.equal(Array.isArray(answered.json.feedback.answer_review.highlights), true)
    assert.equal(Array.isArray(answered.json.feedback.answer_review.corrections), true)
    assert.equal(Array.isArray(answered.json.feedback.answer_review.missing), true)
    assert.equal(answered.json.done, false)

    const idempotent = await call(routes, '/interview-coach/mock/answer', 'POST', {
      sessionId: session.id,
      questionId: firstId,
      answer: '重复提交',
    })
    assert.equal(idempotent.status, 200)
    assert.equal(idempotent.json.idempotent, true)

    const supplement = await call(routes, '/interview-coach/mock/supplement', 'POST', {
      sessionId: session.id,
      questionId: firstId,
      question: 'RRF 的 k 怎么选？',
    })
    assert.equal(supplement.status, 200)
    assert.match(supplement.json.reference_answer, /RRF/)
    assert.match(supplement.json.answer, /RRF/)
    assert.equal(supplement.json.questions.length, 2)
    assert.equal(supplement.json.questions[0], '如果两路分数不可比怎么办？')
    const supplementAgain = await call(routes, '/interview-coach/mock/supplement', 'POST', {
      sessionId: session.id,
      questionId: firstId,
      question: '如果两路分数不可比怎么办？',
    })
    assert.equal(supplementAgain.status, 200)

    const supplementCustom = await call(routes, '/interview-coach/mock/supplement', 'POST', {
      sessionId: session.id,
      questionId: firstId,
      question: '为什么这里不直接用向量检索？',
    })
    assert.equal(supplementCustom.status, 200)
    assert.equal(supplementCustom.json.question, '为什么这里不直接用向量检索？')
    assert.equal(plugin.store.getSession(session.id).answers[0].supplements.length, 3)

    const drillStart = await call(routes, '/interview-coach/mock/drill/start', 'POST', {
      sessionId: session.id,
      questionId: firstId,
    })
    assert.equal(drillStart.status, 200)
    assert.equal(drillStart.json.drill.status, 'active')
    assert.equal(drillStart.json.drill.current.level, 1)
    assert.ok(drillStart.json.drill.current.question.length > 0)

    let drillReply = null
    for (let level = 1; level <= 3; level += 1) {
      const current = level === 1 ? drillStart.json.drill.current : drillReply.json.nextQuestion
      assert.equal(current.level, level)
      drillReply = await call(routes, '/interview-coach/mock/drill/answer', 'POST', {
        sessionId: session.id,
        questionId: firstId,
        answer: `第 ${level} 层回答：讲机制、边界和指标。`,
      })
      assert.equal(drillReply.status, 200)
      assert.equal(drillReply.json.feedback.score, 82)
      assert.match(drillReply.json.feedback.reference_answer, /参考口径/)
      if (level < 3) assert.equal(drillReply.json.nextQuestion.level, level + 1)
    }
    assert.equal(drillReply.json.done, true)
    assert.equal(drillReply.json.drill.summary.count, 3)
    assert.equal(drillReply.json.drill.summary.average, 82)

    const finished = await call(routes, '/interview-coach/mock/finish', 'POST', { sessionId: session.id })
    assert.equal(finished.status, 200)
    assert.equal(finished.json.report.questionCount, 1)
    assert.equal(finished.json.report.drillCount, 3)
    assert.equal(finished.json.report.drillAverage, 82)
    assert.equal(finished.json.report.answers[0].drill.probes.length, 3)
    assert.match(finished.json.report.answers[0].drill.probes[0].referenceAnswer, /参考口径/)
    assert.equal(finished.json.session.status, 'finished')

    const after = await call(routes, '/interview-coach/state')
    assert.equal(after.status, 200)
    assert.equal(after.json.session, null)
    assert.equal(after.json.report.averageScore, 82)
    assert.equal(after.json.answers.total, 4)

    const answerLibrary = await call(routes, '/interview-coach/answers')
    assert.equal(answerLibrary.status, 200)
    assert.equal(answerLibrary.json.total, 4)
    assert.equal(answerLibrary.json.items.length, 4)
    assert.equal(answerLibrary.json.items.some((item) => item.kind === 'main'), true)
    assert.equal(answerLibrary.json.items.some((item) => item.kind === 'drill'), true)

    const searched = await call(routes, '/interview-coach/answers?q=第%202%20层')
    assert.equal(searched.status, 200)
    assert.equal(searched.json.total, 1)
    assert.match(searched.json.items[0].answer, /第 2 层/)

    const toFavorite = answerLibrary.json.items[0]
    const favorite = await call(routes, '/interview-coach/answers/favorite', 'POST', {
      id: toFavorite.id,
      favorite: true,
    })
    assert.equal(favorite.status, 200)
    assert.equal(favorite.json.item.favorite, true)
    assert.equal(favorite.json.answers.favorites, 1)

    const favorites = await call(routes, '/interview-coach/answers?favorite=1')
    assert.equal(favorites.status, 200)
    assert.equal(favorites.json.total, 1)
    assert.equal(favorites.json.items[0].id, toFavorite.id)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})


test('host backfills answer library from existing sessions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-answer-backfill-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const seedRoot = join(root, 'storages', 'interview-coach')
    const seed = createStore(seedRoot)
    await seed.ready()
    await seed.saveSession({
      id: 'mock_backfill',
      status: 'finished',
      questionIds: ['L0-01'],
      currentIndex: 1,
      scope: 'preset',
      answers: [
        {
          questionId: 'L0-01',
          question: 'Agent 和固定 workflow 的本质区别是什么？',
          answer: 'Agent 会根据 observation 动态决定下一步。',
          submittedAt: 1234,
          feedback: { score: 77, gaps: ['没有讲失败处理'] },
        },
      ],
      createdAt: 1200,
      finishedAt: 1300,
    })

    const { routes, ctx } = makeHarness()
    const plugin = apply(ctx, { provider: 'deepseek-account', model: 'deepseek-flash' })
    const state = await call(routes, '/interview-coach/state')
    assert.equal(state.status, 200)
    const records = plugin.store.getAnswerRecords()
    assert.equal(records.length, 1)
    assert.equal(records[0].id, 'mock_backfill:L0-01:main')
    assert.equal(records[0].score, 77)
    assert.equal(records[0].answer, 'Agent 会根据 observation 动态决定下一步。')
    assert.equal(state.json.answers.total, 1)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('host generates, adopts, and uses personal questions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-personal-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const { routes, ctx } = makeHarness()
    apply(ctx, { provider: 'deepseek-account', model: 'deepseek-flash' })

    const setup = await call(routes, '/interview-coach/setup', 'POST', {
      resumeText: '负责推荐系统重构，P99 从 2s 降到 300ms。\n负责 Agent 工具运行时，处理过工具超时和降级。',
      targetRole: 'Agent 开发工程师',
    })
    assert.equal(setup.status, 200)

    const generated = await call(routes, '/interview-coach/personal/generate', 'POST', { count: 2 })
    assert.equal(generated.status, 200)
    assert.equal(generated.json.questions.length, 2)
    assert.equal(generated.json.source, 'llm')

    const adopted = await call(routes, '/interview-coach/personal/adopt', 'POST', { questions: generated.json.questions })
    assert.equal(adopted.status, 200)
    assert.equal(adopted.json.added, 2)
    assert.equal(adopted.json.bank.personal, 2)
    assert.equal(adopted.json.bank.total, 122)
    assert.match(adopted.json.questions[0].id, /^P-/)

    const state = await call(routes, '/interview-coach/state')
    assert.equal(state.json.bank.personal, 2)
    assert.equal(state.json.bank.total, 122)

    const started = await call(routes, '/interview-coach/mock/start', 'POST', { count: 2, scope: 'personal' })
    assert.equal(started.status, 200)
    assert.equal(started.json.session.scope, 'personal')
    assert.equal(started.json.total, 2)

    const used = await call(routes, '/interview-coach/personal/delete', 'POST', { id: adopted.json.questions[0].id })
    assert.equal(used.status, 409)
    assert.equal(used.json.error.code, 'PERSONAL_IN_USE')

    const reset = await call(routes, '/interview-coach/mock/start', 'POST', { count: 2, scope: 'preset' })
    assert.equal(reset.status, 200)
    const deleted = await call(routes, '/interview-coach/personal/delete', 'POST', { id: adopted.json.questions[0].id })
    assert.equal(deleted.status, 200)
    assert.equal(deleted.json.removed, 1)
    assert.equal(deleted.json.bank.personal, 1)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('personal generation is bounded by a timeout and returns fallback questions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-personal-timeout-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const { routes, ctx } = makeHarness({ hangPersonal: true })
    apply(ctx, { provider: 'deepseek-account', model: 'deepseek-flash', personalTimeoutMs: 30 })

    const setup = await call(routes, '/interview-coach/setup', 'POST', {
      resumeText: '负责推荐系统重构，P99 从 2s 降到 300ms。',
      targetRole: 'Agent 开发工程师',
    })
    assert.equal(setup.status, 200)

    const startedAt = Date.now()
    const generated = await call(routes, '/interview-coach/personal/generate', 'POST', { count: 3 })
    assert.equal(generated.status, 200)
    assert.equal(generated.json.timedOut, true)
    assert.equal(generated.json.source, 'personal-fallback-timeout')
    assert.ok(generated.json.questions.length > 0)
    assert.ok(Date.now() - startedAt < 3000)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('personal generation stays bounded when the provider ignores abort', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-personal-timeout-hard-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const { routes, ctx } = makeHarness({ hangPersonal: true, ignorePersonalAbort: true })
    apply(ctx, { provider: 'deepseek-account', model: 'deepseek-flash', personalTimeoutMs: 30 })

    const setup = await call(routes, '/interview-coach/setup', 'POST', {
      resumeText: '负责推荐系统重构，P99 从 2s 降到 300ms。',
      targetRole: 'Agent 开发工程师',
    })
    assert.equal(setup.status, 200)

    const startedAt = Date.now()
    const generated = await call(routes, '/interview-coach/personal/generate', 'POST', { count: 3 })
    assert.equal(generated.status, 200)
    assert.equal(generated.json.timedOut, true)
    assert.equal(generated.json.source, 'personal-fallback-timeout')
    assert.ok(generated.json.questions.length > 0)
    assert.ok(Date.now() - startedAt < 3000)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})

test('host supports interviewer role, isolated candidate, plan, interview, and report', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-interviewer-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = root
  try {
    const { routes, ctx } = makeHarness()
    apply(ctx, { provider: 'deepseek-account', model: 'deepseek-flash' })

    const setup = await call(routes, '/interview-coach/setup', 'POST', {
      resumeText: '负责推荐系统重构，召回率从 70% 提到 88%。',
      targetRole: 'Agent 开发工程师',
    })
    assert.equal(setup.status, 200)

    const candidateRole = await call(routes, '/interview-coach/role', 'POST', { role: 'candidate' })
    assert.equal(candidateRole.status, 200)
    const candidateState = await call(routes, '/interview-coach/state')
    assert.equal(candidateState.json.role, 'candidate')
    assert.equal(candidateState.json.interviewer, undefined)

    const role = await call(routes, '/interview-coach/role', 'POST', { role: 'interviewer' })
    assert.equal(role.status, 200)
    const initial = await call(routes, '/interview-coach/state')
    assert.equal(initial.status, 200)
    assert.equal(initial.json.role, 'interviewer')
    assert.ok(initial.json.interviewer)
    assert.equal(initial.json.interviewer.bank.personal, 0)
    assert.equal(initial.json.memory, undefined)
    assert.equal(initial.json.answers, undefined)

    const candidate = await call(routes, '/interview-coach/interviewer/candidate', 'POST', {
      name: '候选人 A',
      targetRole: 'Agent 开发工程师',
      level: 'P6',
      round: '技术面',
      durationMin: 45,
      jdText: '需要 RAG、Agent 工具运行时和评测经验。',
      resumeText: '负责推荐系统重构，召回率从 70% 提到 88%。\n负责 Agent 工具运行时。',
    })
    assert.equal(candidate.status, 200)
    assert.match(candidate.json.candidate.id, /^c_/)
    assert.ok(candidate.json.memory.total > 0)

    const generated = await call(routes, '/interview-coach/interviewer/plan/generate', 'POST', {
      count: 2,
      candidateId: candidate.json.candidate.id,
    })
    assert.equal(generated.status, 200)
    assert.equal(generated.json.source, 'llm')
    assert.equal(generated.json.questions.length, 2)

    const saved = await call(routes, '/interview-coach/interviewer/plan', 'POST', {
      candidateId: candidate.json.candidate.id,
      questions: generated.json.questions,
    })
    assert.equal(saved.status, 200)
    assert.equal(saved.json.plan.status, 'ready')
    assert.equal(saved.json.plan.questions.length, 2)

    const started = await call(routes, '/interview-coach/interviewer/start', 'POST', {})
    assert.equal(started.status, 200)
    assert.equal(started.json.session.status, 'active')
    assert.equal(started.json.question.id, 'Q1')
    assert.ok(started.json.question.lookFor.length >= 2)

    const first = await call(routes, '/interview-coach/interviewer/answer', 'POST', {
      sessionId: started.json.session.id,
      questionId: 'Q1',
      answer: '我先做召回，再做 rerank，召回率从 70% 提到 88%。',
      notes: '能讲清指标',
      signal: 'strong',
    })
    assert.equal(first.status, 200)
    assert.equal(first.json.done, false)
    assert.equal(first.json.nextQuestion.id, 'Q2')

    const second = await call(routes, '/interview-coach/interviewer/answer', 'POST', {
      sessionId: started.json.session.id,
      questionId: 'Q2',
      answer: '工具失败就重试一次，不行就降级。',
      notes: '缺少停止条件',
      signal: 'weak',
    })
    assert.equal(second.status, 200)
    assert.equal(second.json.done, true)

    const finished = await call(routes, '/interview-coach/interviewer/finish', 'POST', {
      sessionId: started.json.session.id,
    })
    assert.equal(finished.status, 200)
    assert.equal(finished.json.session.status, 'finished')
    assert.equal(finished.json.report.dimensions.length, 4)
    assert.equal(finished.json.report.dimensions[0].score, 4)
    assert.equal(finished.json.report.recommendation, 'hire')

    const report = await call(routes, `/interview-coach/interviewer/report?sessionId=${started.json.session.id}`)
    assert.equal(report.status, 200)
    assert.equal(report.json.report.summary.includes('检索'), true)

    const edited = await call(routes, '/interview-coach/interviewer/report', 'POST', {
      sessionId: started.json.session.id,
      report: { ...finished.json.report, summary: '面试官修订：建议进入下一轮。' },
    })
    assert.equal(edited.status, 200)
    assert.equal(edited.json.report.summary, '面试官修订：建议进入下一轮。')

    const state = await call(routes, '/interview-coach/state')
    assert.equal(state.json.role, 'interviewer')
    assert.equal(state.json.interviewer.plan.status, 'done')
    assert.equal(state.json.interviewer.report.summary, '面试官修订：建议进入下一轮。')
    assert.equal(state.json.interviewer.bank.personal, 0)

    const back = await call(routes, '/interview-coach/role', 'POST', { role: 'candidate' })
    assert.equal(back.status, 200)
    const candidateAgain = await call(routes, '/interview-coach/state')
    assert.equal(candidateAgain.json.role, 'candidate')
    assert.equal(candidateAgain.json.memory.total > 0, true)
    assert.equal(candidateAgain.json.interviewer, undefined)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})
