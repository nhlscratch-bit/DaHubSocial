import { useEffect, useState } from 'react'
import { sb, hiddenIds, friendly, upload } from './supabase'
import { EVCAT, EVSEL, subUrl } from './media'
const mon = t => new Date(t).toLocaleString([], { month: 'short' }).toUpperCase(), day = t => new Date(t).getDate()
const time = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export function EventCard({ e, me, open }) {
  const going = e.event_rsvps.filter(r => r.status === 'going').length, mine = e.event_rsvps.find(r => r.user_id === me.id)
  return <button className="gl evc" onClick={() => open(e.id)}>
    <span className="evd"><b>{day(e.starts_at)}</b><small>{mon(e.starts_at)}</small></span>
    <span className="evi"><b>{e.title}</b><small>{time(e.starts_at)}{e.venue && ` · ${e.venue}`}</small>
      <span className="evt"><i className="gtag">{EVCAT[e.category]}</i><i className="gtag alt">{e.price_label}</i>{e.cancelled && <i className="gtag red">Cancelled</i>}{mine && <i className="gtag grn">{mine.status === 'going' ? 'You are going' : 'Interested'}</i>}</span>
      {going > 0 && <small>{going} going</small>}</span>
    {e.cover_path && <span className="evp" style={{ backgroundImage: `url(${subUrl(e.cover_path)})` }} />}</button>
}
export default function Events({ me, back, open, create }) {
  const [tab, setTab] = useState('up'), [cat, setCat] = useState('all'), [items, setItems] = useState(null), [err, setErr] = useState('')
  const load = async () => {
    setErr(''); setItems(null)
    let q = sb.from('events').select(EVSEL).limit(80)
    if (tab === 'mine') q = q.eq('host_id', me.id).order('starts_at', { ascending: false })
    else q = q.gte('starts_at', new Date(Date.now() - 3 * 36e5).toISOString()).eq('cancelled', false).order('starts_at')
    const { data, error } = await q; if (error) return setErr(error.message)
    const hid = await hiddenIds(); let l = (data || []).filter(e => !hid.has(e.host.id))
    if (tab === 'going') l = l.filter(e => e.event_rsvps.some(r => r.user_id === me.id))
    setItems(l)
  }
  useEffect(() => { load() }, [tab])
  const list = (items || []).filter(e => cat === 'all' || e.category === cat)
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Events<button className="wb p sm" style={{ marginLeft: 'auto' }} onClick={create}>+ Create</button></div><div className="sbody">
    <div className="chips">{[['up', 'Upcoming'], ['going', 'My RSVPs'], ['mine', 'Hosting']].map(([k, l]) => <button key={k} className="chipb" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="chips">{['all', ...Object.keys(EVCAT)].map(k => <button key={k} className="chipb" aria-selected={cat === k} onClick={() => setCat(k)}>{k === 'all' ? 'All' : EVCAT[k]}</button>)}</div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {items === null && !err && <div className="skel"><i /><i /></div>}
    {items && (list.length ? <div style={{ paddingBottom: 120 }}>{list.map(e => <EventCard key={e.id} e={e} me={me} open={open} />)}</div> :
      <div className="empty">{tab === 'up' ? 'No upcoming events yet. Host the first one.' : tab === 'going' ? 'You have not RSVPed to anything yet.' : 'You are not hosting anything yet.'}<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={create}>Create an event</button></div>)}
  </div></div>
}
export function NewEvent({ me, back, created }) {
  const [f, setF] = useState({ title: '', description: '', start: '', end: '', venue: '', neighborhood: '', category: 'music', price: 'Free', link: '' }), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const s = k => e => setF({ ...f, [k]: e.target.value })
  async function send() {
    if (f.title.trim().length < 3) return setErr('Give the event a title.'); if (!f.start) return setErr('Choose a start date and time.')
    const st = new Date(f.start), en = f.end ? new Date(f.end) : null; if (en && en <= st) return setErr('The end must be after the start.')
    if (f.link && !/^https?:\/\//.test(f.link.trim())) return setErr('The link must start with https://')
    setBusy(true); setErr('')
    try {
      const cover = file ? await upload('media-submissions', me.id, file) : null
      const { data, error } = await sb.from('events').insert({ host_id: me.id, title: f.title.trim(), description: f.description.trim() || null, starts_at: st.toISOString(), ends_at: en ? en.toISOString() : null, venue: f.venue.trim() || null, neighborhood: f.neighborhood.trim() || null, category: f.category, price_label: f.price.trim() || 'Free', link_url: f.link.trim() || null, cover_path: cover }).select('id').single()
      if (error) throw error; created(data.id)
    } catch (e) { setErr(friendly(e)) } setBusy(false)
  }
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>New event</div><div className="sbody"><div className="form">
    <p className="hint">Only post real events. Show the price honestly. Events that mislead people can be removed.</p>
    <label>Title<input value={f.title} onChange={s('title')} maxLength={90} placeholder="Open mic night" /></label>
    <label>Starts<input type="datetime-local" value={f.start} onChange={s('start')} /></label>
    <label>Ends (optional)<input type="datetime-local" value={f.end} onChange={s('end')} /></label>
    <label>Category<select value={f.category} onChange={s('category')}>{Object.entries(EVCAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <label>Venue<input value={f.venue} onChange={s('venue')} maxLength={100} placeholder="Name of the place" /></label>
    <label>Neighborhood<input value={f.neighborhood} onChange={s('neighborhood')} maxLength={60} placeholder="Station North" /></label>
    <label>Price<input value={f.price} onChange={s('price')} maxLength={30} placeholder="Free, $10, $20 at the door" /></label>
    <label>Details<textarea rows={4} value={f.description} onChange={s('description')} maxLength={1000} placeholder="What should people know?" /></label>
    <label>Tickets or info link (optional)<input value={f.link} onChange={s('link')} placeholder="https://" inputMode="url" /></label>
    <label>Cover photo (optional)<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} /></label>
    {err && <p className="msg" role="alert">{err}</p>}
    <button className="wb p" disabled={busy} onClick={send}>{busy ? 'Posting…' : 'Post event'}</button></div></div></div>
}
