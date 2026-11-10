import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { apply } from '../lib/index.js'

function makeHarness() {
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
      async *stream({ messages } = {}) {
        const system = messages?.[0]?.content?.[0]?.text ?? ''
        if (system.includes('补充提问模块')) {
          yield {
            type: 'text-delta',
            text: JSON.stringify({
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
            strengths: ['有指标'],
            gaps: ['缺少失败案例'],
            suggestions: ['补一个失败案例'],
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

function request(method, body) {
  const stream = body === undefined ? Readable.from([]) : Readable.from([Buffer.from(JSON.stringify(body))])
  stream.method = method
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
  const handler = routes.get(path)
  assert.ok(handler, `missing route ${path}`)
  const res = response()
  await handler(request(method, body), res)
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
    assert.equal(answered.json.feedback.full_answer.includes('\n\n'), true)
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
    assert.match(supplement.json.answer, /RRF/)
    assert.equal(supplement.json.questions.length, 2)
    assert.equal(supplement.json.questions[0], '如果两路分数不可比怎么办？')
    const supplementAgain = await call(routes, '/interview-coach/mock/supplement', 'POST', {
      sessionId: session.id,
      questionId: firstId,
      question: '如果两路分数不可比怎么办？',
    })
    assert.equal(supplementAgain.status, 200)
    assert.equal(plugin.store.getSession(session.id).answers[0].supplements.length, 2)

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
    assert.equal(finished.json.session.status, 'finished')

    const after = await call(routes, '/interview-coach/state')
    assert.equal(after.status, 200)
    assert.equal(after.json.session, null)
    assert.equal(after.json.report.averageScore, 82)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await rm(root, { recursive: true, force: true })
  }
})
