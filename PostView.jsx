import AutoVideo from './AutoVideo'
import Lightbox from './Lightbox'
import wm from './wordmark.png'
import { useEffect, useRef, useState } from 'react'
import { sb, SEL, REACTIONS, mediaUrl, ago, friendly } from './supabase'
import Avatar from './Avatar'
const LBL = ['Love', 'Like', 'F*ck', 'Sad', 'Lick', 'Wink', 'Wow']
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n
const CSEL = 'id,body,created_at,parent_id,author:profiles!comments_author_id_fkey(id,username,display_name,avatar_url,is_verified),comment_reactions(user_id,reaction_id)'
export default function PostView({ id, focus, me, profile, back, openProfile }) {
  const [p, setP] = useState(null), [cs, setCs] = useState([]), [t, setT] = useState(''), [reply, setReply] = useState(null), [sort, setSort] = useState('top')
  const [lb, setLb] = useState(null), [err, setErr] = useState(''), [fol, setFol] = useState(null), [likers, setLikers] = useState([]), [slide, setSlide] = useState(0), ref = useRef()
  const loadP = async () => {
    const { data, error } = await sb.from('posts').select(SEL).eq('id', id).single(); if (error) return setErr(error.message); setP(data)
    const ids = [...new Set(data.post_reactions.map(r => r.user_id))].slice(0, 4)
    if (ids.length) { const { data: l } = await sb.from('profiles').select('id,username,display_name,avatar_url').in('id', ids); setLikers(l || []) } else setLikers([])
    if (data.author.id !== me.id) { const { data: f } = await sb.from('follows').select('status').eq('follower_id', me.id).eq('followee_id', data.author.id).maybeSingle(); setFol(f?.status || null) }
  }
  const loadC = async () => { const { data } = await sb.from('comments').select(CSEL).eq('post_id', id).order('created_at'); setCs(data || []) }
  useEffect(() => { loadP(); loadC() }, [id])
  useEffect(() => { if (focus && p) ref.current?.scrollIntoView() }, [focus, p])
  if (!p) return <div className="sheet"><div className="bar"><button onClick={back} aria-label="Back">←</button>Post</div>{err && <p className="msg">{err}</p>}</div>
  const mine = p.post_reactions.find(r => r.user_id === me.id), media = [...p.post_media].sort((a, b) => a.position - b.position)
  const tags = (p.body.match(/#\w+/g) || []), text = p.body.replace(/#\w+/g, '').trim()
  async function react(i) {
    const q = sb.from('post_reactions')
    if (mine && mine.reaction_id === i) await q.delete().eq('post_id', id).eq('user_id', me.id)
    else if (mine) await q.update({ reaction_id: i }).eq('post_id', id).eq('user_id', me.id)
    else await q.insert({ post_id: id, user_id: me.id, reaction_id: i })
    loadP()
  }
  const toggle = async (table, has) => { const q = sb.from(table); has ? await q.delete().eq('post_id', id).eq('user_id', me.id) : await q.insert({ post_id: id, user_id: me.id }); loadP() }
  const follow = async () => { fol ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', p.author.id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: p.author.id }); loadP() }
  const share = async () => { const u = location.origin + '/?post=' + id; try { navigator.share ? await navigator.share({ title: 'DAHUB', url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  async function send() {
    if (!t.trim()) return
    const { error } = await sb.from('comments').insert({ post_id: id, author_id: me.id, body: t.trim(), parent_id: reply ? (reply.parent_id || reply.id) : null })
    if (error) setErr(friendly(error)); else { setT(''); setReply(null); loadC(); loadP() }
  }
  const like = async c => { const m = c.comment_reactions.some(r => r.user_id === me.id), q = sb.from('comment_reactions'); m ? await q.delete().eq('comment_id', c.id).eq('user_id', me.id) : await q.insert({ comment_id: c.id, user_id: me.id, reaction_id: 0 }); loadC() }
  const byNew = (a, b) => new Date(b.created_at) - new Date(a.created_at)
  const tops = cs.filter(c => !c.parent_id).sort(sort === 'top' ? (a, b) => b.comment_reactions.length - a.comment_reactions.length || byNew(a, b) : byNew)
  const cm = (c, sub) => <div key={c.id} className={'cm' + (sub ? ' subc' : '')}><Avatar p={c.author} size={sub ? 32 : 42} onClick={() => openProfile(c.author.id)} />
    <div className="bub"><div className="bt"><b>{c.author.display_name}{c.author.is_verified && <span className="ver">✔</span>}</b><small>· {ago(c.created_at)}</small></div><p>{c.body}</p>
      <div className="br"><button onClick={() => setReply(c)}>Reply</button><button className={c.comment_reactions.some(r => r.user_id === me.id) ? 'on' : ''} onClick={() => like(c)}>❤️ {c.comment_reactions.length}</button></div></div></div>
  return <div className="sheet"><div className="pvtop"><button className="ib" onClick={back} aria-label="Back">←</button><img src={wm} alt="DAHUB" /><button className="ib" onClick={share} aria-label="Share">⋯</button></div>
    <div className="sbody">{err && <p className="msg">{err}</p>}
      <div className="ph pp"><Avatar p={p.author} size={62} onClick={() => openProfile(p.author.id)} />
        <div style={{ flex: 1 }}><b>{p.author.display_name}{p.author.is_verified && <span className="ver">✔</span>}</b><small>@{p.author.username} · {ago(p.created_at)}</small></div>
        {p.author.id !== me.id && <button className="wb p sm" onClick={follow}>{fol === 'accepted' ? 'Following' : fol === 'pending' ? 'Requested' : 'Follow'}</button>}</div>
      {(text || tags.length > 0) && <div className="cap pp" style={{ cursor: 'auto' }}>{text}{tags.length > 0 && <div className="tags">{tags.join(' ')}</div>}</div>}
      {media.length > 0 && <div className="carw"><div className="car" onScroll={e => setSlide(Math.round(e.target.scrollLeft / e.target.clientWidth))}>{media.map(m => m.media_type === 'video' ? <AutoVideo key={m.storage_path} src={mediaUrl(m.storage_path)} /> : <img key={m.storage_path} src={mediaUrl(m.storage_path)} alt="" onClick={() => setLb(media.filter(x => x.media_type !== 'video').findIndex(x => x.storage_path === m.storage_path))} />)}</div>{media.length > 1 && <span className="cnt">{slide + 1}/{media.length}</span>}</div>}
      {lb !== null && <Lightbox urls={media.filter(x => x.media_type !== 'video').map(x => mediaUrl(x.storage_path))} start={lb} close={() => setLb(null)} />}
      <div className="rstrip">{REACTIONS.map((r, i) => <button key={i} className={mine?.reaction_id === i ? 'sel' : ''} onClick={() => react(i)} aria-label={r[0]}><span>{r[1]}</span>{LBL[i]}</button>)}</div>
      <div className="pills"><span className="pill">{mine ? REACTIONS[mine.reaction_id][1] : '🤍'} {fmt(p.post_reactions.length)}</span>
        <button className="pill" onClick={() => ref.current?.scrollIntoView({ behavior: 'smooth' })}>💬 {fmt(p.comments[0]?.count || 0)}</button>
        <button className={'pill' + (p.reposts.some(r => r.user_id === me.id) ? ' on' : '')} onClick={() => toggle('reposts', p.reposts.some(r => r.user_id === me.id))}>🔁 {fmt(p.reposts.length)}</button>
        <button className={'pill sq' + (p.bookmarks.length ? ' on' : '')} onClick={() => toggle('bookmarks', p.bookmarks.length > 0)} aria-label="Bookmark">{p.bookmarks.length ? '🔖' : '🏷️'}</button>
        <button className="pill sq" onClick={share} aria-label="Share">📤</button></div>
      {likers.length > 0 && <div className="liked"><div className="stack">{likers.map(l => <Avatar key={l.id} p={l} size={30} />)}</div>
        <span>Liked by <b>{likers[0].display_name}</b>{p.post_reactions.length > 1 && ` and ${fmt(p.post_reactions.length - 1)} others`}</span></div>}
      <div className="chead" ref={ref}><b>Comments ({fmt(p.comments[0]?.count || cs.length)})</b><button onClick={() => setSort(sort === 'top' ? 'new' : 'top')}>Sort by: <b>{sort === 'top' ? 'Top' : 'Newest'}</b> ▾</button></div>
      {tops.map(c => <div key={c.id}>{cm(c)}{cs.filter(r => r.parent_id === c.id).map(r => cm(r, true))}</div>)}
      {!cs.length && <div className="empty">No comments yet. Start the conversation.</div>}</div>
    <div className="cin">{reply && <div className="rep">Replying to {reply.author.display_name} <button onClick={() => setReply(null)}>✕</button></div>}
      <div className="crow"><Avatar p={profile} size={42} /><input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Add a comment…" maxLength={1000} aria-label="Add a comment" /><button className="go" onClick={send} aria-label="Send">➤</button></div></div></div>
}
