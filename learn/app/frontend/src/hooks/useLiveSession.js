import { useEffect, useMemo, useState } from 'react'
import { LIVE_ROLES, LIVE_STATUS } from '../lib/live.js'
import { SIGNALING_MESSAGE_TYPES } from '../lib/config.js'
import { useSignaling } from './useSignaling.js'

export function useLiveSession({ roomId, peerId, role }) {
  const [liveStatus, setLiveStatus] = useState(LIVE_STATUS.idle)
  const [hostPeerId, setHostPeerId] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [streamName, setStreamName] = useState('')
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [notice, setNotice] = useState('')

  const signaling = useSignaling({
    roomId,
    peerId,
    enabled: Boolean(roomId && peerId),
    initialMessageFactory: ({ roomId: nextRoomId, peerId: nextPeerId }) => ({
      type: SIGNALING_MESSAGE_TYPES.joinLiveRoom,
      roomId: nextRoomId,
      peerId: nextPeerId,
      payload: { role }
    }),
    onMessage: (message) => {
      switch (message.type) {
        case SIGNALING_MESSAGE_TYPES.liveState:
          setLiveStatus(message.payload?.liveStatus || LIVE_STATUS.idle)
          setHostPeerId(message.payload?.hostPeerId || '')
          setViewerCount(message.payload?.viewerCount || 0)
          setStreamName(message.payload?.streamName || '')
          setPlaybackUrl(message.payload?.playbackUrl || '')
          break
        case SIGNALING_MESSAGE_TYPES.hostOnline:
          setLiveStatus(LIVE_STATUS.live)
          setHostPeerId(message.peerId || '')
          setStreamName(message.payload?.streamName || '')
          setPlaybackUrl(message.payload?.playbackUrl || '')
          setNotice(role === LIVE_ROLES.audience ? '主播已开播，正在准备播放。' : '直播已开始。')
          break
        case SIGNALING_MESSAGE_TYPES.hostOffline:
          setLiveStatus(LIVE_STATUS.ended)
          setNotice('主播已结束直播。')
          break
        case SIGNALING_MESSAGE_TYPES.audienceCount:
          setViewerCount(message.payload?.viewerCount || 0)
          break
        default:
          break
      }
    }
  })

  useEffect(() => {
    if (!signaling.error) return
    setNotice(signaling.error)
  }, [signaling.error])

  const actions = useMemo(() => ({
    startLive(payload) {
      signaling.sendMessage({
        type: SIGNALING_MESSAGE_TYPES.startLive,
        roomId,
        peerId,
        payload
      })
    },
    stopLive() {
      signaling.sendMessage({
        type: SIGNALING_MESSAGE_TYPES.stopLive,
        roomId,
        peerId
      })
    },
    leaveLive() {
      signaling.sendMessage({
        type: SIGNALING_MESSAGE_TYPES.leaveLiveRoom,
        roomId,
        peerId,
        payload: { role }
      })
    },
    clearNotice() {
      setNotice('')
    }
  }), [peerId, role, roomId, signaling])

  return {
    signalingStatus: signaling.status,
    signalingError: signaling.error,
    liveStatus,
    hostPeerId,
    viewerCount,
    streamName,
    playbackUrl,
    notice,
    ...actions
  }
}
