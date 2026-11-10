import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

export function dshHome() {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

export function storageRoot() {
  return join(dshHome(), 'storages', 'interview-coach')
}

export function newId(prefix = 'ic') {
  return `${prefix}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`
}

export function cleanText(value, max = 200_000) {
  return typeof value === 'string' ? value.slice(0, max).trim() : ''
}

export function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function asNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`interview-coach: ignoring unreadable ${file}: ${String(error)}`)
    }
    return fallback
  }
}

export async function writeJsonAtomic(file, value) {
  await mkdir(dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await rename(tmp, file)
}

export async function readBody(req, limit = 1_000_000) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) {
      const error = new Error('request body too large')
      error.code = 'BODY_TOO_LARGE'
      throw error
    }
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('invalid JSON body')
    error.code = 'INVALID_JSON'
    throw error
  }
}

export function sendJson(res, status, value, method = 'GET') {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(method === 'HEAD' ? undefined : body)
}

export function sendError(res, status, code, message) {
  sendJson(res, status, { error: { code, message } })
}

export function assertMethod(req, res, methods) {
  const allowed = Array.isArray(methods) ? methods : [methods]
  if (allowed.includes(req.method)) return true
  res.writeHead(405, { allow: allowed.join(', ') })
  res.end()
  return false
}

/** Split pasted prose into stable, useful memory units without inventing facts. */
export function splitMemoryText(text, { min = 18, max = 420, limit = 120 } = {}) {
  const rows = []
  const seen = new Set()
  const lines = text.split(/\r?\n/)
  let heading = ''
  let buffer = ''
  const flush = () => {
    const value = buffer.replace(/\s+/g, ' ').trim()
    buffer = ''
    if (value.length < min) return
    if (value.length > max) {
      const chunks = value.split(/(?<=[。；;.!?])\s*/)
      let current = ''
      for (const chunk of chunks) {
        if ((current + chunk).length > max && current.length >= min) {
          push(current)
          current = chunk
        } else {
          current += chunk
        }
      }
      if (current) push(current)
      return
    }
    push(value)
  }
  const push = (value) => {
    const key = value.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    rows.push({ heading, text: value })
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') {
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
    if (buffer.length >= max) flush()
  }
  flush()
  return rows.slice(0, limit)
}
