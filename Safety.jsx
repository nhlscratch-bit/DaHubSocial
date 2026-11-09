import { useEffect, useState } from 'react'
import { sb } from './supabase'
import Avatar from './Avatar'
export default function Safety({ me, back }) {
  const [bl, setBl] = useState(null), [mu, setMu] = useState(null), [err, setErr] = useState('')
  const load = async () => {
    const P = 'id,username,display_name,avatar_url'
    const a = await sb.from('blocks').select('blocked_id,p:profiles!blocks_blocked_id_fkey(' + P + ')').eq('blocker_id', me.id)
    const b = await sb.from('mutes').select('muted_id,p:profiles!mutes_muted_id_fkey(' + P + ')').eq('muter_id', me.id)
    if (a.error || b.error) return setErr((a.error || b.error).message); setBl(a.data); setMu(b.data)
  }
  useEffect(() => { load() }, [])
  const un = async (t, col, id) => { const { error } = await sb.from(t).delete().eq(col, id).eq(t === 'blocks' ? 'blocker_id' : 'muter_id', me.id); error ? setErr(error.message) : load() }
  const row = (x, t, col) => <div key={x.p.id} className="gl subrow"><div className="who"><Avatar p={x.p} size={38} /><div><b>{x.p.display_name}</b><small>@{x.p.username}</small></div></div><button className="wb sm" onClick={() => un(t, col, x.p.id)}>{t === 'blocks' ? 'Unblock' : 'Unmute'}</button></div>
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Blocked & muted</div><div className="sbody">
    {err && <p className="msg" role="alert">{err}</p>}
    <h4 className="sec">Blocked</h4><p className="hint">Blocked people can't follow you or see you in search, and you won't see their posts.</p>
    {bl === null ? <div className="skel"><i /></div> : bl.length ? bl.map(x => row(x, 'blocks', 'blocked_id')) : <div className="empty">You haven't blocked anyone.</div>}
    <h4 className="sec">Muted</h4><p className="hint">Muted people don't know. Their posts and stories just stop showing up for you.</p>
    {mu === null ? <div className="skel"><i /></div> : mu.length ? mu.map(x => row(x, 'mutes', 'muted_id')) : <div className="empty">You haven't muted anyone.</div>}
  </div></div>
}
