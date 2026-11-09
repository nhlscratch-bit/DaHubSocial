import { useEffect, useState } from 'react'
import { sb, friendly } from './supabase'
import { EVCAT, EVSEL, subUrl, evDate } from './media'
import Avatar from './Avatar'
import ReportSheet from './ReportSheet'
import Verified from './Verified'
const ics = e => { const f = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); const en = e.ends_at || new Date(new Date(e.starts_at).getTime() + 2 * 36e5).toISOString()
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:' + e.id + '@dahub', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(e.starts_at), 'DTEND:' + f(en), 'SUMMARY:' + e.title.replace(/[\n,;]/g, ' '), 'LOCATION:' + (e.venue || '').replace(/[\n,;]/g, ' '), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') }
export default function EventView({ id, me, back, openProfile, deleted }) {
  const [e, setE] = useState(null), [err, setErr] = useState(''), [rep, setRep] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  const load = async () => { const { data, error } = await sb.from('events').select(EVSEL).eq('id', id).maybeSingle(); if (error || !data) return setErr('This event is not available.'); setE(data) }
  useEffect(() => { load() }, [id])
  async function rsvp(st) {
    setBusy(true); setMsg(''); const mine = e.event_rsvps.find(r => r.user_id === me.id); let error
    if (mine && mine.status === st) ({ error } = await sb.from('event_rsvps').delete().eq('event_id', id).eq('user_id', me.id))
    else if (mine) ({ error } = await sb.from('event_rsvps').update({ status: st }).eq('event_id', id).eq('user_id', me.id))
    else ({ error } = await sb.from('event_rsvps').insert({ event_id: id, user_id: me.id, status: st }))
    setBusy(false); error ? setMsg(friendly(error)) : load()
  }
  async function toggleCancel() { if (!confirm(e.cancelled ? 'Reopen this event?' : 'Cancel this event? People who RSVPed will see it as cancelled.')) return; const { error } = await sb.from('events').update({ cancelled: !e.cancelled }).eq('id', id); error ? setMsg(error.message) : load() }
  async function del() { if (!confirm('Delete this event for good?')) return; const { error } = await sb.from('events').delete().eq('id', id); error ? setMsg(error.message) : deleted() }
  const share = async () => { const u = location.origin + '/?event=' + id; try { navigator.share ? await navigator.share({ title: e.title, url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  const cal = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics(e)], { type: 'text/calendar' })); a.download = 'event.ics'; a.click() }
  if (err) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Event</div><div className="sbody"><div className="empty">{err}</div></div></div>
  if (!e) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Event</div><div className="sbody"><div className="skel"><i /><i /></div></div></div>
  const mine = e.event_rsvps.find(r => r.user_id === me.id), going = e.event_rsvps.filter(r => r.status === 'going').length, intr = e.event_rsvps.length - going, own = e.host_id === me.id
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Event</div><div className="sbody" style={{ paddingBottom: 120 }}>
    {e.cover_path && <img className="mimg2" style={{ margin: '8px 14px', width: 'calc(100% - 28px)' }} src={subUrl(e.cover_path)} alt="" />}
    <div className="evh"><span className="gtag">{EVCAT[e.category]}</span> <span className="gtag alt">{e.price_label}</span>{e.cancelled && <span className="gtag red">Cancelled</span>}
      <h2>{e.title}</h2><p>🗓 {evDate(e.starts_at)}{e.ends_at && ` – ${evDate(e.ends_at, { hour: 'numeric', minute: '2-digit' })}`}</p>
      {(e.venue || e.neighborhood) && <p>📍 {[e.venue, e.neighborhood].filter(Boolean).join(' · ')}</p>}
      <p><b>{going}</b> going{intr > 0 && <> · <b>{intr}</b> interested</>}</p>
      {e.description && <p className="evdesc">{e.description}</p>}
      <div className="who" role="button" onClick={() => openProfile(e.host.id)}><Avatar p={e.host} size={34} /><span>Hosted by {e.host.display_name}{e.host.is_verified && <Verified />}</span></div></div>
    {msg && <p className="msg" role="alert">{msg}</p>}
    {!e.cancelled && <div className="evact"><button className={'wb sm' + (mine?.status === 'going' ? ' p' : '')} disabled={busy} onClick={() => rsvp('going')}>{mine?.status === 'going' ? '✓ Going' : 'Going'}</button><button className={'wb sm' + (mine?.status === 'interested' ? ' p' : '')} disabled={busy} onClick={() => rsvp('interested')}>{mine?.status === 'interested' ? '★ Interested' : 'Interested'}</button></div>}
    <div className="evact">{e.link_url && <a className="wb p sm" href={e.link_url} target="_blank" rel="noopener noreferrer">Tickets / info</a>}<button className="wb sm" onClick={cal}>Add to calendar</button><button className="wb sm" onClick={share}>Share</button>
      {own ? <><button className="wb sm" onClick={toggleCancel}>{e.cancelled ? 'Reopen' : 'Cancel event'}</button><button className="wb sm" onClick={del}>Delete</button></> : <button className="wb sm" onClick={() => setRep(true)}>Report</button>}</div>
    {rep && <ReportSheet me={me} type="event" targetId={e.id} reportedUser={e.host.id} close={() => setRep(false)} />}
  </div></div>
}
