import { useEffect, useState } from 'react'
import { sb, SEL, mediaUrl } from './supabase'
import { ACCT, ytId } from './media'
import Avatar from './Avatar'
import ReportSheet from './ReportSheet'
export const THEMES = { ocean: 'Ocean', sunset: 'Sunset', midnight: 'Midnight', neon: 'Neon', gold: 'Gold', forest: 'Forest', rose: 'Rose', steel: 'Steel' }
export const FRAMES = { glass: 'Glass', foil: 'Foil', neon: 'Neon', chrome: 'Chrome' }
export const DEFAULT = { theme: 'ocean', frame: 'glass', accent: '#1b9fb2', tagline: '', role_label: '', skills: [], seeking: '', stickers: [], song_url: '', song_title: '', buttons: [{ label: 'Message', kind: 'message' }], featured_posts: [], is_public: true }
export function Card({ pr, pp, stats, openDM, openOpps, children }) {
  const [play, setPlay] = useState(false), id = ytId(pp.song_url)
  const act = b => b.kind === 'message' ? openDM?.(pr.id) : b.kind === 'opps' ? openOpps?.() : b.kind === 'link' && /^https?:\/\//.test(b.url || '') ? window.open(b.url, '_blank', 'noopener') : null
  return <div className={`ppc pp-t-${pp.theme} pp-f-${pp.frame}`} style={{ '--ac': pp.accent }}>
    {pp.stickers.map((s, i) => <span key={i} className={'pps p' + i} style={{ animationDelay: i * 0.4 + 's' }} aria-hidden>{s}</span>)}
    <div className="ppid"><Avatar p={pr} size={96} /><h2>{pr.display_name}{pr.is_verified && <span className="ver">✔</span>}</h2><small>@{pr.username}</small>
      {(pp.role_label || (pr.account_type && pr.account_type !== 'standard')) && <span className="ppr">{pp.role_label || ACCT[pr.account_type]}</span>}
      {pp.tagline && <p className="ppt">{pp.tagline}</p>}</div>
    {pp.skills.length > 0 && <div className="ppsk">{pp.skills.map(s => <i key={s}>{s}</i>)}</div>}
    {pp.seeking && <p className="pps2"><b>Looking for</b>{pp.seeking}</p>}
    {pp.song_url && id && <div className="ppsong">{play ? <iframe title="Song" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`} allow="autoplay; encrypted-media" allowFullScreen /> : <button onClick={() => setPlay(true)}>▶ {pp.song_title || 'Play my song'}</button>}</div>}
    <div className="ppstat"><div><b>{stats.posts}</b>Posts</div><div><b>{stats.followers}</b>Followers</div><div><b>{new Date(pr.created_at).toLocaleDateString([], { month: 'short', year: 'numeric' })}</b>Joined</div></div>
    <small className="ppnote">Counts measured by DAHUB. Words and links are written by the member.</small>
    {pp.buttons.length > 0 && <div className="ppbtn">{pp.buttons.map((b, i) => <button key={i} onClick={() => act(b)}>{b.label}</button>)}</div>}
    {children}</div>
}
export default function Passport({ id, me, back, edit, openPost, openDM, openOpps, openProfile }) {
  const [pr, setPr] = useState(null), [pp, setPp] = useState(null), [stats, setStats] = useState({ posts: 0, followers: 0 }), [posts, setPosts] = useState([]), [err, setErr] = useState(''), [rep, setRep] = useState(false)
  useEffect(() => { (async () => {
    const { data: p } = await sb.from('profiles').select('*').eq('id', id).maybeSingle(); if (!p) return setErr('Passport not found.'); setPr(p)
    const { data: q } = await sb.from('passports').select('*').eq('user_id', id).maybeSingle(); setPp({ ...DEFAULT, ...(q || {}), has: !!q })
    const [a, b] = await Promise.all([sb.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', id), sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', id).eq('status', 'accepted')]); setStats({ posts: a.count || 0, followers: b.count || 0 })
    const ids = q?.featured_posts || []; if (ids.length) { const { data } = await sb.from('posts').select(SEL).in('id', ids); setPosts(ids.map(x => (data || []).find(y => y.id === x)).filter(Boolean)) }
  })() }, [id])
  const share = async () => { const u = location.origin + '/?passport=' + id; try { navigator.share ? await navigator.share({ title: pr.display_name + ' on DAHUB', url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  if (err) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Passport</div><div className="sbody"><div className="empty">{err}</div></div></div>
  if (!pr || !pp) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Passport</div><div className="sbody"><div className="skel"><i /><i /></div></div></div>
  const own = id === me.id, thumb = p => { const m = [...p.post_media].sort((a, b) => a.position - b.position)[0]; return m && m.media_type === 'image' ? mediaUrl(m.storage_path) : null }
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Clout Passport</div><div className="sbody" style={{ paddingBottom: 120 }}>
    {!pp.is_public && !own ? <div className="empty">This Passport is private.</div> : <>
      <Card pr={pr} pp={pp} stats={stats} openDM={openDM} openOpps={openOpps} />
      {posts.length > 0 && <><h4 className="sec">Featured work</h4><div className="ppwork">{posts.map(p => <button key={p.id} onClick={() => openPost(p.id)} style={thumb(p) ? { backgroundImage: `url(${thumb(p)})` } : undefined}>{!thumb(p) && <span>{(p.body || 'Post').slice(0, 60)}</span>}</button>)}</div></>}
      {own && !pp.has && <p className="hint" style={{ margin: '12px 14px' }}>This is the default card. Tap Customize to make it yours.</p>}
      <div className="evact"><button className="wb sm" onClick={share}>Share</button><button className="wb sm" onClick={() => openProfile(id)}>View profile</button>{own ? <button className="wb p sm" onClick={edit}>Customize</button> : <button className="wb sm" onClick={() => setRep(true)}>Report</button>}</div></>}
    {rep && <ReportSheet me={me} type="profile" targetId={id} reportedUser={id} close={() => setRep(false)} />}
  </div></div>
}
