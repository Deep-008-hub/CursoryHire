import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Copy, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'

/*
  VideoRoom — WebRTC 1-on-1 interview room
  ─────────────────────────────────────────
  Signaling: BroadcastChannel API (works same-browser / same-PC for dev)
  For production: swap BroadcastChannel messages with WebSocket events.

  Flow:
    1. First user to open the room becomes "host" (initiator)
    2. Second user joins and receives the offer
    3. They exchange ICE candidates via the channel
    4. Video streams connect peer-to-peer
*/

export default function VideoRoom() {
  const { roomId }  = useParams()
  const navigate    = useNavigate()
  const { user }    = useAuthStore()

  const localRef    = useRef()      // <video> for local stream
  const remoteRef   = useRef()      // <video> for remote stream
  const peerRef     = useRef(null)  // SimplePeer instance
  const channelRef  = useRef(null)  // BroadcastChannel
  const streamRef   = useRef(null)  // local MediaStream

  const [localStream,  setLocalStream]  = useState(null)
  const [connected,    setConnected]    = useState(false)
  const [waiting,      setWaiting]      = useState(true)
  const [micOn,        setMicOn]        = useState(true)
  const [camOn,        setCamOn]        = useState(true)
  const [isInitiator,  setIsInitiator]  = useState(false)
  const [duration,     setDuration]     = useState(0)
  const [loadingMedia, setLoadingMedia] = useState(true)

  const roomKey = `ch_room_${roomId}`

  // ── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!connected) return
    const t = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [connected])

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  // ── Get user media ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        setLocalStream(stream)
        if (localRef.current) localRef.current.srcObject = stream
        setLoadingMedia(false)
        setupSignaling(stream)
      } catch (e) {
        setLoadingMedia(false)
        toast.error('Camera/mic access denied. Please allow permissions and refresh.')
      }
    }
    init()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      channelRef.current?.close()
      peerRef.current?.destroy()
    }
  }, [roomId])

  // ── Signaling via BroadcastChannel ────────────────────────
  const setupSignaling = (stream) => {
    const channel = new BroadcastChannel(roomKey)
    channelRef.current = channel

    // Check if anyone is already in the room
    channel.postMessage({ type: 'join', from: user?.id })

    channel.onmessage = (event) => {
      const msg = event.data
      if (msg.from === user?.id) return  // ignore own messages

      if (msg.type === 'join') {
        // Someone joined after us → we are the initiator
        startPeer(stream, true, channel)
      }

      if (msg.type === 'signal' && peerRef.current) {
        peerRef.current.signal(msg.data)
      }
    }

    // Give 1 second for a "join" response — if none, we wait
    setTimeout(() => {
      if (!peerRef.current) {
        // We are the first in the room — wait for someone to join
        setIsInitiator(false)
      }
    }, 1000)
  }

  const startPeer = (stream, initiator, channel) => {
    if (peerRef.current) return  // already started
    setIsInitiator(initiator)

    import('simple-peer').then(({ default: Peer }) => {
      const peer = new Peer({
        initiator,
        trickle: true,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        },
      })

      peer.on('signal', (data) => {
        channel.postMessage({ type: 'signal', data, from: user?.id })
      })

      peer.on('stream', (remoteStream) => {
        if (remoteRef.current) remoteRef.current.srcObject = remoteStream
        setConnected(true)
        setWaiting(false)
        toast.success('Peer connected!')
      })

      peer.on('connect', () => {
        setConnected(true)
        setWaiting(false)
      })

      peer.on('error', (e) => {
        console.error('Peer error:', e)
        toast.error('Connection error. Try refreshing.')
      })

      peer.on('close', () => {
        setConnected(false)
        setWaiting(true)
        toast.error('Peer disconnected')
      })

      peerRef.current = peer
    })
  }

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
    peerRef.current?.destroy()
    streamRef.current?.getTracks().forEach(t => t.stop())
    channelRef.current?.close()
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
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-semibold text-sm">CursoryHire Interview</span>
          <span className="text-slate-400 text-xs font-mono">{roomId}</span>
        </div>
        <div className="flex items-center gap-4">
          {connected && (
            <span className="text-emerald-400 font-mono text-sm">{formatTime(duration)}</span>
          )}
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
                {waiting ? 'Waiting for the other person…' : 'Connecting…'}
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
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            micOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={micOn ? 'Mute mic' : 'Unmute mic'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            camOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={camOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={copyLink}
          className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all"
          title="Copy invite link"
        >
          <Copy className="w-5 h-5" />
        </button>

        <button
          onClick={hangUp}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg"
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
