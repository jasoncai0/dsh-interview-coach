import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateReport, extractJson, fallbackFeedback, generatePersonalQuestions, generateSupplement, normalizeFeedback, normalizePersonalQuestions } from '../lib/coach.js'

const bankQuestion = {
  keyPoints: ['先给结论', '讲清混合检索机制', '给出 P99 和召回指标'],
  sampleAnswer: '结论：我们用了 BM25 + 向量混合检索。\n\n机制：并行召回后做 RRF 融合和 rerank。\n\n结果：P99 从 2s 降到 300ms，召回率提升 12%。',
  followups: ['RRF 的 k 怎么选？'],
}

test('fallback feedback rewards key-point coverage', () => {
  const weak = fallbackFeedback({
    question: '怎么做混合检索？',
    answer: '我们用了向量检索。',
    memories: [],
    bankQuestion,
  })
  const strong = fallbackFeedback({
    question: '怎么做混合检索？',
    answer: '先给结论：我们用 BM25 加向量混合检索，并行召回后做 RRF 融合和 rerank，P99 从 2s 降到 300ms，召回率提升 12%。',
    memories: [],
    bankQuestion,
  })
  assert.equal(weak.score > 0, true)
  assert.ok(strong.score > weak.score)
  assert.ok(weak.gaps.length > 0)
  assert.ok(weak.suggestions.length > 0)
  assert.equal(weak.supplement_questions.length, 3)
  assert.ok(weak.supplement_questions.every((item) => item.length > 0))
  assert.equal(weak.evidence_status, 'unverified')
  assert.equal(strong.evidence_status, 'verified')
  assert.equal(strong.claim_type, 'technical')
  assert.equal(fallbackFeedback({ question: 'P99 指标怎么定义？', answer: '我们优化了性能。', memories: [], bankQuestion }).claim_type, 'metric')
  assert.equal(fallbackFeedback({ question: 'q', answer: '', memories: [], bankQuestion }).score, 0)
  assert.equal(fallbackFeedback({ question: 'q', answer: '', memories: [], bankQuestion }).evidence_status, 'not_covered')
})

test('fallback answer review highlights covered claims and lists missing points', () => {
  const strong = fallbackFeedback({
    question: '怎么做混合检索？',
    answer: '先给结论：我们用 BM25 加向量混合检索，并行召回后做 RRF 融合和 rerank，P99 从 2s 降到 300ms。',
    memories: [],
    bankQuestion,
  })
  assert.ok(strong.answer_review.highlights.length > 0)
  assert.equal(strong.answer_review.highlights[0].quote.includes('BM25'), true)
  assert.equal(Number.isInteger(strong.answer_review.highlights[0].start), true)
  assert.ok(strong.answer_review.missing.length > 0)
  assert.equal(strong.answer_review.corrections.length, 0)
})

test('answer review only accepts verbatim spans and keeps corrections and missing points', () => {
  const answer = '我会先给结论：使用 BM25 加向量混合检索。\n\n这里我没有设置停止条件。'
  const fallback = fallbackFeedback({ question: 'q', answer, memories: [], bankQuestion })
  const normalized = normalizeFeedback(
    {
      answer_review: {
        highlights: [
          { quote: '我会先给结论：使用 BM25 加向量混合检索', comment: '结论清楚' },
          { quote: '这句话不在回答里' },
        ],
        corrections: [{ quote: '我没有设置停止条件', problem: '缺少停止条件', fix: '应设置最大轮次和超时' }],
        missing: [{ point: 'RRF 融合', explain: '混合检索需要说明融合方式' }],
      },
    },
    fallback,
    answer,
  )
  assert.equal(normalized.answer_review.highlights.length, 1)
  assert.equal(normalized.answer_review.highlights[0].quote, '我会先给结论：使用 BM25 加向量混合检索')
  assert.equal(normalized.answer_review.corrections.length, 1)
  assert.equal(normalized.answer_review.corrections[0].quote, '我没有设置停止条件')
  assert.equal(normalized.answer_review.corrections[0].fix, '应设置最大轮次和超时')
  assert.equal(normalized.answer_review.missing[0].point, 'RRF 融合')
})

test('answer review tolerates whitespace differences and drops overlapping highlights', () => {
  const answer = '先讲 结论\n再讲机制'
  const fallback = fallbackFeedback({ question: 'q', answer, memories: [], bankQuestion })
  const normalized = normalizeFeedback(
    {
      answer_review: {
        highlights: [{ quote: '先讲结论' }, { quote: '再讲机制' }],
        corrections: [{ quote: '再讲机制', problem: '不够具体', fix: '补充具体机制' }],
      },
    },
    fallback,
    answer,
  )
  assert.equal(normalized.answer_review.highlights.length, 1)
  assert.equal(normalized.answer_review.highlights[0].quote, '先讲 结论')
  assert.equal(normalized.answer_review.corrections.length, 1)
  assert.equal(normalized.answer_review.corrections[0].quote, '再讲机制')
})

test('normalization keeps multi-line full answers and clamps score', () => {
  const fallback = fallbackFeedback({ question: 'q', answer: 'a', memories: [], bankQuestion })
  const normalized = normalizeFeedback(
    {
      cue: ['结论', '机制', '指标'],
      short_answer: '先给结论，再讲机制。',
      full_answer: '第一段：结论。\n\n第二段：机制和指标。',
      evidence: [{ source: 'resume', text: 'P99 从 2s 降到 300ms' }],
      score: 150,
      strengths: ['有指标'],
      gaps: ['缺少失败案例'],
      suggestions: ['补一个失败案例'],
      improved_answer: '改进版\n\n第二段',
      supplement_questions: ['这个结论的边界是什么？', '还有别的替代方案吗？', '怎么验证有效？'],
    },
    fallback,
  )
  assert.equal(normalized.score, 49)
  assert.equal(normalized.reference_score, 80)
  assert.match(normalized.reference_score_reason, /80/)
  assert.equal(normalized.full_answer.includes('\n\n'), true)
  assert.equal(normalized.improved_answer.includes('\n\n'), true)
  assert.equal(normalized.evidence[0].source, 'resume')
  assert.equal(normalized.supplement_questions.length, 3)
  assert.match(normalized.supplement_questions[0], /边界/)
  assert.equal(normalized.evidence_status, 'unverified')
  assert.equal(normalized.claim_type, 'technical')

  const uncovered = normalizeFeedback({ score: 88, evidence_status: 'not_covered', claim_type: 'metric' }, fallback)
  assert.equal(uncovered.score, 0)
  assert.equal(uncovered.evidence_status, 'not_covered')
  assert.equal(uncovered.claim_type, 'metric')

  const contradictory = normalizeFeedback({ score: 90, evidence_status: 'contradictory', claim_type: 'invalid' }, fallback)
  assert.equal(contradictory.score, 29)
  assert.equal(contradictory.evidence_status, 'contradictory')
  assert.equal(contradictory.claim_type, 'technical')
})

test('score breakdown is summed and reference score is calibrated near 80', () => {
  const fallback = fallbackFeedback({ question: 'q', answer: 'a', memories: [], bankQuestion })
  const normalized = normalizeFeedback(
    {
      full_answer: '结论。\n\n证据和边界。',
      evidence_status: 'verified',
      claim_type: 'technical',
      score: 99,
      score_breakdown: { evidence: 32, correctness: 17, ownership: 12, metrics: 10, communication: 8 },
      score_reason: '证据覆盖较好，指标口径还差一个来源。',
      reference_score: 95,
      reference_score_reason: '参考回答证据完整，表达略长。',
    },
    fallback,
  )
  assert.equal(normalized.score, 79)
  assert.deepEqual(normalized.score_breakdown, {
    evidence: 32,
    correctness: 17,
    ownership: 12,
    metrics: 10,
    communication: 8,
  })
  assert.equal(normalized.reference_score, 84)
  assert.match(normalized.score_reason, /指标口径/)
  assert.match(normalized.reference_score_reason, /参考回答/)
  assert.match(normalized.reference_score_reason, /目标区间校准/)
})

test('score bands cap inconsistent evidence statuses', () => {
  const fallback = fallbackFeedback({ question: 'q', answer: 'a', memories: [], bankQuestion })
  const verified = normalizeFeedback({ score: 99, evidence_status: 'verified' }, fallback)
  const partial = normalizeFeedback({ score: 99, evidence_status: 'partial' }, fallback)
  const unverified = normalizeFeedback({ score: 99, evidence_status: 'unverified' }, fallback)
  assert.equal(verified.score, 92)
  assert.equal(partial.score, 74)
  assert.equal(unverified.score, 49)
})

test('extractJson handles fenced and prefixed output', () => {
  assert.deepEqual(extractJson('```json\n{"score": 80}\n```'), { score: 80 })
  assert.deepEqual(extractJson('说明文字 {"score": 70} 收尾'), { score: 70 })
  assert.equal(extractJson('not json'), null)
})

test('aggregate report ranks repeated gaps', () => {
  const session = {
    id: 'mock_test',
    answers: [
      { feedback: { score: 60, gaps: ['没有量化结果', '缺少取舍'], suggestions: ['补指标'] } },
      { feedback: { score: 80, gaps: ['没有量化结果'], suggestions: ['补指标'] } },
    ],
  }
  const report = aggregateReport(session)
  assert.equal(report.averageScore, 70)
  assert.equal(report.improvements[0].gap, '没有量化结果')
  assert.equal(report.improvements[0].count, 2)
  assert.equal(report.questionCount, 2)
})

test('supplement fallback answers from the reference and still offers next questions', async () => {
  const result = await generateSupplement(
    {},
    {},
    {
      mainQuestion: 'ReAct 怎么收敛？',
      reference: 'ReAct 是 Thought-Action-Observation 循环。\n\n工程上要设置最大轮次和超时。',
      candidateAnswer: '我会设置最大轮次。',
      question: '工具报错时怎么收敛？',
      memories: [],
      bankQuestion: { followups: ['工具报错时怎么收敛？', '如何限制 Action 参数？'], keyPoints: ['最大轮次'], sampleAnswer: '设置最大轮次。' },
    },
  )
  assert.equal(result.source, 'bank-fallback')
  assert.match(result.reference_answer, /Thought-Action-Observation/)
  assert.match(result.answer, /参考答案/)
  assert.equal(result.next_questions.length >= 2, true)
  assert.equal(result.next_questions.includes('工具报错时怎么收敛？'), false)
})


test('personal question generation falls back to grounded resume questions', async () => {
  const result = await generatePersonalQuestions(
    {},
    {},
    {
      cards: [
        { id: 'resume-1', source: 'resume', title: '简历', text: '负责推荐系统重构，P99 从 2s 降到 300ms。' },
        { id: 'jd-1', source: 'jd', title: '目标 JD', text: '要求 Agent 运行时和工具调用经验。' },
      ],
      profile: { targetRole: 'Agent 开发工程师' },
      count: 2,
    },
  )
  assert.equal(result.source, 'bank-fallback')
  assert.equal(result.questions.length, 2)
  assert.match(result.questions[0].question, /推荐系统|Agent/)
  assert.equal(result.questions[0].source, 'personal')
  assert.equal(result.questions[0].provenance.length, 1)
  assert.equal(result.questions[0].keyPoints.length, 3)
})

test('normalize personal questions keeps valid levels and drops duplicates', () => {
  const questions = normalizePersonalQuestions(
    {
      questions: [
        { level: 'L9', topic: '简历', question: '你简历里的推荐系统为什么先做召回？', claimType: 'metric', keyPoints: ['瓶颈'], sampleAnswer: '因为召回是瓶颈。', followups: ['怎么验证？'], redFlags: ['只讲团队'], provenance: ['resume-1'] },
        { level: 'L2', topic: '简历', question: '你简历里的推荐系统为什么先做召回？' },
        { level: 'L4', topic: 'JD', question: '目标 JD 要求 Agent 运行时，你哪段经历能证明？', claimType: 'ownership', keyPoints: ['案例', '指标'], sampleAnswer: '从工具失败处理讲起。' },
      ],
    },
    [],
    10,
  )
  assert.equal(questions.length, 2)
  assert.equal(questions[0].level, 'L2')
  assert.equal(questions[1].level, 'L4')
  assert.equal(questions[0].source, 'personal')
  assert.equal(questions[0].personal, true)
  assert.equal(questions[0].claimType, 'metric')
  assert.equal(questions[1].claimType, 'ownership')
})
