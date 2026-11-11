import { DRILL_LEVELS } from './coach.js'
import { extractJson, resolveModel, streamText } from './coach.js'

export const DIMENSIONS = [
  { key: 'technical_depth', label: '技术深度' },
  { key: 'problem_solving', label: '问题解决' },
  { key: 'communication', label: '沟通表达' },
  { key: 'role_match', label: '岗位匹配' },
]

const LEVELS = new Set(['L0', 'L1', 'L2', 'L3', 'L4'])
const PLAN_SOURCES = new Set(['generated', 'bank', 'manual'])
const RECOMMENDATIONS = new Set(['strong_hire', 'hire', 'lean_hire', 'no_hire', 'insufficient'])
const SIGNAL_SCORE = { strong: 4, neutral: 3, weak: 2 }

const PLAN_SYSTEM_PROMPT = `你是面试官助手，只负责生成面试计划，不评价候选人是否录用。
只使用提供的 JD、候选人简历和岗位信息；不编造经历、数字、学历或公司。
先在内部抽取候选人的 Claim（ownership/metric/technical/architecture/result）和 JD 能力差距，再出题；每道题必须验证一条 Claim 或一个明确能力差距。
lookFor 是“可观察证据”，不是主题词：要写个人动作、对象、取舍、失败或指标口径；不要写“了解/熟悉/掌握”。
followup 只在关键证据缺失时使用；redFlags 是具体风险信号，不是性格判断。
题目必须与岗位相关，不得涉及年龄、性别、婚育、籍贯、民族、宗教等无关信息。
输出严格 JSON，不输出 Markdown。`

const REPORT_SYSTEM_PROMPT = `你是面试记录整理助手，不是录用决策者。
只能基于面试官记录的回答、笔记和信号生成评估草稿。
每条证据必须能在记录中找到；找不到就写“证据不足”，不要补故事。
评分只代表当前证据覆盖，不代表整体潜力：证据不足的维度 score=null，并在 evidence 里写“未覆盖”，不要用低分代替“没问”。
区分个人动作与团队成果；指标要有 baseline/周期/来源；没有就标“未验证”。
不得根据年龄、性别、婚育、籍贯、民族、宗教、学校等与岗位无关的信息评分。
输出严格 JSON。`

function oneLine(value, max = 400) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

function multiLine(value, max = 4000) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)
}

function stringList(value, max = 4, limit = 180) {
  const source = Array.isArray(value) ? value : []
  const out = []
  const seen = new Set()
  for (const item of source) {
    if (typeof item !== 'string') continue
    const text = oneLine(item, limit)
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length >= max) break
  }
  return out
}

function fitList(value, { max = 4, min = 1, fill = [] } = {}) {
  const list = stringList(value, max)
  for (const item of fill) {
    if (list.length >= min) break
    const text = oneLine(item, 180)
    if (text && !list.includes(text)) list.push(text)
  }
  return list.slice(0, max)
}

function clampScore(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 1 || number > 5) return null
  return Math.round(number)
}

export function normalizePlan(raw, { count = 8, startId = 1 } = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.questions : raw
  const list = Array.isArray(source) ? source : []
  const limit = Math.max(1, Math.min(20, Number(count) || 8))
  const out = []
  const seen = new Set()
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const question = oneLine(item.question, 320)
    if (question.length < 8 || seen.has(question)) continue
    seen.add(question)
    const level = LEVELS.has(String(item.level)) ? String(item.level) : 'L2'
    const topic = oneLine(item.topic, 60) || '综合能力'
    const lookFor = fitList(item.lookFor, { max: 4, min: 2, fill: ['能说清具体做法和判断依据', '能说出一个取舍或边界'] })
    const followups = fitList(item.followups, { max: 3, min: 1, fill: ['能举一个具体例子吗？'] })
    const redFlags = fitList(item.redFlags, { max: 3, min: 1, fill: ['只讲概念，没有个人动作'] })
    const rawTime = Number(item.timeBoxMin)
    const timeBoxMin = Number.isFinite(rawTime) && rawTime > 0 && rawTime <= 30 ? Math.round(rawTime) : 6
    out.push({
      id: `Q${startId + out.length}`,
      level,
      topic,
      question,
      intent: oneLine(item.intent, 240) || '验证候选人是否真正做过，并能讲清取舍和结果',
      lookFor,
      followups,
      redFlags,
      timeBoxMin,
      source: PLAN_SOURCES.has(String(item.source)) ? String(item.source) : 'generated',
    })
    if (out.length >= limit) break
  }
  return out
}

function planKeywords(text) {
  const lower = String(text ?? '').toLowerCase()
  const keywords = ['agent', 'rag', 'mcp', 'skill', 'memory', '记忆', '检索', '工具', '编排', '规划', '评测', '安全', '推理', '上下文', '多智能体', '工作流']
  return keywords.filter((keyword) => lower.includes(keyword))
}

export function fallbackPlanQuestions(bank, { count = 8, jdText = '', resumeText = '' } = {}) {
  const rows = Array.isArray(bank) ? bank : []
  const keywords = planKeywords(`${jdText}\n${resumeText}`)
  const ranked = rows
    .map((row, index) => {
      const text = `${row.topic ?? ''} ${row.question ?? ''} ${(row.tags ?? []).join(' ')}`.toLowerCase()
      const score = keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0)
      return { row, index, score }
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
  const out = []
  const seen = new Set()
  for (const { row } of ranked) {
    const question = oneLine(row.question, 320)
    if (!question || seen.has(question)) continue
    seen.add(question)
    const level = LEVELS.has(String(row.level)) ? String(row.level) : 'L2'
    out.push({
      id: `Q${out.length + 1}`,
      level,
      topic: oneLine(row.topic, 60) || '综合能力',
      question,
      intent: oneLine(row.intent, 240) || '验证候选人的真实经验和判断',
      lookFor: fitList(row.keyPoints, { max: 4, min: 2, fill: ['能说清具体做法', '能说出取舍和结果'] }),
      followups: fitList(row.followups, { max: 3, min: 1, fill: ['能举一个具体例子吗？'] }),
      redFlags: fitList(row.redFlags, { max: 3, min: 1, fill: ['只讲概念，没有个人动作'] }),
      timeBoxMin: 6,
      source: 'bank',
    })
    if (out.length >= Math.max(1, Math.min(20, Number(count) || 8))) break
  }
  return out
}

function planPrompt(candidate, count, bank) {
  const themes = [...new Set((bank ?? []).map((question) => question.topic).filter(Boolean))].slice(0, 24).join('、')
  return `<role>${oneLine(candidate.targetRole, 160)}</role>
<level>${oneLine(candidate.level, 60) || '未指定'}</level>
<round>${oneLine(candidate.round, 60) || '技术面'}</round>
<duration>${Number(candidate.durationMin) || 45} 分钟</duration>
<count>${count}</count>
<jd>
${oneLine(candidate.jdText, 6000)}
</jd>
<candidate_resume>
${oneLine(candidate.resumeText, 8000) || '（未提供简历；只能基于 JD 出题）'}
</candidate_resume>
<bank_themes>${themes || '无'}</bank_themes>
<rules>
- 生成 ${count} 道题；约 50% 围绕简历中的具体经历/项目，30% 围绕 JD 关键能力，20% 围绕岗位通用能力。
- 至少 1 道追问项目中的具体取舍，至少 1 道失败/复盘，至少 1 道岗位场景；不要堆砌纯知识问答。
- 先内部抽取 Claim 与岗位能力差距；每题只验证一条 Claim 或一个差距。
- 每题给 2–4 条 lookFor、1–3 条 followups、1–3 条 redFlags；lookFor 必须是可观察证据（个人动作/对象/取舍/失败/指标口径），不要写“了解/熟悉”；followups 只在关键证据缺失时使用；redFlags 要具体。
- 题干 1–2 句，不直接给答案；不要问年龄、性别、婚育等无关信息。
- timeBoxMin 为建议时长，所有题总时长不超过 ${Number(candidate.durationMin) || 45} 分钟。
- 只输出 JSON：{"questions":[{"level":"L2","topic":"...","question":"...","intent":"...","lookFor":["..."],"followups":["..."],"redFlags":["..."],"timeBoxMin":6}]}
</rules>`
}

export async function generateInterviewPlan(ctx, config, { candidate, count = 8, bank = [] } = {}, signal) {
  const limit = Math.max(1, Math.min(20, Number(count) || 8))
  const fallback = fallbackPlanQuestions(bank, { count: limit, jdText: candidate?.jdText, resumeText: candidate?.resumeText })
  if (!ctx.llm || typeof ctx.llm.stream !== 'function') return { questions: fallback, source: 'bank' }
  try {
    const route = await resolveModel(ctx, config)
    const text = await streamText(ctx, {
      ...route,
      messages: [
        { role: 'system', content: [{ type: 'text', text: PLAN_SYSTEM_PROMPT }] },
        { role: 'user', content: [{ type: 'text', text: planPrompt(candidate ?? {}, limit, bank) }] },
      ],
      signal,
    })
    const parsed = extractJson(text)
    const questions = normalizePlan(parsed, { count: limit })
    if (questions.length === 0) return { questions: fallback, source: 'bank-fallback-empty' }
    return { questions, source: 'llm' }
  } catch (error) {
    ctx.logger?.warn?.(`interview-coach: interviewer plan failed (${error?.code ?? 'unknown'}): ${String(error?.message ?? error)}`)
    return { questions: fallback, source: 'bank-fallback-llm-error' }
  }
}

function answerEvidence(answers) {
  const evidence = []
  for (const answer of answers ?? []) {
    const text = oneLine(answer.notes, 240) || oneLine(answer.answer, 240)
    if (text && !evidence.includes(text)) evidence.push(text)
    if (evidence.length >= 2) break
  }
  return evidence
}

function reportRecommendation(average) {
  if (average === null) return 'insufficient'
  if (average >= 4.5) return 'strong_hire'
  if (average >= 3.5) return 'hire'
  if (average >= 2.5) return 'lean_hire'
  return 'no_hire'
}

export function fallbackReport({ candidate, answers = [] } = {}) {
  const scored = (answers ?? []).map((answer) => SIGNAL_SCORE[answer.signal]).filter((score) => Number.isFinite(score))
  const average = scored.length > 0 ? Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 10) / 10 : null
  const evidence = answerEvidence(answers)
  const coverage = new Set((answers ?? []).map((answer) => answer.questionId).filter(Boolean)).size
  const score = average === null || coverage < 2 ? null : Math.max(1, Math.min(5, Math.round(average)))
  const strengths = (answers ?? []).filter((answer) => answer.signal === 'strong').map((answer) => oneLine(answer.answer, 120)).filter(Boolean).slice(0, 4)
  const risks = (answers ?? []).filter((answer) => answer.signal === 'weak').map((answer) => oneLine(answer.answer, 120)).filter(Boolean).slice(0, 4)
  return {
    summary: `规则草稿：基于 ${(answers ?? []).length} 条面试记录和信号生成，证据不足处需面试官补充。`,
    dimensions: DIMENSIONS.map((dimension) => ({ ...dimension, score, evidence: evidence.slice() })),
    strengths,
    risks,
    recommendation: reportRecommendation(average),
    next_steps: risks.length > 0 ? ['下一轮重点补强弱信号题目，并要求候选人给出具体案例和指标。'] : ['下一轮继续验证关键项目的取舍和结果。'],
    source: 'rule',
    generatedAt: Date.now(),
    candidateName: oneLine(candidate?.name, 80),
  }
}

function normalizeEvidence(value, haystack) {
  const raw = stringList(value, 6, 360)
  const normalizedHaystack = oneLine(haystack, 20000).toLowerCase()
  return raw.filter((item) => normalizedHaystack.includes(oneLine(item, 360).toLowerCase()))
}

export function normalizeReport(raw, { answers = [] } = {}) {
  const value = raw && typeof raw === 'object' ? raw : {}
  const rawDimensions = Array.isArray(value.dimensions) ? value.dimensions : []
  const byKey = new Map(rawDimensions.filter((item) => item && typeof item === 'object').map((item) => [String(item.key), item]))
  const haystack = (answers ?? []).map((answer) => `${answer.answer ?? ''}\n${answer.notes ?? ''}`).join('\n')
  const coverage = new Set((answers ?? []).map((answer) => answer.questionId).filter(Boolean)).size
  const dimensions = DIMENSIONS.map((dimension) => {
    const item = byKey.get(dimension.key) ?? {}
    const evidence = normalizeEvidence(item.evidence, haystack)
    const score = coverage >= 2 && evidence.length > 0 ? clampScore(item.score) : null
    return { ...dimension, score, evidence }
  })
  const rawRecommendation = String(value.recommendation ?? '')
  const allNull = dimensions.every((dimension) => dimension.score === null)
  const recommendation = allNull || coverage < 2 ? 'insufficient' : RECOMMENDATIONS.has(rawRecommendation) ? rawRecommendation : 'insufficient'
  return {
    summary: oneLine(value.summary, 600) || '证据不足，待面试官补充。',
    dimensions,
    strengths: stringList(value.strengths, 6, 240),
    risks: stringList(value.risks, 6, 240),
    recommendation,
    next_steps: stringList(value.next_steps, 6, 240),
    source: 'llm',
    generatedAt: Date.now(),
  }
}

function reportPrompt(candidate, plan, answers) {
  return `<candidate>${JSON.stringify({
    name: oneLine(candidate?.name, 80),
    targetRole: oneLine(candidate?.targetRole, 160),
    level: oneLine(candidate?.level, 60),
    round: oneLine(candidate?.round, 60),
  })}</candidate>
<plan>${JSON.stringify((plan ?? []).map((question) => ({ id: question.id, question: question.question, intent: question.intent, lookFor: question.lookFor })))}</plan>
<answers>${JSON.stringify((answers ?? []).map((answer) => ({ questionId: answer.questionId, question: answer.question, answer: answer.answer, notes: answer.notes, signal: answer.signal })))}</answers>
<rules>
- 输出四个固定维度：technical_depth（技术深度）、problem_solving（问题解决）、communication（沟通表达）、role_match（岗位匹配）。
- 如果 answers 少于 2 道不同题，所有维度 score 必须为 null，recommendation 必须为 insufficient；不要用同一段回答给四个维度凑分。
- 每个维度 score 取 1–5；没有可引用证据时 score 为 null，并写“证据不足”。
- evidence 只能逐字引用 answers 中的 answer/notes，不能改写，不能编造；没有就给空数组。
- recommendation 只能是 strong_hire | hire | lean_hire | no_hire | insufficient。
- 只输出 JSON：{"summary":"...","dimensions":[{"key":"technical_depth","score":4,"evidence":["..."]}],"strengths":["..."],"risks":["..."],"recommendation":"hire","next_steps":["..."]}
</rules>`
}

export async function generateInterviewReport(ctx, config, { candidate, plan, answers } = {}, signal) {
  const fallback = fallbackReport({ candidate, answers })
  if (!ctx.llm || typeof ctx.llm.stream !== 'function') return { report: fallback, source: 'rule' }
  try {
    const route = await resolveModel(ctx, config)
    const text = await streamText(ctx, {
      ...route,
      messages: [
        { role: 'system', content: [{ type: 'text', text: REPORT_SYSTEM_PROMPT }] },
        { role: 'user', content: [{ type: 'text', text: reportPrompt(candidate, plan, answers) }] },
      ],
      signal,
    })
    const parsed = extractJson(text)
    if (!parsed) return { report: { ...fallback, source: 'rule-fallback-invalid-json' }, source: 'rule' }
    const report = normalizeReport(parsed, { answers })
    const hasEvidence = report.dimensions.some((dimension) => dimension.evidence.length > 0)
    if (!hasEvidence) return { report: { ...fallback, source: 'rule-fallback-no-evidence' }, source: 'rule' }
    return { report, source: 'llm' }
  } catch (error) {
    ctx.logger?.warn?.(`interview-coach: interviewer report failed (${error?.code ?? 'unknown'}): ${String(error?.message ?? error)}`)
    return { report: { ...fallback, source: 'rule-fallback-llm-error' }, source: 'rule' }
  }
}
