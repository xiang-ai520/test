import { WebSocketServer } from 'ws'
import { MESSAGE_TYPES } from './protocol.js'
import { SessionStore } from './session-store.js'
import { streamImageMock, streamTextMock } from './mock-adapter.js'
import { runVoiceMockPipeline } from './voice-pipeline.js'

const PORT = Number(process.env.PORT) || 8790
const HOST = process.env.HOST || '0.0.0.0'

const sessions = new SessionStore()

function sendJson(ws, obj) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(obj))
  }
}

function sendError(ws, sessionId, message) {
  sendJson(ws, {
    type: MESSAGE_TYPES.responseError,
    sessionId: sessionId || 'unknown',
    message
  })
}

const wss = new WebSocketServer({ port: PORT, host: HOST })

wss.on('connection', (ws) => {
  let streaming = false

  ws.on('message', async (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      console.warn('[ai-gateway] invalid JSON')
      sendError(ws, null, 'invalid json')
      return
    }

    const { type, sessionId } = msg

    if (typeof type !== 'string') {
      sendError(ws, sessionId || 'unknown', 'missing or invalid type')
      return
    }

    if (typeof sessionId !== 'string' || !sessionId) {
      sendError(ws, 'unknown', 'missing sessionId')
      return
    }

    if (type === MESSAGE_TYPES.sessionStart) {
      sessions.ensure(sessionId)
      console.log('[ai-gateway] session.start', sessionId)
      return
    }

    if (streaming) {
      sendError(ws, sessionId, 'busy')
      return
    }

    try {
      if (type === MESSAGE_TYPES.inputText) {
        const text = typeof msg.text === 'string' ? msg.text : ''
        const visionCtx = sessions.getVisionContextLine(sessionId)
        streaming = true
        await streamTextMock(ws, sessionId, text, sendJson, visionCtx)
        streaming = false
        return
      }

      if (type === MESSAGE_TYPES.inputImage) {
        const mimeType = typeof msg.mimeType === 'string' ? msg.mimeType : 'image/jpeg'
        const data = typeof msg.data === 'string' ? msg.data : ''
        const source = typeof msg.source === 'string' ? msg.source : 'manual'
        const session = sessions.recordImage(sessionId, mimeType, data.length, source)
        const approxKb = Math.max(1, Math.round((session.lastImageBytes || 0) / 1024))
        const visionCtx = sessions.getVisionContextLine(sessionId)
        console.log(
          '[ai-gateway] input.image',
          sessionId,
          mimeType,
          source,
          'base64Len=',
          data.length,
          'approxBytes=',
          session.lastImageBytes
        )
        streaming = true
        await streamImageMock(ws, sessionId, mimeType, approxKb, sendJson, visionCtx)
        streaming = false
        return
      }

      if (type === MESSAGE_TYPES.inputAudio) {
        const visionCtx = sessions.getVisionContextLine(sessionId)
        streaming = true
        try {
          await runVoiceMockPipeline(ws, sessionId, msg, sendJson, visionCtx)
        } finally {
          streaming = false
        }
        return
      }

      console.warn('[ai-gateway] unknown type', type)
      sendError(ws, sessionId, `unknown message type: ${type}`)
    } catch (err) {
      streaming = false
      console.error('[ai-gateway] handler error', err)
      sendError(ws, sessionId, err instanceof Error ? err.message : 'internal error')
    }
  })

  ws.on('close', () => {
    streaming = false
  })
})

wss.on('listening', () => {
  console.log(`[ai-gateway] WebSocket listening on ws://${HOST}:${PORT}`)
})
