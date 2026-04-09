import { useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { StatusBanner } from '../components/StatusBanner.jsx'
import { VideoPanel } from '../components/VideoPanel.jsx'
import { useLivePlayer } from '../hooks/useLivePlayer.js'
import { useLiveSession } from '../hooks/useLiveSession.js'
import { LIVE_ROLES } from '../lib/live.js'

export function AudienceLivePage() {
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const peerId = searchParams.get('peerId') || 'audience-fallback'
  const peerName = searchParams.get('peerName') || '观众'

  const liveSession = useLiveSession({ roomId, peerId, role: LIVE_ROLES.audience })
  const player = useLivePlayer({
    liveStatus: liveSession.liveStatus,
    playbackUrl: liveSession.playbackUrl
  })

  const statusItems = useMemo(() => [
    { label: '房间', value: roomId },
    { label: '角色', value: peerName },
    { label: '信令', value: liveSession.signalingStatus },
    { label: '直播', value: player.playerState },
    { label: '在线人数', value: String(liveSession.viewerCount) }
  ], [liveSession.signalingStatus, liveSession.viewerCount, peerName, player.playerState, roomId])

  const notice = liveSession.notice || player.playerError

  return (
    <main className="page room-page">
      <section className="room-layout">
        <header className="card room-header">
          <div>
            <p className="eyebrow">Phase 2 · Audience Live</p>
            <h1>{roomId}</h1>
            <p className="description">观众页现在会尝试通过本地 SRS 的 WebRTC 播放接口拉取直播流。如果播放失败，请先确认 SRS 已启动、1985/8000 端口可访问，且主播已成功发布流。</p>
          </div>
          <button type="button" className="secondary" onClick={() => {
            liveSession.leaveLive()
            navigate('/')
          }}>返回首页</button>
        </header>

        <StatusBanner items={statusItems} />

        {notice ? <div className="card error-card">{notice}</div> : null}

        <section className="video-grid video-grid--single">
          <VideoPanel
            title="直播画面"
            stream={player.remoteStream}
            emptyText="等待主播开播或等待 SRS 建连..."
          />
        </section>

        <div className="card stream-card">
          <strong>WebRTC 拉流地址</strong>
          <code>{liveSession.playbackUrl || '主播开播后生成'}</code>
        </div>
      </section>
    </main>
  )
}
