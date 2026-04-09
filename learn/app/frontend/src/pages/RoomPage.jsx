import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ControlBar } from '../components/ControlBar.jsx'
import { StatusBanner } from '../components/StatusBanner.jsx'
import { VideoPanel } from '../components/VideoPanel.jsx'
import { useLocalMedia } from '../hooks/useLocalMedia.js'
import { usePeerConnection } from '../hooks/usePeerConnection.js'
import { useSignaling } from '../hooks/useSignaling.js'
import { generatePeerId } from '../lib/id.js'

export function RoomPage() {
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const fallbackPeerIdRef = useRef(generatePeerId())
  const peerId = searchParams.get('peerId') || fallbackPeerIdRef.current
  const peerName = searchParams.get('peerName') || '匿名用户'
  const signalHandlerRef = useRef(() => {})
  const [leftNotice, setLeftNotice] = useState('')

  const {
    localStream,
    error: mediaError,
    isLoading,
    audioEnabled,
    videoEnabled,
    requestMedia,
    toggleAudio,
    toggleVideo,
    switchCamera
  } = useLocalMedia()

  const signaling = useSignaling({
    roomId,
    peerId,
    enabled: Boolean(roomId),
    onMessage: async (message) => {
      if (message.type === 'peer-left') {
        setLeftNotice('对方已离开房间，可以等待对方重新加入。')
      } else if (message.type === 'peer-joined' || message.type === 'peer-ready' || message.type === 'room-state') {
        setLeftNotice('')
      }
      await signalHandlerRef.current(message)
    }
  })

  const peerConnection = usePeerConnection({
    localStream,
    roomId,
    peerId,
    sendMessage: signaling.sendMessage
  })

  signalHandlerRef.current = peerConnection.handleSignalMessage

  const handleLeave = useCallback(() => {
    peerConnection.hangUp()
    navigate('/')
  }, [navigate, peerConnection])

  const statusItems = useMemo(() => [
    { label: '房间', value: roomId },
    { label: '用户', value: peerName },
    { label: '信令', value: signaling.status },
    { label: '连接', value: peerConnection.connectionState }
  ], [peerConnection.connectionState, peerName, roomId, signaling.status])

  return (
    <main className="page room-page">
      <section className="room-layout">
        <header className="card room-header">
          <div>
            <p className="eyebrow">Phase 1 · Room</p>
            <h1>{roomId}</h1>
            <p className="description">等待第二个设备加入后，信令服务会触发 WebRTC 建连。</p>
          </div>
          <button type="button" className="secondary" onClick={requestMedia} disabled={isLoading}>
            {isLoading ? '正在申请权限...' : '重新申请媒体权限'}
          </button>
        </header>

        <StatusBanner items={statusItems} />

        {(mediaError || signaling.error || leftNotice) ? (
          <div className="card error-card">{mediaError || signaling.error || leftNotice}</div>
        ) : null}

        <section className="video-grid">
          <VideoPanel title="本地画面" stream={localStream} muted emptyText="正在等待本地摄像头..." />
          <VideoPanel title="远端画面" stream={peerConnection.remoteStream} emptyText="等待对方加入房间..." />
        </section>

        <ControlBar
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onLeave={handleLeave}
        />
      </section>
    </main>
  )
}
