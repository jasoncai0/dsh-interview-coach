import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const BANK_URL = new URL('../bank/agent.jsonl', import.meta.url)
let cache

function parseLine(line) {
  try {
    const value = JSON.parse(line)
    if (!value || typeof value.id !== 'string' || typeof value.question !== 'string') return null
    return {
      id: value.id,
      level: String(value.level ?? 'L0'),
      topic: String(value.topic ?? '通用'),
      question: value.question,
      intent: String(value.intent ?? ''),
      keyPoints: Array.isArray(value.keyPoints) ? value.keyPoints.filter((item) => typeof item === 'string') : [],
      sampleAnswer: String(value.sampleAnswer ?? ''),
      followups: Array.isArray(value.followups) ? value.followups.filter((item) => typeof item === 'string') : [],
      redFlags: Array.isArray(value.redFlags) ? value.redFlags.filter((item) => typeof item === 'string') : [],
      tags: Array.isArray(value.tags) ? value.tags.filter((item) => typeof item === 'string') : [],
      polished: Boolean(value.polished),
      source: String(value.source ?? 'curated'),
    }
  } catch {
    return null
  }
}

export async function loadBank() {
  if (cache) return cache
  const text = await readFile(fileURLToPath(BANK_URL), 'utf8')
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map(parseLine)
    .filter(Boolean)
  const seen = new Set()
  cache = rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
  return cache
}

export function bankSummary(bank) {
  const byLevel = {}
  const byTopic = {}
  for (const question of bank) {
    byLevel[question.level] = (byLevel[question.level] ?? 0) + 1
    byTopic[question.topic] = (byTopic[question.topic] ?? 0) + 1
  }
  return { total: bank.length, byLevel, byTopic, polished: bank.filter((q) => q.polished).length }
}

function shuffle(values) {
  const copy = values.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function selectQuestions(bank, { count = 10, level = 'all', topic = 'all' } = {}) {
  let rows = bank
  if (level && level !== 'all') rows = rows.filter((question) => question.level === level)
  if (topic && topic !== 'all') rows = rows.filter((question) => question.topic === topic)
  if (rows.length === 0) rows = bank
  const limit = Math.max(1, Math.min(30, Number(count) || 10))
  if (rows.length <= limit) return shuffle(rows)
  const byLevel = new Map()
  for (const question of rows) {
    const bucket = byLevel.get(question.level) ?? []
    bucket.push(question)
    byLevel.set(question.level, bucket)
  }
  const levels = [...byLevel.keys()].sort()
  const picked = []
  let cursor = 0
  while (picked.length < limit) {
    let added = false
    for (const key of levels) {
      const bucket = byLevel.get(key)
      if (cursor < bucket.length && picked.length < limit) {
        picked.push(bucket[cursor])
        added = true
      }
    }
    cursor += 1
    if (!added) break
  }
  return shuffle(picked)
}

export function publicQuestion(question) {
  if (!question) return null
  return {
    id: question.id,
    level: question.level,
    topic: question.topic,
    question: question.question,
    tags: question.tags,
  }
}

export function revealedQuestion(question) {
  if (!question) return null
  return {
    ...publicQuestion(question),
    intent: question.intent,
    keyPoints: question.keyPoints,
    sampleAnswer: question.sampleAnswer,
    followups: question.followups,
    redFlags: question.redFlags,
    polished: question.polished,
  }
}
