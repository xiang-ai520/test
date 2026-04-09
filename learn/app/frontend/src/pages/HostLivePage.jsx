import { useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ControlBar } from '../components/ControlBar.jsx'
import { StatusBanner } from '../components/StatusBanner.jsx'
import { VideoPanel } from '../components/VideoPanel.jsx'
import { useLivePublisher } from '../hooks/useLivePublisher.js'
import { useLiveSession } from '../hooks/useLiveSession.js'
import { useLocalMedia } from '../hooks/useLocalMedia.js'
import { LIVE_ROLES } from '../lib/live.js'

export function HostLivePage() {
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const peerId = searchParams.get('peerId') || 'host-fallback'
  const peerName = searchParams.get('peerName') || '主播'

  const media = useLocalMedia()
  const liveSession = useLiveSession({ roomId, peerId, role: LIVE_ROLES.host })
  const publisher = useLivePublisher({ roomId, localStream: media.localStream })

  const handleStartLive = useCallback(async () => {
    const result = await publisher.startPublishing()
    if (!result) return
    liveSession.startLive(result)
  }, [liveSession, publisher])

  const handleStopLive = useCallback(() => {
    publisher.stopPublishing()
    liveSession.stopLive()
  }, [liveSession, publisher])

  const handleLeave = useCallback(() => {
    liveSession.leaveLive()
    navigate('/')
  }, [liveSession, navigate])

  const statusItems = useMemo(() => [
    { label: '房间', value: roomId },
    { label: '角色', value: peerName },
    { label: '信令', value: liveSession.signalingStatus },
    { label: '直播', value: publisher.publishState },
    { label: '观众数', value: String(liveSession.viewerCount) }
  ], [liveSession.signalingStatus, liveSession.viewerCount, peerName, publisher.publishState, roomId])

  const notice = media.error || publisher.publishError || liveSession.notice

  return (
    <main className="page room-page">
      <section className="room-layout">
        <header className="card room-header">
          <div>
            <p className="eyebrow">Phase 2 · Host Live</p>
            <h1>{roomId}</h1>
            <p className="description">主播页现在会尝试直接与本地 SRS 建立 WebRTC 推流。请先确保 SRS 已启动，并开放 1985 / 8000 / 8080 等局域网端口。</p>
          </div>
          <div className="room-header__actions">
            <button type="button" onClick={handleStartLive}>开始直播</button>
            <button type="button" className="secondary" onClick={handleStopLive}>停止直播</button>
          </div>
        </header>

        <StatusBanner items={statusItems} />

        {notice ? <div className="card error-card">{notice}</div> : null}

        <section className="video-grid video-grid--single">
          <VideoPanel title="主播本地预览" stream={media.localStream} muted emptyText="正在等待摄像头..." />
        </section>

        <div className="card stream-card">
          <strong>WebRTC 播放地址</strong>
          <code>{liveSession.playbackUrl || publisher.publishResult?.playbackUrl || '开始直播后生成'}</code>
          <strong>HLS 回退地址</strong>
          <code>{publisher.publishResult?.hlsUrl || '开始直播后生成'}</code>
        </div>

        <ControlBar
          audioEnabled={media.audioEnabled}
          videoEnabled={media.videoEnabled}
          onToggleAudio={media.toggleAudio}
          onToggleVideo={media.toggleVideo}
          onSwitchCamera={media.switchCamera}
          onLeave={handleLeave}
          leaveLabel="离开直播页"
        />
      </section>
    </main>
  )
}
