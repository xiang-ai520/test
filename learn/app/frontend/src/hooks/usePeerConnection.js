import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_ICE_SERVERS, SIGNALING_MESSAGE_TYPES } from '../lib/config.js'
import { createPeerConnection } from '../lib/rtc.js'

export function usePeerConnection({ localStream, sendMessage, roomId, peerId }) {
  const peerConnectionRef = useRef(null)
  const targetPeerIdRef = useRef(null)
  const pendingRemoteCandidatesRef = useRef([])
  const pendingOfferPeerIdRef = useRef(null)
  const sendMessageRef = useRef(sendMessage)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState('new')

  useEffect(() => {
    sendMessageRef.current = sendMessage
  }, [sendMessage])

  const flushPendingCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current
    if (!peerConnection || !pendingRemoteCandidatesRef.current.length) return

    const candidates = [...pendingRemoteCandidatesRef.current]
    pendingRemoteCandidatesRef.current = []
    for (const candidate of candidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }, [])

  const resetConnection = useCallback(() => {
    peerConnectionRef.current?.close()
    peerConnectionRef.current = null
    targetPeerIdRef.current = null
    pendingRemoteCandidatesRef.current = []
    setRemoteStream(null)
    setConnectionState('new')
  }, [])

  const ensurePeerConnection = useCallback((targetPeerId) => {
    if (peerConnectionRef.current) return peerConnectionRef.current

    targetPeerIdRef.current = targetPeerId
    const peerConnection = createPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
      localStream,
      onTrack: (stream) => setRemoteStream(stream),
      onIceCandidate: (candidate) => {
        sendMessageRef.current({
          type: SIGNALING_MESSAGE_TYPES.iceCandidate,
          roomId,
          peerId,
          targetPeerId: targetPeerIdRef.current,
          payload: { candidate }
        })
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state)
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setRemoteStream(null)
        }
      }
    })

    peerConnectionRef.current = peerConnection
    return peerConnection
  }, [localStream, peerId, roomId])

  const createOffer = useCallback(async (targetPeerId) => {
    if (!localStream) {
      pendingOfferPeerIdRef.current = targetPeerId
      return
    }

    const peerConnection = ensurePeerConnection(targetPeerId)
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    sendMessageRef.current({
      type: SIGNALING_MESSAGE_TYPES.offer,
      roomId,
      peerId,
      targetPeerId,
      payload: { sdp: offer }
    })
  }, [ensurePeerConnection, localStream, peerId, roomId])

  const handleSignalMessage = useCallback(async (message) => {
    switch (message.type) {
      case SIGNALING_MESSAGE_TYPES.roomState:
        if (Array.isArray(message.peers) && message.peers.length > 0) {
          await createOffer(message.peers[0])
        }
        break
      case SIGNALING_MESSAGE_TYPES.peerJoined:
      case SIGNALING_MESSAGE_TYPES.peerReady:
        if (message.peerId && message.peerId !== peerId) {
          await createOffer(message.peerId)
        }
        break
      case SIGNALING_MESSAGE_TYPES.offer: {
        if (!message.peerId || message.peerId === peerId) break
        const peerConnection = ensurePeerConnection(message.peerId)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload.sdp))
        await flushPendingCandidates()
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        sendMessageRef.current({
          type: SIGNALING_MESSAGE_TYPES.answer,
          roomId,
          peerId,
          targetPeerId: message.peerId,
          payload: { sdp: answer }
        })
        break
      }
      case SIGNALING_MESSAGE_TYPES.answer: {
        const peerConnection = peerConnectionRef.current
        if (!peerConnection) break
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload.sdp))
        await flushPendingCandidates()
        break
      }
      case SIGNALING_MESSAGE_TYPES.iceCandidate: {
        if (!message.payload?.candidate) break
        const peerConnection = peerConnectionRef.current
        if (!peerConnection || !peerConnection.remoteDescription) {
          pendingRemoteCandidatesRef.current.push(message.payload.candidate)
          break
        }
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.payload.candidate))
        break
      }
      case SIGNALING_MESSAGE_TYPES.peerLeft:
        resetConnection()
        break
      default:
        break
    }
  }, [createOffer, ensurePeerConnection, flushPendingCandidates, peerId, resetConnection, roomId])

  useEffect(() => {
    if (!localStream) return

    const currentConnection = peerConnectionRef.current
    if (currentConnection) {
      localStream.getTracks().forEach((track) => {
        const sender = currentConnection.getSenders().find((item) => item.track?.kind === track.kind)
        if (sender) sender.replaceTrack(track)
        else currentConnection.addTrack(track, localStream)
      })
    }

    if (pendingOfferPeerIdRef.current) {
      const nextPeerId = pendingOfferPeerIdRef.current
      pendingOfferPeerIdRef.current = null
      createOffer(nextPeerId)
    }
  }, [createOffer, localStream])

  useEffect(() => () => resetConnection(), [resetConnection])

  return {
    remoteStream,
    connectionState,
    handleSignalMessage,
    hangUp: resetConnection
  }
}
