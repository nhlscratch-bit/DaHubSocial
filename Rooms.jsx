import { useEffect, useState } from 'react'
import { sb, friendly } from './supabase'
import Avatar from './Avatar'
import I from './Icons'
import wm from './wordmark.png'
import { RCAT, joinRoom, useRoom, micSupported } from './roomsEngine'
import Verified from './Verified'
export const meOf = (me, profile) => ({ id: me.id, name: profile?.display_name || profile?.username || 'Member', avatar: profile?.avatar_url || null })
export const roomRow = r => ({ id: r.id, host_id: r.host.id, title: r.title, category: r.category, audience: r.audience, status: r.status, started_at: r.started_at, after_dark: !!r.after_dark, peak_listeners: 0 })
const MicI = ({ s = 22 }) => <I n="mic" s={s} />
export { MicI }
export const CAT_ICON = { music: 'music', business: 'briefcase', community: 'people', sports: 'trophy', openmic: 'mic' }
const when = iso => { const d = new Date(iso), t = new Date(), tm = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); return d.toDateString() === t.toDateString() ? 'Today · ' + tm : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + tm }

// Shared page chrome for the Live Rooms screens: icy wallpaper, chrome back button, DAHUB wordmark, optional right action.
export function LrTop({ back, backLabel = 'Back', right }) {
  return <div className="lrtop"><button className="lrcirc" onClick={back} aria-label={backLabel}><I n="back" s={26} /></button><img className="lrwm" src={wm} alt="DAHUB" />{right || <span className="lrsp" />}</div>
}

function LiveCard({ r, join }) {
  return <button className="lrcard lrroom" onClick={() => join(r)} aria-label={'Join ' + r.title}>
    <span className="lrhost"><Avatar p={r.host} size={78} /></span>
    <span className="lrinfo"><b>{r.title}</b>
      <span className="lrtags"><i className="lrchip">#{RCAT[r.category]}</i>{r.audience === 'followers' && <i className="lrchip alt">Followers</i>}</span>
      <small>Hosted by {r.host.display_name || r.host.username}{r.host.is_verified && <Verified />}</small>
      <span className="lrstack">{r.speakers.map(s => <Avatar key={s.id} p={s} size={30} />)}<em><I n="user" s={15} />{r.listeners}</em></span></span>
    <i className="lrlive"><u />LIVE</i></button>
}
function SchedRow({ r, remind, goLive, mine }) {
  return <div className="lrcard lrsched"><Avatar p={r.host} size={52} /><span className="lrinfo"><b>{r.title}</b><small>{when(r.scheduled_for)} · {r.host.display_name || r.host.username}</small></span>
    {mine ? <button className="lrpill on" onClick={() => goLive(r)}>Go live</button> : <button className={'lrpill' + (r.reminded ? '' : ' on')} onClick={() => remind(r)}>{r.reminded ? 'Reminder on ✓' : 'Remind me'}</button>}</div>
}

export default function Rooms({ me, profile, back, create, open }) {
  const [tab, setTab] = useState('live'), [d, setD] = useState(null), [err, setErr] = useState(''), cur = useRoom().active
  const load = async () => { const { data, error } = await sb.rpc('list_rooms'); if (error) return setErr(friendly(error)); setErr(''); setD(data) }
  useEffect(() => { load(); const t = setInterval(load, 20000); const ch = sb.channel('rooms-lobby').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load).subscribe(); return () => { clearInterval(t); sb.removeChannel(ch) } }, [])
  const join = async r => { if (cur?.id === r.id) return open(r.id); try { await joinRoom(roomRow(r), meOf(me, profile)); open(r.id) } catch (e) { setErr(e.message) } }
  const remind = async r => { const q = r.reminded ? sb.from('room_reminders').delete().eq('room_id', r.id).eq('user_id', me.id) : sb.from('room_reminders').insert({ room_id: r.id, user_id: me.id }); const { error } = await q; if (error) return setErr(friendly(error)); load() }
  const goLive = async r => { try { const m = await navigator.mediaDevices.getUserMedia({ audio: true }); const { error } = await sb.rpc('go_live', { p_room: r.id }); if (error) throw error; await joinRoom(roomRow({ ...r, status: 'live' }), meOf(me, profile), m); open(r.id) } catch (e) { setErr(e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your browser settings.' : friendly(e)) } }
  const live = d?.live || [], sched = d?.scheduled || []
  return <div className="sheet lrpage"><div className="sbody lrbody">
    <LrTop back={back} />
    <div className="lrhead"><I n="wave" s={44} /><span><h1>Live Rooms</h1><p>Join the conversation. Be heard.</p></span></div>
    <button className="lrgo" onClick={create} disabled={!micSupported()}><I n="live" s={30} />Start a room</button>
    {!micSupported() && <p className="msg">This browser can’t do live audio. Try Safari or Chrome.</p>}
    <div className="lrseg">{[['live', 'Live Now'], ['sched', 'Scheduled']].map(([k, l]) => <button key={k} aria-selected={tab === k} onClick={() => setTab(k)}>{l}{k === 'sched' && sched.length > 0 && ` (${sched.length})`}</button>)}</div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {!d && !err && <div className="skel"><i /><i /></div>}
    {d && tab === 'live' && <>
      {live.length === 0 ? <div className="lrcard lrempty"><b>No rooms live right now</b><small>Start the first one and members will see it here.</small></div> : live.map(r => <LiveCard key={r.id} r={r} join={join} />)}
      {sched.length > 0 && <><div className="lrsec"><I n="cal2" s={30} /><b>Scheduled</b>{sched.length > 2 && <button className="link" onClick={() => setTab('sched')}>See all ›</button>}</div>
        {sched.slice(0, 2).map(r => <SchedRow key={r.id} r={r} remind={remind} goLive={goLive} mine={r.host.id === me.id} />)}</>}
    </>}
    {d && tab === 'sched' && (sched.length === 0 ? <div className="lrcard lrempty"><b>Nothing scheduled</b><small>Schedule a room and members can set a reminder.</small><button className="lrpill on" onClick={create}>Schedule a room</button></div>
      : sched.map(r => <SchedRow key={r.id} r={r} remind={remind} goLive={goLive} mine={r.host.id === me.id} />))}
    <p className="lrnote">Listener counts update about every 30 seconds. Live audio is peer to peer, so rooms hold up to 25 people.</p>
  </div></div>
}

export function NewRoom({ me, profile, back, created, afterDark }) {
  const [f, setF] = useState({ title: '', category: 'music', audience: 'everyone', allow: true, later: false, at: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const up = p => setF(x => ({ ...x, ...p }))
  async function go() {
    const title = f.title.trim(); if (title.length < 3) return setErr('Give your room a title (at least 3 letters).')
    if (f.later && (!f.at || new Date(f.at) < new Date())) return setErr('Pick a future date and time.')
    setBusy(true); setErr('')
    let mic = null
    try {
      if (!f.later) mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      const now = new Date().toISOString(), row = { host_id: me.id, title, category: f.category, audience: f.audience, allow_requests: f.allow, after_dark: !!afterDark, ...(f.later ? { status: 'scheduled', scheduled_for: new Date(f.at).toISOString() } : { status: 'live', started_at: now, last_beat: now }) }
      const { data, error } = await sb.from('rooms').insert(row).select().single(); if (error) throw error
      if (f.later) return created(null)
      await joinRoom(data, meOf(me, profile), mic); created(data.id)
    } catch (e) { mic?.getTracks().forEach(t => t.stop()); setErr(e.name === 'NotAllowedError' ? 'Microphone blocked. Allow it in your browser settings to host a room.' : friendly(e)); setBusy(false) }
  }
  return <div className={'sheet lrpage' + (afterDark ? ' lrad' : '')}><div className="sbody lrbody">
    <LrTop back={back} />
    <div className="lrcard lrstart"><span className="lrmicbig"><I n="mic" s={40} /></span><span><h1>{afterDark ? 'After Dark Room' : 'Start a Room'}</h1><p>{afterDark ? '18+ only. Only After Dark members can find and join it.' : 'Go live and talk with the DAHUB community'}</p></span></div>
    <div className="lrcard lrf"><label htmlFor="rt"><I n="edit" s={26} />Room Title</label><input id="rt" value={f.title} maxLength={80} onChange={e => up({ title: e.target.value })} placeholder="What do you want to talk about?" /></div>
    <div className="lrcard lrf"><label><I n="tag" s={26} />Topic Category</label><div className="lropts">{Object.entries(RCAT).map(([k, l]) => <button key={k} aria-pressed={f.category === k} onClick={() => up({ category: k })}><I n={CAT_ICON[k]} s={20} />{l}</button>)}</div></div>
    <div className="lrcard lrf"><label><I n="shield" s={26} />Who Can Join?</label><div className="lropts two">{[['everyone', 'Everyone', 'globe'], ['followers', 'Followers Only', 'people']].map(([k, l, ic]) => <button key={k} aria-pressed={f.audience === k} onClick={() => up({ audience: k })}><I n={ic} s={20} />{l}</button>)}</div>{f.audience === 'followers' && <small>Only people who follow you can see and join this room.</small>}</div>
    <div className="lrcard lrf row"><I n="userplus" s={26} /><span><b>Allow Speaker Requests</b><small>Let listeners raise their hand to speak</small></span><input type="checkbox" role="switch" className="swt" checked={f.allow} onChange={e => up({ allow: e.target.checked })} aria-label="Allow speaker requests" /></div>
    <div className="lrcard lrf row"><I n="cal" s={26} /><span><b>Schedule for Later</b><small>Members can set a reminder</small></span><input type="checkbox" role="switch" className="swt" checked={f.later} onChange={e => up({ later: e.target.checked })} aria-label="Schedule for later" /></div>
    {f.later && <div className="lrcard lrf"><label htmlFor="ra"><I n="cal" s={26} />Date and Time</label><input id="ra" type="datetime-local" value={f.at} onChange={e => up({ at: e.target.value })} /></div>}
    {err && <p className="msg" role="alert">{err}</p>}
    <button className="lrgo big" disabled={busy} onClick={go}>{busy ? 'Starting…' : f.later ? <><I n="cal" s={30} />Schedule Room</> : <><I n="live" s={36} />Go Live</>}</button>
    <p className="lrnote">Your mic turns on when you go live. You can mute any time. Rooms follow the community guidelines and can be reported.</p>
  </div></div>
}
