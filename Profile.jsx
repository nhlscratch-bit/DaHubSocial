import { FEATURES } from './features'
import Shoutouts from './Shoutouts'
import wm from './wordmark.png'
import wp from './wallpaper.png'
import { useEffect, useState } from 'react'
import { sb, SEL, mediaUrl, friendly } from './supabase'
import { ACCT } from './media'
import Avatar from './Avatar'
import I from './Icons'
import EditProfile from './EditProfile'
import Spotlight from './Spotlight'
import ReportSheet from './ReportSheet'
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n
const B = [[0, 26, 40], [26, 18, 62], [44, 30, 48], [74, 16, 78], [90, 28, 52], [118, 20, 36], [138, 34, 70], [172, 18, 44], [190, 26, 86], [216, 22, 58], [238, 30, 40], [268, 20, 72], [288, 28, 50], [316, 24, 64], [340, 30, 44], [370, 20, 56]]
function Skyline() {
  return <svg className="sky" viewBox="0 0 390 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3f4a" /><stop offset="1" stopColor="#0b161c" /></linearGradient></defs>
    {B.map(([x, w, h], i) => <g key={i}><rect x={x} y={100 - h} width={w} height={h} fill="url(#sg)" />{Array.from({ length: Math.floor(h / 12) }, (_, j) => <rect key={j} x={x + 4 + (j % 2) * 9} y={100 - h + 6 + j * 12} width="3" height="4" fill="#00d1d1" opacity={(i + j) % 3 ? 0.35 : 0.95} />)}</g>)}</svg>
}
const TABS = ['Posts', 'Photos', 'Videos', 'Likes', 'Shoutouts']
export default function Profile({ openPassport, id, me, back, openSettings, openPost, openDM, openProfile, onUpdated }) {
  const [pr, setPr] = useState(null), [posts, setPosts] = useState([]), [likes, setLikes] = useState([]), [rel, setRel] = useState(null), [n, setN] = useState({ f: 0, g: 0, p: 0 })
  const [tab, setTab] = useState('Posts'), [menu, setMenu] = useState(false), [rep, setRep] = useState(false), [bm, setBm] = useState({ b: false, m: false }), [edit, setEdit] = useState(false), [sc, setSc] = useState(false), own = id === me.id
  const load = async () => {
    const { data } = await sb.from('profiles').select('*').eq('id', id).single(); setPr(data)
    const { data: ps } = await sb.from('posts').select(SEL).eq('author_id', id).order('created_at', { ascending: false }); setPosts(ps || [])
    const c = (col) => sb.from('follows').select('*', { count: 'exact', head: true }).eq(col, id).eq('status', 'accepted')
    const [a, b] = await Promise.all([c('followee_id'), c('follower_id')]); setN({ f: a.count || 0, g: b.count || 0, p: (ps || []).length })
    if (!own) { const [b, m] = await Promise.all([sb.from('blocks').select('blocked_id').eq('blocker_id', me.id).eq('blocked_id', id).maybeSingle(), sb.from('mutes').select('muted_id').eq('muter_id', me.id).eq('muted_id', id).maybeSingle()]); setBm({ b: !!b.data, m: !!m.data }) }
    if (!own) { const { data: r } = await sb.from('follows').select('status').eq('follower_id', me.id).eq('followee_id', id).maybeSingle(); setRel(r?.status || null) }
  }
  useEffect(() => { load() }, [id])
  useEffect(() => { document.body.classList.toggle('hidenav', edit); return () => document.body.classList.remove('hidenav') }, [edit])
  useEffect(() => { if (tab !== 'Likes') return; (async () => {
    const { data: r } = await sb.from('post_reactions').select('post_id').eq('user_id', id).order('created_at', { ascending: false }).limit(60)
    const ids = (r || []).map(x => x.post_id); if (!ids.length) return setLikes([])
    const { data: ps } = await sb.from('posts').select(SEL).in('id', ids); setLikes(ps || []) })() }, [tab, id])
  async function follow() { const { error } = rel ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); if (error) alert(friendly(error)); load() }
  async function toggleMute() { setMenu(false); bm.m ? await sb.from('mutes').delete().eq('muter_id', me.id).eq('muted_id', id) : await sb.from('mutes').insert({ muter_id: me.id, muted_id: id }); load() }
  async function toggleBlock() {
    setMenu(false)
    if (bm.b) { await sb.from('blocks').delete().eq('blocker_id', me.id).eq('blocked_id', id); return load() }
    if (!confirm(`Block @${pr.username}? They won't be able to follow you or find you, and you'll both be unfollowed.`)) return
    const { error } = await sb.from('blocks').insert({ blocker_id: me.id, blocked_id: id }); error ? alert('Could not block: ' + error.message) : back()
  }
  const share = async () => { const u = location.origin + '/?profile=' + id; try { navigator.share ? await navigator.share({ title: pr.display_name, url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  if (!pr) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Profile</div></div>
  const list = tab === 'Likes' ? likes : posts.filter(p => tab === 'Posts' || p.post_media.some(m => m.media_type === (tab === 'Photos' ? 'image' : 'video')))
  const cover = pr.cover_url && sb.storage.from('covers').getPublicUrl(pr.cover_url).data.publicUrl
  const joined = new Date(pr.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const tile = p => { const m = [...p.post_media].sort((a, b) => a.position - b.position)[0]
    return <button key={p.id} className="tile" onClick={() => openPost(p.id)}>
      {m ? (m.media_type === 'video' ? <video src={mediaUrl(m.storage_path)} muted playsInline /> : <img src={mediaUrl(m.storage_path)} alt="" loading="lazy" />) : <div className="ttext">{p.body}</div>}
      <div className="tstat"><span><I n="heart" s={16} /> {fmt(p.post_reactions.length)}</span><span><I n="comment" s={16} /> {fmt(p.comments[0]?.count || 0)}</span><span><I n="repost" s={16} /> {fmt(p.reposts.length)}</span><i><I n="more" s={18} /></i></div></button> }
  return <div className="sheet clear">
    <div className={'mini' + (sc ? ' on' : '')}><button className="ib" onClick={back} aria-label="Back"><I n="back" s={22} /></button><Avatar p={pr} size={34} /><b>{pr.display_name}</b>{own && <button className="wb sm" onClick={() => setEdit(true)}>Edit</button>}</div>
    <div className="sbody pbody" onScroll={e => setSc(e.currentTarget.scrollTop > 190)}>
    <div className="cover spotc">
      <Spotlight me={me} openProfile={openProfile} />
      <button className="ib cb" onClick={back} aria-label="Back"><I n="back" s={22} /></button>
      <button className="ib cb r" onClick={own ? openSettings : () => setMenu(true)} aria-label={own ? 'Settings and activity' : 'More'}>{own ? <I n="menu" s={22} /> : <I n="more" s={22} />}</button></div>
    <div className="pbg">
      <div className="avw"><Avatar p={pr} size={116} />{pr.is_verified && <span className="vb"><I n="check" s={18} /></span>}</div>
      <div className="ptext"><h2>{pr.display_name}</h2><small>@{pr.username}</small>{pr.account_type && pr.account_type !== 'standard' && <span className={'acct ' + pr.account_type}>{pr.account_type === 'official' ? '★ ' : '✔ '}{ACCT[pr.account_type]}</span>}{pr.bio && <p className="bio">{pr.bio}</p>}
        <div className="meta">{pr.location && <span><I n="pin" s={15} /> {pr.location}</span>}{pr.link && <a href={/^https?:/.test(pr.link) ? pr.link : 'https://' + pr.link} target="_blank" rel="noreferrer"><I n="link" s={15} /> {pr.link.replace(/^https?:\/\//, '')}</a>}<span><I n="cal" s={15} /> Joined {joined}</span></div></div>
      <div className="srow"><div className="stats"><div><b>{fmt(n.f)}</b>Followers</div><div><b>{fmt(n.g)}</b>Following</div><div><b>{fmt(n.p)}</b>Posts</div></div>
        {own && <><button className="wb sm" onClick={() => setEdit(true)}>Edit Profile</button><button className="go" onClick={share} aria-label="Share profile"><I n="send" s={18} fill /></button></>}</div>
      {FEATURES.passport && <div className="acts"><button className="wb" onClick={() => openPassport?.(id)}>🪪 Clout Passport</button></div>}
      {!own && <div className="acts"><button className="wb p" onClick={follow}><I n="userplus" s={20} /> {rel === 'accepted' ? 'Following' : rel === 'pending' ? 'Requested' : 'Follow'}</button>
        <button className="wb" onClick={() => openDM(id)}><I n="comment" s={20} /> Message</button><button className="wb" onClick={share}><I n="share" s={20} /> Share</button></div>}
      {own && <div className="hl"><button className="st" onClick={() => window.dispatchEvent(new Event('add-story'))}><span className="ring plain"><I n="plus" s={26} /></span><small>Add Story</small></button></div>}</div>
    <div className="ptabs">{TABS.map(t => <button key={t} aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
    {tab === 'Shoutouts' ? <Shoutouts id={id} me={me} openProfile={openProfile} /> : <><div className="grid">{list.map(tile)}</div>
    {!list.length && <div className="empty">Nothing here yet.</div>}</>}</div>
    {menu && <div className="scrim" onClick={() => setMenu(false)}><div className="msheet" onClick={e => e.stopPropagation()}>
      <button className="wb" onClick={() => { setMenu(false); share() }}>Share profile</button>
      <button className="wb" onClick={toggleMute}>{bm.m ? 'Unmute' : 'Mute'} @{pr.username}</button>
      <button className="wb" onClick={toggleBlock}>{bm.b ? 'Unblock' : 'Block'} @{pr.username}</button>
      <button className="wb" onClick={() => { setMenu(false); setRep(true) }}>Report @{pr.username}</button>
      <button className="wb" onClick={() => setMenu(false)}>Cancel</button></div></div>}
    {rep && <ReportSheet me={me} type="profile" targetId={id} reportedUser={id} close={() => setRep(false)} />}
    {edit && <EditProfile pr={pr} me={me} close={() => setEdit(false)} saved={() => { load(); onUpdated?.() }} />}</div>
}
