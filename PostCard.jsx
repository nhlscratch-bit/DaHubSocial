import { useState } from 'react'
import { sb, SEL, REACTIONS, mediaUrl, ago } from './supabase'
import Avatar from './Avatar'
export default function PostCard({ post, me, openPost, openProfile }) {
  const [p, setP] = useState(post), [pick, setPick] = useState(false)
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
  const rp = p.reposts.some(r => r.user_id === me.id), bm = p.bookmarks.length > 0
  const media = [...p.post_media].sort((a, b) => a.position - b.position)
  return <article className="post">
    <div className="ph"><Avatar p={p.author} size={46} onClick={() => openProfile(p.author.id)} />
      <div style={{ flex: 1 }}><b>{p.author.display_name}{p.author.is_verified && <span className="ver">✔</span>}</b><small>@{p.author.username} · {ago(p.created_at)}{p.audience !== 'public' && ' · ' + p.audience.replace('_', ' ')}</small></div></div>
    {p.body && <div className="cap" onClick={() => openPost?.(p.id)}>{p.body}</div>}
    {media.length > 0 && <div className="mgrid">{media.map(m => m.media_type === 'video'
      ? <video key={m.storage_path} src={mediaUrl(m.storage_path)} controls playsInline />
      : <img key={m.storage_path} src={mediaUrl(m.storage_path)} alt="" loading="lazy" onClick={() => openPost?.(p.id)} />)}</div>}
    {p.post_reactions.length > 0 && <div className="sum">{top} {p.post_reactions.length}</div>}
    <div className="act">
      <button onClick={() => openPost?.(p.id, true)}>💬 {p.comments[0]?.count || 0}</button>
      <button className={rp ? 'on' : ''} onClick={() => toggle('reposts', rp)}>🔁 {p.reposts.length}</button>
      <button className={mine ? 'on' : ''} onClick={() => setPick(!pick)}>{mine ? REACTIONS[mine.reaction_id][1] + ' ' + REACTIONS[mine.reaction_id][0] : '🤍 React'}</button>
      <button className={bm ? 'on' : ''} onClick={() => toggle('bookmarks', bm)} aria-label="Bookmark">{bm ? '🔖' : '🏷️'}</button>
      {pick && <div className="picker">{REACTIONS.map((r, i) => <button key={i} title={r[0]} aria-label={r[0]} onClick={() => react(i)}>{r[1]}</button>)}</div>}
    </div></article>
}
