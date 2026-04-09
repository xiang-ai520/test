import { useEffect, useRef, useState } from 'react'
import { LIVE_STATUS, buildRtcPlayEndpoint, exchangeRtcSdp } from '../lib/live.js'

export function useLivePlayer({ liveStatus, playbackUrl }) {
  const peerConnectionRef = useRef(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [playerState, setPlayerState] = useState('idle')
  const [playerError, setPlayerError] = useState('')

  useEffect(() => {
    if (liveStatus !== LIVE_STATUS.live || !playbackUrl) {
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
      setRemoteStream(null)
      setPlayerState('idle')
      setPlayerError('')
      return undefined
    }

    let cancelled = false

    async function startPlaying() {
      setPlayerState('connecting')
      setPlayerError('')

      try {
        peerConnectionRef.current?.close()
        const peerConnection = new RTCPeerConnection()
        peerConnectionRef.current = peerConnection

        peerConnection.addTransceiver('audio', { direction: 'recvonly' })
        peerConnection.addTransceiver('video', { direction: 'recvonly' })
        peerConnection.ontrack = (event) => {
          if (cancelled) return
          const [stream] = event.streams
          if (stream) {
            setRemoteStream(stream)
            setPlayerState('playing')
          }
        }

        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        const answerSdp = await exchangeRtcSdp({
          endpoint: buildRtcPlayEndpoint(),
          streamUrl: playbackUrl,
          sdp: offer.sdp
        })

        if (cancelled) return

        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp
        })
      } catch (error) {
        if (cancelled) return
        peerConnectionRef.current?.close()
        peerConnectionRef.current = null
        setRemoteStream(null)
        setPlayerState('error')
        setPlayerError(error instanceof Error ? error.message : '播放直播失败')
      }
    }

    startPlaying()

    return () => {
      cancelled = true
      peerConnectionRef.current?.close()
      peerConnectionRef.current = null
    }
  }, [liveStatus, playbackUrl])

  return {
    remoteStream,
    playerState,
    playerError
  }
}
