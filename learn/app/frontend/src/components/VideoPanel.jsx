import { useEffect, useRef } from 'react'

export function VideoPanel({ title, stream, src = '', muted = false, emptyText, videoRef: videoRefProp }) {
  const fallbackRef = useRef(null)
  const videoRef = videoRefProp ?? fallbackRef

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.srcObject = stream || null
  }, [stream, videoRef])

  useEffect(() => {
    if (!videoRef.current) return
    if (stream) return
    videoRef.current.src = src || ''
  }, [src, stream, videoRef])

  const hasVideo = Boolean(stream || src)

  return (
    <section className="video-panel">
      <header className="video-panel__header">
        <span>{title}</span>
      </header>
      <div className="video-panel__body">
        {hasVideo ? (
          <video ref={videoRef} autoPlay playsInline controls={!stream} muted={muted} />
        ) : (
          <div className="video-panel__empty">{emptyText}</div>
        )}
      </div>
    </section>
  )
}
