import { useCallback, useMemo, useState } from 'react'
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
  const liveSession = useLiveSession({ roomId, peerId, role: LIVE_ROLES.host, peerName })
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

  const [mockGiftSelf, setMockGiftSelf] = useState(false)

  const statusItems = useMemo(() => [
    { label: '房间', value: roomId },
    { label: '角色', value: peerName },
    { label: '信令', value: liveSession.signalingStatus },
    { label: '直播', value: publisher.publishState },
    { label: '观众数', value: String(liveSession.viewerCount) },
    {
      label: '连麦(mock)',
      value: liveSession.linkedMic ? liveSession.linkedMic.peerName : '无'
    }
  ], [
    liveSession.linkedMic,
    liveSession.signalingStatus,
    liveSession.viewerCount,
    peerName,
    publisher.publishState,
    roomId
  ])

  const notice = media.error || publisher.publishError || liveSession.notice

  return (
    <main className="page room-page">
      <section className="room-layout">
        <header className="card room-header">
          <div>
            <p className="eyebrow">Phase 2 · Host · 礼物/连麦 mock</p>
            <h1>{roomId}</h1>
            <p className="description">主播推流至本地 SRS；下方为信令广播的礼物与连麦（mock，无第二路 SRS 推流）。</p>
          </div>
          <div className="room-header__actions">
            <button type="button" onClick={handleStartLive}>开始直播</button>
            <button type="button" className="secondary" onClick={handleStopLive}>停止直播</button>
          </div>
        </header>

        <StatusBanner items={statusItems} />

        {notice ? <div className="card error-card">{notice}</div> : null}

        <section className={`video-grid ${liveSession.linkedMic ? '' : 'video-grid--single'}`}>
          <VideoPanel title="主播本地预览" stream={media.localStream} muted emptyText="正在等待摄像头..." />
          {liveSession.linkedMic ? (
            <VideoPanel
              title={`连麦（mock）· ${liveSession.linkedMic.peerName}`}
              stream={null}
              emptyText="占位：真实连麦需第二路推流；当前仅状态同步"
            />
          ) : null}
        </section>

        {liveSession.giftFeed.length > 0 ? (
          <div className="card stream-card live-gift-feed">
            <strong>礼物动效（mock）</strong>
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

        {liveSession.linkMicRequests.length > 0 ? (
          <div className="card stream-card live-link-requests">
            <strong>连麦申请（mock）</strong>
            <ul className="live-link-request-list">
              {liveSession.linkMicRequests.map((r) => (
                <li key={r.requesterPeerId} className="live-link-request-row">
                  <span>{r.requesterName}</span>
                  <div className="action-grid">
                    <button
                      type="button"
                      onClick={() =>
                        liveSession.respondLinkMic({
                          accept: true,
                          targetPeerId: r.requesterPeerId,
                          targetPeerName: r.requesterName
                        })
                      }
                    >
                      同意
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        liveSession.respondLinkMic({
                          accept: false,
                          targetPeerId: r.requesterPeerId,
                          targetPeerName: r.requesterName
                        })
                      }
                    >
                      忽略
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="card stream-card">
          <strong>主播自测礼物（mock）</strong>
          <p className="description" style={{ marginTop: 8, fontSize: 14 }}>
            向房间内广播一条礼物消息，用于无观众时自测 UI。
          </p>
          <div className="action-grid">
            <button
              type="button"
              className="secondary"
              disabled={mockGiftSelf}
              onClick={() => {
                setMockGiftSelf(true)
                liveSession.sendLiveGift({ giftId: 'rose', label: '玫瑰', count: 1 })
                window.setTimeout(() => setMockGiftSelf(false), 400)
              }}
            >
              自测送玫瑰
            </button>
          </div>
        </div>

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
