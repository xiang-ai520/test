import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generatePeerId } from '../lib/id.js'

function makeDefaultRoomId() {
  return `room-${Math.random().toString(36).slice(2, 8)}`
}

export function JoinPage() {
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState(makeDefaultRoomId)
  const [peerName, setPeerName] = useState('')
  const peerIdRef = useRef(generatePeerId())
  const peerId = useMemo(() => peerIdRef.current, [])

  function navigateTo(pathname) {
    navigate(`${pathname}?peerId=${encodeURIComponent(peerId)}&peerName=${encodeURIComponent(peerName.trim())}`)
  }

  function handleCallSubmit(event) {
    event.preventDefault()
    const nextRoomId = roomId.trim()
    if (!nextRoomId) return
    navigateTo(`/room/${encodeURIComponent(nextRoomId)}`)
  }

  function handleHostLive() {
    const nextRoomId = roomId.trim()
    if (!nextRoomId) return
    navigateTo(`/live/host/${encodeURIComponent(nextRoomId)}`)
  }

  function handleAudienceLive() {
    const nextRoomId = roomId.trim()
    if (!nextRoomId) return
    navigateTo(`/live/audience/${encodeURIComponent(nextRoomId)}`)
  }

  return (
    <main className="page join-page">
      <section className="card hero-card">
        <p className="eyebrow">Phase 1 · LAN 1v1 / Phase 2 · Live</p>
        <h1>局域网视频通话与直播</h1>
        <p className="description">同一 WiFi 下，你可以继续进入 1v1 通话房间，或进入 Phase 2 的直播模式：主播开播、观众观看。</p>
        <form className="join-form" onSubmit={handleCallSubmit}>
          <label>
            <span>房间号</span>
            <input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="例如 room-demo" required />
          </label>
          <label>
            <span>昵称（可选）</span>
            <input value={peerName} onChange={(event) => setPeerName(event.target.value)} placeholder="例如 phone / laptop / host" />
          </label>
          <div className="action-grid">
            <button type="submit">进入 1v1 通话</button>
            <button type="button" className="secondary" onClick={handleHostLive}>作为主播开播</button>
            <button type="button" className="secondary" onClick={handleAudienceLive}>作为观众观看</button>
          </div>
        </form>
      </section>
    </main>
  )
}
