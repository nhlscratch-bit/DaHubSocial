import { useState } from 'react'
import { sb, upload } from './supabase'
import { TYPES, COMP, CATS, CONTACT, errMsg } from './opp'
import I from './Icons'
export default function NewOpportunity({ me, back, created }) {
  const [f, setF] = useState({ title: '', type: 'gig', compensation: 'paid', compensation_note: '', category: 'Music', description: '', requirements: '', location: 'Baltimore, MD', is_remote: false, deadline: '', contact_method: 'both' })
  const [img, setImg] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  async function submit() {
    const title = f.title.trim(), description = f.description.trim()
    if (title.length < 3) return setErr('Add a title (at least 3 characters).')
    if (description.length < 10) return setErr('Describe the opportunity (at least 10 characters).')
    if (!f.is_remote && !f.location.trim()) return setErr('Add a location, or mark it as remote.')
    setBusy(true); setErr('')
    try {
      const image_path = img ? await upload('opportunity-media', me.id, img) : null
      const { data, error } = await sb.from('opportunities').insert({ poster_id: me.id, title, type: f.type, compensation: f.compensation, compensation_note: f.compensation_note.trim() || null, category: f.category, description, requirements: f.requirements.trim() || null, location: f.location.trim() || null, is_remote: f.is_remote, deadline: f.deadline || null, contact_method: f.contact_method, image_path }).select('id').single()
      if (error) throw error
      created(data.id)
    } catch (e) { setErr(errMsg(e)); setBusy(false) }
  }
  return <div className="sheet solid"><div className="bar"><button onClick={back} aria-label="Close">✕</button><span style={{ flex: 1 }}>Post an opportunity</span><button className="wb p sm" disabled={busy} onClick={submit}>{busy ? 'Posting…' : 'Post'}</button></div>
    <div className="sbody ofm">
      <p className="onote">Be clear about pay and what you need. Listings that misstate pay or details can be reported and removed.</p>
      <label>Title<input value={f.title} onChange={set('title')} maxLength={100} placeholder="e.g. Studio engineer needed this weekend" /></label>
      <label>Type<select value={f.type} onChange={set('type')}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Pay<select value={f.compensation} onChange={set('compensation')}>{Object.entries(COMP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Pay details (optional)<input value={f.compensation_note} onChange={set('compensation_note')} maxLength={40} placeholder="e.g. $200 flat, or $25/hr" /></label>
      <label>Category<select value={f.category} onChange={set('category')}>{CATS.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Description<textarea value={f.description} onChange={set('description')} maxLength={2000} rows={5} placeholder="What is it, who are you, what happens next?" /></label>
      <label>Requirements (optional)<textarea value={f.requirements} onChange={set('requirements')} maxLength={500} rows={3} placeholder="Experience, gear, availability…" /></label>
      <label>Location<input value={f.location} onChange={set('location')} maxLength={60} placeholder="City, State" /></label>
      <label className="chk"><input type="checkbox" checked={f.is_remote} onChange={set('is_remote')} /> This can be done remotely</label>
      <label>Deadline (optional)<input type="date" value={f.deadline} onChange={set('deadline')} /></label>
      <label>How should people respond?<select value={f.contact_method} onChange={set('contact_method')}>{Object.entries(CONTACT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Photo (optional)<input type="file" accept="image/*" onChange={e => setImg(e.target.files[0] || null)} />{img && <small>{img.name}</small>}</label>
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="wb p" disabled={busy} onClick={submit}><I n="send" s={18} fill /> {busy ? 'Posting…' : 'Post opportunity'}</button></div></div>
}
