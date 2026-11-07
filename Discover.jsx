import { useEffect, useState } from 'react'
import { sb } from './supabase'
import Avatar from './Avatar'
export default function Discover({ me, openProfile }) {
  const [q, setQ] = useState(''), [list, setList] = useState(null), [rel, setRel] = useState({}), [err, setErr] = useState('')
  const loadRel = async () => { const { data } = await sb.from('follows').select('followee_id,status').eq('follower_id', me.id); setRel(Object.fromEntries((data || []).map(x => [x.followee_id, x.status]))) }
  useEffect(() => { loadRel() }, [])
  useEffect(() => {
    const s = q.replace(/[^\w ]/g, '').trim()
    const t = setTimeout(async () => {
      let r = sb.from('profiles').select('id,username,display_name,avatar_url,is_verified').neq('id', me.id).order('created_at', { ascending: false }).limit(30)
      if (s) r = r.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`)
      const { data, error } = await r; setErr(error ? error.message : ''); setList(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [q])
  async function toggle(id) { rel[id] ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); loadRel() }
  return <div className="disc"><h1 className="dmt">Discover</h1>
    <div className="isr"><input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Search people…" aria-label="Search people" /></div>
    <p className="dsub">{q ? 'Results' : 'People on DAHUB'}</p>
    {err && <p className="msg">{err}</p>}{list === null && !err && <div className="skel"><i /></div>}
    {list?.map(p => <div key={p.id} className="drow"><Avatar p={p} size={56} onClick={() => openProfile(p.id)} />
      <div className="itx" onClick={() => openProfile(p.id)}><b>{p.display_name}{p.is_verified && <span className="ver">✔</span>}</b><span>@{p.username}</span></div>
      <button className={'wb sm' + (rel[p.id] ? '' : ' p')} onClick={() => toggle(p.id)}>{rel[p.id] === 'accepted' ? 'Following' : rel[p.id] === 'pending' ? 'Requested' : 'Follow'}</button></div>)}
    {list && !list.length && <div className="empty">No people found.</div>}</div>
}
