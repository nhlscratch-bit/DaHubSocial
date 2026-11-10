// Live voice for a game table (Spades): up to 4 players, everyone connected to everyone (peer to peer).
// Signaling runs on the private Realtime channel "spv:<table id>"; the database only lets players seated
// at that table join it. Mic starts OFF; you always hear the others. Same audio approach as Live Rooms.
import { useSyncExternalStore } from 'react'
import { sb } from './supabase'
import { iceServers } from './ice'

let V = null
let view = { active: false }
const subs = new Set()
const emit = () => { view = V ? { active: true, status: V.status, micOn: V.micOn, peers: V.peers.size, speaking: [...V.speaking], needTap: V.needTap, error: V.error } : { active: false }; subs.forEach(f => f()); V?.onChange?.(view) }
export const useTableVoice = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => view)

const send = (to, kind, data) => V?.ch?.send({ type: 'broadcast', event: 'sig', payload: { to, from: V.me, kind, data } })

function meter(uid, stream) {
  try {
    if (!V.ctx) V.ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (V.ctx.state === 'suspended') V.ctx.resume().catch(() => {})
    const src = V.ctx.createMediaStreamSource(stream), an = V.ctx.createAnalyser(); an.fftSize = 1024; src.connect(an)
    const buf = new Uint8Array(an.fftSize), ses = V; let hold = 0
    const t = setInterval(() => {
      if (V !== ses) return clearInterval(t)
      an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128))
      if (m > 9) hold = Date.now()
      const on = Date.now() - hold < 450 && !(uid === V.me && !V.micOn)
      if (on !== V.speaking.has(uid)) { on ? V.speaking.add(uid) : V.speaking.delete(uid); emit() }
    }, 100)
    V.meters.push({ uid, t, src })
  } catch {}
}
function stopMeter(uid) { V.meters = V.meters.filter(m => { if (m.uid !== uid) return true; clearInterval(m.t); try { m.src.disconnect() } catch {} return false }); if (V.speaking.delete(uid)) emit() }

function closePeer(uid) {
  const p = V.peers.get(uid); if (!p) return
  V.peers.delete(uid); try { p.pc.close() } catch {} try { p.el?.remove() } catch {} stopMeter(uid); emit()
}
function mkPeer(uid) {
  closePeer(uid)
  const pc = new RTCPeerConnection({ iceServers: iceServers() }), p = { pc, queue: [], el: null }, ses = V
  V.peers.set(uid, p)
  const tr = pc.addTransceiver('audio', { direction: 'sendrecv' })
  p.sender = tr.sender
  if (V.track) tr.sender.replaceTrack(V.track).catch(() => {})
  pc.onicecandidate = e => { if (e.candidate && V === ses) send(uid, 'ice', e.candidate.toJSON()) }
  pc.ontrack = e => {
    if (V !== ses || p.el) return
    const stream = e.streams[0] || new MediaStream([e.track])
    const a = new Audio(); a.autoplay = true; a.playsInline = true; a.setAttribute('playsinline', ''); a.srcObject = stream; a.style.display = 'none'; document.body.appendChild(a); p.el = a
    a.play().catch(() => { if (V) { V.needTap = true; emit() } })
    meter(uid, stream)
  }
  pc.onconnectionstatechange = () => { if (V !== ses) return; if (pc.connectionState === 'failed') { closePeer(uid); setTimeout(reconcile, 1500) } emit() }
  emit(); return p
}
async function call(uid) {
  const p = mkPeer(uid)
  try { await p.pc.setLocalDescription(await p.pc.createOffer()); send(uid, 'offer', p.pc.localDescription.toJSON()) } catch { closePeer(uid) }
}
async function onSig({ payload: m }) {
  if (!V || m.to !== V.me || m.from === V.me) return
  if (m.kind === 'bye') return closePeer(m.from)
  if (m.kind === 'offer') {
    const p = mkPeer(m.from)
    try {
      await p.pc.setRemoteDescription(m.data)
      for (const c of p.queue) await p.pc.addIceCandidate(c).catch(() => {}); p.queue = []
      await p.pc.setLocalDescription(await p.pc.createAnswer()); send(m.from, 'answer', p.pc.localDescription.toJSON())
    } catch { closePeer(m.from) }
    return
  }
  const p = V.peers.get(m.from); if (!p) return
  if (m.kind === 'answer') { try { await p.pc.setRemoteDescription(m.data); for (const c of p.queue) await p.pc.addIceCandidate(c).catch(() => {}); p.queue = [] } catch { closePeer(m.from) } }
  else if (m.kind === 'ice') { if (p.pc.remoteDescription) p.pc.addIceCandidate(m.data).catch(() => {}); else p.queue.push(m.data) }
}
// connect to every player present on the channel; the lower user id makes the call so two phones never both dial
function reconcile() {
  if (!V || !V.ch) return
  const here = new Set(Object.keys(V.ch.presenceState()))
  for (const uid of [...V.peers.keys()]) if (!here.has(uid)) closePeer(uid)
  for (const uid of here) if (uid !== V.me && !V.peers.has(uid) && V.me < uid) call(uid)
}

export function joinTableVoice(tableId, me, onChange) {
  if (V && V.table === tableId) { V.onChange = onChange; emit(); return }
  leaveTableVoice()
  V = { table: tableId, me, onChange, status: 'connecting', micOn: false, track: null, stream: null, peers: new Map(), speaking: new Set(), meters: [], needTap: false, error: '', ctx: null, ch: null }
  const ses = V
  const ch = sb.channel('spv:' + tableId, { config: { private: true, presence: { key: me }, broadcast: { self: false } } })
  V.ch = ch
  ch.on('broadcast', { event: 'sig' }, onSig)
    .on('presence', { event: 'sync' }, () => { if (V === ses) reconcile() })
    .subscribe(async s => {
      if (V !== ses) return
      if (s === 'SUBSCRIBED') { V.status = 'live'; emit(); await ch.track({ at: Date.now() }); reconcile() }
      else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { V.status = 'error'; V.error = 'Voice couldn’t connect. It will retry.'; emit(); setTimeout(() => { if (V === ses) { const t = V.table, m = V.me, f = V.onChange; leaveTableVoice(); joinTableVoice(t, m, f) } }, 4000) }
    })
  emit()
}
export async function setTableMic(on) {
  if (!V) return
  if (on && !V.track) {
    const ses = V
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      if (V !== ses) { stream.getTracks().forEach(t => t.stop()); return }
      V.stream = stream; V.track = stream.getAudioTracks()[0]; meter(V.me, V.stream)
      for (const p of V.peers.values()) p.sender?.replaceTrack(V.track).catch(() => {})
    } catch (e) { V.error = e?.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your phone settings to talk.' : 'Couldn’t turn on your mic.'; emit(); return }
  }
  V.micOn = !!on; V.error = ''
  if (V.track) V.track.enabled = V.micOn
  emit()
}
export function resumeTableAudio() { if (!V) return; for (const p of V.peers.values()) p.el?.play().catch(() => {}); V.ctx?.resume?.().catch(() => {}); V.needTap = false; emit() }
export function leaveTableVoice() {
  if (!V) return
  const s = V; V = null
  for (const uid of s.peers.keys()) { try { s.ch?.send({ type: 'broadcast', event: 'sig', payload: { to: uid, from: s.me, kind: 'bye' } }) } catch {} }
  for (const p of s.peers.values()) { try { p.pc.close() } catch {} try { p.el?.remove() } catch {} }
  s.meters.forEach(m => clearInterval(m.t)); s.stream?.getTracks().forEach(t => t.stop())
  try { s.ctx?.close() } catch {} if (s.ch) sb.removeChannel(s.ch)
  emit()
}
