import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createStore } from '../lib/store.js'

test('personal questions persist across store reloads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-store-'))
  try {
    const first = createStore(root)
    await first.ready()
    await first.setPersonalQuestions([
      {
        id: 'P-001',
        level: 'L2',
        topic: '简历追问',
        question: '你简历里的项目为什么这样取舍？',
        keyPoints: ['背景', '取舍', '结果'],
        sampleAnswer: '因为当时的瓶颈在召回。',
        source: 'personal',
        personal: true,
      },
    ])
    const second = createStore(root)
    await second.ready()
    const questions = second.getPersonalQuestions()
    assert.equal(questions.length, 1)
    assert.equal(questions[0].id, 'P-001')
    assert.equal(questions[0].question, '你简历里的项目为什么这样取舍？')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
