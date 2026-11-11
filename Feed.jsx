import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sb, SEL, upload, hiddenIds, friendly } from './supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
import I from './Icons'
import { QotdCard } from './Daily'
import Stories from './Stories'
import Banner from './Banner'
const TABS = [['for', 'For You'], ['following', 'Following'], ['trend', '🔥 Trending']]
const FILT = [['all', 'Everything'], ['photo', 'Photos'], ['video', 'Videos'], ['text', 'Text only']]
export default function Feed({ me, profile, openPost, openProfile, focusKey, goDiscover, go, active }) {
  const [fc, setFc] = useState(null), [tab, setTab] = useState('for'), [posts, setPosts] = useState(null), [err, setErr] = useState('')
  const [text, setText] = useState(''), [files, setFiles] = useState([]), [aud, setAud] = useState('public'), [busy, setBusy] = useState(false), [flt, setFlt] = useState('all'), [fOpen, setFOpen] = useState(false), [poll, setPoll] = useState(null)
  const input = useRef(), photoIn = useRef(), videoIn = useRef()
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls])
  const addFiles = e => { const n = [...e.target.files]; e.target.value = ''; setFiles(f => [...f, ...n].slice(0, 4)) }
  useEffect(() => { input.current?.focus(); window.scrollTo(0, 0) }, [focusKey])
  const load = useCallback(async () => {
    setErr(''); setPosts(null)
    const { data: f } = await sb.from('follows').select('followee_id').eq('follower_id', me.id).eq('status', 'accepted')
    const ids = (f || []).map(x => x.followee_id); setFc(ids.length)
    if (tab !== 'following') ids.push(me.id)
    // For You / Trending also include public posts from verified and official accounts (unless their profile is private)
    let vids = []
    if (tab !== 'following') { const { data: v } = await sb.from('profiles').select('id').eq('is_verified', true).eq('is_private', false).eq('account_status', 'active').limit(200); vids = (v || []).map(x => x.id).filter(id => !ids.includes(id)) }
    if (!ids.length && !vids.length) return setPosts([])
    const [a, b] = await Promise.all([
      ids.length ? sb.from('posts').select(SEL).eq('after_dark', false).in('author_id', ids).order('created_at', { ascending: false }).limit(40) : { data: [] },
      vids.length ? sb.from('posts').select(SEL).eq('after_dark', false).eq('audience', 'public').is('community_id', null).in('author_id', vids).order('created_at', { ascending: false }).limit(40) : { data: [] }])
    const error = a.error || b.error
    if (error) return setErr(error.message)
    const seen = new Set(), data = [...(a.data || []), ...(b.data || [])].filter(x => !seen.has(x.id) && seen.add(x.id)).sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, 50)
    const hid = await hiddenIds(); for (let i = data.length - 1; i >= 0; i--) if (hid.has(data[i].author.id)) data.splice(i, 1)
    if (tab === 'trend') data.sort((a, b) => b.post_reactions.length - a.post_reactions.length)
    setPosts(data)
  }, [tab, me.id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (active) load() }, [active])
  async function publish() {
    if (!text.trim() && !files.length) return
    const po = poll ? poll.map(x => x.trim()).filter(Boolean) : null
    if (poll && (!text.trim() || po.length < 2)) return setErr('A poll needs a question and at least 2 options.')
    setBusy(true); setErr('')
    try {
      const kind = files.some(f => f.type.startsWith('video')) ? 'video' : files.length ? 'photo' : 'text'
      const { data: post, error } = await sb.from('posts').insert({ author_id: me.id, body: text.trim(), kind, audience: aud }).select('id').single()
      if (error) throw error
      if (po) { const { error: pe } = await sb.from('poll_options').insert(po.map((t, i) => ({ post_id: post.id, text: t.slice(0, 60), position: i }))); if (pe) { await sb.from('posts').delete().eq('id', post.id); throw pe } }
      for (const [i, f] of files.entries()) {
        const path = await upload('post-media', me.id, f)
        await sb.from('post_media').insert({ post_id: post.id, storage_path: path, media_type: f.type.startsWith('video') ? 'video' : 'image', position: i })
      }
      setText(''); if (input.current) input.current.style.height = ''; setFiles([]); setPoll(null); setTab('for'); load()
    } catch (e) { setErr(friendly(e)) } finally { setBusy(false) }
  }
  return <div>
    <Banner go={go} />
    <Stories me={me} profile={profile} />
    <QotdCard openPost={openPost} />
    <div className="comp"><div className="crow"><Avatar p={profile} size={46} /><span className="cgap" />
      <button className="ib" onClick={() => photoIn.current.click()} aria-label="Add photo"><I n="image" /></button>
      <button className="ib" onClick={() => videoIn.current.click()} aria-label="Add video"><I n="video" /></button>
      <button className={'ib' + (poll ? ' on' : '')} onClick={() => setPoll(p => p ? null : ['', ''])} aria-label="Add poll"><I n="poll" /></button>
      <button className="go" disabled={busy || (!text.trim() && !files.length)} onClick={publish} aria-label="Post">{busy ? '…' : <I n="send" s={20} fill />}</button>
      <input ref={photoIn} type="file" hidden multiple accept="image/*" onChange={addFiles} /><input ref={videoIn} type="file" hidden accept="video/*" onChange={addFiles} /></div>
      <textarea ref={input} className="ctext" rows={2} value={text} onChange={e => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px' }} placeholder={poll ? 'Ask your poll question…' : "What's on your mind?"} maxLength={2000} aria-label="Compose post" />
      <div className="crow sub"><select value={aud} onChange={e => setAud(e.target.value)} aria-label="Audience"><option value="public">Public</option><option value="followers">Followers</option><option value="friends">Friends</option><option value="only_me">Only me</option></select>
        </div>
      {poll && <div className="pollc"><small>Poll: your question goes in the box above. Add 2 to 4 options.</small>{poll.map((o, i) => <input key={i} value={o} maxLength={60} placeholder={`Option ${i + 1}`} onChange={e => setPoll(p => p.map((x, j) => j === i ? e.target.value : x))} />)}{poll.length < 4 && <button className="link" onClick={() => setPoll(p => [...p, ''])}>+ Add option</button>}</div>}
      {files.length > 0 && <div className="thumbs">{files.map((x, i) => <div className="th" key={i}>{x.type.startsWith('video') ? <video src={urls[i] + '#t=0.1'} muted playsInline /> : <img src={urls[i]} alt="" />}<button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label="Remove">✕</button></div>)}</div>}</div>
    <div className="tabs">{TABS.map(([k, l]) => <button key={k} className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      <button className="ib flt" onClick={() => setFOpen(true)} aria-label="Filters"><I n="filter" s={20} />{flt !== 'all' && <span className="fdot" />}</button></div>
    {fOpen && <div className="scrim" onClick={() => setFOpen(false)}><div className="msheet" onClick={e => e.stopPropagation()}><h3 style={{ margin: 0 }}>Show in your feed</h3>{FILT.map(([k, l]) => <button key={k} className={'wb' + (flt === k ? ' p' : '')} onClick={() => { setFlt(k); setFOpen(false) }}>{l}</button>)}</div></div>}
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {posts === null && !err && <div className="skel"><i /><i /></div>}
    {posts?.length === 0 && (fc === 0 ? <div className="onb"><h3>Your timeline is empty</h3><p>Follow people to build your feed. Posts from the people you follow show up here.</p><button className="wb p" onClick={goDiscover}>Find people to follow</button></div>
      : <div className="empty">{tab === 'following' ? 'Nothing new from the people you follow.' : 'No posts yet. Be the first.'}</div>)}
    {posts?.filter(p => flt === 'all' || (flt === 'text' ? p.post_media.length === 0 : p.post_media.some(m => m.media_type === (flt === 'photo' ? 'image' : 'video')))).map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}
  </div>
}
