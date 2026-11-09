import { useEffect, useState } from 'react'
import { sb, upload, ago } from './supabase'
import { CAT, SUBSEL } from './media'
import I from './Icons'
const ST = { pending: 'Waiting for review', approved: 'Approved', rejected: 'Not approved' }
export default function Submit({ me, back }) {
  const [f, setF] = useState({ category: 'music', title: '', blurb: '', link: '', hood: '' }), [cover, setCover] = useState(null), [media, setMedia] = useState(null)
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false), [mine, setMine] = useState([])
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }))
  const loadMine = async () => { const { data } = await sb.from('submissions').select(SUBSEL).eq('author_id', me.id).order('created_at', { ascending: false }).limit(10); setMine(data || []) }
  useEffect(() => { loadMine() }, [])
  async function send() {
    setErr(''); if (f.title.trim().length < 2) return setErr('Add a title.')
    let link = f.link.trim(); if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link
    if (link && !/^https?:\/\/[^ ]+\.[^ ]+/i.test(link)) return setErr('That link does not look right.')
    for (const x of [cover, media]) if (x && x.size > 100 * 1024 * 1024) return setErr('Files must be under 100 MB.')
    setBusy(true)
    try {
      const cp = cover ? await upload('media-submissions', me.id, cover) : null
      const mp = media ? await upload('media-submissions', me.id, media) : null
      const mt = media ? (media.type.startsWith('video') ? 'video' : media.type.startsWith('audio') ? 'audio' : 'image') : null
      const { error } = await sb.from('submissions').insert({ author_id: me.id, category: f.category, title: f.title.trim(), blurb: f.blurb.trim() || null, link_url: link || null, neighborhood: f.hood.trim() || null, cover_path: cp, media_path: mp, media_type: mt })
      if (error) throw error
      setDone(true); loadMine()
    } catch (e) { setErr(e.message || 'Could not submit.') } finally { setBusy(false) }
  }
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Get featured</div><div className="sbody">
    {done ? <div className="onb"><h3>Submitted</h3><p>Your work is waiting for review. You'll see the result below. Featured spots are free and rotate.</p><button className="wb p" onClick={() => { setDone(false); setF({ category: 'music', title: '', blurb: '', link: '', hood: '' }); setCover(null); setMedia(null) }}>Submit another</button></div>
    : <div className="form">
      <p className="hint">Show Baltimore your music, podcast, business, product or event. A real person reviews every submission. No fake numbers, no paid placement. Up to 3 submissions a week.</p>
      <label>Type<select value={f.category} onChange={set('category')}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Title<input value={f.title} onChange={set('title')} maxLength={80} placeholder="Name of the project, business or drop" /></label>
      <label>Short description<textarea value={f.blurb} onChange={set('blurb')} maxLength={240} rows={3} placeholder="What is it and why should people check it out?" /></label>
      <label>Link (where people go to listen, buy or book)<input value={f.link} onChange={set('link')} inputMode="url" placeholder="https://" /></label>
      <label>Neighborhood (optional)<input value={f.hood} onChange={set('hood')} maxLength={40} placeholder="e.g. Hampden, West Baltimore" /></label>
      <label>Cover image<input type="file" accept="image/*" onChange={e => setCover(e.target.files[0] || null)} /></label>
      <label>Audio, video or photo to play on DAHUB (optional)<input type="file" accept="audio/*,video/*,image/*" onChange={e => setMedia(e.target.files[0] || null)} /></label>
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="wb p" disabled={busy} onClick={send}>{busy ? 'Submitting…' : 'Submit for review'}</button></div>}
    {mine.length > 0 && <><h4 className="sec">Your submissions</h4>{mine.map(s => <div key={s.id} className="gl subrow"><div><b>{s.title}</b><small>{CAT[s.category]} · {ago(s.created_at)}</small>{s.review_note && <small>Note: {s.review_note}</small>}</div><span className={'chip st-' + s.status}>{ST[s.status]}</span></div>)}</>}
  </div></div>
}
