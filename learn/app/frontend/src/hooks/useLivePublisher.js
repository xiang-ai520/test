import { useEffect, useRef, useState } from 'react'
import {
  LIVE_STATUS,
  buildRtcPublishEndpoint,
  buildRtcStreamUrl,
  createLivePublishResult,
  exchangeRtcSdp
} from '../lib/live.js'

const TARGET_VIDEO_MAX_BITRATE = 1_500_000
const TARGET_VIDEO_MIN_BITRATE = 800_000
const TARGET_AUDIO_MAX_BITRATE = 96_000
const TARGET_FRAMERATE = 24

async function applySenderOptimizations(peerConnection) {
  const senders = peerConnection.getSenders()

  await Promise.all(senders.map(async (sender) => {
    if (!sender.track) return
    const parameters = sender.getParameters()
    const encodings = parameters.encodings?.length ? parameters.encodings : [{}]

    if (sender.track.kind === 'video') {
      encodings[0].maxBitrate = TARGET_VIDEO_MAX_BITRATE
      encodings[0].minBitrate = TARGET_VIDEO_MIN_BITRATE
      encodings[0].maxFramerate = TARGET_FRAMERATE
      encodings[0].networkPriority = 'high'
      encodings[0].priority = 'high'
      parameters.degradationPreference = 'balanced'
    }

    if (sender.track.kind === 'audio') {
      encodings[0].maxBitrate = TARGET_AUDIO_MAX_BITRATE
      encodings[0].networkPriority = 'high'
      encodings[0].priority = 'high'
    }

    parameters.encodings = encodings

    try {
      await sender.setParameters(parameters)
    } catch {
      // 某些浏览器会忽略部分编码参数，失败时保留默认配置
    }
  }))
}

export function useLivePublisher({ roomId, localStream }) {
  const peerConnectionRef = useRef(null)
  const [publishState, setPublishState] = useState(LIVE_STATUS.idle)
  const [publishError, setPublishError] = useState('')
  const [publishResult, setPublishResult] = useState(null)

  useEffect(() => {
    return () => {
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
    }
  }, [])

  async function startPublishing() {
    if (!localStream) {
      setPublishError('请先授权摄像头和麦克风。')
      setPublishState(LIVE_STATUS.error)
      return null
    }

    setPublishError('')
    setPublishState('connecting')

    try {
      peerConnectionRef.current?.close()
      const peerConnection = new RTCPeerConnection()
      peerConnectionRef.current = peerConnection

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream)
      })

      await applySenderOptimizations(peerConnection)

      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      const streamUrl = buildRtcStreamUrl(roomId)
      const answerSdp = await exchangeRtcSdp({
        endpoint: buildRtcPublishEndpoint(),
        streamUrl,
        sdp: offer.sdp
      })

      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      })

      const result = createLivePublishResult(roomId)
      setPublishResult(result)
      setPublishState(LIVE_STATUS.live)
      return result
    } catch (error) {
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
      setPublishResult(null)
      setPublishState(LIVE_STATUS.error)
      setPublishError(error instanceof Error ? error.message : '启动直播失败')
      return null
    }
  }

  function stopPublishing() {
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    setPublishState(LIVE_STATUS.ended)
    setPublishResult(null)
  }

  return {
    publishState,
    publishError,
    publishResult,
    startPublishing,
    stopPublishing
  }
}
