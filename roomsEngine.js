import { useSyncExternalStore } from 'react'
import { sb, hiddenIds } from './supabase'
import { iceServers } from './ice'
export { ICE } from './ice'
export const RCAT = { music: 'Music', business: 'Business', community: 'Community', sports: 'Sports', openmic: 'Open Mic' }
export const MAX_ROOM = 25 // audio is peer to peer, so a room is capped
let S = null // active session
let view = { active: null }
const subs = new Set(); const emit = () => { view = { active: S ? snap() : null }; subs.forEach(f => f()) }
export const useRoom = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => view)
export const getRoom = () => S
const snap = () => ({ id: S.id, room: S.room, me: S.me.id, status: S.status, error: S.error, speakers: [...S.speakers], members: S.members, speaking: S.speaking, muted: S.muted, hand: S.hand, canSpeak: S.canSpeak, invited: S.invited, reactions: S.reactions, notice: S.notice, hostGone: S.hostGone, summary: S.summary, profiles: S.profiles, hasMic: !!S.mic, needTap: !!S.needTap, isHost: S.room.host_id === S.me.id })
const note = m => { if (S) { S.notice = m; emit(); setTimeout(() => { if (S && S.notice === m) { S.notice = ''; emit() } }, 3500) } }

function startMeter(uid, stream) {
  try {
    const src = S.ctx.createMediaStreamSource(stream), an = S.ctx.createAnalyser(); an.fftSize = 2048; src.connect(an)
    const buf = new Uint8Array(an.fftSize), ses = S; let hold = 0
    const t = setInterval(() => {
      if (S !== ses) return clearInterval(t)
      an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128))
      if (m > 8) hold = Date.now()
      const on = Date.now() - hold < 450 && !(uid === S.me.id && S.muted); if (on !== S.speaking.has(uid)) { on ? S.speaking.add(uid) : S.speaking.delete(uid); S.speaking = new Set(S.speaking); emit() }
    }, 100)
    S.meters.push({ uid, t, src })
  } catch {}
}
function playRemote(uid, stream) {
  try {
    // Playback goes through a real audio element (most reliable on iPhone); Web Audio is only used to measure who is talking.
    const a = new Audio(); a.autoplay = true; a.playsInline = true; a.srcObject = stream; a.setAttribute('playsinline', ''); document.body.appendChild(a); a.style.display = 'none'
    a.play().catch(() => { S && (S.needTap = true) && emit() })
    S.els.push(a); startMeter(uid, stream)
  } catch {}
}
const send = (to, kind, data) => S?.ch.send({ type: 'broadcast', event: 'sig', payload: { to, from: S.me.id, kind, data } })
const iSpeak = () => S.speakers.has(S.me.id) && !!S.mic
function closePc(peer, tell) { const p = S.pcs.get(peer); if (!p) return; S.pcs.delete(peer); try { p.pc.close() } catch {} if (tell) send(peer, 'bye') }
function mkPc(peer, rel) {
  const pc = new RTCPeerConnection({ iceServers: iceServers() }), e = { pc, rel, queue: [], ready: false }, ses = S
  S.pcs.set(peer, e)
  pc.onicecandidate = ev => { if (ev.candidate && S === ses) send(peer, 'ice', ev.candidate.toJSON()) }
  pc.ontrack = ev => { if (S === ses && ev.streams[0] && !e.played) { e.played = true; playRemote(peer, ev.streams[0]) } }
  pc.onconnectionstatechange = () => { if (S !== ses) return; if (pc.connectionState === 'failed') { closePc(peer, true); setTimeout(reconcile, 1500) } }
  return e
}
async function connect(peer) {
  const speak = iSpeak(), rel = (speak ? 'S' : 'L') + (S.speakers.has(peer) ? 'S' : 'L'), e = mkPc(peer, rel)
  if (speak) S.mic.getTracks().forEach(t => e.pc.addTrack(t, S.mic)); else e.pc.addTransceiver('audio', { direction: 'recvonly' })
  try { await e.pc.setLocalDescription(await e.pc.createOffer()); send(peer, 'offer', e.pc.localDescription.toJSON()) } catch { closePc(peer) }
}
async function onSig({ payload: m }) {
  if (!S || m.to !== S.me.id || S.hidden.has(m.from)) return
  if (m.kind === 'bye') { closePc(m.from); return setTimeout(reconcile, 300) }
  if (m.kind === 'offer') {
    closePc(m.from)
    const speak = iSpeak(), e = mkPc(m.from, (speak ? 'S' : 'L') + (S.speakers.has(m.from) ? 'S' : 'L'))
    try {
      await e.pc.setRemoteDescription(m.data); e.ready = true
      if (speak) S.mic.getTracks().forEach(t => e.pc.addTrack(t, S.mic)) // after the offer so the track rides the offered audio line
      await e.pc.setLocalDescription(await e.pc.createAnswer()); send(m.from, 'answer', e.pc.localDescription.toJSON())
      for (const c of e.queue) await e.pc.addIceCandidate(c).catch(() => {}); e.queue = []
    } catch { closePc(m.from) }
    return
  }
  const e = S.pcs.get(m.from); if (!e) return
  try {
    if (m.kind === 'answer') { await e.pc.setRemoteDescription(m.data); e.ready = true; for (const c of e.queue) await e.pc.addIceCandidate(c).catch(() => {}); e.queue = [] }
    else if (m.kind === 'ice') { e.ready ? await e.pc.addIceCandidate(m.data).catch(() => {}) : e.queue.push(m.data) }
  } catch {}
}
function reconcile() {
  if (!S || S.status !== 'live') return
  const speak = iSpeak(), ids = new Set([...S.members.keys()].filter(k => k !== S.me.id && !S.hidden.has(k)))
  for (const peer of [...S.pcs.keys()]) if (!ids.has(peer)) closePc(peer)
  for (const peer of ids) {
    const ps = S.speakers.has(peer), rel = (speak ? 'S' : 'L') + (ps ? 'S' : 'L'), cur = S.pcs.get(peer)
    if (!speak && !ps) continue
    if (cur && cur.rel !== rel) closePc(peer, true)
    if (S.pcs.has(peer)) continue
    const offerer = speak && ps ? S.me.id < peer : ps
    if (offerer) connect(peer)
  }
}
function track() { S?.ch.track({ uid: S.me.id, name: S.me.name, avatar: S.me.avatar, hand: S.hand, muted: S.muted || !S.mic, t: Date.now() }) }
function rebuild() { for (const p of [...S.pcs.keys()]) closePc(p, true); reconcile() }

async function getMic() {
  const m = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); return m
}
export const micSupported = () => !!(navigator.mediaDevices?.getUserMedia && window.RTCPeerConnection)
// Join (or host) a room. Must be called from a tap so audio can start. `mic` is an already-granted stream for the host.
export async function joinRoom(room, me, mic) {
  if (S && S.id === room.id) return S
  if (S) await leaveRoom()
  if (!micSupported()) throw new Error('This browser does not support live audio.')
  const ctx = new (window.AudioContext || window.webkitAudioContext)(); ctx.resume?.()
  const hid = await hiddenIds()
  S = { id: room.id, room, me, ctx, hidden: hid, status: 'connecting', error: '', speakers: new Set(), members: new Map(), speaking: new Set(), muted: true, hand: false, canSpeak: false, invited: false, mic: null, pcs: new Map(), els: [], meters: [], reactions: [], notice: '', hostGone: false, summary: null, timers: [], profiles: {}, t0: Date.now() }
  const ses = S
  const { data: sp } = await sb.from('room_speakers').select('user_id').eq('room_id', room.id)
  S.speakers = new Set((sp || []).map(x => x.user_id))
  if (room.host_id === me.id) S.speakers.add(me.id)
  if (mic) { S.mic = mic; S.muted = false; S.mic.getAudioTracks().forEach(t => (t.enabled = true)); startMeter(me.id, mic) }
  S.canSpeak = S.speakers.has(me.id)
  loadProfiles([...S.speakers])
  if (S.canSpeak && !S.mic && room.host_id !== me.id) S.invited = true
  const ch = sb.channel('room:' + room.id, { config: { presence: { key: me.id }, broadcast: { self: false } } }); S.ch = ch
  ch.on('presence', { event: 'sync' }, () => {
    if (S !== ses) return
    const st = ch.presenceState(), mm = new Map()
    for (const [k, v] of Object.entries(st)) { const p = v[v.length - 1]; if (p && !S.hidden.has(k)) mm.set(k, p) }
    S.members = mm
    if (S.status === 'connecting' && mm.size > MAX_ROOM && !S.speakers.has(me.id)) { S.error = 'This room is full. Live audio is peer to peer, so rooms are limited to ' + MAX_ROOM + ' people.'; S.status = 'error' }
    S.hostGone = S.status === 'live' && mm.size > 0 && !mm.has(room.host_id) && room.host_id !== me.id
    emit(); reconcile()
  })
  ch.on('broadcast', { event: 'sig' }, onSig)
  ch.on('broadcast', { event: 'react' }, ({ payload }) => addReaction(payload.emoji, payload.name))
  ch.on('broadcast', { event: 'decline' }, ({ payload }) => { if (payload.to === me.id) { S.hand = false; track(); note('The host passed on your request for now.') } })
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'room_speakers' }, async p => {
    if (S !== ses || (p.new?.room_id || p.old?.room_id) !== room.id) return
    const id = (p.new?.user_id) || (p.old?.user_id); if (!id) return
    const was = iSpeak(), hadRole = S.speakers.has(me.id)
    if (p.eventType === 'DELETE') S.speakers.delete(id); else S.speakers.add(id)
    if (id === me.id) {
      if (p.eventType === 'DELETE') { S.canSpeak = false; S.invited = false; if (S.mic) { S.mic.getTracks().forEach(t => t.stop()); S.mic = null } S.muted = true; track(); note('You moved to the audience.') }
      else if (!hadRole) { S.canSpeak = true; S.hand = false; S.invited = !S.mic; track(); note('You were invited to speak.') }
    }
    if (p.eventType !== 'DELETE') loadProfiles([id])
    emit(); if (was !== iSpeak() || id !== me.id) rebuild()
  })
  ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, p => {
    if (S !== ses) return
    S.room = { ...S.room, ...p.new }
    if (p.new.status === 'ended') endLocal(p.new)
    else emit()
  })
  ch.subscribe(async s => {
    if (S !== ses) return
    if (s === 'SUBSCRIBED') { S.status = 'live'; track(); emit(); reconcile() }
    if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { S.error = 'Could not connect to the room. Check your connection.'; S.status = 'error'; emit() }
  })
  S.timers.push(setInterval(() => { if (S === ses) reconcile() }, 6000))
  if (room.host_id === me.id) {
    const beat = () => { if (S !== ses || S.status !== 'live') return; const n = [...S.members.keys()].filter(k => !S.speakers.has(k)).length
      sb.from('rooms').update({ last_beat: new Date().toISOString(), listener_count: n, peak_listeners: Math.max(S.room.peak_listeners || 0, n) }).eq('id', room.id).then(({ error }) => { if (!error) S.room.peak_listeners = Math.max(S.room.peak_listeners || 0, n) }) }
    S.timers.push(setInterval(beat, 25000)); setTimeout(beat, 2500)
  }
  emit(); return S
}
async function loadProfiles(ids) { const ses = S; if (!ids.length) return; const { data } = await sb.from('profiles').select('id,display_name,username,avatar_url,is_verified').in('id', ids); if (S !== ses || !data) return; for (const p of data) S.profiles[p.id] = { name: p.display_name || p.username, avatar: p.avatar_url, verified: !!p.is_verified }; emit() }
function endLocal(row) {
  if (!S) return
  S.status = 'ended'; S.summary = { started: row.started_at || S.room.started_at, ended: row.ended_at || new Date().toISOString(), peak: Math.max(row.peak_listeners || 0, S.room.peak_listeners || 0) }
  teardown(true); emit()
}
function teardown(keepState) {
  if (!S) return
  S.timers.forEach(clearInterval); S.meters.forEach(m => clearInterval(m.t))
  for (const p of [...S.pcs.keys()]) closePc(p, !keepState)
  S.els.forEach(a => { try { a.srcObject = null; a.remove() } catch {} })
  if (S.mic) { S.mic.getTracks().forEach(t => t.stop()); S.mic = null }
  try { sb.removeChannel(S.ch) } catch {}
  try { S.ctx.close() } catch {}
}
export async function leaveRoom() { if (!S) return; teardown(false); S = null; emit() }
export async function endRoom() {
  if (!S || S.room.host_id !== S.me.id) return
  const n = [...S.members.keys()].filter(k => !S.speakers.has(k)).length
  const { data, error } = await sb.from('rooms').update({ status: 'ended', ended_at: new Date().toISOString(), peak_listeners: Math.max(S.room.peak_listeners || 0, n) }).eq('id', S.id).select().single()
  if (error) return note('Could not end the room: ' + error.message)
  endLocal(data)
}
export function dismissSummary() { if (S?.status === 'ended') { S = null; emit() } }
export function toggleMute() { if (!S?.mic) return; S.muted = !S.muted; S.mic.getAudioTracks().forEach(t => (t.enabled = !S.muted)); if (S.muted && S.speaking.has(S.me.id)) { S.speaking.delete(S.me.id); S.speaking = new Set(S.speaking) } track(); emit() }
export function toggleHand() { if (!S || S.canSpeak) return; S.hand = !S.hand; track(); emit() }
export async function takeStage() {
  if (!S || !S.canSpeak || S.mic) return
  try { S.mic = await getMic(); S.muted = false; S.invited = false; startMeter(S.me.id, S.mic); track(); emit(); rebuild() }
  catch { note('Microphone blocked. Allow it in your browser settings, then try again.') }
}
export async function invite(uid) { if (!S) return; const { error } = await sb.from('room_speakers').insert({ room_id: S.id, user_id: uid }); if (error) note(error.message) }
export async function moveToAudience(uid) { if (!S) return; await sb.from('room_speakers').delete().eq('room_id', S.id).eq('user_id', uid) }
export function decline(uid) { S?.ch.send({ type: 'broadcast', event: 'decline', payload: { to: uid } }) }
function addReaction(emoji, name) { if (!S) return; const id = Math.random().toString(36).slice(2), left = 10 + Math.random() * 80; S.reactions = [...S.reactions.slice(-12), { id, emoji, name, left }]; emit(); setTimeout(() => { if (S) { S.reactions = S.reactions.filter(r => r.id !== id); emit() } }, 2600) }
export function react(emoji) { if (!S) return; addReaction(emoji, S.me.name); S.ch.send({ type: 'broadcast', event: 'react', payload: { emoji, name: S.me.name } }) }

export function resumeAudio() { if (!S) return; S.ctx.resume?.(); S.els.forEach(a => a.play().catch(() => {})); S.needTap = false; emit() }
