import { useEffect, useRef, useState } from 'react'
import { sb, REACTIONS, ago } from './supabase'
import Avatar from './Avatar'
const SEL = 'id,type,post_id,reaction_id,created_at,read_at,actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url,is_verified),post:posts(id,body)'
const TXT = { follow: 'started following you', follow_request: 'requested to follow you', follow_accept: 'accepted your follow request', comment: 'commented on your post', reply: 'replied to your comment', repost: 'reposted your post' }
export default function Notifications({ me, back, openPost, openProfile }) {
  const [rows, setRows] = useState(null), [err, setErr] = useState(''), [fresh, setFresh] = useState(null), marked = useRef(false)
  const load = async () => {
    const { data, error } = await sb.from('notifications').select(SEL).eq('user_id', me.id).order('created_at', { ascending: false }).limit(80)
    if (error) return setErr(error.message)
    setRows(data || []); setFresh(f => f || new Set((data || []).filter(r => !r.read_at).map(r => r.id)))
  }
  useEffect(() => {
    load(); const ch = sb.channel('notifs-open-' + me.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, load).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [])
  useEffect(() => {
    if (rows === null || marked.current) return; marked.current = true
    sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', me.id).is('read_at', null).then(() => window.dispatchEvent(new Event('notif-read')))
  }, [rows])
  const accept = async r => { await sb.from('follows').update({ status: 'accepted' }).eq('follower_id', r.actor.id).eq('followee_id', me.id); load() }
  const decline = async r => { await sb.from('follows').delete().eq('follower_id', r.actor.id).eq('followee_id', me.id); load() }
  const clear = async () => { if (!confirm('Clear all notifications?')) return; await sb.from('notifications').delete().eq('user_id', me.id); setRows([]); window.dispatchEvent(new Event('notif-read')) }
  const label = r => r.type === 'reaction' ? `reacted ${REACTIONS[r.reaction_id]?.[1] || ''} to your post` : TXT[r.type]
  const row = r => <div key={r.id} className={'nrow' + (fresh?.has(r.id) ? ' new' : '')} onClick={() => r.post_id && r.post ? openPost(r.post_id) : openProfile(r.actor.id)}>
    <Avatar p={r.actor} size={52} />
    <div className="ntx"><span><b>{r.actor.display_name}</b> {label(r)}<small>{ago(r.created_at)}</small></span>{r.post?.body && <div className="nsn">{r.post.body}</div>}</div>
    {r.type === 'follow_request' && <div className="nact" onClick={e => e.stopPropagation()}><button className="wb p sm" onClick={() => accept(r)}>Accept</button><button className="wb sm" onClick={() => decline(r)}>Decline</button></div>}</div>
  const nw = (rows || []).filter(r => fresh?.has(r.id)), old = (rows || []).filter(r => !fresh?.has(r.id))
  return <div className="sheet clear"><div className="bar"><button onClick={back} aria-label="Back">←</button><span style={{ flex: 1 }}>Notifications</span>{rows?.length > 0 && <button className="link" onClick={clear}>Clear all</button>}</div>
    <div className="sbody">{err && <p className="msg">{err}</p>}{rows === null && !err && <div className="skel"><i /></div>}
      {nw.length > 0 && <><div className="nsec">New</div>{nw.map(row)}</>}
      {old.length > 0 && <><div className="nsec">Earlier</div>{old.map(row)}</>}
      {rows && !rows.length && <div className="empty">No notifications yet. When people follow you, react or comment, it shows up here.</div>}</div></div>
}
