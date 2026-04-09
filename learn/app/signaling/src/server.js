import { WebSocketServer } from 'ws'
import { getOtherPeers, getPeerSocket, joinRoom, leaveRoom } from './room-manager.js'
import {
  getLiveAudienceSockets,
  getLiveHostSocket,
  getLiveRoomIdForPeer,
  getLiveRoomSockets,
  isLiveAudienceInRoom,
  joinLiveRoom,
  leaveLiveRoom,
  startLive,
  stopLive,
  updateLiveLinkMic
} from './live-room-manager.js'
import { MESSAGE_TYPES } from './protocol.js'

const PORT = process.env.PORT || 8788
const HEARTBEAT_INTERVAL_MS = 15000

const wss = new WebSocketServer({ port: PORT })

function send(socket, message) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function broadcast(sockets, message) {
  sockets.forEach((socket) => send(socket, message))
}

function relay(message) {
  if (!message.roomId || !message.targetPeerId) return
  const targetSocket = getPeerSocket(message.roomId, message.targetPeerId)
  if (!targetSocket) return

  send(targetSocket, {
    type: message.type,
    roomId: message.roomId,
    peerId: message.peerId,
    payload: message.payload
  })
}

function notifyLeave(peerId) {
  const roomId = leaveRoom(peerId)
  if (!roomId) return
  const peers = getOtherPeers(roomId, peerId)
  peers.forEach(({ socket }) => {
    send(socket, {
      type: MESSAGE_TYPES.peerLeft,
      roomId,
      peerId
    })
  })
}

function notifyLiveLeave(peerId) {
  const result = leaveLiveRoom(peerId)
  if (!result) return

  if (result.broadcastLinkMicClear) {
    broadcast(getLiveRoomSockets(result.roomId), {
      type: MESSAGE_TYPES.linkMicState,
      roomId: result.roomId,
      payload: { linkedMic: null }
    })
  }

  if (result.role === 'host') {
    broadcast(getLiveAudienceSockets(result.roomId), {
      type: MESSAGE_TYPES.hostOffline,
      roomId: result.roomId,
      peerId,
      payload: result.state
    })
  }

  broadcast(getLiveRoomSockets(result.roomId), {
    type: MESSAGE_TYPES.audienceCount,
    roomId: result.roomId,
    payload: { viewerCount: result.state?.viewerCount || 0 }
  })
}

wss.on('connection', (socket) => {
  socket.isAlive = true
  socket.peerId = null
  socket.connectionType = 'call'

  socket.on('pong', () => {
    socket.isAlive = true
  })

  socket.on('message', (rawMessage) => {
    let message
    try {
      message = JSON.parse(rawMessage.toString())
    } catch {
      send(socket, { type: MESSAGE_TYPES.error, message: 'invalid json' })
      return
    }

    switch (message.type) {
      case MESSAGE_TYPES.joinRoom: {
        const { roomId, peerId } = message
        if (!roomId || !peerId) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'roomId and peerId are required' })
          return
        }

        const result = joinRoom({ roomId, peerId, socket })
        if (!result.ok) {
          send(socket, { type: MESSAGE_TYPES.error, message: result.error })
          return
        }

        socket.peerId = peerId
        socket.connectionType = 'call'
        send(socket, {
          type: MESSAGE_TYPES.roomState,
          roomId,
          peerId,
          peers: result.peers
        })

        const peers = getOtherPeers(roomId, peerId)
        peers.forEach(({ peerId: otherPeerId, socket: otherSocket }) => {
          send(otherSocket, {
            type: MESSAGE_TYPES.peerJoined,
            roomId,
            peerId
          })
          send(socket, {
            type: MESSAGE_TYPES.peerReady,
            roomId,
            peerId: otherPeerId
          })
        })
        break
      }
      case MESSAGE_TYPES.joinLiveRoom: {
        const { roomId, peerId, payload } = message
        const role = payload?.role || 'audience'
        if (!roomId || !peerId) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'roomId and peerId are required' })
          return
        }

        const result = joinLiveRoom({ roomId, peerId, socket, role })
        if (!result.ok) {
          send(socket, { type: MESSAGE_TYPES.error, message: result.error })
          return
        }

        socket.peerId = peerId
        socket.connectionType = 'live'
        send(socket, {
          type: MESSAGE_TYPES.liveState,
          roomId,
          peerId,
          payload: result.state
        })
        broadcast(getLiveRoomSockets(roomId), {
          type: MESSAGE_TYPES.audienceCount,
          roomId,
          payload: { viewerCount: result.state.viewerCount }
        })
        break
      }
      case MESSAGE_TYPES.startLive: {
        const { roomId, peerId, payload } = message
        const result = startLive({
          roomId,
          peerId,
          streamName: payload?.streamName || '',
          playbackUrl: payload?.playbackUrl || ''
        })
        if (!result.ok) {
          send(socket, { type: MESSAGE_TYPES.error, message: result.error })
          return
        }

        broadcast(getLiveAudienceSockets(roomId), {
          type: MESSAGE_TYPES.hostOnline,
          roomId,
          peerId,
          payload: result.state
        })
        send(socket, {
          type: MESSAGE_TYPES.liveState,
          roomId,
          peerId,
          payload: result.state
        })
        break
      }
      case MESSAGE_TYPES.stopLive: {
        const { roomId, peerId } = message
        const result = stopLive({ roomId, peerId })
        if (!result.ok) {
          send(socket, { type: MESSAGE_TYPES.error, message: result.error })
          return
        }

        broadcast(getLiveAudienceSockets(roomId), {
          type: MESSAGE_TYPES.hostOffline,
          roomId,
          peerId,
          payload: result.state
        })
        send(socket, {
          type: MESSAGE_TYPES.liveState,
          roomId,
          peerId,
          payload: result.state
        })
        break
      }
      case MESSAGE_TYPES.sendLiveGift: {
        const { roomId, peerId, payload } = message
        if (!roomId || !peerId || socket.peerId !== peerId) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'invalid gift message' })
          break
        }
        if (socket.connectionType !== 'live') {
          send(socket, { type: MESSAGE_TYPES.error, message: 'not in live room' })
          break
        }
        if (getLiveRoomIdForPeer(peerId) !== roomId) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'room mismatch' })
          break
        }
        broadcast(getLiveRoomSockets(roomId), {
          type: MESSAGE_TYPES.liveGift,
          roomId,
          peerId,
          payload: {
            giftId: payload?.giftId || 'unknown',
            label: payload?.label || '礼物',
            count: Number(payload?.count) > 0 ? Number(payload.count) : 1,
            fromName: payload?.fromName || '观众'
          }
        })
        break
      }
      case MESSAGE_TYPES.requestLinkMic: {
        const { roomId, peerId, payload } = message
        if (!roomId || !peerId || socket.peerId !== peerId) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'invalid link mic request' })
          break
        }
        if (socket.connectionType !== 'live') {
          send(socket, { type: MESSAGE_TYPES.error, message: 'not in live room' })
          break
        }
        if (!isLiveAudienceInRoom(peerId, roomId)) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'only audience can request link mic' })
          break
        }
        const hostSocket = getLiveHostSocket(roomId)
        if (!hostSocket) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'host offline' })
          break
        }
        send(hostSocket, {
          type: MESSAGE_TYPES.linkMicRequest,
          roomId,
          peerId,
          payload: {
            requesterPeerId: peerId,
            requesterName: payload?.peerName || '观众'
          }
        })
        break
      }
      case MESSAGE_TYPES.respondLinkMic: {
        const { roomId, peerId, payload } = message
        if (!roomId || !peerId || socket.peerId !== peerId) {
          send(socket, { type: MESSAGE_TYPES.error, message: 'invalid respond link mic' })
          break
        }
        const result = updateLiveLinkMic({
          roomId,
          hostPeerId: peerId,
          accept: Boolean(payload?.accept),
          targetPeerId: payload?.targetPeerId || '',
          targetPeerName: payload?.targetPeerName || ''
        })
        if (!result.ok) {
          send(socket, { type: MESSAGE_TYPES.error, message: result.error })
          break
        }
        broadcast(getLiveRoomSockets(roomId), {
          type: MESSAGE_TYPES.linkMicState,
          roomId,
          payload: { linkedMic: result.linkedMic }
        })
        break
      }
      case MESSAGE_TYPES.leaveLiveRoom:
        notifyLiveLeave(message.peerId)
        break
      case MESSAGE_TYPES.offer:
      case MESSAGE_TYPES.answer:
      case MESSAGE_TYPES.iceCandidate:
        relay(message)
        break
      case MESSAGE_TYPES.pong:
        socket.isAlive = true
        break
      default:
        send(socket, { type: MESSAGE_TYPES.error, message: 'unsupported message type' })
    }
  })

  socket.on('close', () => {
    if (!socket.peerId) return
    if (socket.connectionType === 'live') notifyLiveLeave(socket.peerId)
    else notifyLeave(socket.peerId)
  })

  socket.on('error', () => {
    if (!socket.peerId) return
    if (socket.connectionType === 'live') notifyLiveLeave(socket.peerId)
    else notifyLeave(socket.peerId)
  })
})

const interval = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      socket.terminate()
      return
    }

    socket.isAlive = false
    socket.ping()
  })
}, HEARTBEAT_INTERVAL_MS)

wss.on('close', () => clearInterval(interval))

console.log(`Signaling server listening on ws://0.0.0.0:${PORT}`)
