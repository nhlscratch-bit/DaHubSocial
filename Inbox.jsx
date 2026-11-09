import wm from './wordmark.png'
import { useCallback, useEffect, useState } from 'react'
import { sb, ago } from './supabase'
import Avatar from './Avatar'
import Verified from './Verified'
export default function Inbox({ me, online, back, openChat, openDM }) {
  const [rows, setRows] = useState(null), [tab, setTab] = useState('all'), [q, setQ] = useState(''), [uo, setUo] = useState(false), [fol, setFol] = useState(new Set()), [nd, setNd] = useState(false), [err, setErr] = useState('')
  const load = useCallback(async () => {
    const { data, error } = await sb.from('conversation_members').select('status,last_read_at,conversation:conversations(id,is_group,title,last_message_at,last_message_preview,last_sender_id,members:conversation_members(user_id,profile:profiles(id,username,display_name,avatar_url,is_verified)))').eq('user_id', me.id)
    if (error) return setErr(error.message)
    setRows((data || []).filter(r => r.conversation).map(r => { const c = r.conversation, other = c.members.find(m => m.user_id !== me.id)?.profile
      return { status: r.status, c, other, title: c.is_group ? c.title : other?.display_name || 'Unknown', unread: !!c.last_sender_id && c.last_sender_id !== me.id && new Date(c.last_message_at) > new Date(r.last_read_at) } })
      .sort((a, b) => new Date(b.c.last_message_at) - new Date(a.c.last_message_at)))
  }, [me.id])
  useEffect(() => {
    load(); sb.from('follows').select('followee_id').eq('follower_id', me.id).eq('status', 'accepted').then(({ data }) => setFol(new Set((data || []).map(x => x.followee_id))))
    const ch = sb.channel('inbox-' + me.id).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, load).subscribe()
    window.addEventListener('dm-read', load); return () => { sb.removeChannel(ch); window.removeEventListener('dm-read', load) }
  }, [load])
  const reqN = (rows || []).filter(r => r.status === 'request').length
  const list = (rows || []).filter(r => tab === 'req' ? r.status === 'request' : r.status === 'accepted' && (tab === 'all' || (r.other && fol.has(r.other.id))))
    .filter(r => (!uo || r.unread) && r.title.toLowerCase().includes(q.toLowerCase()))
  return <div className="sheet clear"><div className="ihead"><button className="ib" onClick={back} aria-label="Back">←</button><img src={wm} alt="DAHUB" /><button className="ib fabs" onClick={() => setNd(true)} aria-label="New message">+</button></div>
    <h1 className="dmt">DMs</h1>
    <div className="isr"><input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Search DMs…" aria-label="Search DMs" /><button className={'ib' + (uo ? ' act' : '')} onClick={() => setUo(!uo)} aria-label="Unread only" title="Unread only">⚙️</button></div>
    <div className="itabs">{[['all', 'All'], ['pri', 'Primary'], ['req', 'Requests']].map(([k, l]) => <button key={k} aria-selected={tab === k} onClick={() => setTab(k)}>{l}{k === 'req' && reqN > 0 && <span className="rb">{reqN}</span>}</button>)}</div>
    <div className="sbody">{err && <p className="msg">{err}</p>}{rows === null && !err && <div className="skel" />}
      {list.map(r => <button key={r.c.id} className="irow" onClick={() => openChat(r.c.id)}><Avatar p={r.other} size={64} online={r.other ? online.has(r.other.id) : undefined} />
        <div className="itx"><b>{r.title}{r.other?.is_verified && <Verified />}</b><span className={r.unread ? 'un' : ''}>{r.c.last_sender_id === me.id && 'You: '}{r.c.last_message_preview || 'Say hi 👋'}</span></div>
        <div className="itm"><small>{r.c.last_message_preview ? ago(r.c.last_message_at) : ''}</small>{r.unread && <i className="ub" />}</div></button>)}
      {rows && !list.length && <div className="empty">{tab === 'req' ? 'No message requests.' : q || uo ? 'No matches.' : 'No messages yet. Tap + to start one.'}</div>}</div>
    {nd && <NewDM me={me} close={() => setNd(false)} pick={id => { setNd(false); openDM(id) }} online={online} />}</div>
}
function NewDM({ me, close, pick, online }) {
  const [q, setQ] = useState(''), [res, setRes] = useState([])
  useEffect(() => { const s = q.replace(/[^\w ]/g, '').trim(); const t = setTimeout(async () => {
    let r = sb.from('profiles').select('id,username,display_name,avatar_url,is_verified').neq('id', me.id).limit(20)
    if (s) r = r.or(`username.ilike.%${s}%,display_name.ilike.%${s}%`)
    const { data } = await r; setRes(data || []) }, 250); return () => clearTimeout(t) }, [q])
  return <div className="sheet"><div className="bar"><button onClick={close} aria-label="Close">✕</button>New message</div>
    <div className="isr" style={{ marginTop: 10 }}><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…" aria-label="Search people" /></div>
    <div className="sbody">{res.map(p => <button key={p.id} className="irow" onClick={() => pick(p.id)}><Avatar p={p} size={52} online={online.has(p.id)} /><div className="itx"><b>{p.display_name}{p.is_verified && <Verified />}</b><span>@{p.username}</span></div></button>)}
      {!res.length && <div className="empty">No people found.</div>}</div></div>
}
