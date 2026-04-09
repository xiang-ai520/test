import { useEffect, useMemo, useState } from 'react'

const DEFAULT_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: {
    facingMode: 'user',
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 24 }
  }
}

export function useLocalMedia() {
  const [localStream, setLocalStream] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)

  const constraints = useMemo(() => ({
    ...DEFAULT_CONSTRAINTS,
    video: {
      ...DEFAULT_CONSTRAINTS.video,
      facingMode
    }
  }), [facingMode])

  async function requestMedia() {
    setIsLoading(true)
    setError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream((prevStream) => {
        prevStream?.getTracks().forEach((track) => track.stop())
        return stream
      })
      setAudioEnabled(true)
      setVideoEnabled(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '无法访问摄像头或麦克风')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    requestMedia()

    return () => {
      setLocalStream((prevStream) => {
        prevStream?.getTracks().forEach((track) => track.stop())
        return null
      })
    }
  }, [facingMode])

  function toggleAudio() {
    if (!localStream) return
    const nextEnabled = !audioEnabled
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setAudioEnabled(nextEnabled)
  }

  function toggleVideo() {
    if (!localStream) return
    const nextEnabled = !videoEnabled
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = nextEnabled
    })
    setVideoEnabled(nextEnabled)
  }

  function switchCamera() {
    setFacingMode((current) => (current === 'user' ? 'environment' : 'user'))
  }

  return {
    localStream,
    error,
    isLoading,
    facingMode,
    audioEnabled,
    videoEnabled,
    requestMedia,
    toggleAudio,
    toggleVideo,
    switchCamera
  }
}
