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

  const liveSession = useLiveSession({ roomId, peerId, role: LIVE_ROLES.audience, peerName })
  const player = useLivePlayer({
    liveStatus: liveSession.liveStatus,
    playbackUrl: liveSession.playbackUrl
  })

  const statusItems = useMemo(() => [
    { label: '房间', value: roomId },
    { label: '角色', value: peerName },
    { label: '信令', value: liveSession.signalingStatus },
    { label: '直播', value: player.playerState },
    { label: '在线人数', value: String(liveSession.viewerCount) },
    {
      label: '连麦(mock)',
      value:
        liveSession.linkedMic?.peerId === peerId
          ? '你已连麦'
          : liveSession.linkedMic
            ? `他人：${liveSession.linkedMic.peerName}`
            : '无'
    }
  ], [
    liveSession.linkedMic,
    liveSession.signalingStatus,
    liveSession.viewerCount,
    peerId,
    peerName,
    player.playerState,
    roomId
  ])

  const notice = liveSession.notice || player.playerError

  return (
    <main className="page room-page">
      <section className="room-layout">
        <header className="card room-header">
          <div>
            <p className="eyebrow">Phase 2 · Audience · 礼物/连麦 mock</p>
            <h1>{roomId}</h1>
            <p className="description">拉流依赖 SRS；礼物与连麦仅信令 mock，连麦通过后为占位画面。</p>
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

        <div className="card stream-card live-interaction-card">
          <strong>互动（mock）</strong>
          <div className="action-grid" style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() =>
                liveSession.sendLiveGift({ giftId: 'rose', label: '玫瑰', count: 1 })
              }
            >
              送玫瑰 ×1
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                liveSession.sendLiveGift({ giftId: 'rocket', label: '火箭', count: 1 })
              }
            >
              送火箭 ×1
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => liveSession.requestLinkMic()}
              disabled={Boolean(liveSession.linkedMic)}
            >
              {liveSession.linkedMic?.peerId === peerId
                ? '你已连麦'
                : liveSession.linkedMic
                  ? '连麦位已被占用'
                  : '申请连麦'}
            </button>
          </div>
        </div>

        {liveSession.giftFeed.length > 0 ? (
          <div className="card stream-card live-gift-feed">
            <strong>礼物广播</strong>
            <ul className="live-gift-list">
              {liveSession.giftFeed.map((g) => (
                <li key={g.id} className="live-gift-item">
                  <span>
                    {g.fromName} 送出 {g.label} ×{g.count}
                  </span>
                  <button type="button" className="secondary" onClick={() => liveSession.dismissGift(g.id)}>
                    关闭
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="card stream-card">
          <strong>WebRTC 拉流地址</strong>
          <code>{liveSession.playbackUrl || '主播开播后生成'}</code>
        </div>
      </section>
    </main>
  )
}
