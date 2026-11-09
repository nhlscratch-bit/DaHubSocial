import { useEffect, useState } from 'react'
import { sb, friendly } from './supabase'
import Avatar from './Avatar'
import { RCAT, joinRoom, useRoom, micSupported } from './roomsEngine'
import Verified from './Verified'
export const meOf = (me, profile) => ({ id: me.id, name: profile?.display_name || profile?.username || 'Member', avatar: profile?.avatar_url || null })
export const roomRow = r => ({ id: r.id, host_id: r.host.id, title: r.title, category: r.category, audience: r.audience, status: r.status, started_at: r.started_at, peak_listeners: 0 })
const MicI = ({ s = 22 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
export { MicI }
const when = iso => new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
function RoomCard({ r, join, remind, goLive, mine }) {
  const live = r.status === 'live'
  return <div className="gl rcard"><button className="rmain" onClick={() => live && join(r)} disabled={!live} aria-label={live ? 'Join ' + r.title : r.title}>
    <Avatar p={r.host} size={58} />
    <span className="evi"><b>{r.title}</b>
      <span className="evt"><i className="gtag alt">#{RCAT[r.category]}</i>{r.audience === 'followers' && <i className="gtag grn">Followers</i>}</span>
      <small>Hosted by {r.host.display_name || r.host.username}{r.host.is_verified && <Verified />}</small>
      {live ? <span className="rspk">{r.speakers.map(s => <Avatar key={s.id} p={s} size={26} />)}<em>🎧 {r.listeners}</em></span> : <small>{when(r.scheduled_for)}</small>}</span>
    {live && <i className="livebadge"><u />LIVE</i>}</button>
    {!live && <div className="ract">{mine ? <button className="wb p sm" onClick={() => goLive(r)}>Go live now</button> : <button className={'wb sm' + (r.reminded ? '' : ' p')} onClick={() => remind(r)}>{r.reminded ? 'Reminder on ✓' : 'Remind me'}</button>}</div>}
  </div>
}
export default function Rooms({ me, profile, back, create, open }) {
  const [tab, setTab] = useState('live'), [d, setD] = useState(null), [err, setErr] = useState(''), cur = useRoom().active
  const load = async () => { const { data, error } = await sb.rpc('list_rooms'); if (error) return setErr(friendly(error)); setErr(''); setD(data) }
  useEffect(() => { load(); const t = setInterval(load, 20000); const ch = sb.channel('rooms-lobby').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load).subscribe(); return () => { clearInterval(t); sb.removeChannel(ch) } }, [])
  const join = async r => { try { await joinRoom(roomRow(r), meOf(me, profile)); open(r.id) } catch (e) { setErr(e.message) } }
  const remind = async r => { const q = r.reminded ? sb.from('room_reminders').delete().eq('room_id', r.id).eq('user_id', me.id) : sb.from('room_reminders').insert({ room_id: r.id, user_id: me.id }); const { error } = await q; if (error) return setErr(friendly(error)); load() }
  const goLive = async r => { try { const m = await navigator.mediaDevices.getUserMedia({ audio: true }); const { error } = await sb.rpc('go_live', { p_room: r.id }); if (error) throw error; await joinRoom(roomRow({ ...r, status: 'live' }), meOf(me, profile), m); open(r.id) } catch (e) { setErr(e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your browser settings.' : friendly(e)) } }
  const list = d ? (tab === 'live' ? d.live : d.scheduled) : null
  return <div className="sheet pulsepg"><div className="bar"><button onClick={back} aria-label="Back">←</button>Live Rooms</div><div className="sbody">
    <div className="rhero"><b>Join the conversation. Be heard.</b>
      <button className="gobtn" onClick={create} disabled={!micSupported()}><span>●</span> Start a room</button></div>
    {!micSupported() && <p className="msg">This browser can’t do live audio. Try Safari or Chrome.</p>}
    {cur && cur.status !== 'ended' && <button className="wb sm" style={{ margin: '0 14px 8px' }} onClick={() => open(cur.id)}>Return to “{cur.room.title}”</button>}
    <div className="chips">{[['live', 'Live Now'], ['sched', 'Scheduled']].map(([k, l]) => <button key={k} className="chipb" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {list === null && !err && <div className="skel"><i /><i /></div>}
    {list && list.length === 0 && <div className="empty"><h3>{tab === 'live' ? 'No rooms live right now' : 'Nothing scheduled'}</h3>{tab === 'live' ? 'Start the first one.' : 'Schedule a room and members can set a reminder.'}<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={create}>Start a room</button></div>}
    {list && list.length > 0 && <div style={{ padding: '0 0 140px' }}>{list.map(r => <RoomCard key={r.id} r={r} join={join} remind={remind} goLive={goLive} mine={r.host.id === me.id} />)}</div>}
    <p className="pnote" style={{ paddingBottom: 120 }}>Listener counts update about every 30 seconds. Live audio is peer to peer, so rooms hold up to {25} people.</p>
  </div></div>
}
export function NewRoom({ me, profile, back, created }) {
  const [f, setF] = useState({ title: '', category: 'community', audience: 'everyone', allow: true, later: false, at: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const up = p => setF(x => ({ ...x, ...p }))
  async function go() {
    const title = f.title.trim(); if (title.length < 3) return setErr('Give your room a title (at least 3 letters).')
    if (f.later && (!f.at || new Date(f.at) < new Date())) return setErr('Pick a future date and time.')
    setBusy(true); setErr('')
    let mic = null
    try {
      if (!f.later) mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      const now = new Date().toISOString(), row = { host_id: me.id, title, category: f.category, audience: f.audience, allow_requests: f.allow, ...(f.later ? { status: 'scheduled', scheduled_for: new Date(f.at).toISOString() } : { status: 'live', started_at: now, last_beat: now }) }
      const { data, error } = await sb.from('rooms').insert(row).select().single(); if (error) throw error
      if (f.later) return created(null)
      await joinRoom(data, meOf(me, profile), mic); created(data.id)
    } catch (e) { mic?.getTracks().forEach(t => t.stop()); setErr(e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your browser settings to host a room.' : friendly(e)); setBusy(false) }
  }
  return <div className="sheet"><div className="bar"><button onClick={back} aria-label="Back">←</button>Start a Room</div><div className="sbody" style={{ padding: '0 14px 140px' }}>
    <div className="gl fcard"><label htmlFor="rt">Room title</label><input id="rt" value={f.title} maxLength={80} onChange={e => up({ title: e.target.value })} placeholder="What do you want to talk about?" /></div>
    <div className="gl fcard"><label>Topic</label><div className="chips" style={{ flexWrap: 'wrap', padding: 0 }}>{Object.entries(RCAT).map(([k, l]) => <button key={k} className="chipb" aria-selected={f.category === k} onClick={() => up({ category: k })}>{l}</button>)}</div></div>
    <div className="gl fcard"><label>Who can join?</label><div className="chips" style={{ padding: 0 }}>{[['everyone', 'Everyone'], ['followers', 'Followers only']].map(([k, l]) => <button key={k} className="chipb" aria-selected={f.audience === k} onClick={() => up({ audience: k })}>{l}</button>)}</div>{f.audience === 'followers' && <small className="pnote" style={{ padding: '6px 0 0' }}>Only people who follow you can see and join this room.</small>}</div>
    <div className="gl fcard row"><span><b>Allow speaker requests</b><small>Let listeners raise their hand to speak</small></span><input type="checkbox" role="switch" className="swt" checked={f.allow} onChange={e => up({ allow: e.target.checked })} aria-label="Allow speaker requests" /></div>
    <div className="gl fcard row"><span><b>Schedule for later</b><small>Members can set a reminder</small></span><input type="checkbox" role="switch" className="swt" checked={f.later} onChange={e => up({ later: e.target.checked })} aria-label="Schedule for later" /></div>
    {f.later && <div className="gl fcard"><label htmlFor="ra">Date and time</label><input id="ra" type="datetime-local" value={f.at} onChange={e => up({ at: e.target.value })} /></div>}
    {err && <p className="msg" role="alert">{err}</p>}
    <button className="gobtn big" disabled={busy} onClick={go}>{busy ? 'Starting…' : f.later ? 'Schedule room' : <><span>●</span> Go Live</>}</button>
    <p className="pnote">Your mic turns on when you go live. You can mute any time. Be respectful. Rooms follow the community guidelines and can be reported.</p>
  </div></div>
}
