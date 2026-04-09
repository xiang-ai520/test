import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { VideoPanel } from '../components/VideoPanel.jsx'
import { useAiGateway } from '../hooks/useAiGateway.js'
import { useLocalMedia } from '../hooks/useLocalMedia.js'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder.js'

function captureVideoJpegBase64(videoEl) {
  if (!videoEl || videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null
  const w = videoEl.videoWidth
  const h = videoEl.videoHeight
  if (!w || !h) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(videoEl, 0, 0)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return dataUrl.replace(/^data:image\/jpeg;base64,/, '')
}

export function AiSessionPage() {
  const videoRef = useRef(null)
  const { localStream, error: mediaError, isLoading } = useLocalMedia()
  const {
    connectionState,
    lastError,
    messages,
    streamingText,
    voiceBusy,
    connect,
    disconnect,
    sendText,
    sendImage,
    sendAudio,
    sessionId
  } = useAiGateway()

  const { isRecording, error: recorderError, startRecording, stopRecording } = useVoiceRecorder(localStream)

  const [input, setInput] = useState('')
  const [autoSnap, setAutoSnap] = useState(false)
  const [snapIntervalSec, setSnapIntervalSec] = useState(5)

  const snapAndSend = useCallback(
    (source = 'manual') => {
      const b64 = captureVideoJpegBase64(videoRef.current)
      if (!b64) return false
      return sendImage('image/jpeg', b64, source)
    },
    [sendImage]
  )

  useEffect(() => {
    if (!autoSnap || connectionState !== 'open') return
    const ms = Math.max(3, snapIntervalSec) * 1000
    const id = window.setInterval(() => {
      snapAndSend('timer')
    }, ms)
    return () => window.clearInterval(id)
  }, [autoSnap, connectionState, snapAndSend, snapIntervalSec])

  function handleTextSubmit(event) {
    event.preventDefault()
    if (sendText(input)) setInput('')
  }

  const handleStopVoiceAndSend = useCallback(async () => {
    const blob = await stopRecording()
    if (blob) await sendAudio(blob)
  }, [stopRecording, sendAudio])

  return (
    <main className="page room-page">
      <div className="room-layout ai-layout">
        <header className="card room-header">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>
              Phase 3–5 · 文本/视觉/语音 + 画面上下文（mock）
            </p>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', margin: '8px 0 0' }}>本地 AI 会话（mock）</h1>
          </div>
          <div className="room-header__actions">
            <Link to="/">
              <button type="button" className="secondary">
                返回首页
              </button>
            </Link>
            {connectionState === 'open' ? (
              <button type="button" className="danger" onClick={disconnect}>
                断开网关
              </button>
            ) : (
              <button type="button" onClick={connect} disabled={connectionState === 'connecting'}>
                {connectionState === 'connecting' ? '连接中…' : '连接 AI 网关'}
              </button>
            )}
          </div>
        </header>

        {(mediaError || lastError || recorderError) && (
          <section className="card error-card">
            {mediaError && <p>媒体：{mediaError}</p>}
            {recorderError && <p>录音：{recorderError}</p>}
            {lastError && <p>网关：{lastError}</p>}
          </section>
        )}

        <section className="video-grid video-grid--single">
          <VideoPanel
            title="摄像头预览（用于截图发送）"
            stream={localStream}
            muted
            emptyText={isLoading ? '正在请求摄像头…' : '请允许使用摄像头'}
            videoRef={videoRef}
          />
        </section>

        <section className="card stream-card">
          <p className="status-banner__label">会话 ID</p>
          <code>{sessionId}</code>
          <p className="status-banner__label" style={{ marginTop: 12 }}>
            连接状态：{connectionState}
          </p>
          <label className="ai-toggle">
            <input type="checkbox" checked={autoSnap} onChange={(e) => setAutoSnap(e.target.checked)} />
            <span>定时自动截帧（source=timer）</span>
          </label>
          <label className="join-form" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <span className="status-banner__label">定时间隔（秒）</span>
            <select
              value={snapIntervalSec}
              onChange={(e) => setSnapIntervalSec(Number(e.target.value))}
              disabled={!autoSnap}
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </label>
          <div className="action-grid" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="secondary"
              onClick={() => snapAndSend('manual')}
              disabled={connectionState !== 'open'}
            >
              手动截图发送
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => snapAndSend('event')}
              disabled={connectionState !== 'open'}
            >
              事件截帧
            </button>
          </div>
        </section>

        <section className="card stream-card">
          <h2 className="status-banner__label" style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>
            Phase 5 · 低频摘要（mock）
          </h2>
          <p className="description" style={{ margin: '8px 0 0', fontSize: 14 }}>
            先发若干截帧，再点下面按钮：文本会带上「画面上下文」由网关拼进 mock 回复（验证标准 2/3）。
          </p>
          <div className="action-grid" style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                void sendText('请根据最近画面用一句话做 mock 摘要。')
              }}
              disabled={connectionState !== 'open'}
            >
              请求一句话摘要（mock）
            </button>
          </div>
        </section>

        <section className="card stream-card ai-voice-card">
          <h2 className="status-banner__label" style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>
            Phase 4 · 语音
          </h2>
          <p className="description" style={{ margin: '8px 0 0', fontSize: 14 }}>
            使用与预览相同的媒体流中的麦克风；录音后经网关 mock STT → mock 文本回复 → mock TTS（WAV）播放。
          </p>
          {voiceBusy ? (
            <p className="ai-voice-phase">聆听结束 · 识别 / 推理 / 合成中…</p>
          ) : isRecording ? (
            <p className="ai-voice-phase">正在录音…</p>
          ) : (
            <p className="ai-voice-phase ai-voice-phase--muted">空闲</p>
          )}
          <div className="action-grid" style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => startRecording()}
              disabled={connectionState !== 'open' || voiceBusy || isRecording}
            >
              开始录音
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void handleStopVoiceAndSend()}
              disabled={connectionState !== 'open' || voiceBusy || !isRecording}
            >
              停止并上传
            </button>
          </div>
        </section>

        <section className="card stream-card">
          <h2 className="status-banner__label" style={{ margin: 0, fontSize: 16, color: '#e2e8f0' }}>
            对话
          </h2>
          <div className="ai-chat-log">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`ai-bubble ai-bubble--${
                  m.role === 'user'
                    ? 'user'
                    : m.role === 'assistant'
                      ? 'assistant'
                      : m.role === 'transcript'
                        ? 'transcript'
                        : 'system'
                }`}
              >
                {m.text}
              </div>
            ))}
            {streamingText ? (
              <div className="ai-bubble ai-bubble--assistant ai-bubble--streaming">{streamingText}</div>
            ) : null}
          </div>
          <form className="join-form" style={{ marginTop: 12 }} onSubmit={handleTextSubmit}>
            <label>
              <span>文本消息</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入后发送，网关将以 mock 流式回复"
                disabled={connectionState !== 'open'}
              />
            </label>
            <button type="submit" disabled={connectionState !== 'open' || !input.trim()}>
              发送文本
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
