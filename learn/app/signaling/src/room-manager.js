const rooms = new Map()
const peerToRoom = new Map()

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map())
  }
  return rooms.get(roomId)
}

function removePeerFromRoom(peerId) {
  const roomId = peerToRoom.get(peerId)
  if (!roomId) return null

  const room = rooms.get(roomId)
  if (!room) {
    peerToRoom.delete(peerId)
    return null
  }

  room.delete(peerId)
  peerToRoom.delete(peerId)

  if (room.size === 0) {
    rooms.delete(roomId)
  }

  return roomId
}

export function joinRoom({ roomId, peerId, socket }) {
  const room = getRoom(roomId)

  if (room.size >= 2 && !room.has(peerId)) {
    return { ok: false, error: 'room is full' }
  }

  room.set(peerId, socket)
  peerToRoom.set(peerId, roomId)

  return {
    ok: true,
    peers: [...room.keys()].filter((id) => id !== peerId)
  }
}

export function getPeerSocket(roomId, peerId) {
  return rooms.get(roomId)?.get(peerId) || null
}

export function getOtherPeers(roomId, peerId) {
  const room = rooms.get(roomId)
  if (!room) return []
  return [...room.entries()]
    .filter(([id]) => id !== peerId)
    .map(([id, socket]) => ({ peerId: id, socket }))
}

export function leaveRoom(peerId) {
  const roomId = removePeerFromRoom(peerId)
  return roomId
}

export function getRoomSize(roomId) {
  return rooms.get(roomId)?.size || 0
}
