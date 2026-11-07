import wm from './wordmark.png'
import { useEffect, useState } from 'react'
import { sb, SEL, upload, mediaUrl } from './supabase'
import Avatar from './Avatar'
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n
const TABS = ['Posts', 'Photos', 'Videos', 'Likes', 'Tagged']
export default function Profile({ id, me, back, openPost, openDM }) {
  const [pr, setPr] = useState(null), [posts, setPosts] = useState([]), [likes, setLikes] = useState([]), [rel, setRel] = useState(null), [n, setN] = useState({ f: 0, g: 0, p: 0 })
  const [tab, setTab] = useState('Posts'), [edit, setEdit] = useState(false), [form, setForm] = useState({}), [err, setErr] = useState(''), own = id === me.id
  const load = async () => {
    const { data } = await sb.from('profiles').select('*').eq('id', id).single(); setPr(data)
    setForm({ display_name: data?.display_name || '', bio: data?.bio || '', location: data?.location || '', link: data?.link || '' })
    const { data: ps } = await sb.from('posts').select(SEL).eq('author_id', id).order('created_at', { ascending: false }); setPosts(ps || [])
    const c = (t, col) => sb.from(t).select('*', { count: 'exact', head: true }).eq(col, id)
    const [a, b] = await Promise.all([c('follows', 'followee_id').eq('status', 'accepted'), c('follows', 'follower_id').eq('status', 'accepted')])
    setN({ f: a.count || 0, g: b.count || 0, p: (ps || []).length })
    if (!own) { const { data: r } = await sb.from('follows').select('status').eq('follower_id', me.id).eq('followee_id', id).maybeSingle(); setRel(r?.status || null) }
  }
  useEffect(() => { load() }, [id])
  useEffect(() => { if (tab !== 'Likes') return; (async () => {
    const { data: r } = await sb.from('post_reactions').select('post_id').eq('user_id', id).order('created_at', { ascending: false }).limit(60)
    const ids = (r || []).map(x => x.post_id); if (!ids.length) return setLikes([])
    const { data: ps } = await sb.from('posts').select(SEL).in('id', ids); setLikes(ps || []) })() }, [tab, id])
  async function follow() { rel ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); load() }
  async function save() { const { error } = await sb.from('profiles').update(form).eq('id', id); if (error) setErr(error.message); else { setEdit(false); load() } }
  const pic = col => async e => { const f = e.target.files[0]; if (!f) return; try { const path = await upload(col === 'avatar_url' ? 'avatars' : 'covers', me.id, f); await sb.from('profiles').update({ [col]: path }).eq('id', id); load() } catch (x) { setErr(x.message) } }
  const share = async () => { const u = location.origin; try { navigator.share ? await navigator.share({ title: pr.display_name, url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  if (!pr) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Profile</div></div>
  const list = tab === 'Likes' ? likes : tab === 'Tagged' ? [] : posts.filter(p => tab === 'Posts' || p.post_media.some(m => m.media_type === (tab === 'Photos' ? 'image' : 'video')))
  const cover = pr.cover_url && sb.storage.from('covers').getPublicUrl(pr.cover_url).data.publicUrl
  const joined = new Date(pr.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const tile = p => { const m = [...p.post_media].sort((a, b) => a.position - b.position)[0]
    return <button key={p.id} className="tile" onClick={() => openPost(p.id)}>
      {m ? (m.media_type === 'video' ? <video src={mediaUrl(m.storage_path)} muted playsInline /> : <img src={mediaUrl(m.storage_path)} alt="" loading="lazy" />) : <div className="ttext">{p.body}</div>}
      <div className="tstat"><span>♡ {fmt(p.post_reactions.length)}</span><span>💬 {fmt(p.comments[0]?.count || 0)}</span><span>🔁 {fmt(p.reposts.length)}</span></div></button> }
  return <div className="sheet"><div className="sbody">
    <div className="cover" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>{!cover && <img src={wm} alt="" />}
      <button className="ib cb" onClick={back} aria-label="Back">←</button>{own && <label className="ib cb r" aria-label="Change cover">📷<input type="file" accept="image/*" hidden onChange={pic('cover_url')} /></label>}</div>
    <div className="pinfo"><div className="prow1"><div className="avw"><Avatar p={pr} size={104} />{pr.is_verified && <span className="vb">✔</span>}</div>
      <div className="pname"><h2>{pr.display_name}</h2><small>@{pr.username}</small></div></div>
      {pr.bio && <p className="bio">{pr.bio}</p>}
      <div className="meta">{pr.location && <span>📍 {pr.location}</span>}{pr.link && <a href={/^https?:/.test(pr.link) ? pr.link : 'https://' + pr.link} target="_blank" rel="noreferrer">🔗 {pr.link.replace(/^https?:\/\//, '')}</a>}<span>🗓️ Joined {joined}</span></div>
      <div className="stats"><div><b>{fmt(n.f)}</b>Followers</div><div><b>{fmt(n.g)}</b>Following</div><div><b>{fmt(n.p)}</b>Posts</div></div>
      <div className="acts">{own ? <button className="wb" onClick={() => setEdit(!edit)}>Edit Profile</button> : <button className="wb p" onClick={follow}>{rel === 'accepted' ? '✓ Following' : rel === 'pending' ? 'Requested' : '+ Follow'}</button>}
        <button className="wb" onClick={() => own ? sb.auth.signOut() : openDM(id)}>{own ? 'Sign out' : '💬 Message'}</button><button className="wb" onClick={share}>↗ Share Profile</button></div>
      {edit && <div className="editf"><input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} maxLength={60} placeholder="Display name" aria-label="Display name" /><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} maxLength={300} placeholder="Bio" /><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location" /><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="Link" /><label className="link">Change avatar<input type="file" accept="image/*" hidden onChange={pic('avatar_url')} /></label><button className="wb p" onClick={save}>Save</button></div>}
      {err && <p className="msg">{err}</p>}</div>
    <div className="ptabs">{TABS.map(t => <button key={t} aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className="grid">{list.map(tile)}</div>
    {!list.length && <div className="empty">{tab === 'Tagged' ? 'Tagging is coming soon.' : 'Nothing here yet.'}</div>}</div></div>
}
