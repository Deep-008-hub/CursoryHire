import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Users, Loader2, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

/*
  VideoRoom — WebRTC 1-on-1 interview room
  ─────────────────────────────────────────
  Signaling: WebSocket server (FastAPI /ws/room/{room_id})
  Works between different devices and browsers over the internet.

  Flow:
  1. Both users open the room URL
  2. They connect to the WebSocket signaling server
  3. First user sends offer → second user sends answer
  4. ICE candidates exchanged via WebSocket
  5. Direct peer-to-peer video connection established
*/

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ]
}

// Get WebSocket URL from API URL
const getWsUrl = (roomId) => {
  const isLocalhost = window.location.hostname === 'localhost'
  if (isLocalhost) {
    return `ws://localhost:8000/ws/room/${roomId}`
  }
  // Production — use Railway WebSocket URL
  const apiUrl = import.meta.env.VITE_API_URL || 'https://cursoryhire-production.up.railway.app'
  const wsUrl  = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')
  return `${wsUrl}/ws/room/${roomId}`
}

export default function VideoRoom() {
  const { roomId }  = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuthStore()

  // Refs
  const localRef  = useRef()
  const remoteRef = useRef()
  const pcRef     = useRef(null)   // RTCPeerConnection
  const wsRef     = useRef(null)   // WebSocket
  const streamRef = useRef(null)   // local MediaStream
  const isInitiatorRef = useRef(false)

  // State
  const [connected,    setConnected]    = useState(false)
  const [waiting,      setWaiting]      = useState(true)
  const [micOn,        setMicOn]        = useState(true)
  const [camOn,        setCamOn]        = useState(true)
  const [duration,     setDuration]     = useState(0)
  const [loadingMedia, setLoadingMedia] = useState(true)
  const [wsStatus,     setWsStatus]     = useState('connecting') // connecting | connected | disconnected
  const [peerCount,    setPeerCount]    = useState(0)

  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!connected) return
    const t = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [connected])

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // ── Send via WebSocket ─────────────────────────────────────
  const sendSignal = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  // ── Create RTCPeerConnection ───────────────────────────────
  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pcRef.current = pc

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    // ICE candidates → send via WebSocket
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: 'ice-candidate', candidate: e.candidate })
      }
    }

    // Remote stream
    pc.ontrack = (e) => {
      if (remoteRef.current && e.streams[0]) {
        remoteRef.current.srcObject = e.streams[0]
        setConnected(true)
        setWaiting(false)
        toast.success('Connected! Video call started.')
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnected(false)
        setWaiting(true)
        toast.error('Peer disconnected')
      }
    }

    return pc
  }, [sendSignal])

  // ── Main setup ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // 1. Get camera + mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        if (localRef.current) localRef.current.srcObject = stream
        setLoadingMedia(false)

        // 2. Connect WebSocket
        const wsUrl = getWsUrl(roomId)
        console.log('Connecting to WebSocket:', wsUrl)
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('WebSocket connected')
          setWsStatus('connected')
          toast.success('Connected to room!')
        }

        ws.onclose = () => {
          console.log('WebSocket disconnected')
          setWsStatus('disconnected')
        }

        ws.onerror = (e) => {
          console.error('WebSocket error:', e)
          setWsStatus('disconnected')
          toast.error('Connection error. Please refresh.')
        }

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data)
          console.log('Signal received:', msg.type)

          if (msg.type === 'peer-joined') {
            // Someone joined after us → we are the initiator → send offer
            setPeerCount(msg.count)
            if (!pcRef.current) {
              isInitiatorRef.current = true
              const pc = createPeerConnection(stream)
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              sendSignal({ type: 'offer', sdp: pc.localDescription })
              toast('Peer joined! Connecting...', { icon: '🔗' })
            }
          }

          if (msg.type === 'offer') {
            // We received an offer → create answer
            if (!pcRef.current) {
              isInitiatorRef.current = false
              const pc = createPeerConnection(stream)
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              sendSignal({ type: 'answer', sdp: pc.localDescription })
            }
          }

          if (msg.type === 'answer' && pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          }

          if (msg.type === 'ice-candidate' && pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate))
            } catch (e) {
              console.error('ICE candidate error:', e)
            }
          }

          if (msg.type === 'peer-left') {
            setConnected(false)
            setWaiting(true)
            setPeerCount(0)
            toast.error('The other person left the call')
            // Clean up peer connection so we can reconnect
            if (pcRef.current) {
              pcRef.current.close()
              pcRef.current = null
            }
            if (remoteRef.current) remoteRef.current.srcObject = null
          }
        }

      } catch (e) {
        console.error('Media error:', e)
        setLoadingMedia(false)
        toast.error('Camera/mic access denied. Please allow permissions and refresh.')
      }
    }

    init()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      wsRef.current?.close()
      pcRef.current?.close()
    }
  }, [roomId, createPeerConnection, sendSignal])

  // ── Controls ───────────────────────────────────────────────
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled) }
  }

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled) }
  }

  const hangUp = () => {
    pcRef.current?.close()
    wsRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    navigate(-1)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Room link copied!')
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">

      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-white font-semibold text-sm">CursoryHire Interview</span>
          <span className="text-slate-400 text-xs font-mono">{roomId}</span>
        </div>
        <div className="flex items-center gap-4">
          {connected && (
            <span className="text-emerald-400 font-mono text-sm">{formatTime(duration)}</span>
          )}
          {/* WebSocket status */}
          <span className="flex items-center gap-1.5 text-xs">
            {wsStatus === 'connected'
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Signaling connected</span></>
              : <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">Disconnected</span></>
            }
          </span>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            connected ? 'bg-emerald-500/20 text-emerald-400' :
            waiting   ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-700 text-slate-400'
          }`}>
            {connected ? '● Connected' : waiting ? '◌ Waiting for peer…' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">

        {/* Remote (large) */}
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          {loadingMedia ? (
            <div className="text-center text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
              <p>Requesting camera access…</p>
            </div>
          ) : !connected ? (
            <div className="text-center max-w-sm px-6">
              <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-5">
                <Users className="w-10 h-10 text-slate-500" />
              </div>
              <h2 className="text-white font-display font-bold text-xl mb-2">
                {wsStatus === 'connecting' ? 'Connecting to room…' :
                 wsStatus === 'disconnected' ? 'Connection lost' :
                 waiting ? 'Waiting for the other person…' : 'Connecting…'}
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Share this link with the other interview participant
              </p>
              <div className="bg-slate-700 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <span className="text-slate-300 text-xs truncate flex-1">{window.location.href}</span>
                <button onClick={copyLink} className="text-blue-400 hover:text-blue-300 flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-4">
                Both participants must open this URL in their browser
              </p>
              {wsStatus === 'disconnected' && (
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
          ) : null}
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover ${connected ? 'block' : 'hidden'}`}
          />
        </div>

        {/* Local (picture-in-picture) */}
        <div className="absolute bottom-24 right-4 w-44 h-32 bg-slate-700 rounded-2xl overflow-hidden border-2 border-slate-600 shadow-2xl">
          {loadingMedia ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : !camOn ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
              <VideoOff className="w-6 h-6 text-slate-500" />
            </div>
          ) : null}
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${camOn ? 'block' : 'hidden'}`}
          />
          <div className="absolute bottom-1.5 left-2 text-white text-xs font-medium bg-black/40 rounded px-1.5 py-0.5">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-20 flex items-center justify-center gap-4 bg-slate-900 border-t border-slate-700 flex-shrink-0">
        <button onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            micOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`} title={micOn ? 'Mute mic' : 'Unmute mic'}>
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            camOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button onClick={copyLink}
          className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all"
          title="Copy invite link">
          <Copy className="w-5 h-5" />
        </button>

        <button onClick={hangUp}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg"
          title="End call">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
