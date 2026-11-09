import { useState } from 'react'
import { sb, SEL, REACTIONS, mediaUrl, ago } from './supabase'
import Avatar from './Avatar'
import I from './Icons'
import ReportSheet from './ReportSheet'
export default function PostCard({ post, me, openPost, openProfile }) {
  const [p, setP] = useState(post), [pick, setPick] = useState(false), [menu, setMenu] = useState(false), [rep, setRep] = useState(false), [gone, setGone] = useState(false)
  const reload = async () => { const { data } = await sb.from('posts').select(SEL).eq('id', p.id).single(); if (data) setP(data) }
  const mine = p.post_reactions.find(r => r.user_id === me.id)
  const top = Object.entries(p.post_reactions.reduce((a, r) => (a[r.reaction_id] = (a[r.reaction_id] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => REACTIONS[e[0]][1]).join('')
  async function react(i) {
    setPick(false); const q = sb.from('post_reactions')
    if (mine && mine.reaction_id === i) await q.delete().eq('post_id', p.id).eq('user_id', me.id)
    else if (mine) await q.update({ reaction_id: i }).eq('post_id', p.id).eq('user_id', me.id)
    else await q.insert({ post_id: p.id, user_id: me.id, reaction_id: i })
    reload()
  }
  const toggle = async (table, has) => { const q = sb.from(table); has ? await q.delete().eq('post_id', p.id).eq('user_id', me.id) : await q.insert({ post_id: p.id, user_id: me.id }); reload() }
  const share = async () => { try { navigator.share ? await navigator.share({ title: 'DAHUB', url: location.origin + '/?post=' + p.id }) : (await navigator.clipboard.writeText(location.origin + '/?post=' + p.id), alert('Link copied')) } catch {} }
  const rp = p.reposts.some(r => r.user_id === me.id), bm = p.bookmarks.length > 0
  const media = [...p.post_media].sort((a, b) => a.position - b.position)
  const del = async () => { setMenu(false); if (!confirm('Delete this post? This cannot be undone.')) return; const { error } = await sb.from('posts').delete().eq('id', p.id); error ? alert('Could not delete: ' + error.message) : setGone(true) }
  if (gone) return null
  return <article className="post">
    <button className="pmore" onClick={() => setMenu(!menu)} aria-label="Post options" />
    {menu && <div className="pmenu">{p.author.id === me.id ? <button onClick={del}>Delete post</button> : <button onClick={() => { setMenu(false); setRep(true) }}>Report post</button>}<button onClick={() => setMenu(false)}>Cancel</button></div>}
    {rep && <ReportSheet me={me} type="post" targetId={p.id} reportedUser={p.author.id} close={() => setRep(false)} />}
    <div className="ph"><Avatar p={p.author} size={38} onClick={() => openProfile(p.author.id)} />
      <div style={{ flex: 1 }}><b>{p.author.display_name}{p.author.is_verified && <span className="ver">✔</span>}</b><small>@{p.author.username} · {ago(p.created_at)}{p.audience !== 'public' && ' · ' + p.audience.replace('_', ' ')}</small></div></div>
    {p.body && <div className="cap" onClick={() => openPost?.(p.id)}>{p.body.split(/(#\w+)/g).map((x, i) => x.startsWith('#') ? <span key={i} className="tag">{x}</span> : x)}</div>}
    {media.length > 0 && <div className="mgrid">{media.map(m => m.media_type === 'video'
      ? <video key={m.storage_path} src={mediaUrl(m.storage_path)} controls playsInline />
      : <img key={m.storage_path} src={mediaUrl(m.storage_path)} alt="" loading="lazy" onClick={() => openPost?.(p.id)} />)}</div>}
    {p.post_reactions.length > 0 && <div className="sum">{top} {p.post_reactions.length}</div>}
    <div className="act">
      <button onClick={() => openPost?.(p.id, true)} aria-label="Comments"><I n="comment" s={22} /> {p.comments[0]?.count || 0}</button>
      <button className={rp ? 'on' : ''} onClick={() => toggle('reposts', rp)} aria-label="Repost"><I n="repost" s={22} /> {p.reposts.length}</button>
      <button className={'rx' + (mine ? ' on' : '')} onClick={() => setPick(!pick)} aria-label="React">{mine ? <span className="em">{REACTIONS[mine.reaction_id][1]}</span> : <I n="heart" s={22} />} {mine ? REACTIONS[mine.reaction_id][0] : p.post_reactions.length || 'React'}</button>
      <button className={bm ? 'on' : ''} onClick={() => toggle('bookmarks', bm)} aria-label="Bookmark"><I n="bookmark" s={22} fill={bm} /></button>
      <button onClick={share} aria-label="Share"><I n="share" s={22} /></button>
      {pick && <div className="picker">{REACTIONS.map((r, i) => <button key={i} title={r[0]} aria-label={r[0]} onClick={() => react(i)}>{r[1]}</button>)}</div>}
    </div></article>
}
