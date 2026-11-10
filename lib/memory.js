import { createHash } from 'node:crypto'
import { newId } from './util.js'

const DIMS = 384

const SOURCE_WEIGHT = {
  resume: 1,
  manual: 0.95,
  interview: 0.8,
  github: 0.7,
  blog: 0.55,
  jd: 0.5,
  bank: 0.35,
  web: 0.2,
}

function fnv1a(value) {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Stable local lexical vector. BGE compatibility is a later adapter, not a wire dependency. */
export function localEmbedding(text) {
  const vector = new Float32Array(DIMS)
  const normalized = String(text).toLowerCase().replace(/\s+/g, ' ')
  const chars = [...normalized]
  for (let i = 0; i < chars.length; i++) {
    for (const width of [1, 2, 3]) {
      if (i + width > chars.length) continue
      const gram = chars.slice(i, i + width).join('')
      const hash = fnv1a(gram)
      const index = hash % DIMS
      vector[index] += width === 1 ? 0.5 : width === 2 ? 1 : 1.4
    }
  }
  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < DIMS; i++) vector[i] /= norm
  return vector
}

export function cosine(left, right) {
  let dot = 0
  for (let i = 0; i < left.length; i++) dot += left[i] * right[i]
  return dot
}

export function tokenize(text) {
  const value = String(text).toLowerCase()
  const ascii = value.match(/[a-z0-9_+.#-]{2,}/g) ?? []
  const chinese = value.replace(/[^\u4e00-\u9fff]/g, '')
  const bigrams = []
  for (let i = 0; i + 1 < chinese.length; i++) bigrams.push(chinese.slice(i, i + 2))
  return [...ascii, ...bigrams]
}

function cardTags(text) {
  const tags = []
  const lower = text.toLowerCase()
  for (const tag of ['agent', 'rag', 'mcp', 'skill', 'memory', 'llm', 'java', 'go', 'python', '推荐', '搜索', '广告', '支付']) {
    if (lower.includes(tag)) tags.push(tag)
  }
  return tags
}

export function cardsFromText(text, { source, kind = source, weight = SOURCE_WEIGHT[source] ?? 0.5, title = '' } = {}) {
  const clean = String(text ?? '').trim()
  if (!clean) return []
  const chunks = []
  const lines = clean.split(/\r?\n/)
  let buffer = ''
  let heading = ''
  const flush = () => {
    const value = buffer.replace(/\s+/g, ' ').trim()
    buffer = ''
    if (value.length < 12) return
    chunks.push({ heading, text: value.slice(0, 600) })
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (/^#{1,6}\s+/.test(line) || /^[一二三四五六七八九十]+、/.test(line)) {
      flush()
      heading = line.replace(/^#{1,6}\s+/, '').slice(0, 80)
      continue
    }
    if (/^[-*•]\s+/.test(line) || /^\d+[.)、]\s+/.test(line)) {
      flush()
      buffer = line.replace(/^([-*•]|\d+[.)、])\s+/, '')
      flush()
      continue
    }
    buffer += `${buffer ? ' ' : ''}${line}`
    if (buffer.length > 600) flush()
  }
  flush()
  if (chunks.length === 0) chunks.push({ heading: title || kind, text: clean.slice(0, 600) })
  return chunks.slice(0, 60).map((chunk, index) => {
    const textValue = chunk.text
    return {
      id: newId('mem'),
      kind,
      title: (title || chunk.heading || `${kind} ${index + 1}`).slice(0, 80),
      text: textValue,
      tags: cardTags(textValue),
      source,
      sourceWeight: weight,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: source === 'resume' && index === 0,
      embedding: [...localEmbedding(`${chunk.heading} ${textValue}`)],
    }
  })
}

export function buildProfileCards(profile) {
  const cards = []
  if (profile.resumeText) {
    cards.push(...cardsFromText(profile.resumeText, { source: 'resume', title: '简历' }))
  }
  if (profile.jdText) {
    cards.push(...cardsFromText(profile.jdText, { source: 'jd', title: '目标 JD' }))
  }
  if (profile.notesText) {
    cards.push(...cardsFromText(profile.notesText, { source: 'manual', title: '补充材料' }))
  }
  return cards
}

function bm25Stats(cards) {
  const docs = cards.map((card) => tokenize(`${card.title} ${card.text} ${(card.tags ?? []).join(' ')}`))
  const df = new Map()
  for (const doc of docs) {
    for (const token of new Set(doc)) df.set(token, (df.get(token) ?? 0) + 1)
  }
  const avgdl = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length)
  return { docs, df, avgdl, total: cards.length }
}

export function retrieve(cards, query, limit = 6) {
  if (!Array.isArray(cards) || cards.length === 0) return []
  const { docs, df, avgdl, total } = bm25Stats(cards)
  const queryTokens = tokenize(query)
  const queryVector = localEmbedding(query)
  const k1 = 1.5
  const b = 0.75
  const scored = cards.map((card, index) => {
    const doc = docs[index]
    const frequencies = new Map()
    for (const token of doc) frequencies.set(token, (frequencies.get(token) ?? 0) + 1)
    let bm25 = 0
    for (const token of queryTokens) {
      const frequency = frequencies.get(token) ?? 0
      if (frequency === 0) continue
      const idf = Math.log(1 + (total - (df.get(token) ?? 0) + 0.5) / ((df.get(token) ?? 0) + 0.5))
      bm25 += idf * ((frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * doc.length) / (avgdl || 1))))
    }
    const bm25Norm = bm25 / (bm25 + 2)
    const vector = localEmbedding(`${card.title} ${card.text}`)
    const cosineScore = Math.max(0, cosine(queryVector, vector))
    const sourceWeight = card.sourceWeight ?? SOURCE_WEIGHT[card.source] ?? 0.5
    const resumeBonus = card.source === 'resume' ? 0.1 : 0
    const score = 0.45 * cosineScore + 0.25 * bm25Norm + 0.2 * sourceWeight + 0.1 * (card.pinned ? 1 : 0) + resumeBonus
    return {
      ...card,
      score: Number(score.toFixed(4)),
      breakdown: { vector: Number(cosineScore.toFixed(4)), bm25: Number(bm25Norm.toFixed(4)), sourceWeight, resumeBonus },
    }
  })
  return scored.sort((left, right) => right.score - left.score).slice(0, Math.max(1, limit))
}

export function memoryStats(cards) {
  const bySource = {}
  for (const card of cards) bySource[card.source] = (bySource[card.source] ?? 0) + 1
  return { total: cards.length, bySource }
}

export function fingerprint(cards) {
  return createHash('sha1')
    .update(cards.map((card) => `${card.id}:${card.source}:${card.text}`).join('\n'))
    .digest('hex')
}
