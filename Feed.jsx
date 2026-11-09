import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sb, SEL, upload, hiddenIds, friendly } from './supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
import I from './Icons'
import Stories from './Stories'
const TABS = [['for', 'For You'], ['following', 'Following'], ['trend', '🔥 Trending'], ['near', '📍 Nearby']]
export default function Feed({ me, profile, openPost, openProfile, focusKey, goDiscover, active }) {
  const [fc, setFc] = useState(null), [tab, setTab] = useState('for'), [posts, setPosts] = useState(null), [err, setErr] = useState('')
  const [text, setText] = useState(''), [files, setFiles] = useState([]), [aud, setAud] = useState('public'), [busy, setBusy] = useState(false)
  const input = useRef(), photoIn = useRef(), videoIn = useRef()
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls])
  const addFiles = e => { const n = [...e.target.files]; e.target.value = ''; setFiles(f => [...f, ...n].slice(0, 4)) }
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
    const hid = await hiddenIds(); for (let i = data.length - 1; i >= 0; i--) if (hid.has(data[i].author.id)) data.splice(i, 1)
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
    } catch (e) { setErr(friendly(e)) } finally { setBusy(false) }
  }
  return <div>
    <Stories me={me} profile={profile} />
    <div className="comp"><div className="crow"><Avatar p={profile} size={46} />
      <input ref={input} value={text} onChange={e => setText(e.target.value)} placeholder="What's on your mind?" maxLength={2000} aria-label="Compose post" />
      <button className="ib" onClick={() => photoIn.current.click()} aria-label="Add photo"><I n="image" /></button>
      <button className="ib" onClick={() => videoIn.current.click()} aria-label="Add video"><I n="video" /></button>
      <button className="go" disabled={busy || (!text.trim() && !files.length)} onClick={publish} aria-label="Post">{busy ? '…' : <I n="send" s={20} fill />}</button>
      <input ref={photoIn} type="file" hidden multiple accept="image/*" onChange={addFiles} /><input ref={videoIn} type="file" hidden accept="video/*" onChange={addFiles} /></div>
      <div className="crow sub"><select value={aud} onChange={e => setAud(e.target.value)} aria-label="Audience"><option value="public">Public</option><option value="followers">Followers</option><option value="friends">Friends</option><option value="only_me">Only me</option></select>
        </div>
      {files.length > 0 && <div className="thumbs">{files.map((x, i) => <div className="th" key={i}>{x.type.startsWith('video') ? <video src={urls[i] + '#t=0.1'} muted playsInline /> : <img src={urls[i]} alt="" />}<button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label="Remove">✕</button></div>)}</div>}</div>
    <div className="tabs">{TABS.map(([k, l]) => <button key={k} className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      <button className="ib flt" onClick={() => alert('Feed filters are a later milestone.')} aria-label="Filters"><I n="filter" s={20} /></button></div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {posts === null && !err && <div className="skel"><i /><i /></div>}
    {posts?.length === 0 && (fc === 0 && tab !== 'near' ? <div className="onb"><h3>Your timeline is empty</h3><p>Follow people to build your feed. Posts from the people you follow show up here.</p><button className="wb p" onClick={goDiscover}>Find people to follow</button></div>
      : <div className="empty">{tab === 'near' ? 'Nearby needs location permission. Coming soon.' : tab === 'following' ? 'Nothing new from the people you follow.' : 'No posts yet. Be the first.'}</div>)}
    {posts?.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}
  </div>
}
