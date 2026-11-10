import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  DIMENSIONS,
  normalizePlan,
  normalizeReport,
  fallbackPlanQuestions,
  fallbackReport,
} from '../lib/interviewer.js'
import { createInterviewerStore } from '../lib/interviewer-store.js'

test('interviewer store round-trips candidate, plan, and session in interviewer/', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-interviewer-store-'))
  try {
    const store = createInterviewerStore(root)
    await store.ready()
    const candidate = await store.saveCandidate({
      name: '候选人 A',
      targetRole: 'Agent 开发工程师',
      level: 'P6',
      round: '技术面',
      durationMin: 45,
      jdText: '需要 Agent 运行时和 RAG 经验',
      resumeText: '做过 RAG 和工具调用',
      cards: [{ id: 'c1', text: '做过 RAG', source: 'resume' }],
    })
    assert.match(candidate.id, /^c_/)
    assert.equal(candidate.targetRole, 'Agent 开发工程师')

    const plan = await store.savePlan({
      candidateId: candidate.id,
      status: 'ready',
      questions: [{ id: 'Q1', question: '讲一个 RAG 取舍', level: 'L2', topic: 'RAG' }],
    })
    assert.match(plan.id, /^p_/)
    assert.equal(plan.status, 'ready')

    const session = await store.saveSession({
      id: 's_test',
      mode: 'interview',
      candidateId: candidate.id,
      planId: plan.id,
      status: 'active',
      currentIndex: 0,
      answers: [],
    })
    assert.equal(session.id, 's_test')

    const reloaded = createInterviewerStore(root)
    await reloaded.ready()
    assert.equal(reloaded.getCandidate().id, candidate.id)
    assert.equal(reloaded.getPlan().id, plan.id)
    assert.equal(reloaded.getSession().id, session.id)
    assert.equal(reloaded.getCandidate().cards[0].text, '做过 RAG')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('normalizePlan clamps, dedupes, and assigns stable ids', () => {
  const questions = normalizePlan({
    questions: [
      { id: 'x', level: 'L9', topic: '  ', question: '讲一个你做过的 RAG 取舍。', lookFor: ['a'], followups: [], redFlags: [], timeBoxMin: 99 },
      { level: 'L3', topic: '工具', question: '讲一个你做过的 RAG 取舍。' },
      { level: 'L1', topic: '编排', question: '你如何设计一条 Agent 执行链？', lookFor: ['状态机', '重试'], followups: ['怎么回滚？'], redFlags: ['只说框架'], timeBoxMin: 7, source: 'manual' },
    ],
  }, { count: 8 })
  assert.equal(questions.length, 2)
  assert.equal(questions[0].id, 'Q1')
  assert.equal(questions[0].level, 'L2')
  assert.equal(questions[0].timeBoxMin, 6)
  assert.equal(questions[1].id, 'Q2')
  assert.equal(questions[1].level, 'L1')
  assert.equal(questions[1].source, 'manual')
  assert.deepEqual(questions[1].lookFor, ['状态机', '重试'])
})

test('normalizeReport keeps fixed dimensions and only verifiable evidence', () => {
  const answers = [{
    questionId: 'Q1',
    question: '讲一个 RAG 取舍。',
    answer: '我先把召回率从 70% 提到 88%，再补 rerank。',
    notes: '候选人能讲清指标',
    signal: 'strong',
  }, {
    questionId: 'Q2',
    question: '工具调用失败怎么办？',
    answer: '先判断是否可重试，再降级并回填 observation。',
    notes: '有失败分支',
    signal: 'neutral',
  }]
  const report = normalizeReport({
    summary: '证据尚可',
    dimensions: [
      { key: 'technical_depth', score: 4, evidence: ['召回率从 70% 提到 88%', '不存在的证据'] },
      { key: 'problem_solving', score: 0, evidence: ['候选人能讲清指标'] },
      { key: 'communication', score: 9, evidence: [] },
      { key: 'role_match', score: 3, evidence: ['候选人能讲清指标'] },
      { key: 'extra', score: 5, evidence: ['候选人能讲清指标'] },
    ],
    strengths: ['有指标', 123],
    risks: ['样本少'],
    recommendation: 'definitely',
    next_steps: ['追问失败案例'],
  }, { answers })
  assert.deepEqual(report.dimensions.map((item) => item.key), DIMENSIONS.map((item) => item.key))
  assert.equal(report.dimensions[0].score, 4)
  assert.deepEqual(report.dimensions[0].evidence, ['召回率从 70% 提到 88%'])
  assert.equal(report.dimensions[1].score, null)
  assert.equal(report.dimensions[2].score, null)
  assert.equal(report.recommendation, 'insufficient')
  assert.deepEqual(report.strengths, ['有指标'])
})

test('fallbackPlanQuestions and fallbackReport are deterministic', () => {
  const bank = [
    { id: 'L2-01', level: 'L2', topic: '记忆', question: '长期记忆怎么写、检索、更新？', intent: '验证记忆系统', keyPoints: ['写入', '检索', '更新'], followups: ['怎么删？'], redFlags: ['只讲向量库'], source: 'curated' },
    { id: 'L3-01', level: 'L3', topic: '工具', question: '工具调用失败怎么处理？', intent: '验证工具运行时', keyPoints: ['重试', '降级'], followups: ['怎么防重试风暴？'], redFlags: ['只说 try/catch'], source: 'curated' },
    { id: 'L1-01', level: 'L1', topic: '编排', question: 'ReAct 和 Plan-and-Execute 怎么选？', intent: '验证编排', keyPoints: ['循环', '规划'], followups: ['怎么停止？'], redFlags: ['只背定义'], source: 'curated' },
  ]
  const questions = fallbackPlanQuestions(bank, { count: 2, jdText: '需要 RAG 和工具运行时经验' })
  assert.equal(questions.length, 2)
  assert.equal(questions.every((item) => item.source === 'bank'), true)
  assert.equal(questions.every((item) => item.lookFor.length >= 2), true)

  const report = fallbackReport({
    candidate: { name: '候选人 A' },
    answers: [
      { questionId: 'Q1', question: 'Q1', answer: '答了工具重试和降级', notes: '表达清楚', signal: 'strong' },
      { questionId: 'Q2', question: 'Q2', answer: '只答了概念', notes: '', signal: 'weak' },
    ],
  })
  assert.equal(report.dimensions.length, 4)
  assert.equal(report.dimensions[0].score, 3)
  assert.match(report.summary, /规则草稿/)
  assert.equal(report.recommendation, 'lean_hire')
})

test('one answer is not enough evidence for four dimension scores', () => {
  const answer = {
    questionId: 'Q1',
    question: '状态机怎么设计？',
    answer: '我会用状态机编排计划、工具调用和校验节点，失败后重试并回填 observation。',
    notes: '缺少停止条件。',
    signal: 'neutral',
  }
  const report = normalizeReport({
    summary: '只答了一题。',
    dimensions: [
      { key: 'technical_depth', score: 4, evidence: [answer.answer] },
      { key: 'problem_solving', score: 4, evidence: [answer.answer] },
      { key: 'communication', score: 4, evidence: [answer.notes] },
      { key: 'role_match', score: 4, evidence: [answer.answer] },
    ],
    recommendation: 'hire',
    strengths: ['结构清楚'],
    risks: ['覆盖不足'],
    next_steps: ['补问 Q2-Q6'],
  }, { answers: [answer] })
  assert.equal(report.dimensions.every((item) => item.score === null), true)
  assert.equal(report.recommendation, 'insufficient')
})
