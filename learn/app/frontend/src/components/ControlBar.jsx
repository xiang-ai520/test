export function ControlBar({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onLeave,
  leaveLabel = '离开房间'
}) {
  return (
    <div className="control-bar">
      <button type="button" onClick={onToggleAudio}>
        {audioEnabled ? '关闭麦克风' : '打开麦克风'}
      </button>
      <button type="button" onClick={onToggleVideo}>
        {videoEnabled ? '关闭摄像头' : '打开摄像头'}
      </button>
      <button type="button" onClick={onSwitchCamera}>切换前后摄</button>
      <button type="button" className="danger" onClick={onLeave}>{leaveLabel}</button>
    </div>
  )
}
