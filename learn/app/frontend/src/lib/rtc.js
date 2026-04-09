export function createPeerConnection({ iceServers, localStream, onTrack, onIceCandidate, onConnectionStateChange }) {
  const peerConnection = new RTCPeerConnection({ iceServers })

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })
  }

  peerConnection.ontrack = (event) => {
    const [remoteStream] = event.streams
    if (remoteStream) onTrack(remoteStream)
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate)
  }

  peerConnection.onconnectionstatechange = () => {
    onConnectionStateChange(peerConnection.connectionState)
  }

  return peerConnection
}
