import { useCallback, useEffect, useState } from 'react'
import { sb, ago } from './supabase'
import { CAT, SUBSEL, subUrl } from './media'
import { REASONS } from './opp'
import Avatar from './Avatar'
import MediaAdmin from './MediaAdmin'
const TABLE = { post: 'posts', comment: 'comments', opportunity: 'opportunities' }
export default function Admin({ me, back, openPost, openProfile, openOpp }) {
  const [tab, setTab] = useState('subs'), [subs, setSubs] = useState(null), [reps, setReps] = useState(null), [live, setLive] = useState(null), [names, setNames] = useState({}), [note, setNote] = useState({}), [days, setDays] = useState({}), [msg, setMsg] = useState('')
  const load = useCallback(async () => {
    const a = await sb.from('submissions').select(SUBSEL).eq('status', 'pending').order('created_at'); setSubs(a.data || [])
    const { data: r } = await sb.from('reports').select('*').in('status', ['open', 'reviewing']).order('created_at'); setReps(r || [])
    const ids = [...new Set((r || []).flatMap(x => [x.reporter_id, x.reported_user_id]).filter(Boolean))]
    if (ids.length) { const { data: p } = await sb.from('profiles').select('id,username,display_name').in('id', ids); setNames(Object.fromEntries((p || []).map(x => [x.id, x]))) }
    const { data: l } = await sb.from('spotlights').select('id,headline,category,ends_at,profile:profiles!spotlights_profile_id_fkey(display_name,username)').order('created_at', { ascending: false }).limit(30); setLive(l || [])
  }, [])
  useEffect(() => { load() }, [load])
  const audit = (action, type, id, n) => sb.from('audit_log').insert({ admin_id: me.id, action, target_type: type, target_id: id, note: n || null })
  async function review(s, ok) {
    setMsg(''); const { error } = await sb.rpc('review_submission', { p_id: s.id, p_approve: ok, p_note: note[s.id]?.trim() || null, p_days: Number(days[s.id] || 7) })
    if (error) return setMsg(error.message); setMsg(ok ? 'Approved and now featured.' : 'Rejected.'); load()
  }
  async function resolve(r, status, remove) {
    setMsg('')
    if (remove) { const t = TABLE[r.target_type]; if (!t) return setMsg('That type cannot be removed from here.'); const { error } = await sb.from(t).delete().eq('id', r.target_id); if (error) return setMsg('Could not remove: ' + error.message) }
    const { error } = await sb.from('reports').update({ status, reviewed_by: me.id, reviewed_at: new Date().toISOString(), resolution_note: note[r.id]?.trim() || null }).eq('id', r.id)
    if (error) return setMsg(error.message); audit(remove ? 'remove_content' : status === 'dismissed' ? 'dismiss_report' : 'action_report', r.target_type, r.target_id, note[r.id]); load()
  }
  async function endSpot(s) { if (!confirm('Remove this from the Spotlight?')) return; const { error } = await sb.from('spotlights').delete().eq('id', s.id); if (error) return setMsg(error.message); audit('remove_spotlight', 'spotlight', s.id); load() }
  const view = r => r.target_type === 'post' ? openPost(r.target_id) : r.target_type === 'profile' ? openProfile(r.target_id) : r.target_type === 'opportunity' ? openOpp(r.target_id) : null
  const nm = id => names[id] ? `${names[id].display_name} (@${names[id].username})` : 'unknown'
  const noteBox = id => <input className="anote" value={note[id] || ''} onChange={e => setNote(n => ({ ...n, [id]: e.target.value }))} placeholder="Note (shown to the creator on a rejection)" maxLength={200} />
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Admin</div><div className="sbody">
    <div className="chips">{[['subs', `Submissions${subs ? ` (${subs.length})` : ''}`], ['reps', `Reports${reps ? ` (${reps.length})` : ''}`], ['arts', 'Artists'], ['live', 'Live spotlights']].map(([k, l]) => <button key={k} className="chipb" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    {msg && <p className="msg" role="status">{msg}</p>}
    {tab === 'arts' && <MediaAdmin me={me} />}
    {tab === 'subs' && (subs === null ? <div className="skel"><i /></div> : subs.length === 0 ? <div className="empty">No submissions waiting.</div> : subs.map(s => <div key={s.id} className="gl arow">
      {s.cover_path && <img className="mimg2" src={subUrl(s.cover_path)} alt="" />}
      <span className="chip t">{CAT[s.category]}</span><h4>{s.title}</h4>{s.blurb && <p>{s.blurb}</p>}
      <small>{s.author.display_name} (@{s.author.username}) · {ago(s.created_at)}{s.neighborhood && ` · ${s.neighborhood}`}</small>
      {s.link_url && <a href={s.link_url} target="_blank" rel="noopener noreferrer">{s.link_url}</a>}
      {s.media_type === 'audio' && <audio controls src={subUrl(s.media_path)} preload="metadata" />}
      {s.media_type === 'video' && <video controls playsInline src={subUrl(s.media_path)} />}
      {s.media_type === 'image' && <img className="mimg2" src={subUrl(s.media_path)} alt="" />}
      <button className="link" onClick={() => openProfile(s.author.id)}>View profile</button>
      {noteBox(s.id)}
      <div className="aact"><select value={days[s.id] || 7} onChange={e => setDays(d => ({ ...d, [s.id]: e.target.value }))} aria-label="Days featured">{[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}</select>
        <button className="wb p sm" onClick={() => review(s, true)}>Approve</button><button className="wb sm" onClick={() => review(s, false)}>Reject</button></div></div>))}
    {tab === 'reps' && (reps === null ? <div className="skel"><i /></div> : reps.length === 0 ? <div className="empty">No open reports.</div> : reps.map(r => <div key={r.id} className="gl arow">
      <span className="chip t">{r.target_type}</span><h4>{REASONS[r.reason] || r.reason}</h4>{r.details && <p>{r.details}</p>}
      <small>Reported by {nm(r.reporter_id)} · {ago(r.created_at)}{r.reported_user_id && <> · About {nm(r.reported_user_id)}</>}</small>
      {r.target_type === 'artist' && <small>Artist id {r.target_id.slice(0, 8)}. Edit or delete it under the Artists tab.</small>}
      {['post', 'profile', 'opportunity'].includes(r.target_type) && <button className="link" onClick={() => view(r)}>View reported {r.target_type}</button>}
      {noteBox(r.id)}
      <div className="aact"><button className="wb sm" onClick={() => resolve(r, 'dismissed')}>Dismiss</button><button className="wb sm" onClick={() => resolve(r, 'actioned')}>Mark handled</button>
        {TABLE[r.target_type] && <button className="wb p sm" onClick={() => confirm('Delete the reported ' + r.target_type + '?') && resolve(r, 'actioned', true)}>Remove content</button>}</div></div>))}
    {tab === 'live' && (live === null ? <div className="skel"><i /></div> : live.length === 0 ? <div className="empty">Nothing featured.</div> : live.map(s => <div key={s.id} className="gl arow"><span className="chip t">{CAT[s.category]}</span><h4>{s.headline}</h4>
      <small>{s.profile?.display_name} · {s.ends_at ? (new Date(s.ends_at) > new Date() ? 'ends ' + new Date(s.ends_at).toLocaleDateString() : 'ended') : 'no end date'}</small><div className="aact"><button className="wb sm" onClick={() => endSpot(s)}>Remove</button></div></div>))}
  </div></div>
}
