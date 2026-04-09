import { MESSAGE_TYPES } from './protocol.js'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function splitChunks(text, size) {
  const chars = [...text]
  const out = []
  for (let i = 0; i < chars.length; i += size) {
    out.push(chars.slice(i, i + size).join(''))
  }
  return out.length ? out : ['']
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {(ws: import('ws').WebSocket, obj: object) => void} sendJson
 */
export async function streamTextMock(ws, sessionId, text, sendJson, visionContext = '') {
  const snippet = (text || '').slice(0, 120)
  let reply = `（mock）你发送了：「${snippet}${(text || '').length > 120 ? '…' : ''}」。这是本地 AI 网关的流式占位回复，后续可替换为真实模型。`
  if (visionContext) {
    reply += ` ${visionContext}`
  }

  for (const chunk of splitChunks(reply, 6)) {
    await delay(45)
    sendJson(ws, {
      type: MESSAGE_TYPES.responseDelta,
      sessionId,
      text: chunk
    })
  }

  sendJson(ws, { type: MESSAGE_TYPES.responseDone, sessionId })
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {(ws: import('ws').WebSocket, obj: object) => void} sendJson
 */
export async function streamImageMock(ws, sessionId, mimeType, approxKb, sendJson, visionContext = '') {
  let reply = `（mock）已收到图像：${mimeType || 'unknown'}，约 ${approxKb} KB（估算）。会话内已记录画面上下文。`
  if (visionContext) {
    reply += ` ${visionContext}`
  }

  for (const chunk of splitChunks(reply, 8)) {
    await delay(50)
    sendJson(ws, {
      type: MESSAGE_TYPES.responseDelta,
      sessionId,
      text: chunk
    })
  }

  sendJson(ws, { type: MESSAGE_TYPES.responseDone, sessionId })
}
