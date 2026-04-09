import { useCallback, useEffect, useRef, useState } from 'react'

function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export function useVoiceRecorder(mediaStream) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState('')
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = useCallback(() => {
    if (!mediaStream) {
      setError('无媒体流，无法录音')
      return false
    }
    const audioTracks = mediaStream.getAudioTracks().filter((t) => t.readyState === 'live')
    if (!audioTracks.length) {
      setError('未检测到可用麦克风（请确认已授权并开启麦克风）')
      return false
    }

    chunksRef.current = []
    const mimeType = pickMimeType()

    try {
      const options = mimeType ? { mimeType } : undefined
      const rec = options ? new MediaRecorder(mediaStream, options) : new MediaRecorder(mediaStream)
      recorderRef.current = rec
      rec.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      }
      rec.start(250)
      setIsRecording(true)
      setError('')
      return true
    } catch {
      setError('无法启动录音（浏览器不支持或权限受限）')
      return false
    }
  }, [mediaStream])

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      const rec = recorderRef.current
      if (!rec || rec.state === 'inactive') {
        setIsRecording(false)
        recorderRef.current = null
        resolve(null)
        return
      }

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        recorderRef.current = null
        chunksRef.current = []
        setIsRecording(false)
        resolve(blob.size ? blob : null)
      }

      rec.stop()
    })
  }, [])

  useEffect(() => {
    return () => {
      const rec = recorderRef.current
      if (rec && rec.state !== 'inactive') {
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
      }
    }
  }, [])

  return { isRecording, error, startRecording, stopRecording }
}
