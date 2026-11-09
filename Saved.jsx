import { useEffect, useState } from 'react'
import { sb, SEL, hiddenIds } from './supabase'
import PostCard from './PostCard'
export default function Saved({ me, back, openPost, openProfile }) {
  const [posts, setPosts] = useState(null), [err, setErr] = useState('')
  const load = async () => {
    setErr(''); const { data: b, error } = await sb.from('bookmarks').select('post_id,created_at').eq('user_id', me.id).order('created_at', { ascending: false }).limit(60)
    if (error) return setErr(error.message); const ids = (b || []).map(x => x.post_id); if (!ids.length) return setPosts([])
    const { data, error: e2 } = await sb.from('posts').select(SEL).in('id', ids); if (e2) return setErr(e2.message)
    const hid = await hiddenIds(); const order = new Map(ids.map((id, i) => [id, i]))
    setPosts((data || []).filter(p => !hid.has(p.author.id)).sort((a, c) => order.get(a.id) - order.get(c.id)))
  }
  useEffect(() => { load() }, [])
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Saved</div><div className="sbody">
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {posts === null && !err && <div className="skel"><i /><i /></div>}
    {posts?.length === 0 && <div className="empty">Nothing saved yet. Tap the bookmark on a post to keep it here.</div>}
    {posts?.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}
  </div></div>
}
