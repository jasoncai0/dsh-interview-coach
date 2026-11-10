import assert from 'node:assert/strict'
import test from 'node:test'
import { buildProfileCards, cardsFromText, cosine, localEmbedding, memoryStats, retrieve, tokenize } from '../lib/memory.js'

const resume = `# 候选人 A
后端工程师，负责推荐与搜索服务。

## 项目
- 主导推荐系统重构，P99 从 2s 降到 300ms，CTR 提升 8%。
- 设计 RAG 知识库，使用 BM25 + 向量混合检索，召回率提升 12%。

## 技能
Java、Go、Python、Agent、MCP、RAG。`

test('text cards preserve source weight and dimensions', () => {
  const cards = cardsFromText(resume, { source: 'resume', title: '简历' })
  assert.ok(cards.length >= 3)
  for (const card of cards) {
    assert.equal(card.source, 'resume')
    assert.equal(card.sourceWeight, 1)
    assert.equal(card.embedding.length, 384)
    assert.ok(card.text.length > 0)
  }
})

test('profile cards include resume, JD and notes with priority weights', () => {
  const cards = buildProfileCards({
    resumeText: resume,
    jdText: '招聘 Agent 开发工程师，要求熟悉 RAG、MCP、评估。',
    notesText: '我做过的项目：推荐系统、知识库。',
  })
  assert.ok(cards.some((card) => card.source === 'resume' && card.pinned))
  assert.ok(cards.some((card) => card.source === 'jd'))
  assert.ok(cards.some((card) => card.source === 'manual'))
  const stats = memoryStats(cards)
  assert.equal(stats.total, cards.length)
  assert.ok(stats.bySource.resume > 0)
})

test('retrieval prefers resume evidence for a resume-shaped query', () => {
  const cards = buildProfileCards({
    resumeText: resume,
    jdText: '招聘 Agent 开发工程师，要求熟悉 RAG、MCP、评估。',
    notesText: '通用面试笔记：先讲结论，再讲机制。',
  })
  const results = retrieve(cards, '推荐系统 P99 从 2s 降到 300ms 怎么做的？', 5)
  assert.ok(results.length > 0)
  assert.equal(results[0].source, 'resume')
  assert.ok(results[0].score > 0)
})

test('embeddings are stable and comparable', () => {
  const left = localEmbedding('推荐系统 向量检索')
  const right = localEmbedding('推荐系统 向量检索')
  assert.deepEqual([...left], [...right])
  assert.ok(Math.abs(cosine(left, right) - 1) < 1e-6)
  assert.ok(tokenize('Java 和 RAG 的混合检索').length > 0)
})
