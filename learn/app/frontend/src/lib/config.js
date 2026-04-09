export const SIGNALING_MESSAGE_TYPES = {
  joinRoom: 'join-room',
  peerJoined: 'peer-joined',
  peerReady: 'peer-ready',
  offer: 'offer',
  answer: 'answer',
  iceCandidate: 'ice-candidate',
  peerLeft: 'peer-left',
  error: 'error',
  roomState: 'room-state',
  ping: 'ping',
  pong: 'pong',
  joinLiveRoom: 'join-live-room',
  leaveLiveRoom: 'leave-live-room',
  startLive: 'start-live',
  stopLive: 'stop-live',
  liveState: 'live-state',
  hostOnline: 'host-online',
  hostOffline: 'host-offline',
  audienceCount: 'audience-count'
}

const hostname = window.location.hostname || 'localhost'

export const SIGNALING_SERVER_URL =
  hostname === 'localhost'
    ? 'ws://localhost:8788'
    : `ws://${hostname}:8788`

export const MEDIA_SERVER_CONFIG = {
  baseHttpUrl: hostname === 'localhost' ? 'http://localhost:8080' : `http://${hostname}:8080`,
  baseRtcUrl: hostname === 'localhost' ? 'http://localhost:1985' : `http://${hostname}:1985`,
  appName: 'live'
}

export const DEFAULT_ICE_SERVERS = []
