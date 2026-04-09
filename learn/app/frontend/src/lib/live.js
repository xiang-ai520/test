import { MEDIA_SERVER_CONFIG } from './config.js'

export const LIVE_ROLES = {
  host: 'host',
  audience: 'audience'
}

export const LIVE_STATUS = {
  idle: 'idle',
  live: 'live',
  ended: 'ended',
  error: 'error'
}

export function buildStreamName(roomId) {
  return roomId.trim().toLowerCase()
}

export function buildPlaybackUrl(roomId) {
  return `${MEDIA_SERVER_CONFIG.baseHttpUrl}/${MEDIA_SERVER_CONFIG.appName}/${buildStreamName(roomId)}.m3u8`
}

export function buildRtcStreamUrl(roomId) {
  const streamName = buildStreamName(roomId)
  return `webrtc://${window.location.hostname}/${MEDIA_SERVER_CONFIG.appName}/${streamName}`
}

export function buildRtcPublishEndpoint() {
  return `${MEDIA_SERVER_CONFIG.baseRtcUrl}/rtc/v1/publish/`
}

export function buildRtcPlayEndpoint() {
  return `${MEDIA_SERVER_CONFIG.baseRtcUrl}/rtc/v1/play/`
}

export async function exchangeRtcSdp({ endpoint, streamUrl, sdp }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api: endpoint,
      streamurl: streamUrl,
      sdp
    })
  })

  if (!response.ok) {
    throw new Error(`SRS API 请求失败: ${response.status}`)
  }

  const data = await response.json()
  if (data.code && data.code !== 0) {
    throw new Error(data.server || `SRS 返回错误码 ${data.code}`)
  }

  if (!data.sdp) {
    throw new Error('SRS 未返回有效 SDP')
  }

  return data.sdp
}

export function createLivePublishResult(roomId) {
  return {
    streamName: buildStreamName(roomId),
    playbackUrl: buildRtcStreamUrl(roomId),
    hlsUrl: buildPlaybackUrl(roomId)
  }
}
