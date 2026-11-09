import { useEffect, useState } from 'react'
import { sb, friendly, upload } from './supabase'
import { CCAT, subUrl } from './media'
export function CCard({ c, open, joined }) {
  return <button className="gl evc" onClick={() => open(c.id)}>
    <span className="cph" style={c.cover_path ? { backgroundImage: `url(${subUrl(c.cover_path)})` } : undefined}>{!c.cover_path && c.name[0].toUpperCase()}</span>
    <span className="evi"><b>{c.name}</b><small>{c.description || CCAT[c.category]}</small><span className="evt"><i className="gtag">{CCAT[c.category]}</i>{joined && <i className="gtag grn">Joined</i>}</span><small>{(c.community_members?.[0]?.count ?? 0)} member{(c.community_members?.[0]?.count ?? 0) !== 1 && 's'}</small></span></button>
}
export default function Communities({ me, back, open, create }) {
  const [tab, setTab] = useState('disc'), [cat, setCat] = useState('all'), [q, setQ] = useState(''), [list, setList] = useState(null), [mine, setMine] = useState(new Set()), [err, setErr] = useState('')
  const load = async () => {
    setErr(''); const [c, m] = await Promise.all([sb.from('communities').select('*,community_members(count)').order('created_at', { ascending: false }).limit(100), sb.from('community_members').select('community_id').eq('user_id', me.id)])
    if (c.error) return setErr(c.error.message); setList(c.data || []); setMine(new Set((m.data || []).map(x => x.community_id)))
  }
  useEffect(() => { load() }, [])
  const ql = q.trim().toLowerCase(), shown = (list || []).filter(c => (tab === 'disc' || mine.has(c.id)) && (cat === 'all' || c.category === cat) && (!ql || c.name.toLowerCase().includes(ql)))
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Communities<button className="wb p sm" style={{ marginLeft: 'auto' }} onClick={create}>+ Create</button></div><div className="sbody">
    <input className="msearch" value={q} onChange={e => setQ(e.target.value)} placeholder="Search communities" aria-label="Search communities" />
    <div className="chips">{[['disc', 'Discover'], ['mine', 'Joined']].map(([k, l]) => <button key={k} className="chipb" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="chips">{['all', ...Object.keys(CCAT)].map(k => <button key={k} className="chipb" aria-selected={cat === k} onClick={() => setCat(k)}>{k === 'all' ? 'All' : CCAT[k]}</button>)}</div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {list === null && !err && <div className="skel"><i /><i /></div>}
    {list && (shown.length ? <div style={{ paddingBottom: 120 }}>{shown.map(c => <CCard key={c.id} c={c} open={open} joined={mine.has(c.id)} />)}</div> : <div className="empty">{tab === 'mine' ? 'You have not joined any communities yet.' : 'Nothing here yet. Start the first one.'}<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={create}>Create a community</button></div>)}
  </div></div>
}
export function NewCommunity({ me, back, created }) {
  const [f, setF] = useState({ name: '', description: '', category: 'neighborhood' }), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function send() {
    if (f.name.trim().length < 3) return setErr('Give it a name (at least 3 letters).'); setBusy(true); setErr('')
    try {
      const cover = file ? await upload('media-submissions', me.id, file) : null
      const { data, error } = await sb.from('communities').insert({ owner_id: me.id, name: f.name.trim(), description: f.description.trim() || null, category: f.category, cover_path: cover }).select('id').single()
      if (error) throw error; created(data.id)
    } catch (e) { setErr(e.code === '23505' ? 'A community with that name already exists.' : friendly(e)) } setBusy(false)
  }
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>New community</div><div className="sbody"><div className="form">
    <p className="hint">Start a group around something real: your neighborhood, your craft, your team. You run it, and you can remove posts and members. Keep it respectful.</p>
    <label>Name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={50} placeholder="Station North Creatives" /></label>
    <label>Category<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{Object.entries(CCAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    <label>What is it about?<textarea rows={3} maxLength={500} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
    <label>Cover photo (optional)<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} /></label>
    {err && <p className="msg" role="alert">{err}</p>}
    <button className="wb p" disabled={busy} onClick={send}>{busy ? 'Creating…' : 'Create community'}</button></div></div></div>
}
