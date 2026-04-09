const liveRooms = new Map()
const livePeerIndex = new Map()

function getRoom(roomId) {
  if (!liveRooms.has(roomId)) {
    liveRooms.set(roomId, {
      host: null,
      audiences: new Map(),
      liveStatus: 'idle',
      streamName: '',
      playbackUrl: ''
    })
  }
  return liveRooms.get(roomId)
}

function getViewerCount(room) {
  return room.audiences.size
}

export function joinLiveRoom({ roomId, peerId, socket, role }) {
  const room = getRoom(roomId)

  if (role === 'host') {
    if (room.host && room.host.peerId !== peerId) {
      return { ok: false, error: 'host already exists' }
    }
    room.host = { peerId, socket }
  } else {
    room.audiences.set(peerId, socket)
  }

  livePeerIndex.set(peerId, { roomId, role })

  return {
    ok: true,
    state: {
      liveStatus: room.liveStatus,
      hostPeerId: room.host?.peerId || '',
      viewerCount: getViewerCount(room),
      streamName: room.streamName,
      playbackUrl: room.playbackUrl
    }
  }
}

export function leaveLiveRoom(peerId) {
  const entry = livePeerIndex.get(peerId)
  if (!entry) return null

  const room = liveRooms.get(entry.roomId)
  if (!room) {
    livePeerIndex.delete(peerId)
    return null
  }

  if (entry.role === 'host' && room.host?.peerId === peerId) {
    room.host = null
    room.liveStatus = 'ended'
    room.streamName = ''
    room.playbackUrl = ''
  }

  if (entry.role === 'audience') {
    room.audiences.delete(peerId)
  }

  livePeerIndex.delete(peerId)

  if (!room.host && room.audiences.size === 0) {
    liveRooms.delete(entry.roomId)
  }

  return {
    roomId: entry.roomId,
    role: entry.role,
    state: room ? {
      liveStatus: room.liveStatus,
      hostPeerId: room.host?.peerId || '',
      viewerCount: getViewerCount(room),
      streamName: room.streamName,
      playbackUrl: room.playbackUrl
    } : null
  }
}

export function startLive({ roomId, peerId, streamName, playbackUrl }) {
  const room = liveRooms.get(roomId)
  if (!room || room.host?.peerId !== peerId) {
    return { ok: false, error: 'host not found' }
  }

  room.liveStatus = 'live'
  room.streamName = streamName
  room.playbackUrl = playbackUrl

  return {
    ok: true,
    state: {
      liveStatus: room.liveStatus,
      hostPeerId: room.host?.peerId || '',
      viewerCount: getViewerCount(room),
      streamName: room.streamName,
      playbackUrl: room.playbackUrl
    }
  }
}

export function stopLive({ roomId, peerId }) {
  const room = liveRooms.get(roomId)
  if (!room || room.host?.peerId !== peerId) {
    return { ok: false, error: 'host not found' }
  }

  room.liveStatus = 'ended'
  room.streamName = ''
  room.playbackUrl = ''

  return {
    ok: true,
    state: {
      liveStatus: room.liveStatus,
      hostPeerId: room.host?.peerId || '',
      viewerCount: getViewerCount(room),
      streamName: room.streamName,
      playbackUrl: room.playbackUrl
    }
  }
}

export function getLiveRoomState(roomId) {
  const room = liveRooms.get(roomId)
  if (!room) {
    return {
      liveStatus: 'idle',
      hostPeerId: '',
      viewerCount: 0,
      streamName: '',
      playbackUrl: ''
    }
  }

  return {
    liveStatus: room.liveStatus,
    hostPeerId: room.host?.peerId || '',
    viewerCount: getViewerCount(room),
    streamName: room.streamName,
    playbackUrl: room.playbackUrl
  }
}

export function getLiveAudienceSockets(roomId) {
  const room = liveRooms.get(roomId)
  if (!room) return []
  return [...room.audiences.values()]
}

export function getLiveRoomSockets(roomId) {
  const room = liveRooms.get(roomId)
  if (!room) return []
  const sockets = [...room.audiences.values()]
  if (room.host?.socket) sockets.push(room.host.socket)
  return sockets
}
