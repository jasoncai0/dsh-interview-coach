import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createStore } from '../lib/store.js'

test('answer records dedupe, preserve favorites, and persist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'interview-coach-answers-'))
  try {
    const first = createStore(root)
    await first.ready()
    await first.upsertAnswerRecords([
      {
        id: 's1:q1:main',
        question: '什么是 ReAct？',
        answer: '思考-行动-观察循环。',
        score: 82,
        createdAt: 10,
        favorite: false,
      },
    ])
    await first.setAnswerFavorite('s1:q1:main', true)
    await first.upsertAnswerRecords([
      {
        id: 's1:q1:main',
        question: '什么是 ReAct？',
        answer: '更新后的回答。',
        score: 90,
        createdAt: 20,
        favorite: false,
      },
      {
        id: 's1:q1:drill:1',
        question: 'ReAct 什么时候停止？',
        answer: '达到最大轮次或连续失败时。',
        score: 70,
        createdAt: 30,
        favorite: false,
      },
    ])

    const records = first.getAnswerRecords()
    assert.equal(records.length, 2)
    const main = records.find((item) => item.id === 's1:q1:main')
    assert.equal(main.answer, '更新后的回答。')
    assert.equal(main.favorite, true)
    assert.equal(records[0].id, 's1:q1:drill:1')

    const second = createStore(root)
    await second.ready()
    const reloaded = second.getAnswerRecords()
    assert.equal(reloaded.length, 2)
    assert.equal(reloaded.find((item) => item.id === 's1:q1:main').favorite, true)
    assert.equal(await second.setAnswerFavorite('missing', true), null)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

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
