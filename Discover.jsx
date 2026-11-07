import { useEffect, useState } from 'react'
import { sb } from './supabase'
import Avatar from './Avatar'
// People search only. DAHUB never lists everyone: you find people by searching a name or @handle.
export default function Discover({ me, openProfile }) {
  const [q, setQ] = useState(''), [list, setList] = useState([]), [rel, setRel] = useState({}), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const s = q.replace(/[^\w ]/g, '').trim()
  const loadRel = async () => { const { data } = await sb.from('follows').select('followee_id,status').eq('follower_id', me.id); setRel(Object.fromEntries((data || []).map(x => [x.followee_id, x.status]))) }
  useEffect(() => { loadRel() }, [])
  useEffect(() => {
    if (s.length < 2) { setList([]); setErr(''); setBusy(false); return }
    setBusy(true)
    const t = setTimeout(async () => {
      const { data, error } = await sb.from('profiles').select('id,username,display_name,avatar_url,is_verified').neq('id', me.id)
        .or(`username.ilike.${s.replace(/ /g, '_')}%,display_name.ilike.${s}%`).limit(15)
      setErr(error ? error.message : ''); setList(data || []); setBusy(false)
    }, 300)
    return () => clearTimeout(t)
  }, [s])
  async function toggle(id) { rel[id] ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); loadRel() }
  return <div className="disc"><h1 className="dmt">Discover</h1>
    <div className="isr"><input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Search by name or @handle" aria-label="Search people" autoCapitalize="none" autoCorrect="off" /></div>
    {s.length < 2 && <div className="onb"><h3>Find your people</h3><p>Search a name or @handle to find someone. Your timeline starts when you follow people.</p></div>}
    {err && <p className="msg">{err}</p>}{busy && <div className="skel"><i /></div>}
    {s.length >= 2 && !busy && list.map(p => <div key={p.id} className="drow"><Avatar p={p} size={56} onClick={() => openProfile(p.id)} />
      <div className="itx" onClick={() => openProfile(p.id)}><b>{p.display_name}{p.is_verified && <span className="ver">✔</span>}</b><span>@{p.username}</span></div>
      <button className={'wb sm' + (rel[p.id] ? '' : ' p')} onClick={() => toggle(p.id)}>{rel[p.id] === 'accepted' ? 'Following' : rel[p.id] === 'pending' ? 'Requested' : 'Follow'}</button></div>)}
    {s.length >= 2 && !busy && !err && !list.length && <div className="empty">No one found for "{q.trim()}".</div>}</div>
}
