import { useEffect, useRef, useState } from 'react'
import { sb, SEL, ago } from '../supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
export default function PostView({ id, focus, me, back, openProfile }) {
  const [post, setPost] = useState(null), [cs, setCs] = useState([]), [t, setT] = useState(''), [err, setErr] = useState(''), ref = useRef()
  const loadC = async () => { const { data } = await sb.from('comments').select('id,body,created_at,author:profiles!comments_author_id_fkey(id,username,display_name,avatar_url)').eq('post_id', id).order('created_at'); setCs(data || []) }
  useEffect(() => { sb.from('posts').select(SEL).eq('id', id).single().then(({ data, error }) => error ? setErr(error.message) : setPost(data)); loadC() }, [id])
  useEffect(() => { if (focus && post) ref.current?.scrollIntoView() }, [focus, post])
  async function send() {
    if (!t.trim()) return
    const { error } = await sb.from('comments').insert({ post_id: id, author_id: me.id, body: t.trim() })
    if (error) setErr(error.message); else { setT(''); loadC() }
  }
  return <div className="sheet"><div className="bar"><button onClick={back} aria-label="Back">←</button>Post</div>
    <div className="sbody">{err && <p className="msg">{err}</p>}
      {post && <PostCard post={post} me={me} openProfile={openProfile} />}
      <b ref={ref} className="ch">Comments ({cs.length})</b>
      {cs.map(c => <div key={c.id} className="cm"><Avatar p={c.author} size={36} onClick={() => openProfile(c.author.id)} /><div><b>{c.author.display_name}</b> <small>{ago(c.created_at)}</small><p>{c.body}</p></div></div>)}
      {!cs.length && <div className="empty">No comments yet. Start the conversation.</div>}</div>
    <div className="cin"><input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Add a comment…" maxLength={1000} aria-label="Add a comment" /><button className="go" onClick={send}>➤</button></div></div>
}
