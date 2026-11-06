import { useCallback, useEffect, useRef, useState } from 'react'
import { sb, SEL, upload } from '../supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
const TABS = [['for', 'For You'], ['following', 'Following'], ['trend', '🔥 Trending'], ['near', '📍 Nearby']]
export default function Feed({ me, profile, openPost, openProfile, focusKey }) {
  const [tab, setTab] = useState('for'), [posts, setPosts] = useState(null), [err, setErr] = useState('')
  const [text, setText] = useState(''), [files, setFiles] = useState([]), [aud, setAud] = useState('public'), [busy, setBusy] = useState(false)
  const input = useRef(), file = useRef()
  useEffect(() => { input.current?.focus(); window.scrollTo(0, 0) }, [focusKey])
  const load = useCallback(async () => {
    setErr(''); setPosts(null)
    if (tab === 'near') return setPosts([])
    let q = sb.from('posts').select(SEL).order('created_at', { ascending: false }).limit(40)
    if (tab === 'following') {
      const { data: f } = await sb.from('follows').select('followee_id').eq('follower_id', me.id).eq('status', 'accepted')
      const ids = (f || []).map(x => x.followee_id); if (!ids.length) return setPosts([]); q = q.in('author_id', ids)
    }
    const { data, error } = await q
    if (error) return setErr(error.message)
    if (tab === 'trend') data.sort((a, b) => b.post_reactions.length - a.post_reactions.length)
    setPosts(data)
  }, [tab, me.id])
  useEffect(() => { load() }, [load])
  async function publish() {
    if (!text.trim() && !files.length) return; setBusy(true); setErr('')
    try {
      const kind = files.some(f => f.type.startsWith('video')) ? 'video' : files.length ? 'photo' : 'text'
      const { data: post, error } = await sb.from('posts').insert({ author_id: me.id, body: text.trim(), kind, audience: aud }).select('id').single()
      if (error) throw error
      for (const [i, f] of files.entries()) {
        const path = await upload('post-media', me.id, f)
        await sb.from('post_media').insert({ post_id: post.id, storage_path: path, media_type: f.type.startsWith('video') ? 'video' : 'image', position: i })
      }
      setText(''); setFiles([]); setTab('for'); load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  return <div>
    <div className="stories">{[['+', 'Add Story'], [profile, 'Your Story']].map(([s, l], i) => <div key={i} className="st">{i ? <Avatar p={s} size={66} /> : <div className="av add">+</div>}{l}</div>)}</div>
    <div className="comp"><div className="crow"><Avatar p={profile} size={40} />
      <input ref={input} value={text} onChange={e => setText(e.target.value)} placeholder="What's on your mind?" maxLength={2000} aria-label="Compose post" />
      <button className="ib" onClick={() => file.current.click()} aria-label="Add photo or video">🖼️</button>
      <button className="go" disabled={busy || (!text.trim() && !files.length)} onClick={publish}>{busy ? '…' : '➤'}</button>
      <input ref={file} type="file" hidden multiple accept="image/*,video/*" onChange={e => setFiles([...e.target.files].slice(0, 4))} /></div>
      <div className="crow sub"><select value={aud} onChange={e => setAud(e.target.value)} aria-label="Audience"><option value="public">Public</option><option value="followers">Followers</option><option value="friends">Friends</option><option value="only_me">Only me</option></select>
        {files.length > 0 && <small>{files.length} file(s) attached · <button className="link" onClick={() => setFiles([])}>clear</button></small>}</div></div>
    <div className="tabs">{TABS.map(([k, l]) => <button key={k} className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {posts === null && !err && <div className="skel" />}
    {posts?.length === 0 && <div className="empty">{tab === 'near' ? 'Nearby needs location permission. Coming soon.' : tab === 'following' ? 'Follow people to fill this tab.' : 'No posts yet. Be the first.'}</div>}
    {posts?.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}
  </div>
}
