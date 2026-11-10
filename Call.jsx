import { useEffect, useRef, useState } from 'react'
import { sb, startDM, friendly } from './supabase'
import Avatar from './Avatar'
import { iceServers } from './ice'
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
let actx
const beep = (f = 440, ms = 400) => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; g.gain.value = 0.06; o.connect(g); g.connect(actx.destination); o.start(); setTimeout(() => o.stop(), ms) } catch {} }

// Voice and video calls. Signaling goes through the call_signals table (private, row-level security); media goes peer to peer.
export default function CallManager({ me }) {
  const [call, setCall] = useState(null), [note, setNote] = useState(''), [muted, setMuted] = useState(false), [camOff, setCamOff] = useState(false), [secs, setSecs] = useState(0)
  const C = useRef(null), pc = useRef(null), local = useRef(null), pend = useRef([]), timers = useRef([]), t0 = useRef(0), lv = useRef(), rv = useRef(), remote = useRef(null), ring = useRef(null)
  C.current = call
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; clearInterval(ring.current) }
  const cleanup = () => {
    clearTimers(); pc.current?.close(); pc.current = null; local.current?.getTracks().forEach(t => t.stop()); local.current = null; remote.current = null; pend.current = []; t0.current = 0; setMuted(false); setCamOff(false); setSecs(0)
  }
  const send = async (kind, to, id, payload) => { const r = await sb.from('call_signals').insert({ call_id: id, to_id: to, kind, payload: payload || null }); if (r.error) console.warn('call signal failed', kind, r.error.message); return r }
  const logMsg = async (peerId, body) => { try { const cid = await startDM(me.id, peerId); await sb.from('messages').insert({ conversation_id: cid, sender_id: me.id, body, kind: 'text' }) } catch {} }
  const finish = (text, ms = 1800) => { setNote(text); setTimeout(() => { setCall(null); setNote('') }, ms) }
  const getMedia = video => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: video ? { facingMode: 'user' } : false })
  function makePC(id, peerId) {
    const p = new RTCPeerConnection({ iceServers: iceServers() }); pc.current = p
    p.onicecandidate = e => e.candidate && send('ice', peerId, id, e.candidate.toJSON())
    p.ontrack = e => { remote.current = e.streams[0]; if (rv.current) rv.current.srcObject = remote.current }
    p.onconnectionstatechange = () => {
      const s = p.connectionState
      if (s === 'connected') { clearTimers(); t0.current = Date.now(); setCall(c => c && { ...c, phase: 'live' }) }
      if (s === 'failed') end('failed')
      if (s === 'disconnected') timers.current.push(setTimeout(() => pc.current?.connectionState !== 'connected' && end('failed'), 8000))
    }
    local.current.getTracks().forEach(t => p.addTrack(t, local.current)); return p
  }
  const flush = async () => { for (const c of pend.current.splice(0)) try { await pc.current.addIceCandidate(c) } catch {} }
  async function start(peer, video) {
    if (C.current) return; if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) return alert('Calls are not supported in this browser.')
    const id = crypto.randomUUID(); setNote(''); setCall({ id, peer, video, dir: 'out', phase: 'ringing' })
    try {
      local.current = await getMedia(video); if (lv.current) lv.current.srcObject = local.current
      const p = makePC(id, peer.id), off = await p.createOffer(); await p.setLocalDescription(off)
      const { error } = await send('offer', peer.id, id, { sdp: off.sdp, video }); if (error) throw error
      ring.current = setInterval(() => beep(440, 700), 2500)
      timers.current.push(setTimeout(() => { send('end', peer.id, id); logMsg(peer.id, `${video ? '🎥' : '📞'} Missed ${video ? 'video' : 'voice'} call`); cleanup(); finish('No answer') }, 45000))
    } catch (e) { cleanup(); const m = friendly(e); finish(/Permission|NotAllowed|denied/i.test(e?.name + e?.message) ? 'Allow microphone' + (video ? ' and camera' : '') + ' access to make calls.' : m, 3500) }
  }
  async function accept() {
    const c = C.current; if (!c) return; clearTimers()
    try {
      local.current = await getMedia(c.video); if (lv.current) lv.current.srcObject = local.current
      const p = makePC(c.id, c.peer.id); await p.setRemoteDescription({ type: 'offer', sdp: c.offer }); await flush()
      const ans = await p.createAnswer(); await p.setLocalDescription(ans); await send('answer', c.peer.id, c.id, { sdp: ans.sdp })
      setCall({ ...c, phase: 'connecting' }); timers.current.push(setTimeout(() => pc.current?.connectionState !== 'connected' && end('failed'), 25000))
    } catch (e) { send('decline', c.peer.id, c.id); cleanup(); finish('Allow microphone' + (c.video ? ' and camera' : '') + ' access to take calls.', 3500) }
  }
  function decline() { const c = C.current; if (!c) return; send('decline', c.peer.id, c.id); cleanup(); setCall(null) }
  function end(why) {
    const c = C.current; if (!c) return; const dur = t0.current ? Math.round((Date.now() - t0.current) / 1000) : 0
    if (why !== 'remote') send('end', c.peer.id, c.id)
    if (c.dir === 'out' && why !== 'remote') logMsg(c.peer.id, dur ? `${c.video ? '🎥' : '📞'} ${c.video ? 'Video' : 'Voice'} call · ${mmss(dur)}` : `${c.video ? '🎥' : '📞'} Missed ${c.video ? 'video' : 'voice'} call`)
    cleanup(); finish(why === 'failed' ? "Couldn't connect. Check your connection and try again." : 'Call ended')
  }
  const onSignal = async s => {
    const c = C.current, p = s.payload || {}
    if (s.kind === 'offer') {
      if (Date.now() - new Date(s.created_at) > 60000) return
      if (c) return send('busy', s.from_id, s.call_id)
      const { data: peer } = await sb.from('profiles').select('id,username,display_name,avatar_url').eq('id', s.from_id).single(); if (!peer) return
      pend.current = []; setNote(''); setCall({ id: s.call_id, peer, video: !!p.video, dir: 'in', phase: 'ringing', offer: p.sdp })
      ring.current = setInterval(() => { beep(520, 350); navigator.vibrate?.(300) }, 1800)
      timers.current.push(setTimeout(() => { cleanup(); setCall(null) }, 45000)); return
    }
    if (!c || c.id !== s.call_id) return
    if (s.kind === 'answer' && pc.current) { clearInterval(ring.current); await pc.current.setRemoteDescription({ type: 'answer', sdp: p.sdp }); await flush(); setCall({ ...c, phase: 'connecting' }); timers.current.push(setTimeout(() => pc.current?.connectionState !== 'connected' && end('failed'), 25000)) }
    else if (s.kind === 'ice') { if (pc.current?.remoteDescription) try { await pc.current.addIceCandidate(p) } catch {} else pend.current.push(p) }
    else if (['end', 'decline', 'busy'].includes(s.kind)) {
      const dur = t0.current ? Math.round((Date.now() - t0.current) / 1000) : 0
      if (c.dir === 'out') logMsg(c.peer.id, dur ? `${c.video ? '🎥' : '📞'} ${c.video ? 'Video' : 'Voice'} call · ${mmss(dur)}` : s.kind === 'busy' ? `${c.video ? '🎥' : '📞'} Missed ${c.video ? 'video' : 'voice'} call (busy)` : `${c.video ? '🎥' : '📞'} Call declined`)
      cleanup(); finish(s.kind === 'decline' ? 'Call declined' : s.kind === 'busy' ? 'They are on another call' : 'Call ended')
    }
  }
  const H = useRef(); H.current = { onSignal, start }
  useEffect(() => {
    const ch = sb.channel('calls-' + me.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `to_id=eq.${me.id}` }, p => H.current.onSignal(p.new)).subscribe()
    const st = e => H.current.start(e.detail.peer, e.detail.video); window.addEventListener('start-call', st)
    return () => { sb.removeChannel(ch); window.removeEventListener('start-call', st); cleanup() }
  }, [me.id])
  useEffect(() => { if (call?.phase !== 'live') return; const t = setInterval(() => setSecs(Math.round((Date.now() - t0.current) / 1000)), 500); return () => clearInterval(t) }, [call?.phase])
  useEffect(() => { if (lv.current && local.current) lv.current.srcObject = local.current; if (rv.current && remote.current) rv.current.srcObject = remote.current })
  const toggleMic = () => { const v = !muted; local.current?.getAudioTracks().forEach(t => t.enabled = !v); setMuted(v) }
  const toggleCam = () => { const v = !camOff; local.current?.getVideoTracks().forEach(t => t.enabled = !v); setCamOff(v) }
  if (!call) return null
  const c = call, live = c.phase === 'live', status = note || (c.phase === 'ringing' ? (c.dir === 'in' ? `Incoming ${c.video ? 'video' : 'voice'} call` : 'Calling…') : c.phase === 'connecting' ? 'Connecting…' : mmss(secs))
  return <div className="call" role="dialog" aria-label="Call">
    <video ref={rv} className={'crv' + (c.video && live ? ' on' : '')} autoPlay playsInline />
    {c.video && !note && <video ref={lv} className={'clv' + (camOff ? ' off' : '')} autoPlay playsInline muted />}
    <div className="cmid"><Avatar p={c.peer} size={c.video && live ? 64 : 140} /><h2>{c.peer.display_name}</h2><p>{status}</p></div>
    {!note && <div className="cbtns">
      {c.dir === 'in' && c.phase === 'ringing' ? <><button className="cb red" onClick={decline} aria-label="Decline">✕<small>Decline</small></button><button className="cb grn" onClick={accept} aria-label="Accept">{c.video ? '🎥' : '📞'}<small>Accept</small></button></>
        : <><button className={'cb' + (muted ? ' on' : '')} onClick={toggleMic} aria-label="Mute">{muted ? '🔇' : '🎤'}<small>{muted ? 'Unmute' : 'Mute'}</small></button>
          {c.video && <button className={'cb' + (camOff ? ' on' : '')} onClick={toggleCam} aria-label="Camera">{camOff ? '🚫' : '📷'}<small>{camOff ? 'Camera on' : 'Camera off'}</small></button>}
          <button className="cb red" onClick={() => end('local')} aria-label="End call">✕<small>End</small></button></>}
    </div>}
  </div>
}
