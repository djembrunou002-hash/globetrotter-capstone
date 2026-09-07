import { useCallback, useEffect, useRef, useState } from 'react'
import { getSocket } from '../services/chatService.js'

export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
]

function rms(buffer) {
  let sum = 0
  for (let index = 0; index < buffer.length; index += 1) {
    const value = (buffer[index] - 128) / 128
    sum += value * value
  }
  return Math.sqrt(sum / buffer.length)
}

export function useCall({ room, kind, currentUser, participants, onError }) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState({})
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(kind === 'video')
  const [mutedPeers, setMutedPeers] = useState([])
  const [ready, setReady] = useState(false)

  const peersRef = useRef(new Map())
  const localStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analysersRef = useRef(new Map())
  const levelTargetsRef = useRef(new Map())
  const rafRef = useRef(null)
  const roomRef = useRef(room)

  useEffect(() => {
    roomRef.current = room
  }, [room])

  const signal = useCallback((to, data) => {
    getSocket()?.emit('call:signal', { room: roomRef.current, to, data })
  }, [])

  const attachAnalyser = useCallback((id, stream) => {
    if (!stream || analysersRef.current.has(id)) return

    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        audioCtxRef.current = new Ctx()
      }

      const context = audioCtxRef.current
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)

      analysersRef.current.set(id, {
        analyser,
        source,
        buffer: new Uint8Array(analyser.frequencyBinCount)
      })
    } catch {
      return
    }
  }, [])

  const attachLevel = useCallback((id, element) => {
    if (element) levelTargetsRef.current.set(id, element)
    else levelTargetsRef.current.delete(id)
  }, [])

  useEffect(() => {
    function tick() {
      analysersRef.current.forEach((entry, id) => {
        const element = levelTargetsRef.current.get(id)
        if (!element) return

        entry.analyser.getByteTimeDomainData(entry.buffer)
        const level = Math.min(1, rms(entry.buffer) * 4)

        element.style.setProperty('--level', level.toFixed(3))
        if (level > 0.12) element.setAttribute('data-speaking', 'true')
        else element.removeAttribute('data-speaking')
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const createPeer = useCallback(
    peerId => {
      const existing = peersRef.current.get(peerId)
      if (existing) return existing

      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const entry = {
        connection,
        polite: String(currentUser.id) < String(peerId),
        makingOffer: false,
        ignoreOffer: false
      }

      peersRef.current.set(peerId, entry)

      const stream = localStreamRef.current
      if (stream) stream.getTracks().forEach(track => connection.addTrack(track, stream))

      connection.onicecandidate = event => {
        if (event.candidate) signal(peerId, { candidate: event.candidate })
      }

      connection.ontrack = event => {
        const [incoming] = event.streams
        if (!incoming) return

        attachAnalyser(peerId, incoming)
        setRemoteStreams(prev => ({ ...prev, [peerId]: incoming }))
      }

      connection.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true
          await connection.setLocalDescription()
          signal(peerId, { description: connection.localDescription })
        } catch {
          return
        } finally {
          entry.makingOffer = false
        }
      }

      connection.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(connection.connectionState)) {
          connection.close()
          peersRef.current.delete(peerId)
          setRemoteStreams(prev => {
            const next = { ...prev }
            delete next[peerId]
            return next
          })
        }
      }

      return entry
    },
    [attachAnalyser, currentUser.id, signal]
  )

  useEffect(() => {
    let cancelled = false

    async function begin() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError('calls are not supported on this device')
        return
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: kind === 'video'
        })
      } catch {
        onError('microphone or camera permission was refused')
        return
      }

      if (cancelled) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      localStreamRef.current = stream
      attachAnalyser(currentUser.id, stream)
      setLocalStream(stream)
      setReady(true)
    }

    begin()

    return () => {
      cancelled = true
    }
  }, [kind, currentUser.id, attachAnalyser, onError])

  useEffect(() => {
    if (!ready) return

    const ids = participants.map(item => item.id).filter(id => id !== currentUser.id)

    ids.forEach(id => createPeer(id))

    peersRef.current.forEach((entry, id) => {
      if (ids.includes(id)) return

      entry.connection.close()
      peersRef.current.delete(id)

      const analyser = analysersRef.current.get(id)
      if (analyser) {
        try {
          analyser.source.disconnect()
        } catch {
          return
        }
        analysersRef.current.delete(id)
      }

      setRemoteStreams(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    })
  }, [participants, ready, createPeer, currentUser.id])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    async function handleSignal(payload) {
      if (payload.room !== roomRef.current) return

      const peerId = payload.from
      const data = payload.data || {}
      const entry = createPeer(peerId)
      const connection = entry.connection

      try {
        if (data.description) {
          const collision =
            data.description.type === 'offer' &&
            (entry.makingOffer || connection.signalingState !== 'stable')

          entry.ignoreOffer = !entry.polite && collision
          if (entry.ignoreOffer) return

          await connection.setRemoteDescription(data.description)

          if (data.description.type === 'offer') {
            await connection.setLocalDescription()
            signal(peerId, { description: connection.localDescription })
          }
        } else if (data.candidate) {
          try {
            await connection.addIceCandidate(data.candidate)
          } catch {
            if (!entry.ignoreOffer) return
          }
        }
      } catch {
        return
      }
    }

    socket.on('call:signal', handleSignal)
    return () => socket.off('call:signal', handleSignal)
  }, [createPeer, signal])

  useEffect(() => {
    return () => {
      peersRef.current.forEach(entry => entry.connection.close())
      peersRef.current.clear()

      analysersRef.current.forEach(entry => {
        try {
          entry.source.disconnect()
        } catch {
          return
        }
      })
      analysersRef.current.clear()
      levelTargetsRef.current.clear()

      const stream = localStreamRef.current
      if (stream) stream.getTracks().forEach(track => track.stop())
      localStreamRef.current = null

      const context = audioCtxRef.current
      if (context && context.state !== 'closed') context.close()
      audioCtxRef.current = null
    }
  }, [])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return

    const next = !muted
    stream.getAudioTracks().forEach(track => {
      track.enabled = !next
    })

    setMuted(next)
    getSocket()?.emit('call:media', { room: roomRef.current, muted: next })
  }, [muted])

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current
    if (!stream) return

    const existing = stream.getVideoTracks()

    if (existing.length > 0) {
      const next = !cameraOn
      existing.forEach(track => {
        track.enabled = next
      })
      setCameraOn(next)
      getSocket()?.emit('call:media', { room: roomRef.current, video: next })
      return
    }

    let extra
    try {
      extra = await navigator.mediaDevices.getUserMedia({ video: true })
    } catch {
      onError('camera permission was refused')
      return
    }

    const [track] = extra.getVideoTracks()
    if (!track) return

    stream.addTrack(track)
    peersRef.current.forEach(entry => entry.connection.addTrack(track, stream))

    setCameraOn(true)
    getSocket()?.emit('call:media', { room: roomRef.current, video: true })
  }, [cameraOn, onError])

  const togglePeerMute = useCallback(peerId => {
    setMutedPeers(prev =>
      prev.includes(peerId) ? prev.filter(id => id !== peerId) : [...prev, peerId]
    )
  }, [])

  const muteEveryone = useCallback(
    peerIds => {
      setMutedPeers(prev => (prev.length > 0 ? [] : peerIds))
    },
    []
  )

  return {
    localStream,
    remoteStreams,
    ready,
    muted,
    cameraOn,
    mutedPeers,
    attachLevel,
    toggleMute,
    toggleCamera,
    togglePeerMute,
    muteEveryone
  }
}