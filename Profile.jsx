import wm from './wordmark.png'
import wp from './wallpaper.png'
import { useEffect, useState } from 'react'
import { sb, SEL, mediaUrl } from './supabase'
import Avatar from './Avatar'
import I from './Icons'
import EditProfile from './EditProfile'
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n
const TABS = ['Posts', 'Photos', 'Videos', 'Likes', 'Tagged']
export default function Profile({ id, me, back, openPost, openDM, onUpdated }) {
  const [pr, setPr] = useState(null), [posts, setPosts] = useState([]), [likes, setLikes] = useState([]), [rel, setRel] = useState(null), [n, setN] = useState({ f: 0, g: 0, p: 0 })
  const [tab, setTab] = useState('Posts'), [edit, setEdit] = useState(false), own = id === me.id
  const load = async () => {
    const { data } = await sb.from('profiles').select('*').eq('id', id).single(); setPr(data)
    const { data: ps } = await sb.from('posts').select(SEL).eq('author_id', id).order('created_at', { ascending: false }); setPosts(ps || [])
    const c = (col) => sb.from('follows').select('*', { count: 'exact', head: true }).eq(col, id).eq('status', 'accepted')
    const [a, b] = await Promise.all([c('followee_id'), c('follower_id')]); setN({ f: a.count || 0, g: b.count || 0, p: (ps || []).length })
    if (!own) { const { data: r } = await sb.from('follows').select('status').eq('follower_id', me.id).eq('followee_id', id).maybeSingle(); setRel(r?.status || null) }
  }
  useEffect(() => { load() }, [id])
  useEffect(() => { if (tab !== 'Likes') return; (async () => {
    const { data: r } = await sb.from('post_reactions').select('post_id').eq('user_id', id).order('created_at', { ascending: false }).limit(60)
    const ids = (r || []).map(x => x.post_id); if (!ids.length) return setLikes([])
    const { data: ps } = await sb.from('posts').select(SEL).in('id', ids); setLikes(ps || []) })() }, [tab, id])
  async function follow() { rel ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); load() }
  const share = async () => { const u = location.origin; try { navigator.share ? await navigator.share({ title: pr.display_name, url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  if (!pr) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Profile</div></div>
  const list = tab === 'Likes' ? likes : tab === 'Tagged' ? [] : posts.filter(p => tab === 'Posts' || p.post_media.some(m => m.media_type === (tab === 'Photos' ? 'image' : 'video')))
  const cover = pr.cover_url && sb.storage.from('covers').getPublicUrl(pr.cover_url).data.publicUrl
  const joined = new Date(pr.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const tile = p => { const m = [...p.post_media].sort((a, b) => a.position - b.position)[0]
    return <button key={p.id} className="tile" onClick={() => openPost(p.id)}>
      {m ? (m.media_type === 'video' ? <video src={mediaUrl(m.storage_path)} muted playsInline /> : <img src={mediaUrl(m.storage_path)} alt="" loading="lazy" />) : <div className="ttext">{p.body}</div>}
      <div className="tstat"><span><I n="heart" s={16} /> {fmt(p.post_reactions.length)}</span><span><I n="comment" s={16} /> {fmt(p.comments[0]?.count || 0)}</span><span><I n="repost" s={16} /> {fmt(p.reposts.length)}</span><i><I n="more" s={18} /></i></div></button> }
  return <div className="sheet"><div className="sbody">
    <div className="cover" style={{ backgroundImage: `url(${cover || wp})` }}>
      {!cover && <div className="cbrand"><img src={wm} alt="DAHUB" /><span>ONE HUB. EVERY SIDE OF LIFE.</span></div>}
      <button className="ib cb" onClick={back} aria-label="Back"><I n="back" s={22} /></button>
      <button className="ib cb r" onClick={own ? () => setEdit(true) : share} aria-label={own ? 'Edit cover' : 'More'}>{own ? <I n="camera" s={22} /> : <I n="more" s={22} />}</button></div>
    <div className="pinfo"><div className="prow1"><div className="avw"><Avatar p={pr} size={112} />{pr.is_verified && <span className="vb">✔</span>}</div>
      <div className="ptext"><h2>{pr.display_name}</h2><small>@{pr.username}</small>{pr.bio && <p className="bio">{pr.bio}</p>}
        <div className="meta">{pr.location && <span><I n="pin" s={15} /> {pr.location}</span>}{pr.link && <a href={/^https?:/.test(pr.link) ? pr.link : 'https://' + pr.link} target="_blank" rel="noreferrer"><I n="link" s={15} /> {pr.link.replace(/^https?:\/\//, '')}</a>}<span><I n="cal" s={15} /> Joined {joined}</span></div></div></div>
      <div className="srow"><div className="stats"><div><b>{fmt(n.f)}</b>Followers</div><div><b>{fmt(n.g)}</b>Following</div><div><b>{fmt(n.p)}</b>Posts</div></div>
        {own && <><button className="wb sm" onClick={() => setEdit(true)}>Edit Profile</button><button className="go" onClick={share} aria-label="Share profile"><I n="send" s={18} fill /></button></>}</div>
      {!own && <div className="acts"><button className="wb p" onClick={follow}><I n="userplus" s={20} /> {rel === 'accepted' ? 'Following' : rel === 'pending' ? 'Requested' : 'Follow'}</button>
        <button className="wb" onClick={() => openDM(id)}><I n="comment" s={20} /> Message</button><button className="wb" onClick={share}><I n="share" s={20} /> Share</button></div>}
      {own && <div className="hl"><button className="st" onClick={() => alert('Stories are a later milestone.')}><span className="ring plain"><I n="plus" s={30} /></span><small>Add Story</small></button></div>}</div>
    <div className="ptabs">{TABS.map(t => <button key={t} aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className="grid">{list.map(tile)}</div>
    {!list.length && <div className="empty">{tab === 'Tagged' ? 'Tagging is coming soon.' : 'Nothing here yet.'}</div>}</div>
    {edit && <EditProfile pr={pr} me={me} close={() => setEdit(false)} saved={() => { load(); onUpdated?.() }} />}</div>
}
