const liveRooms = new Map()
const livePeerIndex = new Map()

function getViewerCount(room) {
  return room.audiences.size
}

function buildLiveState(room) {
  return {
    liveStatus: room.liveStatus,
    hostPeerId: room.host?.peerId || '',
    viewerCount: getViewerCount(room),
    streamName: room.streamName,
    playbackUrl: room.playbackUrl,
    linkedMic: room.linkedMic || null
  }
}

function getRoom(roomId) {
  if (!liveRooms.has(roomId)) {
    liveRooms.set(roomId, {
      host: null,
      audiences: new Map(),
      liveStatus: 'idle',
      streamName: '',
      playbackUrl: '',
      linkedMic: null
    })
  }
  return liveRooms.get(roomId)
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
    state: buildLiveState(room)
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

  let broadcastLinkMicClear = false

  if (entry.role === 'host' && room.host?.peerId === peerId) {
    room.host = null
    room.liveStatus = 'ended'
    room.streamName = ''
    room.playbackUrl = ''
    if (room.linkedMic) {
      room.linkedMic = null
      broadcastLinkMicClear = true
    }
  }

  if (entry.role === 'audience') {
    room.audiences.delete(peerId)
    if (room.linkedMic?.peerId === peerId) {
      room.linkedMic = null
      broadcastLinkMicClear = true
    }
  }

  livePeerIndex.delete(peerId)

  if (!room.host && room.audiences.size === 0) {
    liveRooms.delete(entry.roomId)
  }

  return {
    roomId: entry.roomId,
    role: entry.role,
    broadcastLinkMicClear,
    state: room ? buildLiveState(room) : null
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
    state: buildLiveState(room)
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
    state: buildLiveState(room)
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
      playbackUrl: '',
      linkedMic: null
    }
  }

  return buildLiveState(room)
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

export function getLiveHostSocket(roomId) {
  const room = liveRooms.get(roomId)
  return room?.host?.socket ?? null
}

export function getLiveRoomIdForPeer(peerId) {
  return livePeerIndex.get(peerId)?.roomId ?? null
}

export function isLiveAudienceInRoom(peerId, roomId) {
  const entry = livePeerIndex.get(peerId)
  return Boolean(entry && entry.roomId === roomId && entry.role === 'audience')
}

export function updateLiveLinkMic({ roomId, hostPeerId, accept, targetPeerId, targetPeerName }) {
  const room = liveRooms.get(roomId)
  if (!room || room.host?.peerId !== hostPeerId) {
    return { ok: false, error: 'host not found' }
  }
  if (!accept) {
    return { ok: true, linkedMic: room.linkedMic, state: buildLiveState(room) }
  }
  if (!targetPeerId) {
    return { ok: false, error: 'targetPeerId required' }
  }
  room.linkedMic = { peerId: targetPeerId, peerName: targetPeerName || '观众' }
  return { ok: true, linkedMic: room.linkedMic, state: buildLiveState(room) }
}
