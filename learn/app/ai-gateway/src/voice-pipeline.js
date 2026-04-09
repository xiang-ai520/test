import { MESSAGE_TYPES } from './protocol.js'
import { streamTextMock } from './mock-adapter.js'
import { transcribeMock } from './adapters/stt-adapter.js'
import { synthesizeMockWavBase64 } from './adapters/tts-adapter.js'

/** ~9MB binary when decoded */
const MAX_AUDIO_BASE64_CHARS = 12 * 1024 * 1024

/**
 * STT（mock）→ 文本模型（mock 流式）→ TTS（mock WAV）
 * @param {import('ws').WebSocket} ws
 * @param {string} sessionId
 * @param {{ mimeType?: string, data?: string }} payload
 * @param {(ws: import('ws').WebSocket, obj: object) => void} sendJson
 */
export async function runVoiceMockPipeline(ws, sessionId, payload, sendJson, visionContext = '') {
  const data = typeof payload.data === 'string' ? payload.data : ''
  const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : 'audio/webm'

  if (!data.length) {
    sendJson(ws, { type: MESSAGE_TYPES.responseError, sessionId, message: 'empty audio' })
    return
  }

  if (data.length > MAX_AUDIO_BASE64_CHARS) {
    sendJson(ws, { type: MESSAGE_TYPES.responseError, sessionId, message: 'audio payload too large' })
    return
  }

  const transcript = transcribeMock(data.length, mimeType)
  console.log('[ai-gateway] stt.result (mock)', sessionId, transcript.slice(0, 100))

  sendJson(ws, {
    type: MESSAGE_TYPES.sttResult,
    sessionId,
    text: transcript
  })

  await streamTextMock(ws, sessionId, transcript, sendJson, visionContext)

  const wavB64 = synthesizeMockWavBase64()
  sendJson(ws, {
    type: MESSAGE_TYPES.responseAudio,
    sessionId,
    mimeType: 'audio/wav',
    data: wavB64
  })
}
