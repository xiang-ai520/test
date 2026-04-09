import { useCallback, useReducer, useRef, useState } from 'react'
import { AI_GATEWAY_WS_URL } from '../lib/config.js'
import { AI_MESSAGE_TYPES } from '../lib/aiProtocol.js'

function makeSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ai-session-${crypto.randomUUID()}`
  }
  return `ai-session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('read failed'))
        return
      }
      const i = result.indexOf(',')
      resolve(i >= 0 ? result.slice(i + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

function chatReducer(state, action) {
  switch (action.type) {
    case 'user':
      return { ...state, messages: [...state.messages, { role: 'user', text: action.text }] }
    case 'stt':
      return { ...state, messages: [...state.messages, { role: 'transcript', text: action.text }] }
    case 'delta':
      return { ...state, stream: state.stream + (action.text || '') }
    case 'done': {
      if (!state.stream) return { ...state, stream: '' }
      return {
        messages: [...state.messages, { role: 'assistant', text: state.stream }],
        stream: ''
      }
    }
    case 'error':
      return {
        ...state,
        stream: '',
        messages: [...state.messages, { role: 'system', text: `错误：${action.message}` }]
      }
    default:
      return state
  }
}

export function useAiGateway() {
  const sessionIdRef = useRef(makeSessionId())
  const wsRef = useRef(null)
  const [connectionState, setConnectionState] = useState('idle')
  const [lastError, setLastError] = useState('')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [chat, dispatch] = useReducer(chatReducer, { messages: [], stream: '' })
  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const playResponseAudio = useCallback(
    (mimeType, base64) => {
      cleanupAudio()
      try {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: mimeType || 'audio/wav' })
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          setVoiceBusy(false)
          cleanupAudio()
        }
        audio.onerror = () => {
          setVoiceBusy(false)
          setLastError('播放 AI 语音失败')
          cleanupAudio()
        }
        void audio.play().catch(() => {
          setVoiceBusy(false)
          setLastError('无法自动播放语音（浏览器可能阻止了无手势播放）')
        })
      } catch {
        setVoiceBusy(false)
        setLastError('解码 AI 语音失败')
      }
    },
    [cleanupAudio]
  )

  const handleMessage = useCallback(
    (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }

      if (msg.sessionId !== sessionIdRef.current) return

      switch (msg.type) {
        case AI_MESSAGE_TYPES.sttResult:
          dispatch({ type: 'stt', text: msg.text || '' })
          break
        case AI_MESSAGE_TYPES.responseAudio:
          playResponseAudio(msg.mimeType, msg.data)
          break
        case AI_MESSAGE_TYPES.responseDelta:
          dispatch({ type: 'delta', text: msg.text })
          break
        case AI_MESSAGE_TYPES.responseDone:
          dispatch({ type: 'done' })
          break
        case AI_MESSAGE_TYPES.responseError:
          setVoiceBusy(false)
          setLastError(msg.message || '未知错误')
          dispatch({ type: 'error', message: msg.message || '未知错误' })
          break
        default:
          break
      }
    },
    [playResponseAudio]
  )

  const connect = useCallback(() => {
    setLastError('')
    const existing = wsRef.current
    if (existing?.readyState === WebSocket.OPEN) return
    if (existing?.readyState === WebSocket.CONNECTING) return

    setConnectionState('connecting')
    const ws = new WebSocket(AI_GATEWAY_WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionState('open')
      ws.send(
        JSON.stringify({
          type: AI_MESSAGE_TYPES.sessionStart,
          sessionId: sessionIdRef.current
        })
      )
    }

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null
        setConnectionState('closed')
      }
    }

    ws.onerror = () => {
      setLastError('无法连接 AI 网关（请确认已启动 learn/app/ai-gateway）')
      setConnectionState('error')
    }

    ws.onmessage = handleMessage
  }, [handleMessage])

  const disconnect = useCallback(() => {
    cleanupAudio()
    setVoiceBusy(false)
    wsRef.current?.close()
    wsRef.current = null
    setConnectionState('closed')
  }, [cleanupAudio])

  const sendText = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed) return false
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError('未连接网关')
      return false
    }
    dispatch({ type: 'user', text: trimmed })
    ws.send(
      JSON.stringify({
        type: AI_MESSAGE_TYPES.inputText,
        sessionId: sessionIdRef.current,
        text: trimmed
      })
    )
    return true
  }, [])

  const sendImage = useCallback((mimeType, base64Data, source = 'manual') => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError('未连接网关')
      return false
    }
    if (!base64Data) return false
    const srcLabel = source === 'timer' ? '定时' : source === 'event' ? '事件' : '手动'
    dispatch({ type: 'user', text: `[图像·${srcLabel}] ${mimeType}` })
    ws.send(
      JSON.stringify({
        type: AI_MESSAGE_TYPES.inputImage,
        sessionId: sessionIdRef.current,
        mimeType,
        data: base64Data,
        source
      })
    )
    return true
  }, [])

  const sendAudio = useCallback(async (blob) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setLastError('未连接网关')
      return false
    }
    if (!blob?.size) return false

    let b64
    try {
      b64 = await blobToBase64(blob)
    } catch {
      setLastError('音频编码失败')
      return false
    }

    setVoiceBusy(true)
    dispatch({ type: 'user', text: '（语音输入）' })
    ws.send(
      JSON.stringify({
        type: AI_MESSAGE_TYPES.inputAudio,
        sessionId: sessionIdRef.current,
        mimeType: blob.type || 'audio/webm',
        data: b64
      })
    )
    return true
  }, [])

  return {
    sessionId: sessionIdRef.current,
    connectionState,
    lastError,
    messages: chat.messages,
    streamingText: chat.stream,
    voiceBusy,
    connect,
    disconnect,
    sendText,
    sendImage,
    sendAudio
  }
}
