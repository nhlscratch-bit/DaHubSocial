import { useCallback, useEffect, useRef, useState } from 'react'
import { sb, SEL, upload } from './supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
import I from './Icons'
const TABS = [['for', 'For You'], ['following', 'Following'], ['trend', '🔥 Trending'], ['near', '📍 Nearby']]
export default function Feed({ me, profile, openPost, openProfile, focusKey, goDiscover, active }) {
  const [fc, setFc] = useState(null), [tab, setTab] = useState('for'), [posts, setPosts] = useState(null), [err, setErr] = useState('')
  const [text, setText] = useState(''), [files, setFiles] = useState([]), [aud, setAud] = useState('public'), [busy, setBusy] = useState(false)
  const input = useRef(), file = useRef()
  useEffect(() => { input.current?.focus(); window.scrollTo(0, 0) }, [focusKey])
  const load = useCallback(async () => {
    setErr(''); setPosts(null)
    if (tab === 'near') return setPosts([])
    const { data: f } = await sb.from('follows').select('followee_id').eq('follower_id', me.id).eq('status', 'accepted')
    const ids = (f || []).map(x => x.followee_id); setFc(ids.length)
    if (tab !== 'following') ids.push(me.id)
    if (!ids.length) return setPosts([])
    const q = sb.from('posts').select(SEL).in('author_id', ids).order('created_at', { ascending: false }).limit(40)
    const { data, error } = await q
    if (error) return setErr(error.message)
    if (tab === 'trend') data.sort((a, b) => b.post_reactions.length - a.post_reactions.length)
    setPosts(data)
  }, [tab, me.id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (active) load() }, [active])
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
    <div className="stories">{[0, 1].map(i => <button key={i} className="st" onClick={() => alert('Stories are a later milestone.')}>
      {i ? <span className="ring"><Avatar p={profile} size={68} /></span> : <span className="ring plain"><I n="plus" s={32} /></span>}<small>{i ? 'Your Story' : 'Add Story'}</small></button>)}</div>
    <div className="comp"><div className="crow"><Avatar p={profile} size={46} />
      <input ref={input} value={text} onChange={e => setText(e.target.value)} placeholder="What's on your mind?" maxLength={2000} aria-label="Compose post" />
      <button className="ib" onClick={() => file.current.click()} aria-label="Add photo"><I n="image" /></button>
      <button className="ib" onClick={() => file.current.click()} aria-label="Add video"><I n="video" /></button>
      <button className="go" disabled={busy || (!text.trim() && !files.length)} onClick={publish} aria-label="Post">{busy ? '…' : <I n="send" s={20} fill />}</button>
      <input ref={file} type="file" hidden multiple accept="image/*,video/*" onChange={e => setFiles([...e.target.files].slice(0, 4))} /></div>
      <div className="crow sub"><select value={aud} onChange={e => setAud(e.target.value)} aria-label="Audience"><option value="public">Public</option><option value="followers">Followers</option><option value="friends">Friends</option><option value="only_me">Only me</option></select>
        {files.length > 0 && <small>{files.length} file(s) attached · <button className="link" onClick={() => setFiles([])}>clear</button></small>}</div></div>
    <div className="tabs">{TABS.map(([k, l]) => <button key={k} className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      <button className="ib flt" onClick={() => alert('Feed filters are a later milestone.')} aria-label="Filters"><I n="filter" s={20} /></button></div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {posts === null && !err && <div className="skel"><i /><i /></div>}
    {posts?.length === 0 && (fc === 0 && tab !== 'near' ? <div className="onb"><h3>Your timeline is empty</h3><p>Follow people to build your feed. Posts from the people you follow show up here.</p><button className="wb p" onClick={goDiscover}>Find people to follow</button></div>
      : <div className="empty">{tab === 'near' ? 'Nearby needs location permission. Coming soon.' : tab === 'following' ? 'Nothing new from the people you follow.' : 'No posts yet. Be the first.'}</div>)}
    {posts?.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}
  </div>
}
