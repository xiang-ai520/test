import { useEffect, useRef, useState } from 'react'
import { SIGNALING_MESSAGE_TYPES, SIGNALING_SERVER_URL } from '../lib/config.js'

export function useSignaling({ roomId, peerId, enabled, onMessage, initialMessageFactory }) {
  const socketRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const initialMessageFactoryRef = useRef(initialMessageFactory)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    initialMessageFactoryRef.current = initialMessageFactory
  }, [initialMessageFactory])

  useEffect(() => {
    if (!enabled || !roomId || !peerId) return undefined

    let shouldReconnect = true
    const socket = new WebSocket(SIGNALING_SERVER_URL)
    socketRef.current = socket
    setStatus('connecting')
    setError('')

    socket.onopen = () => {
      setStatus('connected')
      const initialMessage = initialMessageFactoryRef.current?.({ roomId, peerId }) || {
        type: SIGNALING_MESSAGE_TYPES.joinRoom,
        roomId,
        peerId
      }
      socket.send(JSON.stringify(initialMessage))
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === SIGNALING_MESSAGE_TYPES.error) {
        setError(data.message || '信令服务发生错误')
      }
      onMessageRef.current?.(data)
    }

    socket.onerror = () => {
      setStatus('error')
      setError('无法连接信令服务')
    }

    socket.onclose = (event) => {
      setStatus('closed')
      if (!shouldReconnect) return
      if (event.code === 1000 || event.code === 1001) return
      if (!socketRef.current || socketRef.current !== socket) return
      setError((current) => current || '信令连接已关闭，请确认 signaling 服务仍在运行。')
    }

    return () => {
      shouldReconnect = false
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'cleanup')
      }
      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [enabled, roomId, peerId])

  function sendMessage(message) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return false
    socketRef.current.send(JSON.stringify(message))
    return true
  }

  return {
    status,
    error,
    sendMessage
  }
}
