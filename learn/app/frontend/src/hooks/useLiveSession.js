import { useCallback, useEffect, useMemo, useState } from 'react'
import { LIVE_ROLES, LIVE_STATUS } from '../lib/live.js'
import { SIGNALING_MESSAGE_TYPES } from '../lib/config.js'
import { useSignaling } from './useSignaling.js'

export function useLiveSession({ roomId, peerId, role, peerName = '' }) {
  const [liveStatus, setLiveStatus] = useState(LIVE_STATUS.idle)
  const [hostPeerId, setHostPeerId] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [streamName, setStreamName] = useState('')
  const [playbackUrl, setPlaybackUrl] = useState('')
  const [linkedMic, setLinkedMic] = useState(null)
  const [giftFeed, setGiftFeed] = useState([])
  const [linkMicRequests, setLinkMicRequests] = useState([])
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
        case SIGNALING_MESSAGE_TYPES.liveState: {
          const p = message.payload
          setLiveStatus(p?.liveStatus || LIVE_STATUS.idle)
          setHostPeerId(p?.hostPeerId || '')
          setViewerCount(p?.viewerCount || 0)
          setStreamName(p?.streamName || '')
          setPlaybackUrl(p?.playbackUrl || '')
          setLinkedMic(p?.linkedMic ?? null)
          break
        }
        case SIGNALING_MESSAGE_TYPES.hostOnline:
          setLiveStatus(LIVE_STATUS.live)
          setHostPeerId(message.peerId || '')
          setStreamName(message.payload?.streamName || '')
          setPlaybackUrl(message.payload?.playbackUrl || '')
          setNotice(role === LIVE_ROLES.audience ? '主播已开播，正在准备播放。' : '直播已开始。')
          break
        case SIGNALING_MESSAGE_TYPES.hostOffline:
          setLiveStatus(LIVE_STATUS.ended)
          setLinkedMic(null)
          setNotice('主播已结束直播。')
          break
        case SIGNALING_MESSAGE_TYPES.audienceCount:
          setViewerCount(message.payload?.viewerCount || 0)
          break
        case SIGNALING_MESSAGE_TYPES.liveGift: {
          const p = message.payload || {}
          setGiftFeed((prev) => [
            ...prev.slice(-24),
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              fromPeerId: message.peerId,
              giftId: p.giftId,
              label: p.label,
              count: p.count,
              fromName: p.fromName
            }
          ])
          break
        }
        case SIGNALING_MESSAGE_TYPES.linkMicRequest:
          if (role === LIVE_ROLES.host) {
            setLinkMicRequests((prev) => {
              const rid = message.peerId
              const filtered = prev.filter((r) => r.requesterPeerId !== rid)
              return [
                ...filtered,
                {
                  requesterPeerId: rid,
                  requesterName: message.payload?.requesterName || '观众'
                }
              ]
            })
          }
          break
        case SIGNALING_MESSAGE_TYPES.linkMicState:
          setLinkedMic(message.payload?.linkedMic ?? null)
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
    },
    sendLiveGift({ giftId, label, count = 1 }) {
      return signaling.sendMessage({
        type: SIGNALING_MESSAGE_TYPES.sendLiveGift,
        roomId,
        peerId,
        payload: {
          giftId,
          label,
          count,
          fromName: peerName || (role === LIVE_ROLES.host ? '主播' : '观众')
        }
      })
    },
    requestLinkMic() {
      return signaling.sendMessage({
        type: SIGNALING_MESSAGE_TYPES.requestLinkMic,
        roomId,
        peerId,
        payload: { peerName: peerName || '观众' }
      })
    },
    respondLinkMic({ accept, targetPeerId, targetPeerName }) {
      const ok = signaling.sendMessage({
        type: SIGNALING_MESSAGE_TYPES.respondLinkMic,
        roomId,
        peerId,
        payload: { accept, targetPeerId, targetPeerName }
      })
      if (ok) {
        setLinkMicRequests((prev) => prev.filter((r) => r.requesterPeerId !== targetPeerId))
      }
      return ok
    }
  }), [peerId, peerName, role, roomId, signaling])

  const dismissGift = useCallback((id) => {
    setGiftFeed((prev) => prev.filter((g) => g.id !== id))
  }, [])

  return {
    signalingStatus: signaling.status,
    signalingError: signaling.error,
    liveStatus,
    hostPeerId,
    viewerCount,
    streamName,
    playbackUrl,
    linkedMic,
    giftFeed,
    linkMicRequests,
    notice,
    dismissGift,
    ...actions
  }
}
