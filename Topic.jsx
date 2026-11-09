import { useEffect, useState } from 'react'
import { sb, SEL, hiddenIds } from './supabase'
import PostCard from './PostCard'
export default function Topic({ tag, me, back, openPost, openProfile }) {
  const [posts, setPosts] = useState(null), [err, setErr] = useState('')
  const load = async () => {
    setErr(''); setPosts(null)
    const { data, error } = await sb.from('posts').select(SEL).eq('after_dark', false).ilike('body', `%#${tag.replace(/[%_]/g, '')}%`).order('created_at', { ascending: false }).limit(50)
    if (error) return setErr(error.message); const hid = await hiddenIds()
    setPosts((data || []).filter(p => !hid.has(p.author.id) && new RegExp('#' + tag + '\\b', 'i').test(p.body)))
  }
  useEffect(() => { load() }, [tag])
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>#{tag}</div><div className="sbody">
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {posts === null && !err && <div className="skel"><i /><i /></div>}
    {posts?.length === 0 && <div className="empty">No posts with #{tag} yet. Post something and add the tag.</div>}
    {posts?.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}</div></div>
}
