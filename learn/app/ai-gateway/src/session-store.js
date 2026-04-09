const FRAME_HISTORY_MAX = 12

const SOURCE_LABEL = {
  timer: '定时',
  manual: '手动',
  event: '事件'
}

export class SessionStore {
  constructor() {
    /** @type {Map<string, { createdAt: number, lastImageMime: string | null, lastImageBytes: number | null, frameEvents: { at: number, source: string }[] }>} */
    this.map = new Map()
  }

  ensure(sessionId) {
    if (!this.map.has(sessionId)) {
      this.map.set(sessionId, {
        createdAt: Date.now(),
        lastImageMime: null,
        lastImageBytes: null,
        frameEvents: []
      })
    }
    return this.map.get(sessionId)
  }

  recordImage(sessionId, mimeType, base64Length, source = 'manual') {
    const session = this.ensure(sessionId)
    const approxBytes = Math.floor((base64Length * 3) / 4)
    session.lastImageMime = mimeType
    session.lastImageBytes = approxBytes
    if (!session.frameEvents) session.frameEvents = []
    session.frameEvents.push({
      at: Date.now(),
      source: typeof source === 'string' ? source : 'manual'
    })
    while (session.frameEvents.length > FRAME_HISTORY_MAX) {
      session.frameEvents.shift()
    }
    return session
  }

  /** @returns {string} 供 mock 文本拼接，无画面历史时为空串 */
  getVisionContextLine(sessionId) {
    const session = this.map.get(sessionId)
    if (!session?.frameEvents?.length) return ''
    const n = session.frameEvents.length
    const last = session.frameEvents[n - 1]
    const label = SOURCE_LABEL[last.source] || last.source
    const t = new Date(last.at).toLocaleTimeString()
    return `【画面上下文】本会话已累计 ${n} 次截帧；最近一次为「${label}」于 ${t}。模型回复应结合这些画面理解用户意图（当前仍为 mock）。`
  }
}
