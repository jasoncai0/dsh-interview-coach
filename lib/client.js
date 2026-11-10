window.__ModuleLoader__.load({
  id: 'dsh-interview-coach',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement
    const PANEL_ID = 'interview-coach'

    const CSS = `
.ic-root { color: var(--dsw-alias-label-primary, #1f2329); font: var(--dsw-font-s-13, 13px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif); }
.ic-panel { display:flex; flex-direction:column; height:100%; min-height:0; background: var(--dsw-alias-bg-layer-1, #fff); }
.ic-head { display:flex; align-items:center; gap:10px; padding:14px 18px 10px; border-bottom:1px solid var(--dsw-alias-border-l2, #e6e8eb); }
.ic-title { font-size:16px; font-weight:650; letter-spacing:.01em; }
.ic-sub { color: var(--dsw-alias-label-tertiary, #8a9099); font-size:12px; }
.ic-head-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
.ic-tabs { display:flex; gap:4px; padding:10px 18px 0; border-bottom:1px solid var(--dsw-alias-border-l2, #e6e8eb); }
.ic-tab { border:0; background:transparent; color:var(--dsw-alias-label-secondary,#5c6370); padding:8px 11px 10px; border-bottom:2px solid transparent; cursor:pointer; font:inherit; }
.ic-tab[data-active="true"] { color:var(--dsw-alias-label-primary,#1f2329); border-bottom-color:var(--dsw-alias-brand-primary,#3b82f6); font-weight:600; }
.ic-body { flex:1; overflow:auto; padding:16px 18px 28px; }
.ic-grid { display:grid; grid-template-columns:minmax(0,1.45fr) minmax(250px,.8fr); gap:14px; align-items:start; }
@media (max-width: 820px) { .ic-grid { grid-template-columns:1fr; } }
.ic-card { border:1px solid var(--dsw-alias-border-l2,#e6e8eb); border-radius:12px; background:var(--dsw-alias-bg-layer-2,#fafbfc); padding:14px; }
.ic-card + .ic-card { margin-top:12px; }
.ic-card h3 { margin:0 0 10px; font-size:13px; font-weight:650; }
.ic-label { display:block; font-size:12px; color:var(--dsw-alias-label-secondary,#5c6370); margin:10px 0 5px; }
.ic-input, .ic-textarea, .ic-select { width:100%; box-sizing:border-box; border:1px solid var(--dsw-alias-border-l2,#d9dde3); border-radius:8px; padding:8px 10px; background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; font:inherit; outline:none; }
.ic-input:focus, .ic-textarea:focus, .ic-select:focus { border-color:var(--dsw-alias-brand-primary,#3b82f6); box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary,#3b82f6) 15%, transparent); }
.ic-textarea { min-height:112px; resize:vertical; line-height:1.55; }
.ic-textarea.ic-resume { min-height:210px; }
.ic-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.ic-btn { border:1px solid var(--dsw-alias-border-l2,#d9dde3); background:var(--dsw-alias-bg-layer-1,#fff); color:inherit; border-radius:8px; padding:7px 12px; cursor:pointer; font:inherit; }
.ic-btn:hover { background:var(--dsw-alias-bg-layer-3,#f1f3f5); }
.ic-btn[data-kind="primary"] { background:var(--dsw-alias-brand-primary,#2563eb); border-color:var(--dsw-alias-brand-primary,#2563eb); color:#fff; font-weight:600; }
.ic-btn[data-kind="primary"]:hover { filter:brightness(.96); }
.ic-btn:disabled { opacity:.55; cursor:not-allowed; }
.ic-btn[data-kind="ghost"] { border-color:transparent; background:transparent; color:var(--dsw-alias-label-secondary,#5c6370); padding:5px 8px; }
.ic-stat { display:flex; flex-direction:column; gap:2px; padding:8px 0; border-bottom:1px dashed var(--dsw-alias-border-l2,#e6e8eb); }
.ic-stat:last-child { border-bottom:0; }
.ic-stat b { font-size:18px; line-height:1.2; }
.ic-stat span { font-size:11px; color:var(--dsw-alias-label-tertiary,#8a9099); }
.ic-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
.ic-badge { display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:2px 7px; font-size:11px; background:var(--dsw-alias-bg-layer-3,#eef1f5); color:var(--dsw-alias-label-secondary,#5c6370); }
.ic-badge[data-tone="good"] { background:#e8f7ee; color:#16794a; }
.ic-badge[data-tone="warn"] { background:#fff4e5; color:#9a5b00; }
.ic-badge[data-tone="blue"] { background:#e9f1ff; color:#1f5fbf; }
.ic-question { font-size:17px; line-height:1.55; font-weight:600; margin:8px 0 10px; }
.ic-meta { color:var(--dsw-alias-label-tertiary,#8a9099); font-size:12px; }
.ic-progress { height:5px; border-radius:99px; background:var(--dsw-alias-bg-layer-3,#eef1f5); overflow:hidden; margin:10px 0; }
.ic-progress > i { display:block; height:100%; background:var(--dsw-alias-brand-primary,#2563eb); }
.ic-answer { border-left:3px solid var(--dsw-alias-brand-primary,#2563eb); background:var(--dsw-alias-bg-layer-2,#f6f8fb); border-radius:0 10px 10px 0; padding:10px 12px; margin:10px 0; }
.ic-answer b { display:block; font-size:11px; color:var(--dsw-alias-label-tertiary,#8a9099); font-weight:600; letter-spacing:.04em; text-transform:uppercase; margin-bottom:3px; }
.ic-review { border:1px solid var(--dsw-alias-border-l2,#e0e4ea); border-radius:10px; background:var(--dsw-alias-bg-layer-1,#fff); padding:10px 12px; margin:10px 0; }
.ic-review-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px; }
.ic-review-head b { font-size:12px; }
.ic-review-legend { color:var(--dsw-alias-label-tertiary,#8a9099); font-size:11px; }
.ic-review-answer { white-space:pre-wrap; line-height:1.8; max-height:340px; overflow:auto; padding-right:4px; }
.ic-mark-ok { background:#dcf7e7; color:#115c38; border-bottom:2px solid #34a853; border-radius:3px; padding:1px 2px; }
.ic-mark-bad { background:#fff0d6; color:#7a4a00; border-bottom:2px solid #f59e0b; border-radius:3px; padding:1px 2px; }
.ic-review-note { margin-top:9px; padding-top:8px; border-top:1px dashed var(--dsw-alias-border-l2,#e0e4ea); }
.ic-review-note > b { display:block; font-size:11px; letter-spacing:.04em; color:var(--dsw-alias-label-tertiary,#8a9099); margin-bottom:4px; }
.ic-review-item { font-size:12px; line-height:1.65; margin:5px 0; }
.ic-review-item .ic-review-quote { color:var(--dsw-alias-label-tertiary,#8a9099); font-size:11px; }
.ic-review-item .ic-review-fix { color:#115c38; }
.ic-cue { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
.ic-cue span { border:1px solid var(--dsw-alias-border-l2,#e0e4ea); background:var(--dsw-alias-bg-layer-1,#fff); border-radius:7px; padding:4px 8px; font-size:12px; }
.ic-list { margin:6px 0 0 18px; padding:0; }
.ic-list li { margin:3px 0; }
.ic-error { color:#b42318; background:#fff1f0; border:1px solid #ffd5d2; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12px; }
.ic-ok { color:#16794a; background:#eefaf3; border:1px solid #c9efd9; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12px; }
.ic-empty { color:var(--dsw-alias-label-tertiary,#8a9099); padding:18px 0; text-align:center; font-size:12px; }
.ic-hud { position:fixed; top:18px; right:18px; z-index:60; width:min(390px, calc(100vw - 28px)); max-height:min(72vh, 640px); display:flex; flex-direction:column; pointer-events:none; }
.ic-hud-pill { align-self:flex-end; pointer-events:auto; display:flex; align-items:center; gap:8px; max-width:100%; padding:7px 10px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2,#d9dde3); background:color-mix(in srgb, var(--dsw-alias-bg-layer-1,#fff) 92%, transparent); box-shadow:0 8px 24px rgba(15,23,42,.12); font-size:12px; cursor:pointer; backdrop-filter: blur(8px); }
.ic-hud-dot { width:7px; height:7px; border-radius:50%; background:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,.14); }
.ic-hud-dot[data-live="false"] { background:#94a3b8; box-shadow:0 0 0 3px rgba(148,163,184,.15); }
.ic-hud-card { pointer-events:auto; margin-top:8px; border:1px solid var(--dsw-alias-border-l2,#d9dde3); border-radius:12px; background:color-mix(in srgb, var(--dsw-alias-bg-layer-1,#fff) 96%, transparent); box-shadow:0 12px 36px rgba(15,23,42,.16); overflow:auto; backdrop-filter: blur(10px); }
.ic-hud-head { display:flex; align-items:center; gap:8px; padding:9px 11px; border-bottom:1px solid var(--dsw-alias-border-l2,#e6e8eb); position:sticky; top:0; background:inherit; z-index:1; }
.ic-hud-body { padding:10px 11px 12px; }
.ic-hud-question { font-size:12px; color:var(--dsw-alias-label-secondary,#5c6370); margin-bottom:6px; }
.ic-hud-short { font-size:14px; line-height:1.55; font-weight:600; }
.ic-hud-full { margin-top:8px; font-size:12px; line-height:1.6; color:var(--dsw-alias-label-secondary,#4b5563); }
.ic-hud-full summary { cursor:pointer; color:var(--dsw-alias-brand-primary,#2563eb); font-size:11px; }
.ic-hud-actions { display:flex; gap:5px; margin-left:auto; }
.ic-hud-btn { border:0; background:transparent; color:var(--dsw-alias-label-secondary,#5c6370); border-radius:6px; cursor:pointer; padding:3px 6px; font:inherit; }
.ic-hud-btn:hover { background:var(--dsw-alias-bg-layer-3,#eef1f5); }
.ic-score { font-size:22px; font-weight:700; line-height:1; }
.ic-score small { font-size:10px; font-weight:500; color:var(--dsw-alias-label-tertiary,#8a9099); }
.ic-split { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.ic-kv { font-size:12px; }
.ic-kv b { font-size:11px; color:var(--dsw-alias-label-tertiary,#8a9099); display:block; margin-bottom:2px; }
.ic-report-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--dsw-alias-border-l2,#e6e8eb); }
.ic-report-row:last-child { border-bottom:0; }
.ic-report-row .ic-report-q { flex:1; min-width:0; }
.ic-report-row .ic-report-q b { display:block; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ic-report-row .ic-report-q span { font-size:11px; color:var(--dsw-alias-label-tertiary,#8a9099); }
.ic-bank-row { padding:8px 0; border-bottom:1px dashed var(--dsw-alias-border-l2,#e6e8eb); }
.ic-bank-row b { font-size:12px; font-weight:600; }
.ic-bank-row p { margin:3px 0 0; font-size:12px; color:var(--dsw-alias-label-secondary,#5c6370); }
.ic-personal-preview { margin-top:14px; padding-top:10px; border-top:1px dashed var(--dsw-alias-border-l2,#e6e8eb); }
.ic-personal-item { padding:9px 0; border-bottom:1px dashed var(--dsw-alias-border-l2,#e6e8eb); }
.ic-personal-item b { font-size:12px; font-weight:600; }
.ic-personal-item p { margin:4px 0 0; font-size:11px; color:var(--dsw-alias-label-secondary,#5c6370); }
.ic-answer-toolbar { display:grid; grid-template-columns:minmax(0,1fr) 120px 120px auto; gap:8px; align-items:center; }
@media (max-width: 760px) { .ic-answer-toolbar { grid-template-columns:1fr 1fr; } }
.ic-answer-item { padding:12px 0; border-bottom:1px dashed var(--dsw-alias-border-l2,#e6e8eb); }
.ic-answer-item:last-child { border-bottom:0; }
.ic-answer-q { font-size:13px; line-height:1.6; font-weight:600; margin:4px 0 7px; }
.ic-answer-text { white-space:pre-wrap; line-height:1.75; font-size:13px; background:var(--dsw-alias-bg-layer-1,#fff); border:1px solid var(--dsw-alias-border-l2,#e6e8eb); border-radius:9px; padding:9px 11px; max-height:260px; overflow:auto; }
.ic-answer-meta { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin:5px 0; }
.ic-answer-ref { margin-top:8px; font-size:12px; line-height:1.65; color:var(--dsw-alias-label-secondary,#4b5563); }
.ic-answer-ref b { color:var(--dsw-alias-label-primary,#1f2329); }
.ic-answer-details { margin-top:8px; }
.ic-answer-details summary { cursor:pointer; color:var(--dsw-alias-brand-primary,#2563eb); font-size:11px; }
.ic-answer-fav { margin-left:auto; }
.ic-toast { position:fixed; right:22px; bottom:22px; z-index:80; max-width:420px; background:#1f2937; color:#fff; border-radius:10px; padding:9px 12px; font-size:12px; box-shadow:0 10px 30px rgba(15,23,42,.25); }
.ic-drill { margin-top:14px; border:1px solid var(--dsw-alias-border-l2,#e1e5ea); border-radius:12px; padding:13px 14px; background:var(--dsw-alias-bg-layer-2,#f8fafc); }
.ic-drill-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.ic-drill-head b { font-size:13px; }
.ic-drill-q { font-size:14px; line-height:1.65; margin:7px 0 9px; font-weight:650; }
.ic-drill-levels { display:flex; gap:5px; margin:8px 0; flex-wrap:wrap; }
.ic-drill-level { font-size:10px; border-radius:999px; padding:3px 7px; background:var(--dsw-alias-bg-layer-3,#eef1f5); color:var(--dsw-alias-label-tertiary,#7b8490); }
.ic-drill-level[data-state="done"] { background:#e8f6ee; color:#1f7a45; }
.ic-drill-level[data-state="active"] { background:#e8efff; color:#2457c5; font-weight:700; }
.ic-drill-history { margin-top:9px; border-top:1px dashed var(--dsw-alias-border-l2,#e1e5ea); padding-top:7px; }
.ic-drill-history details { padding:4px 0; font-size:12px; }
.ic-drill-history summary { cursor:pointer; color:var(--dsw-alias-label-secondary,#4b5563); }
.ic-drill-history p { margin:5px 0; line-height:1.6; }
.ic-drill-summary { display:flex; gap:16px; align-items:baseline; margin:6px 0; }
.ic-drill-summary b { font-size:24px; }
.ic-drill-summary span { font-size:11px; color:var(--dsw-alias-label-tertiary,#7b8490); }
.ic-supplement { margin-top:14px; border:1px solid var(--dsw-alias-border-l2,#e1e5ea); border-radius:12px; padding:13px 14px; background:var(--dsw-alias-bg-layer-1,#fff); }
.ic-supplement-head { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.ic-supplement-head b { font-size:13px; }
.ic-qchips { display:flex; flex-wrap:wrap; gap:7px; margin:8px 0 4px; }
.ic-qchip { border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#2563eb) 28%, var(--dsw-alias-border-l2,#e1e5ea)); background:color-mix(in srgb, var(--dsw-alias-brand-primary,#2563eb) 5%, var(--dsw-alias-bg-layer-1,#fff)); color:var(--dsw-alias-label-primary,#1f2329); border-radius:9px; padding:6px 9px; cursor:pointer; font:inherit; font-size:12px; text-align:left; line-height:1.45; }
.ic-qchip:hover { background:color-mix(in srgb, var(--dsw-alias-brand-primary,#2563eb) 10%, var(--dsw-alias-bg-layer-1,#fff)); }
.ic-qchip:disabled { opacity:.55; cursor:wait; }
.ic-ask { display:flex; gap:8px; align-items:center; margin-top:9px; }
.ic-ask .ic-input { flex:1; width:auto; min-width:0; font-size:12px; }
.ic-ask .ic-btn { white-space:nowrap; }
.ic-supplement-thread { margin-top:10px; border-top:1px dashed var(--dsw-alias-border-l2,#e1e5ea); padding-top:8px; }
.ic-supplement-item { padding:7px 0; }
.ic-supplement-q { font-size:12px; font-weight:650; line-height:1.55; }
.ic-supplement-ref { margin:6px 0 0; padding:8px 10px; border-left:3px solid var(--dsw-alias-brand-primary,#2563eb); border-radius:6px; background:color-mix(in srgb, var(--dsw-alias-brand-primary,#2563eb) 5%, var(--dsw-alias-bg-layer-1,#fff)); font-size:12px; line-height:1.65; white-space:pre-wrap; }
.ic-supplement-ref b { display:block; font-size:11px; color:var(--dsw-alias-brand-primary,#2563eb); margin-bottom:3px; }
.ic-supplement-a { margin:4px 0 0; font-size:12px; line-height:1.65; white-space:pre-wrap; color:var(--dsw-alias-label-secondary,#4b5563); }
.ic-supplement-evidence { margin:4px 0 0; font-size:11px; color:var(--dsw-alias-label-tertiary,#7b8490); }
.ic-supplement-evidence span { display:block; margin-top:2px; }
`

    const COPY = {
      panel: '面试教练',
      title: '面试教练',
      subtitle: 'Mock-first · 简历优先 · 答案不打断你',
    }

    function api(path, options = {}) {
      return fetch(path, {
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
        ...options,
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          const error = new Error(payload?.error?.message ?? `HTTP ${response.status}`)
          error.code = payload?.error?.code
          throw error
        }
        return payload
      })
    }

    function createStore() {
      let snapshot = {
        loading: true,
        error: '',
        data: null,
        mock: null,
        quick: null,
        toast: '',
        hudHidden: false,
        hudCollapsed: false,
      }
      const listeners = new Set()
      const emit = () => {
        for (const listener of listeners) listener()
      }
      const set = (patch) => {
        snapshot = typeof patch === 'function' ? patch(snapshot) : { ...snapshot, ...patch }
        emit()
      }
      const subscribe = (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
      const getSnapshot = () => snapshot

      const SESSION_ISSUE_MESSAGES = {
        SESSION_NOT_FOUND: '这轮 Mock 已失效（插件重启或数据清理），已重置，请重新开始。',
        SESSION_FINISHED: '这轮 Mock 已经结束，请查看复盘。',
        SESSION_COMPLETE: '这轮 Mock 的题目已经答完，请生成复盘。',
      }

      async function apiSession(path, options) {
        try {
          return await api(path, options)
        } catch (error) {
          const message = SESSION_ISSUE_MESSAGES[error?.code]
          if (!message) throw error
          error.message = message
          if (error.code === 'SESSION_NOT_FOUND') {
            set({ mock: null, quick: null, hudCollapsed: true, toast: message })
          }
          throw error
        }
      }

      async function refresh() {
        try {
          const data = await api('/interview-coach/state')
          set((current) => {
            let mock = current.mock
            if (data.session) {
              if (data.session.currentQuestion) {
                if (!mock || mock.session?.id !== data.session.id) {
                  mock = {
                    session: data.session,
                    question: data.session.currentQuestion,
                    answer: null,
                    feedback: null,
                    nextQuestion: null,
                    drill: null,
                    drillFeedback: null,
                    done: false,
                    total: data.session.questionCount,
                  }
                } else {
                  mock = { ...mock, session: data.session }
                }
              } else if (mock?.session?.id === data.session.id) {
                mock = { ...mock, session: data.session }
              } else if (mock && !mock.report) {
                mock = null
              }
            } else if (mock && !mock.report) {
              mock = null
            }
            return { ...current, loading: false, error: '', data, mock }
          })
        } catch (error) {
          set({ loading: false, error: String(error?.message ?? error) })
        }
      }

      async function saveProfile(fields) {
        set({ error: '' })
        const result = await api('/interview-coach/setup', { method: 'POST', body: JSON.stringify(fields) })
        await refresh()
        set({ toast: '已保存，并重建简历/JD/补充材料记忆' })
        return result
      }

      async function importFile(file) {
        const buffer = await file.arrayBuffer()
        let binary = ''
        const bytes = new Uint8Array(buffer)
        const chunk = 0x8000
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
        }
        const result = await api('/interview-coach/setup/import', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, base64: btoa(binary) }),
        })
        if (typeof result.text !== 'string') throw new Error('导入结果缺少文本')
        return { text: result.text, name: file.name }
      }

      async function generatePersonal(count = 10) {
        return api('/interview-coach/personal/generate', { method: 'POST', body: JSON.stringify({ count }) })
      }

      async function adoptPersonal(questions) {
        const result = await api('/interview-coach/personal/adopt', {
          method: 'POST',
          body: JSON.stringify({ questions }),
        })
        await refresh()
        return result
      }

      async function deletePersonal(id) {
        const result = await api('/interview-coach/personal/delete', {
          method: 'POST',
          body: JSON.stringify({ id }),
        })
        await refresh()
        return result
      }

      async function startMock(options) {
        set({ error: '' })
        const result = await api('/interview-coach/mock/start', { method: 'POST', body: JSON.stringify(options) })
        set({
          mock: {
            session: result.session,
            question: result.question,
            answer: null,
            feedback: null,
            nextQuestion: null,
            drill: null,
            drillFeedback: null,
            done: false,
            total: result.total,
          },
          quick: null,
          hudCollapsed: false,
        })
        await refresh()
      }

      async function submitAnswer(answer) {
        const mock = snapshot.mock
        if (!mock?.question) throw new Error('没有正在进行的题目')
        const result = await apiSession('/interview-coach/mock/answer', {
          method: 'POST',
          body: JSON.stringify({ sessionId: mock.session.id, questionId: mock.question.id, answer }),
        })
        set((current) => ({
          ...current,
          mock: {
            ...current.mock,
            session: result.session,
            question: result.question,
            answer,
            feedback: result.feedback,
            nextQuestion: result.nextQuestion,
            drill: null,
            drillFeedback: null,
            done: result.done,
          },
          hudCollapsed: false,
        }))
      }

      function advance() {
        const mock = snapshot.mock
        if (!mock?.nextQuestion) return
        set((current) => ({
          ...current,
          mock: {
            ...current.mock,
            question: current.mock.nextQuestion,
            answer: null,
            feedback: null,
            nextQuestion: null,
            drill: null,
            drillFeedback: null,
            done: false,
          },
          hudCollapsed: true,
        }))
      }

      async function startDrill() {
        const mock = snapshot.mock
        if (!mock?.question) throw new Error('没有已提交的题目')
        const result = await apiSession('/interview-coach/mock/drill/start', {
          method: 'POST',
          body: JSON.stringify({ sessionId: mock.session.id, questionId: mock.question.id }),
        })
        set((current) => ({
          ...current,
          mock: { ...current.mock, drill: result.drill, drillFeedback: null },
          hudCollapsed: false,
        }))
        return result
      }

      async function submitDrill(answer) {
        const mock = snapshot.mock
        if (!mock?.drill) throw new Error('还没有开始深挖')
        const result = await apiSession('/interview-coach/mock/drill/answer', {
          method: 'POST',
          body: JSON.stringify({ sessionId: mock.session.id, questionId: mock.question.id, answer }),
        })
        set((current) => ({
          ...current,
          mock: { ...current.mock, drill: result.drill, drillFeedback: result.feedback ?? null },
          hudCollapsed: false,
        }))
        return result
      }

      async function askSupplement(question) {
        const mock = snapshot.mock
        if (!mock?.question) throw new Error('没有已提交的题目')
        return apiSession('/interview-coach/mock/supplement', {
          method: 'POST',
          body: JSON.stringify({ sessionId: mock.session.id, questionId: mock.question.id, question }),
        })
      }

      async function finishMock() {
        const mock = snapshot.mock
        if (!mock?.session) return
        const result = await apiSession('/interview-coach/mock/finish', {
          method: 'POST',
          body: JSON.stringify({ sessionId: mock.session.id }),
        })
        set((current) => ({
          ...current,
          mock: {
            ...current.mock,
            report: result.report,
            session: result.session,
            done: true,
            feedback: null,
            drill: null,
            drillFeedback: null,
          },
          hudCollapsed: true,
        }))
        await refresh()
      }

      function resetMock() {
        set({ mock: null, quick: null, hudCollapsed: true })
        void refresh()
      }

      async function quickAsk(question, answer) {
        const result = await api('/interview-coach/answer', {
          method: 'POST',
          body: JSON.stringify({ question, answer }),
        })
        set({ quick: { question, answer, feedback: result.feedback }, hudCollapsed: false })
      }

      function setHud(patch) {
        set(patch)
      }

      function setToast(toast) {
        set({ toast })
      }

      return {
        subscribe,
        getSnapshot,
        refresh,
        saveProfile,
        importFile,
        generatePersonal,
        adoptPersonal,
        deletePersonal,
        startMock,
        submitAnswer,
        advance,
        startDrill,
        submitDrill,
        askSupplement,
        finishMock,
        resetMock,
        quickAsk,
        setHud,
        setToast,
      }
    }

    function useStore(store) {
      return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
    }

    function useNow(active) {
      const [now, setNow] = React.useState(Date.now())
      React.useEffect(() => {
        if (!active) return undefined
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
      }, [active])
      return now
    }

    function elapsed(from, now) {
      if (!from) return '00:00'
      const total = Math.max(0, Math.floor((now - from) / 1000))
      const minutes = String(Math.floor(total / 60)).padStart(2, '0')
      const seconds = String(total % 60).padStart(2, '0')
      return `${minutes}:${seconds}`
    }

    function Badge({ children, tone }) {
      return h('span', { className: 'ic-badge', 'data-tone': tone }, children)
    }

    function Btn({ children, kind, ...props }) {
      return h('button', { className: 'ic-btn', 'data-kind': kind, type: 'button', ...props }, children)
    }

    function SetupTab({ store, data }) {
      const profile = data?.profile ?? {}
      const [resume, setResume] = React.useState('')
      const [resumeName, setResumeName] = React.useState('')
      const [jd, setJd] = React.useState('')
      const [notes, setNotes] = React.useState('')
      const [role, setRole] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [message, setMessage] = React.useState('')
      const [error, setError] = React.useState('')
      const fileRef = React.useRef(null)

      React.useEffect(() => {
        setRole(profile.targetRole ?? '')
        setResumeName(profile.resumeName ?? '')
      }, [profile.targetRole, profile.resumeName])

      async function onFile(event) {
        const file = event.target.files?.[0]
        if (!file) return
        setBusy(true)
        setError('')
        setMessage('')
        try {
          const imported = await store.importFile(file)
          setResume(imported.text)
          setResumeName(imported.name)
          setMessage(`已读取 ${imported.name}（${imported.text.length} 字），确认后点保存。`)
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
          event.target.value = ''
        }
      }

      async function save() {
        setBusy(true)
        setError('')
        setMessage('')
        try {
          const fields = { targetRole: role }
          if (String(resume ?? '').trim()) {
            fields.resumeText = resume
            if (resumeName) fields.resumeName = resumeName
          }
          if (String(jd ?? '').trim()) fields.jdText = jd
          if (String(notes ?? '').trim()) fields.notesText = notes
          await store.saveProfile(fields)
          setMessage('已保存，并重建记忆。')
          setResume('')
          setJd('')
          setNotes('')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      return h(
        'div',
        { className: 'ic-grid' },
        h(
          'div',
          null,
          h(
            'div',
            { className: 'ic-card' },
            h('h3', null, '简历与目标'),
            h('label', { className: 'ic-label' }, '目标岗位'),
            h('input', {
              className: 'ic-input',
              value: role,
              placeholder: '例如：Agent 开发工程师 / LLM 应用开发',
              onChange: (event) => setRole(event.target.value),
            }),
            h('label', { className: 'ic-label' }, '简历文本（最重要；支持 .txt/.md/.docx 导入，PDF 请粘贴）'),
            h('textarea', {
              className: 'ic-textarea ic-resume',
              value: resume,
              placeholder: profile.resumeChars > 0 ? `已保存 ${profile.resumeChars} 字；如需替换，在这里粘贴新简历。` : '粘贴简历内容，或选择文件导入。',
              onChange: (event) => setResume(event.target.value),
            }),
            h(
              'div',
              { className: 'ic-row', style: { marginTop: 8 } },
              h('input', { ref: fileRef, type: 'file', accept: '.txt,.md,.markdown,.docx', style: { display: 'none' }, onChange: onFile }),
              h(Btn, { onClick: () => fileRef.current?.click(), disabled: busy }, busy ? '读取中…' : '导入文件'),
              h('span', { className: 'ic-meta' }, profile.resumeName || '未导入文件'),
            ),
          ),
          h(
            'div',
            { className: 'ic-card' },
            h('h3', null, 'JD 与补充材料'),
            h('label', { className: 'ic-label' }, '目标 JD'),
            h('textarea', {
              className: 'ic-textarea',
              value: jd,
              placeholder: '粘贴 JD；用于把简历经历映射到岗位要求。',
              onChange: (event) => setJd(event.target.value),
            }),
            h('label', { className: 'ic-label' }, '补充材料（GitHub / 博客 / 项目笔记；只写真实内容）'),
            h('textarea', {
              className: 'ic-textarea',
              value: notes,
              placeholder: '可粘贴 GitHub README、博客要点、项目复盘。不要写没做过的内容。',
              onChange: (event) => setNotes(event.target.value),
            }),
            error ? h('div', { className: 'ic-error' }, error) : null,
            message ? h('div', { className: 'ic-ok' }, message) : null,
            h(
              'div',
              { className: 'ic-row', style: { marginTop: 10 } },
              h(Btn, { kind: 'primary', onClick: save, disabled: busy }, busy ? '保存中…' : '保存并重建记忆'),
              h('span', { className: 'ic-meta' }, '简历权重最高；不会编造简历外的事实。'),
            ),
          ),
        ),
        h(
          'div',
          null,
          h(
            'div',
            { className: 'ic-card' },
            h('h3', null, '当前记忆'),
            h(
              'div',
              { className: 'ic-stats' },
              h('div', { className: 'ic-stat' }, h('b', null, data?.memory?.total ?? 0), h('span', null, '记忆卡片')),
              h('div', { className: 'ic-stat' }, h('b', null, data?.bank?.total ?? 0), h('span', null, '题库题目')),
              h('div', { className: 'ic-stat' }, h('b', null, data?.bank?.polished ?? 0), h('span', null, '精修题')),
            ),
            h('div', { className: 'ic-label' }, '来源分布'),
            Object.entries(data?.memory?.bySource ?? {}).map(([source, count]) =>
              h('div', { key: source, className: 'ic-stat', style: { flexDirection: 'row', justifyContent: 'space-between' } }, h('span', null, source), h('b', null, count)),
            ),
          ),
          h(
            'div',
            { className: 'ic-card' },
            h('h3', null, 'Mock 模式说明'),
            h('p', { className: 'ic-meta', style: { margin: 0 } }, 'Mock 中你用自己的话回答；提交前 HUD 只显示题号与计时，不显示答案。提交后才出现提示与参考答案。'),
            h('p', { className: 'ic-meta' }, 'ASR 是增强项：当前版本先支持文字作答；麦克风转写可在后续接入。'),
          ),
        ),
      )
    }

    function MockTab({ store, data }) {
      const snap = useStore(store)
      const mock = snap.mock
      const active = Boolean(mock?.session && mock.session.status === 'active')
      const question = mock?.feedback ? mock.question : mock?.question
      const [answer, setAnswer] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const [count, setCount] = React.useState(10)
      const [scope, setScope] = React.useState('mixed')
      const now = useNow(active && !mock?.feedback)
      const [elapsedMs, setElapsedMs] = React.useState(0)
      React.useEffect(() => {
        if (!active || !question?.id) return
        setElapsedMs(0)
        const started = Date.now()
        const id = setInterval(() => setElapsedMs(Date.now() - started), 1000)
        return () => clearInterval(id)
      }, [active, question?.id])

      async function start() {
        setBusy(true)
        setError('')
        try {
          await store.startMock({ count, scope })
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      async function submit() {
        if (!answer.trim()) {
          setError('先写一点你的回答，再提交。')
          return
        }
        setBusy(true)
        setError('')
        try {
          await store.submitAnswer(answer)
          setAnswer('')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      async function finish() {
        setBusy(true)
        setError('')
        try {
          await store.finishMock()
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      if (!mock) {
        return h(
          'div',
          { className: 'ic-grid' },
          h(
            'div',
            { className: 'ic-card' },
            h('h3', null, '开始一场 Agent 面试 Mock'),
            h('p', { className: 'ic-meta', style: { marginTop: 0 } }, '从题库按层级抽题；每题先自己回答，再对照提示与参考答案。'),
            h('label', { className: 'ic-label' }, '题目来源'),
            h(
              'select',
              { className: 'ic-select', value: scope, onChange: (event) => setScope(event.target.value) },
              [
                ['mixed', `混合：预置 + 我的题（${data?.bank?.personal ?? 0} 道）`],
                ['preset', '仅预置题库'],
                ['personal', `仅我的题（${data?.bank?.personal ?? 0} 道）`],
              ].map(([value, label]) => h('option', { key: value, value, disabled: value === 'personal' && !(data?.bank?.personal > 0) }, label)),
            ),
            h('label', { className: 'ic-label' }, '题目数量'),
            h(
              'select',
              { className: 'ic-select', value: count, onChange: (event) => setCount(Number(event.target.value)) },
              [5, 10, 15].map((value) => h('option', { key: value, value }, `${value} 题`)),
            ),
            h(
              'div',
              { className: 'ic-row', style: { marginTop: 12 } },
              h(Btn, { kind: 'primary', onClick: start, disabled: busy }, busy ? '准备中…' : '开始 Mock'),
            ),
            error ? h('div', { className: 'ic-error' }, error) : null,
          ),
          h(
            'div',
            { className: 'ic-card' },
            h('h3', null, '评分维度'),
            h('div', { className: 'ic-stat' }, h('b', null, '正确性 40%'), h('span', null, '关键机制、边界、取舍是否说对')),
            h('div', { className: 'ic-stat' }, h('b', null, '结构 20%'), h('span', null, '结论先行，STAR / 目标-方案-取舍-指标')),
            h('div', { className: 'ic-stat' }, h('b', null, '证据 20%'), h('span', null, '只引用简历中真实项目与数字')),
            h('div', { className: 'ic-stat' }, h('b', null, '深度 20%'), h('span', null, '失败案例、监控、成本、演进')),
          ),
        )
      }

      if (mock.report) {
        return h(ReportView, { report: mock.report, onRestart: () => store.resetMock() })
      }

      const total = mock.session?.questionCount ?? mock.total ?? 1
      const index = Math.min(total, (mock.session?.currentIndex ?? 0) + (mock.feedback ? 0 : 1))
      const progress = Math.round((Math.max(0, index - 1) / Math.max(1, total)) * 100)
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ic-card' },
          h(
            'div',
            { className: 'ic-row' },
            h(Badge, { tone: 'blue' }, `${question?.level ?? 'L?'} · ${question?.topic ?? '综合'}`),
            h('span', { className: 'ic-meta' }, `第 ${Math.min(index, total)} / ${total} 题`),
            h('span', { className: 'ic-meta' }, active && !mock.feedback ? `本题 ${elapsed(0, elapsedMs)}` : '已提交'),
            mock.feedback ? h(Badge, { tone: mock.feedback.score >= 70 ? 'good' : 'warn' }, `${mock.feedback.score} 分`) : null,
          ),
          h('div', { className: 'ic-progress' }, h('i', { style: { width: `${progress}%` } })),
          h('div', { className: 'ic-question' }, question?.question ?? '题目加载中…'),
          !mock.feedback
            ? h(
                'div',
                null,
                h('label', { className: 'ic-label' }, '你的回答（提交前 HUD 不显示参考答案）'),
                h('textarea', {
                  className: 'ic-textarea',
                  value: answer,
                  placeholder: '用你面试时会说的话回答；可以先说结论，再讲机制和取舍。',
                  onChange: (event) => setAnswer(event.target.value),
                }),
                h(
                  'div',
                  { className: 'ic-row', style: { marginTop: 10 } },
                  h(Btn, { kind: 'primary', onClick: submit, disabled: busy }, busy ? '评估中…' : '提交回答'),
                  h(Btn, { onClick: finish, disabled: busy || (mock.session?.answers?.length ?? 0) === 0 }, '提前结束并生成复盘'),
                ),
                error ? h('div', { className: 'ic-error' }, error) : null,
              )
            : h(
                'div',
                null,
                h(FeedbackPanel, { feedback: mock.feedback, question: mock.question, answer: mock.answer }),
                h(SupplementPanel, { key: `sup-${mock.question?.id}`, store, mock }),
                h(DrillPanel, { key: mock.question?.id, store, mock }),
              ),
        ),
        mock.feedback
          ? h(
              'div',
              { className: 'ic-row', style: { marginTop: 12 } },
              mock.nextQuestion
                ? h(Btn, { kind: 'primary', onClick: () => store.advance() }, '下一题')
                : h(Btn, { kind: 'primary', onClick: finish, disabled: busy }, busy ? '生成复盘中…' : '生成最终复盘'),
              h(Btn, { onClick: finish, disabled: busy || !mock.nextQuestion }, '直接生成复盘'),
            )
          : null,
      )
    }

    function DrillPanel({ store, mock }) {
      const drill = mock?.drill ?? null
      const [hidden, setHidden] = React.useState(false)
      const [answer, setAnswer] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const probeCount = drill?.probes?.length ?? 0
      React.useEffect(() => {
        setAnswer('')
      }, [probeCount, drill?.status])

      if (hidden) {
        return h(
          'div',
          { className: 'ic-drill', style: { padding: '9px 12px' } },
          h(
            'div',
            { className: 'ic-row' },
            h('span', { className: 'ic-meta' }, '已跳过这轮深挖。'),
            h(Btn, { onClick: () => setHidden(false) }, '重新打开'),
          ),
        )
      }

      async function start() {
        setBusy(true)
        setError('')
        try {
          await store.startDrill()
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      async function submit() {
        if (!answer.trim()) {
          setError('先写下你的回答，再提交。')
          return
        }
        setBusy(true)
        setError('')
        try {
          await store.submitDrill(answer)
          setAnswer('')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }

      if (!drill) {
        return h(
          'div',
          { className: 'ic-drill' },
          h(
            'div',
            { className: 'ic-drill-head' },
            h('b', null, '继续深挖这道题'),
            h(Badge, { tone: 'blue' }, '3 层'),
          ),
          h('div', { className: 'ic-meta', style: { margin: '0 0 8px' } }, '机制 → 边界 → 实战。每次只追一问；答完会继续追问，不替换主问题评分。'),
          h(
            'div',
            { className: 'ic-row' },
            h(Btn, { kind: 'primary', onClick: start, disabled: busy }, busy ? '准备中…' : '开始深挖'),
            h(Btn, { onClick: () => setHidden(true), disabled: busy }, '跳过'),
          ),
          error ? h('div', { className: 'ic-error' }, error) : null,
        )
      }

      const levels = [1, 2, 3]
      const levelNames = ['机制与细节', '边界与权衡', '实战与度量']
      const doneLevels = new Set((drill.probes ?? []).map((probe) => probe.level))
      const activeLevel = drill.status === 'active' ? drill.current?.level : null

      function levelStrip() {
        return h(
          'div',
          { className: 'ic-drill-levels' },
          levels.map((level) =>
            h(
              'span',
              {
                key: level,
                className: 'ic-drill-level',
                'data-state': doneLevels.has(level) ? 'done' : activeLevel === level ? 'active' : 'todo',
              },
              `${level} ${levelNames[level - 1]}${doneLevels.has(level) ? ' ✓' : ''}`,
            ),
          ),
        )
      }

      function history() {
        if (!drill.probes?.length) return null
        return h(
          'div',
          { className: 'ic-drill-history' },
          drill.probes.map((probe) =>
            h(
              'details',
              { key: probe.level },
              h('summary', null, `第 ${probe.level} 层 · ${probe.focus} · ${probe.feedback?.score ?? 0} 分`),
              h('p', { style: { fontWeight: 600 } }, probe.question),
              h('p', { className: 'ic-meta' }, `你的回答：${probe.answer}`),
              probe.feedback?.gaps?.length
                ? h('p', { className: 'ic-meta' }, `要补：${probe.feedback.gaps.join('；')}`)
                : null,
            ),
          ),
        )
      }

      if (drill.status === 'done') {
        return h(
          'div',
          { className: 'ic-drill' },
          h('div', { className: 'ic-drill-head' }, h('b', null, '深挖完成'), h(Badge, { tone: 'good' }, `${drill.summary?.count ?? drill.probes?.length ?? 0} 层`)),
          levelStrip(),
          h(
            'div',
            { className: 'ic-drill-summary' },
            h('b', null, drill.summary?.average ?? 0),
            h('span', null, '深挖均分 / 100'),
            h('span', null, `深度分 ${drill.summary?.depthScore ?? 0}`),
          ),
          drill.summary?.gaps?.length
            ? h('div', null, h('b', { className: 'ic-label' }, '反复出现的缺口'), h('ul', { className: 'ic-list' }, drill.summary.gaps.map((item, index) => h('li', { key: index }, `${item.gap}（${item.count} 次）`))))
            : null,
          history(),
        )
      }

      return h(
        'div',
        { className: 'ic-drill' },
        h(
          'div',
          { className: 'ic-drill-head' },
          h('b', null, `深挖 ${drill.current?.level ?? 1} / 3`),
          h(Badge, { tone: 'blue' }, drill.current?.focus ?? '机制与细节'),
        ),
        levelStrip(),
        h('div', { className: 'ic-drill-q' }, drill.current?.question ?? '正在准备追问…'),
        h('label', { className: 'ic-label' }, '只回答这一层；不用重复主问题的全部内容'),
        h('textarea', {
          className: 'ic-textarea',
          value: answer,
          placeholder: '尽量给出具体机制、边界、失败案例或指标。',
          onChange: (event) => setAnswer(event.target.value),
          rows: 3,
        }),
        h(
          'div',
          { className: 'ic-row', style: { marginTop: 8 } },
          h(Btn, { kind: 'primary', onClick: submit, disabled: busy }, busy ? '评估中…' : '提交追问'),
          h(Btn, { onClick: () => setHidden(true), disabled: busy }, '跳过深挖'),
        ),
        error ? h('div', { className: 'ic-error' }, error) : null,
        history(),
      )
    }

    function SupplementPanel({ store, mock }) {
      const feedback = mock?.feedback
      const [questions, setQuestions] = React.useState([])
      const [thread, setThread] = React.useState([])
      const [custom, setCustom] = React.useState('')
      const [busy, setBusy] = React.useState('')
      const [error, setError] = React.useState('')
      React.useEffect(() => {
        setQuestions(feedback?.supplement_questions ?? [])
        setThread([])
        setCustom('')
        setError('')
      }, [mock?.question?.id, feedback])
      const options = questions.length > 0 ? questions : feedback?.supplement_questions ?? []
      if (!feedback) return null

      async function ask(question) {
        const text = String(question ?? '').trim()
        if (!text) {
          setError('先输入一个追问。')
          return false
        }
        setBusy(text)
        setError('')
        try {
          const result = await store.askSupplement(text)
          setThread((items) => [...items, { question: text, reference_answer: result.reference_answer ?? '', answer: result.answer, evidence: result.evidence ?? [] }])
          setQuestions((items) => {
            const remaining = items.filter((item) => item !== text)
            const next = Array.isArray(result.questions) ? result.questions : []
            return [...new Set([...remaining, ...next])].slice(0, 6)
          })
          return true
        } catch (cause) {
          setError(String(cause?.message ?? cause))
          return false
        } finally {
          setBusy('')
        }
      }

      async function askCustom() {
        const question = custom.trim()
        if (!question || busy) return
        if (await ask(question)) setCustom('')
      }

      return h(
        'div',
        { className: 'ic-supplement' },
        h(
          'div',
          { className: 'ic-supplement-head' },
          h('b', null, '补充提问 · 追问参考答案'),
          h(Badge, { tone: 'blue' }, '自动生成 + 自定义'),
        ),
        h('div', { className: 'ic-meta', style: { margin: '0 0 2px' } }, '点下面的问题，或在输入框里写自己的追问；每次回答都会继续生成 2–3 个可点的追问。'),
        options.length > 0
          ? h(
              'div',
              { className: 'ic-qchips' },
              options.map((question, index) =>
                h(
                  'button',
                  { key: `${index}-${question}`, className: 'ic-qchip', onClick: () => ask(question), disabled: Boolean(busy) },
                  busy === question ? '解释中…' : question,
                ),
              ),
            )
          : null,
        h(
          'div',
          { className: 'ic-ask' },
          h('input', {
            className: 'ic-input',
            value: custom,
            maxLength: 300,
            placeholder: '也可以输入自己的追问，例如：为什么这里不直接用向量检索？',
            onChange: (event) => setCustom(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
                event.preventDefault()
                void askCustom()
              }
            },
          }),
          h(Btn, { onClick: askCustom, disabled: Boolean(busy) || !custom.trim() }, busy ? '回答中…' : '提问'),
        ),
        thread.length > 0
          ? h(
              'div',
              { className: 'ic-supplement-thread' },
              thread.map((item, index) =>
                h(
                  'div',
                  { key: index, className: 'ic-supplement-item' },
                  h('div', { className: 'ic-supplement-q' }, `Q：${item.question}`),
                  item.reference_answer
                    ? h('div', { className: 'ic-supplement-ref' }, h('b', null, '参考回答'), item.reference_answer)
                    : null,
                  h('div', { className: 'ic-supplement-explain' }, h('b', { className: 'ic-label', style: { margin: '4px 0 0' } }, '解释与补充'), h('p', { className: 'ic-supplement-a' }, item.answer)),
                  item.evidence?.length
                    ? h(
                        'div',
                        { className: 'ic-supplement-evidence' },
                        h('b', { className: 'ic-label', style: { margin: '3px 0' } }, '引用'),
                        item.evidence.map((evidence, evidenceIndex) =>
                          h('span', { key: evidenceIndex }, `[${evidence.source}] ${evidence.text}`),
                        ),
                      )
                    : null,
                ),
              ),
            )
          : null,
        error ? h('div', { className: 'ic-error' }, error) : null,
      )
    }

    function reviewSpans(answer, review) {
      const text = String(answer ?? '')
      if (!text || !review) return []
      const spans = []
      const add = (item, kind) => {
        if (!item || typeof item.quote !== 'string') return
        let start = Number.isInteger(item.start) ? item.start : -1
        let end = Number.isInteger(item.end) ? item.end : -1
        if (!(start >= 0 && end > start && end <= text.length && text.slice(start, end) === item.quote)) {
          const found = text.indexOf(item.quote)
          if (found < 0) return
          start = found
          end = found + item.quote.length
        }
        if (!(start >= 0 && end > start && end <= text.length)) return
        if (spans.some((span) => start < span.end && span.start < end)) return
        spans.push({ start, end, kind, item })
      }
      for (const item of review.corrections ?? []) add(item, 'bad')
      for (const item of review.highlights ?? []) add(item, 'ok')
      return spans.sort((left, right) => left.start - right.start)
    }

    function AnswerReview({ answer, review }) {
      const text = String(answer ?? '')
      if (!text) return null
      const spans = reviewSpans(text, review)
      const parts = []
      let cursor = 0
      for (const span of spans) {
        if (span.start > cursor) parts.push(text.slice(cursor, span.start))
        const label = span.kind === 'ok' ? '正确' : '需要纠正'
        parts.push(h('mark', { key: `${span.start}-${span.kind}`, className: `ic-mark-${span.kind}`, title: `${label}：${span.item.comment ?? span.item.problem ?? ''}` }, text.slice(span.start, span.end)))
        cursor = span.end
      }
      if (cursor < text.length) parts.push(text.slice(cursor))
      const corrections = review?.corrections ?? []
      const missing = review?.missing ?? []
      return h(
        'div',
        { className: 'ic-review' },
        h('div', { className: 'ic-review-head' }, h('b', null, '你的回答'), h('span', { className: 'ic-review-legend' }, '绿色：正确 · 橙色：需要纠正')),
        h('div', { className: 'ic-review-answer' }, parts.length > 0 ? parts : text),
        corrections.length > 0
          ? h(
              'div',
              { className: 'ic-review-note' },
              h('b', null, '纠正'),
              corrections.map((item, index) =>
                h(
                  'div',
                  { key: index, className: 'ic-review-item' },
                  h('div', { className: 'ic-review-quote' }, `原话：${item.quote}`),
                  item.problem ? h('div', null, h('b', null, '问题：'), item.problem) : null,
                  item.fix ? h('div', { className: 'ic-review-fix' }, h('b', null, '改成：'), item.fix) : null,
                ),
              ),
            )
          : null,
        missing.length > 0
          ? h(
              'div',
              { className: 'ic-review-note' },
              h('b', null, '遗漏'),
              missing.map((item, index) =>
                h('div', { key: index, className: 'ic-review-item' }, h('b', null, `${item.point}：`), item.explain || '参考答案要求补上这一点。'),
              ),
            )
          : null,
      )
    }

    function FeedbackPanel({ feedback, question, answer }) {
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ic-row', style: { marginTop: 4 } },
          h('div', { className: 'ic-score' }, feedback.score, h('small', null, ' / 100')),
          h('div', { className: 'ic-meta' }, feedback.source === 'llm' ? 'LLM 对照简历与题库生成' : '题库兜底（LLM 不可用时）'),
        ),
        h(AnswerReview, { answer, review: feedback.answer_review }),
        h('div', { className: 'ic-cue' }, (feedback.cue ?? []).map((item, index) => h('span', { key: index }, item))),
        h('div', { className: 'ic-answer' }, h('b', null, 'Short answer'), h('div', null, feedback.short_answer)),
        h(
          'details',
          { className: 'ic-hud-full', open: false },
          h('summary', null, '展开完整参考答案'),
          h('div', { style: { marginTop: 6, whiteSpace: 'pre-wrap' } }, feedback.full_answer),
        ),
        feedback.strengths?.length
          ? h('div', { style: { marginTop: 10 } }, h('b', { className: 'ic-label' }, '做得好的'), h('ul', { className: 'ic-list' }, feedback.strengths.map((item, index) => h('li', { key: index }, item))))
          : null,
        feedback.gaps?.length
          ? h('div', { style: { marginTop: 8 } }, h('b', { className: 'ic-label' }, '需要补的点'), h('ul', { className: 'ic-list' }, feedback.gaps.map((item, index) => h('li', { key: index }, item))))
          : null,
        feedback.suggestions?.length
          ? h('div', { style: { marginTop: 8 } }, h('b', { className: 'ic-label' }, '下一轮动作'), h('ul', { className: 'ic-list' }, feedback.suggestions.map((item, index) => h('li', { key: index }, item))))
          : null,
        feedback.evidence?.length
          ? h(
              'div',
              { style: { marginTop: 8 } },
              h('b', { className: 'ic-label' }, '引用证据'),
              feedback.evidence.map((item, index) =>
                h('div', { key: index, className: 'ic-meta', style: { marginTop: 3 } }, `[${item.source}] ${item.text}`),
              ),
            )
          : null,
        feedback.followups?.length
          ? h('div', { style: { marginTop: 8 } }, h('b', { className: 'ic-label' }, '可能的追问'), h('ul', { className: 'ic-list' }, feedback.followups.map((item, index) => h('li', { key: index }, item))))
          : null,
      )
    }

    function ReportView({ report, onRestart }) {
      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ic-card' },
          h('h3', null, 'Mock 复盘'),
          h(
            'div',
            { className: 'ic-row' },
            h('div', { className: 'ic-score' }, report.averageScore, h('small', null, ' / 100')),
            h('div', { className: 'ic-meta' }, `${report.questionCount} 题 · 生成于 ${new Date(report.generatedAt).toLocaleString()}`),
            report.drillCount
              ? h(Badge, { tone: 'blue' }, `深挖 ${report.drillCount} 层 · 均分 ${report.drillAverage}`)
              : null,
          ),
          h(
            'div',
            { className: 'ic-split', style: { marginTop: 12 } },
            Object.entries(report.dimensions ?? {}).map(([key, value]) =>
              h('div', { key, className: 'ic-kv' }, h('b', null, key), h('div', null, `${value} / 100`)),
            ),
          ),
        ),
        h(
          'div',
          { className: 'ic-card' },
          h('h3', null, '优先提升点'),
          report.improvements?.length
            ? report.improvements.map((item) =>
                h('div', { key: item.rank, className: 'ic-report-row' }, h(Badge, { tone: 'warn' }, `#${item.rank}`), h('div', { className: 'ic-report-q' }, h('b', null, item.gap), h('span', null, `出现 ${item.count} 次`))),
              )
            : h('div', { className: 'ic-empty' }, '这次没有记录到明显缺口。'),
        ),
        h(
          'div',
          { className: 'ic-card' },
          h('h3', null, '逐题对照'),
          (report.answers ?? []).map((item, index) =>
            h(
              'details',
              { key: index, className: 'ic-bank-row' },
              h(
                'summary',
                null,
                `${index + 1}. ${item.question}（${item.score} 分${item.drill ? ` · 深挖 ${item.drill.average} 分` : ''}）`,
              ),
              h('div', { className: 'ic-meta', style: { marginTop: 6 } }, h('b', null, '你的回答：'), item.answer || '（空）'),
              item.gaps?.length ? h('ul', { className: 'ic-list' }, item.gaps.map((gap, i) => h('li', { key: i }, gap))) : null,
              item.improvedAnswer ? h('div', { className: 'ic-answer', style: { marginTop: 8 } }, h('b', null, '参考改进'), h('div', null, item.improvedAnswer)) : null,
              item.drill?.probes?.length
                ? h(
                    'div',
                    { style: { marginTop: 8 } },
                    h('b', { className: 'ic-label' }, `深挖 ${item.drill.probes.length} 层 · 均分 ${item.drill.average}`),
                    item.drill.probes.map((probe) =>
                      h(
                        'div',
                        { key: probe.level, className: 'ic-drill-history' },
                        h('b', null, `L${probe.level} ${probe.focus} · ${probe.score} 分`),
                        h('p', { className: 'ic-meta' }, probe.question),
                        h('p', { className: 'ic-meta' }, `你的回答：${probe.answer}`),
                        probe.gaps?.length ? h('p', { className: 'ic-meta' }, `要补：${probe.gaps.join('；')}`) : null,
                      ),
                    ),
                  )
                : null,
            ),
          ),
        ),
        h('div', { className: 'ic-row', style: { marginTop: 12 } }, h(Btn, { kind: 'primary', onClick: onRestart }, '再开一场')),
      )
    }

    function AnswerBankTab({ data }) {
      const [query, setQuery] = React.useState('')
      const [level, setLevel] = React.useState('all')
      const [score, setScore] = React.useState('all')
      const [onlyFavorites, setOnlyFavorites] = React.useState(false)
      const [items, setItems] = React.useState([])
      const [total, setTotal] = React.useState(0)
      const [all, setAll] = React.useState(data?.answers?.total ?? 0)
      const [favorites, setFavorites] = React.useState(data?.answers?.favorites ?? 0)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const seq = React.useRef(0)

      const load = React.useCallback(async () => {
        const requestId = seq.current + 1
        seq.current = requestId
        const params = new URLSearchParams()
        if (query.trim()) params.set('q', query.trim())
        if (level !== 'all') params.set('level', level)
        if (score !== 'all') params.set('score', score)
        if (onlyFavorites) params.set('favorite', '1')
        setBusy(true)
        setError('')
        try {
          const result = await api(`/interview-coach/answers?${params.toString()}`)
          if (seq.current !== requestId) return
          setItems(result.items ?? [])
          setTotal(result.total ?? 0)
          setAll(result.all ?? 0)
          setFavorites(result.favorites ?? 0)
        } catch (cause) {
          if (seq.current === requestId) setError(String(cause?.message ?? cause))
        } finally {
          if (seq.current === requestId) setBusy(false)
        }
      }, [query, level, score, onlyFavorites])

      React.useEffect(() => {
        const timer = setTimeout(() => void load(), 180)
        return () => clearTimeout(timer)
      }, [load])

      async function toggleFavorite(item) {
        setError('')
        try {
          const result = await api('/interview-coach/answers/favorite', {
            method: 'POST',
            body: JSON.stringify({ id: item.id, favorite: !item.favorite }),
          })
          setItems((current) => current.map((entry) => (entry.id === item.id ? result.item : entry)))
          setFavorites(result.answers?.favorites ?? favorites)
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        }
      }

      return h(
        'div',
        null,
        h(
          'div',
          { className: 'ic-card' },
          h('div', { className: 'ic-row', style: { justifyContent: 'space-between' } }, h('h3', null, '回答库'), h(Badge, { tone: 'blue' }, `${total} 条`)),
          h('p', { className: 'ic-meta', style: { marginTop: 0 } }, '每次提交 Mock 后自动保存；可按题目、答案、知识点检索。深挖回答也会保存。'),
          h(
            'div',
            { className: 'ic-answer-toolbar' },
            h('input', {
              className: 'ic-input',
              value: query,
              onChange: (event) => setQuery(event.target.value),
              placeholder: '搜题目、答案、知识点，例如：RRF、权限树、失败',
              'aria-label': '搜索回答库',
            }),
            h(
              'select',
              { className: 'ic-select', value: level, onChange: (event) => setLevel(event.target.value), 'aria-label': '按层级筛选' },
              [['all', '全部层级'], ['L0', 'L0'], ['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3'], ['L4', 'L4']].map(([value, label]) => h('option', { key: value, value }, label)),
            ),
            h(
              'select',
              { className: 'ic-select', value: score, onChange: (event) => setScore(event.target.value), 'aria-label': '按分数筛选' },
              [['all', '全部分数'], ['high', '80 分以上'], ['mid', '60–79 分'], ['low', '60 分以下']].map(([value, label]) => h('option', { key: value, value }, label)),
            ),
            h(Btn, { kind: onlyFavorites ? 'primary' : undefined, onClick: () => setOnlyFavorites((value) => !value) }, onlyFavorites ? `只看收藏 · ${favorites}` : `收藏 ${favorites}`),
          ),
          h('div', { className: 'ic-meta', style: { marginTop: 8 } }, `共 ${all} 条历史回答 · 当前筛选 ${total} 条 · 最多显示 100 条`),
          error ? h('div', { className: 'ic-error' }, error) : null,
          busy && items.length === 0 ? h('div', { className: 'ic-empty' }, '正在读取回答库…') : null,
          items.length === 0 && !busy ? h('div', { className: 'ic-empty' }, all === 0 ? '还没有历史回答。完成一次 Mock 后会自动保存。' : '没有匹配的回答，换个关键词或筛选条件。') : null,
          items.map((item) =>
            h(
              'div',
              { key: item.id, className: 'ic-answer-item' },
              h(
                'div',
                { className: 'ic-answer-meta' },
                item.level ? h(Badge, { tone: 'blue' }, item.level) : null,
                item.topic ? h(Badge, null, item.topic) : null,
                item.kind === 'drill' ? h(Badge, { tone: 'warn' }, `深挖 · ${item.focus || '追问'}`) : h(Badge, null, '主题回答'),
                Number.isFinite(item.score) ? h(Badge, { tone: item.score >= 80 ? 'good' : item.score < 60 ? 'warn' : undefined }, `${item.score} 分`) : null,
                h('span', { className: 'ic-meta' }, item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''),
              ),
              item.kind === 'drill' && item.parentQuestion ? h('div', { className: 'ic-meta' }, `母题：${item.parentQuestion}`) : null,
              h('div', { className: 'ic-answer-q' }, item.question),
              h('div', { className: 'ic-answer-text' }, item.answer || '（空回答）'),
              item.feedback?.short_answer
                ? h('div', { className: 'ic-answer-ref' }, h('b', null, '参考回答：'), ` ${item.feedback.short_answer}`)
                : null,
              h(
                'div',
                { className: 'ic-answer-meta' },
                h('details', { className: 'ic-answer-details' },
                  h('summary', null, '展开复盘'),
                  item.feedback?.full_answer ? h('p', null, item.feedback.full_answer) : null,
                  (item.feedback?.gaps ?? []).length > 0
                    ? h('div', null, h('b', null, '需要补：'), h('ul', { className: 'ic-list' }, item.feedback.gaps.map((gap, index) => h('li', { key: index }, gap))))
                    : null,
                  (item.feedback?.improved_answer ?? '') ? h('p', null, h('b', null, '改进版：'), item.feedback.improved_answer) : null,
                ),
                h(Btn, { kind: 'ghost', className: 'ic-answer-fav', onClick: () => toggleFavorite(item) }, item.favorite ? '已收藏' : '收藏'),
              ),
            ),
          ),
        ),
      )
    }

    function ReviewTab({ data, store }) {
      if (!data?.report) return h('div', { className: 'ic-card' }, h('h3', null, '复盘'), h('div', { className: 'ic-empty' }, '完成一场 Mock 后，这里会出现逐题对照与提升点。'))
      return h(ReportView, { report: data.report, onRestart: () => store.resetMock() })
    }

    function BankTab({ data, store }) {
      const [questions, setQuestions] = React.useState(null)
      const [preview, setPreview] = React.useState([])
      const [count, setCount] = React.useState(10)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const load = React.useCallback(async () => {
        try {
          const value = await api('/interview-coach/bank')
          setQuestions(value.questions)
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        }
      }, [])
      React.useEffect(() => {
        void load()
      }, [load, data?.bank?.total, data?.bank?.personal])
      const personal = (questions ?? []).filter((question) => question.personal)
      const preset = (questions ?? []).filter((question) => !question.personal)
      async function generate() {
        setBusy(true)
        setError('')
        try {
          const result = await store.generatePersonal(count)
          setPreview(result.questions ?? [])
          if ((result.questions ?? []).length === 0) setError('没有从当前记忆里生成出题目，请先在设置里导入简历或补充材料。')
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }
      async function adopt() {
        setBusy(true)
        setError('')
        try {
          await store.adoptPersonal(preview)
          setPreview([])
          await load()
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }
      async function remove(id) {
        setBusy(true)
        setError('')
        try {
          await store.deletePersonal(id)
          await load()
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setBusy(false)
        }
      }
      return h(
        'div',
        { className: 'ic-grid' },
        h(
          'div',
          { className: 'ic-card' },
          h('h3', null, '题库概览'),
          h('div', { className: 'ic-stat', style: { flexDirection: 'row', justifyContent: 'space-between' } }, h('span', null, '总题数'), h('b', null, data?.bank?.total ?? 0)),
          h('div', { className: 'ic-stat', style: { flexDirection: 'row', justifyContent: 'space-between' } }, h('span', null, '预置题库'), h('b', null, data?.bank?.preset ?? 0)),
          h('div', { className: 'ic-stat', style: { flexDirection: 'row', justifyContent: 'space-between' } }, h('span', null, '我的题'), h('b', null, data?.bank?.personal ?? 0)),
          Object.entries(data?.bank?.byLevel ?? {}).map(([level, value]) =>
            h('div', { key: level, className: 'ic-stat', style: { flexDirection: 'row', justifyContent: 'space-between' } }, h('span', null, level), h('b', null, value)),
          ),
          h('div', { className: 'ic-label' }, '主题'),
          h('div', { className: 'ic-cue' }, Object.keys(data?.bank?.byTopic ?? {}).slice(0, 18).map((topic) => h('span', { key: topic }, topic))),
        ),
        h(
          'div',
          { className: 'ic-card' },
          h('div', { className: 'ic-row', style: { justifyContent: 'space-between' } }, h('h3', null, '我的题'), h(Badge, { tone: 'blue' }, `${personal.length} 道`)),
          h('p', { className: 'ic-meta', style: { marginTop: 0 } }, '从简历、JD 和补充材料生成，只保存在本地；不会改动 120 道预置题库。'),
          h(
            'div',
            { className: 'ic-row' },
            h(
              'select',
              { className: 'ic-select', value: count, onChange: (event) => setCount(Number(event.target.value)) },
              [5, 10, 20].map((value) => h('option', { key: value, value }, `生成 ${value} 道`)),
            ),
            h(Btn, { kind: 'primary', onClick: generate, disabled: busy }, busy ? '生成中…' : '从记忆生成'),
            h(Btn, { onClick: load, disabled: busy }, '刷新列表'),
          ),
          error ? h('div', { className: 'ic-error' }, error) : null,
          preview.length > 0
            ? h(
                'div',
                { className: 'ic-personal-preview' },
                h('div', { className: 'ic-label' }, `预览 · ${preview.length} 道，确认后再加入`),
                preview.map((question, index) =>
                  h(
                    'div',
                    { key: `${question.question}-${index}`, className: 'ic-personal-item' },
                    h('div', { className: 'ic-row' }, h(Badge, { tone: 'blue' }, question.level), h('span', { className: 'ic-meta' }, question.topic)),
                    h('b', null, question.question),
                    h('p', { className: 'ic-meta' }, `判分点：${(question.keyPoints ?? []).join('；')}`),
                  ),
                ),
                h(
                  'div',
                  { className: 'ic-row', style: { marginTop: 10 } },
                  h(Btn, { kind: 'primary', onClick: adopt, disabled: busy }, busy ? '加入中…' : '加入我的题'),
                  h(Btn, { onClick: () => setPreview([]), disabled: busy }, '丢弃预览'),
                ),
              )
            : null,
          personal.length > 0
            ? h(
                'div',
                { style: { marginTop: 14 } },
                h('div', { className: 'ic-label' }, '已加入'),
                personal.map((question) =>
                  h(
                    'div',
                    { key: question.id, className: 'ic-personal-item' },
                    h('div', { className: 'ic-row' }, h(Badge, { tone: 'good' }, question.level), h('span', { className: 'ic-meta' }, `${question.id} · ${question.topic}`)),
                    h('b', null, question.question),
                    h('div', { className: 'ic-row', style: { marginTop: 6 } }, h(Btn, { kind: 'ghost', onClick: () => remove(question.id), disabled: busy }, '删除')),
                  ),
                ),
              )
            : h('div', { className: 'ic-empty' }, '还没有自己的题。导入简历后点“从记忆生成”。'),
        ),
        h(
          'div',
          { className: 'ic-card' },
          h('h3', null, '题目列表'),
          h('div', { className: 'ic-meta' }, `预置 ${preset.length} 道 · 我的 ${personal.length} 道`),
          (questions ?? []).slice(0, 200).map((question) =>
            h(
              'div',
              { key: question.id, className: 'ic-bank-row' },
              h('b', null, `${question.id} · ${question.level} · ${question.topic}`),
              question.personal ? h(Badge, { tone: 'blue' }, '我的题') : null,
              h('p', null, question.question),
            ),
          ),
        ),
      )
    }

    function InterviewPanel({ store }) {
      const snap = useStore(store)
      const data = snap.data
      const [tab, setTab] = React.useState('setup')
      React.useEffect(() => {
        void store.refresh()
      }, [])
      const tabs = [
        ['setup', '设置'],
        ['mock', 'Mock'],
        ['review', '复盘'],
        ['answers', '回答库'],
        ['bank', '题库'],
      ]
      return h(
        'div',
        { className: 'ic-root ic-panel' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'ic-head' },
          h('div', null, h('div', { className: 'ic-title' }, COPY.title), h('div', { className: 'ic-sub' }, COPY.subtitle)),
          h(
            'div',
            { className: 'ic-head-actions' },
            snap.loading ? h('span', { className: 'ic-meta' }, '加载中…') : null,
            h(Btn, { kind: 'ghost', onClick: () => store.refresh() }, '刷新'),
          ),
        ),
        h(
          'div',
          { className: 'ic-tabs' },
          tabs.map(([id, label]) => h('button', { key: id, className: 'ic-tab', 'data-active': String(tab === id), onClick: () => setTab(id) }, label)),
        ),
        h(
          'div',
          { className: 'ic-body' },
          snap.error ? h('div', { className: 'ic-error' }, snap.error) : null,
          !data
            ? h('div', { className: 'ic-empty' }, '正在读取面试教练状态…')
            : tab === 'setup'
              ? h(SetupTab, { store, data })
              : tab === 'mock'
                ? h(MockTab, { store, data })
                : tab === 'review'
                  ? h(ReviewTab, { data, store })
                  : tab === 'answers'
                    ? h(AnswerBankTab, { data })
                    : h(BankTab, { data, store }),
        ),
        snap.toast ? h('div', { className: 'ic-toast', onClick: () => store.setToast('') }, snap.toast) : null,
      )
    }

    function HudRoot({ children }) {
      return h('div', { className: 'ic-root ic-hud' }, h('style', null, CSS), children)
    }

    function InterviewHud({ store }) {
      const snap = useStore(store)
      const mock = snap.mock
      const quick = snap.quick
      const active = Boolean(mock?.session && mock.session.status === 'active')
      const drill = mock?.drill ?? null
      const drillActive = Boolean(drill && drill.status === 'active')
      const drillDone = Boolean(drill && drill.status === 'done')
      const feedback = drillActive ? null : mock?.feedback ?? quick?.feedback ?? null
      const question = mock?.question ?? null
      const now = useNow(active || Boolean(feedback))
      const [expanded, setExpanded] = React.useState(false)
      const hudHidden = snap.hudHidden
      const collapsed = snap.hudCollapsed

      React.useEffect(() => {
        if (feedback) setExpanded(true)
      }, [feedback])

      if (hudHidden) return null
      if (!active && !feedback) {
        return h(
          HudRoot,
          null,
          h(
            'div',
            { className: 'ic-hud-pill', onClick: () => store.setHud({ hudCollapsed: !collapsed }) },
            h('span', { className: 'ic-hud-dot', 'data-live': 'false' }),
            h('span', null, '面试教练 · 待机'),
            dataHint(snap.data),
          ),
        )
      }

      const progressIndex = feedback
        ? Math.max(1, Math.min(mock.session.currentIndex ?? 1, mock.session.questionCount ?? 1))
        : Math.min((mock.session.currentIndex ?? 0) + 1, mock.session.questionCount ?? 0)
      const progressText = drillActive
        ? `深挖 ${drill.current?.level ?? 1}/3 · ${drill.current?.focus ?? '追问'}`
        : drillDone
          ? '深挖完成'
          : active
            ? `第 ${progressIndex} / ${mock.session.questionCount ?? 0} 题`
            : '参考回答'
      const timer = active && mock.session.startedAt ? elapsed(mock.session.startedAt, now) : ''
      if (collapsed) {
        const pillText = feedback
          ? active
            ? `Mock · ${feedback.score} 分`
            : `参考回答 · ${feedback.score} 分`
          : `答题中 · ${progressText}${timer ? ` · ${timer}` : ''}`
        return h(
          HudRoot,
          null,
          h(
            'div',
            { className: 'ic-hud-pill', onClick: () => store.setHud({ hudCollapsed: false }) },
            h('span', { className: 'ic-hud-dot' }),
            h('span', null, pillText),
          ),
        )
      }

      return h(
        HudRoot,
        null,
        h(
          'div',
          { className: 'ic-hud-card' },
          h(
            'div',
            { className: 'ic-hud-head' },
            h('span', { className: 'ic-hud-dot', 'data-live': String(active) }),
            h('span', { style: { fontWeight: 650 } }, active ? `Mock · ${progressText}` : '参考回答'),
            timer ? h('span', { className: 'ic-meta' }, timer) : null,
            h(
              'div',
              { className: 'ic-hud-actions' },
              h('button', { className: 'ic-hud-btn', onClick: () => setExpanded((value) => !value), title: '展开/收起' }, expanded ? '收起' : '展开'),
              h('button', { className: 'ic-hud-btn', onClick: () => store.setHud({ hudCollapsed: true }), title: '折叠为小条', 'aria-label': '折叠为小条' }, '—'),
              h('button', { className: 'ic-hud-btn', onClick: () => store.setHud({ hudHidden: true }), title: '隐藏（⌘⇧H）' }, '×'),
            ),
          ),
          drillActive
            ? h(
                'div',
                { className: 'ic-hud-body' },
                h('div', { className: 'ic-hud-question' }, drill.current?.question ?? '正在准备追问…'),
                h('div', { className: 'ic-meta' }, '深挖中：不展示参考答案。先在左侧答完这一层。'),
              )
            : !feedback
            ? h(
                'div',
                { className: 'ic-hud-body' },
                h('div', { className: 'ic-hud-question' }, question?.question ?? '正在准备题目…'),
                h('div', { className: 'ic-meta' }, '答题中：参考答案已隐藏。提交后显示提示、短答与完整答案。'),
              )
            : h(
                'div',
                { className: 'ic-hud-body' },
                question?.question ? h('div', { className: 'ic-hud-question' }, question.question) : null,
                drillDone && drill.summary
                  ? h('div', { className: 'ic-row', style: { marginBottom: 6 } }, h(Badge, { tone: 'good' }, `深挖均分 ${drill.summary.average}`), h('span', { className: 'ic-meta' }, `深度分 ${drill.summary.depthScore}`))
                  : null,
                h('div', { className: 'ic-row', style: { marginBottom: 6 } }, h('div', { className: 'ic-score' }, feedback.score, h('small', null, ' / 100')), h('span', { className: 'ic-meta' }, feedback.source === 'llm' ? 'LLM · 简历优先' : '题库兜底')),
                h('div', { className: 'ic-cue' }, (feedback.cue ?? []).map((item, index) => h('span', { key: index }, item))),
                h('div', { className: 'ic-hud-short' }, feedback.short_answer),
                expanded
                  ? h(
                      'div',
                      null,
                      h('details', { className: 'ic-hud-full' }, h('summary', null, '完整参考答案'), h('div', { style: { marginTop: 5, whiteSpace: 'pre-wrap' } }, feedback.full_answer)),
                      feedback.gaps?.length
                        ? h('div', { style: { marginTop: 8 } }, h('b', { className: 'ic-label' }, '要补的点'), h('ul', { className: 'ic-list' }, feedback.gaps.map((item, index) => h('li', { key: index }, item))))
                        : null,
                      feedback.suggestions?.length
                        ? h('div', { style: { marginTop: 6 } }, h('b', { className: 'ic-label' }, '下一轮动作'), h('ul', { className: 'ic-list' }, feedback.suggestions.map((item, index) => h('li', { key: index }, item))))
                        : null,
                    )
                  : null,
              ),
          active && !feedback
            ? h(
                'div',
                { className: 'ic-hud-body', style: { paddingTop: 0 } },
                h(
                  'button',
                  {
                    className: 'ic-hud-btn',
                    style: { width: '100%', textAlign: 'left' },
                    onClick: () => store.setHud({ hudCollapsed: true }),
                  },
                  '折叠 HUD（不停止计时）',
                ),
              )
            : null,
        ),
      )
    }

    function dataHint(data) {
      if (!data) return null
      if (data.session?.status === 'active') return h('span', { className: 'ic-meta' }, '已有进行中的 Mock')
      return h('span', { className: 'ic-meta' }, `${data.bank?.total ?? 0} 题 · ${data.memory?.total ?? 0} 记忆`)
    }

    function apply(ctx) {
      const store = createStore()
      ctx.effect(() => {
        void store.refresh()
        const id = setInterval(() => {
          const snap = store.getSnapshot()
          if (!snap.mock?.session || snap.mock.session.status !== 'active') void store.refresh()
        }, 20_000)
        return () => clearInterval(id)
      }, 'interview-coach: state refresh')

      ctx.effect(() => {
        const onKey = (event) => {
          if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
            event.preventDefault()
            const snap = store.getSnapshot()
            store.setHud({ hudHidden: !snap.hudHidden })
          }
          if (event.key === 'Escape' && !event.metaKey && !event.ctrlKey) {
            const target = event.target
            const tag = target?.tagName?.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
            const snap = store.getSnapshot()
            if (snap.mock?.feedback || snap.quick?.feedback) store.setHud({ hudCollapsed: true })
          }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, 'interview-coach: HUD shortcut')

      const icon = () => h(
        'svg',
        { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', style: { display: 'block' } },
        h('path', {
          d: 'M4.6 4.4h11.2a2.6 2.6 0 0 1 2.6 2.6v6.4a2.6 2.6 0 0 1-2.6 2.6H9.1l-3.4 2.6V16H4.6A2.6 2.6 0 0 1 2 13.4V7a2.6 2.6 0 0 1 2.6-2.6Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M6.2 8.2h7.8M6.2 11h6.1M6.2 13.8h3.8',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 18.2, cy: 17.8, r: 4.3, fill: '#F5A623' }),
        h('path', {
          d: 'm16.3 16.2 1.9 2 1.9-2',
          fill: 'none',
          stroke: '#1B2559',
          strokeWidth: 1.55,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 42,
            label: () => COPY.panel,
          },
          icon,
        ),
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            inject: () => ({ store }),
          },
          InterviewPanel,
        ),
      )

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'interview-coach-hud',
            order: 80,
            inject: () => ({ store }),
          },
          InterviewHud,
        ),
      )
    }

    exports.apply = apply
    exports.inject = ['slots']
    exports.__internals = { createStore, PANEL_ID }
    return module.exports
  },
})
