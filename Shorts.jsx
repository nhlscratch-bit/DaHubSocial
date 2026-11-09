import { useCallback, useEffect, useRef, useState } from 'react'
import { sb, SEL, mediaUrl, hiddenIds, friendly } from './supabase'
import Avatar from './Avatar'
import I from './Icons'
import ReportSheet from './ReportSheet'
import Verified from './Verified'
let sound = true
const vid = p => [...p.post_media].sort((a, b) => a.position - b.position).find(m => m.media_type === 'video')
export default function Shorts({ me, active, openPost, openProfile, goCreate }) {
  const [tab, setTab] = useState('for'), [items, setItems] = useState(null), [err, setErr] = useState(''), [cur, setCur] = useState(0), [rel, setRel] = useState({}), [rep, setRep] = useState(null), [menu, setMenu] = useState(null), [muted, setMuted] = useState(false)
  const box = useRef()
  const load = useCallback(async () => {
    setErr(''); setItems(null); setCur(0); box.current && (box.current.scrollTop = 0)
    const { data: f } = await sb.from('follows').select('followee_id,status').eq('follower_id', me.id); setRel(Object.fromEntries((f || []).map(x => [x.followee_id, x.status])))
    let q = sb.from('posts').select(SEL).eq('after_dark', false).eq('kind', 'video').order('created_at', { ascending: false }).limit(40)
    if (tab === 'following') { const ids = (f || []).filter(x => x.status === 'accepted').map(x => x.followee_id); if (!ids.length) return setItems([]); q = q.in('author_id', ids) }
    const { data, error } = await q; if (error) return setErr(error.message)
    const hid = await hiddenIds(); setItems((data || []).filter(p => vid(p) && !hid.has(p.author.id)))
  }, [tab, me.id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (active) { const s = box.current; s && s.dispatchEvent(new Event('scroll')) } }, [active])
  const onScroll = e => { const i = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight); if (i !== cur) setCur(i) }
  async function follow(id) { const { error } = await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); error ? alert(friendly(error)) : setRel(r => ({ ...r, [id]: 'pending-or-accepted' })) }
  const block = async p => { setMenu(null); if (!confirm(`Block @${p.author.username}? You'll both be unfollowed and you won't see their posts.`)) return; const { error } = await sb.from('blocks').insert({ blocker_id: me.id, blocked_id: p.author.id }); error ? alert('Could not block: ' + error.message) : setItems(a => a.filter(x => x.author.id !== p.author.id)) }
  return <div className="shorts">
    <div className="shtabs">{[['for', 'For You'], ['following', 'Following']].map(([k, l]) => <button key={k} aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="shscroll" ref={box} onScroll={onScroll}>
      {err && <div className="shmsg"><p>{err}</p><button className="wb p sm" onClick={load}>Retry</button></div>}
      {items === null && !err && <div className="shmsg"><p>Loading…</p></div>}
      {items?.length === 0 && <div className="shmsg"><h3>{tab === 'following' ? 'No videos from people you follow yet' : 'No Shorts yet'}</h3><p>{tab === 'following' ? 'Follow creators to see their videos here.' : 'Be the first. Post a video and it shows up here.'}</p><button className="wb p" onClick={goCreate}>Post a video</button></div>}
      {items?.map((p, i) => <Slide key={p.id} p={p} me={me} on={active && i === cur} near={Math.abs(i - cur) <= 1} rel={rel[p.author.id]} muted={muted} setMuted={setMuted}
        openPost={openPost} openProfile={openProfile} follow={follow} more={() => setMenu(p)} />)}
      {items?.length > 0 && <div className="shslide shend"><p>You're all caught up</p><button className="wb p sm" onClick={load}>Refresh</button></div>}
    </div>
    {menu && <div className="scrim" onClick={() => setMenu(null)}><div className="msheet" onClick={e => e.stopPropagation()}>
      {menu.author.id !== me.id && <><button className="wb" onClick={() => { setRep(menu); setMenu(null) }}>Report</button><button className="wb" onClick={() => block(menu)}>Block @{menu.author.username}</button></>}
      <button className="wb" onClick={() => setMenu(null)}>Cancel</button></div></div>}
    {rep && <ReportSheet me={me} type="post" targetId={rep.id} reportedUser={rep.author.id} close={() => setRep(null)} />}
  </div>
}

function Slide({ p, me, on, near, rel, muted, setMuted, openPost, openProfile, follow, more }) {
  const v = useRef(), [paused, setPaused] = useState(false), [pct, setPct] = useState(0), [port, setPort] = useState(true), [heart, setHeart] = useState(false), [rx, setRx] = useState(p.post_reactions), tap = useRef(0), timer = useRef()
  const mine = rx.find(r => r.user_id === me.id), src = mediaUrl(vid(p).storage_path)
  useEffect(() => {
    const el = v.current; if (!el) return
    if (on && !paused) { el.muted = !sound || muted; el.play().catch(() => { el.muted = true; setMuted(true); el.play().catch(() => {}) }) } else el.pause()
    if (!on) { el.currentTime = 0; setPaused(false) }
  }, [on, paused, near])
  async function like(force) {
    if (mine) { if (force) return; setRx(r => r.filter(x => x.user_id !== me.id)); await sb.from('post_reactions').delete().eq('post_id', p.id).eq('user_id', me.id) }
    else { setRx(r => [...r, { user_id: me.id, reaction_id: 0 }]); const { error } = await sb.from('post_reactions').insert({ post_id: p.id, user_id: me.id, reaction_id: 0 }); if (error) setRx(p.post_reactions) }
  }
  const press = () => {
    const now = Date.now()
    if (now - tap.current < 300) { clearTimeout(timer.current); tap.current = 0; like(true); setHeart(true); setTimeout(() => setHeart(false), 700); return }
    tap.current = now; timer.current = setTimeout(() => { sound = true; if (muted) { setMuted(false); if (v.current) v.current.muted = false } else setPaused(x => !x) }, 300)
  }
  const share = async () => { const u = location.origin + '/?post=' + p.id; try { navigator.share ? await navigator.share({ title: 'DAHUB', url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  const own = p.author.id === me.id
  return <div className="shslide">
    {near ? <video ref={v} src={src + '#t=0.1'} loop playsInline preload={on ? 'auto' : 'metadata'} className={port ? 'cover' : ''} onClick={press}
      onLoadedMetadata={e => setPort(e.target.videoHeight >= e.target.videoWidth * 0.9)} onTimeUpdate={e => setPct(e.target.duration ? e.target.currentTime / e.target.duration * 100 : 0)} /> : <div className="shph" />}
    {paused && <div className="shpause">▶</div>}{muted && on && <div className="shsnd">🔇 Tap for sound</div>}{heart && <div className="shheart">❤️</div>}
    <div className="shrail">
      <div className="shav"><Avatar p={p.author} size={52} onClick={() => openProfile(p.author.id)} />{!own && !rel && <button className="shfol" onClick={() => follow(p.author.id)} aria-label="Follow">+</button>}</div>
      <button className={mine ? 'on' : ''} onClick={() => like(false)} aria-label="Like"><I n="heart" s={32} fill={!!mine} /><small>{rx.length}</small></button>
      <button onClick={() => openPost(p.id, true)} aria-label="Comments"><I n="comment" s={32} /><small>{p.comments[0]?.count || 0}</small></button>
      <button onClick={share} aria-label="Share"><I n="share" s={30} /><small>Share</small></button>
      <button onClick={more} aria-label="More"><I n="more" s={30} /></button></div>
    <div className="shinfo"><b onClick={() => openProfile(p.author.id)}>@{p.author.username}{p.author.is_verified && <Verified />}</b>
      {p.body && <p>{p.body.split(/(#\w+)/g).map((x, i) => x.startsWith('#') ? <button key={i} className="shtag" onClick={() => window.dispatchEvent(new CustomEvent('open-tag', { detail: x.slice(1) }))}>{x}</button> : x)}</p>}</div>
    <i className="shbar"><b style={{ width: pct + '%' }} /></i></div>
}
