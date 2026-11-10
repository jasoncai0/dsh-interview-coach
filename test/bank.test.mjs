import assert from 'node:assert/strict'
import test from 'node:test'
import { loadBank, selectQuestions, publicQuestion, revealedQuestion } from '../lib/bank.js'

test('bank has 120 unique questions across five levels', async () => {
  const bank = await loadBank()
  assert.equal(bank.length, 120)
  assert.equal(new Set(bank.map((row) => row.id)).size, 120)
  for (const level of ['L0', 'L1', 'L2', 'L3', 'L4']) {
    assert.equal(bank.filter((row) => row.level === level).length, 24, level)
  }
  assert.equal(bank.filter((row) => row.polished).length, 40)
})

test('every bank row has the review fields the coach needs', async () => {
  const bank = await loadBank()
  for (const row of bank) {
    assert.equal(typeof row.question, 'string')
    assert.ok(row.question.length > 0)
    assert.ok(Array.isArray(row.keyPoints) && row.keyPoints.length >= 3, row.id)
    assert.ok(typeof row.sampleAnswer === 'string' && row.sampleAnswer.length > 20, row.id)
    assert.ok(Array.isArray(row.followups), row.id)
    assert.ok(Array.isArray(row.redFlags), row.id)
    assert.ok(Array.isArray(row.tags), row.id)
  }
})

test('question selection is balanced and public views hide answers', async () => {
  const bank = await loadBank()
  const picked = selectQuestions(bank, { count: 10 })
  assert.equal(picked.length, 10)
  assert.equal(new Set(picked.map((row) => row.id)).size, 10)
  const publicRow = publicQuestion(picked[0])
  assert.equal(publicRow.sampleAnswer, undefined)
  assert.equal(publicRow.keyPoints, undefined)
  const revealed = revealedQuestion(picked[0])
  assert.equal(revealed.sampleAnswer, picked[0].sampleAnswer)
  assert.deepEqual(revealed.keyPoints, picked[0].keyPoints)
})
