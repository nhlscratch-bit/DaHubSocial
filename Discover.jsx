import { useEffect, useState } from 'react'
import { sb, hiddenIds, friendly } from './supabase'
import Avatar from './Avatar'
import briefcase from './briefcase.png'
import Verified from './Verified'
import I from './Icons'
const KINDS = [['people', 'People', 'user'], ['posts', 'Posts', 'comment'], ['tags', 'Hashtags', 'tag'], ['events', 'Events', 'cal'], ['groups', 'Communities', 'people']]
// People search only. DAHUB never lists everyone: you find people by searching a name or @handle.
export default function Discover({ me, openProfile, openOpps, openPost, openEvent, openCommunity }) {
  const [kind, setKind] = useState('people'), [res, setRes] = useState([]),
  [q, setQ] = useState(''), [list, setList] = useState([]), [rel, setRel] = useState({}), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const s = q.replace(/[^\w ]/g, '').trim()
  const loadRel = async () => { const { data } = await sb.from('follows').select('followee_id,status').eq('follower_id', me.id); setRel(Object.fromEntries((data || []).map(x => [x.followee_id, x.status]))) }
  useEffect(() => { loadRel() }, [])
  // other search kinds: posts, hashtags, events, communities (public only, blocks respected)
  useEffect(() => {
    if (kind === 'people') return
    if (s.length < 2) { setRes([]); setErr(''); setBusy(false); return }
    setBusy(true)
    const t = setTimeout(async () => {
      const like = `%${s}%`, hid = await hiddenIds(); let out = [], error = null
      if (kind === 'posts') { const r = await sb.from('posts').select('id,body,created_at,author:profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified)').eq('after_dark', false).eq('audience', 'public').is('community_id', null).ilike('body', like).order('created_at', { ascending: false }).limit(25); error = r.error; out = (r.data || []).filter(p => !hid.has(p.author.id)) }
      if (kind === 'tags') { const tag = s.replace(/ /g, ''); const r = await sb.from('posts').select('body').eq('after_dark', false).eq('audience', 'public').ilike('body', `%#${tag}%`).order('created_at', { ascending: false }).limit(200); error = r.error
        const n = {}; for (const p of r.data || []) for (const m of p.body.matchAll(/#(\w{2,40})/g)) if (m[1].toLowerCase().startsWith(tag.toLowerCase())) n[m[1].toLowerCase()] = (n[m[1].toLowerCase()] || 0) + 1
        out = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([t, c]) => ({ id: t, t, c })) }
      if (kind === 'events') { const r = await sb.from('events').select('id,title,venue,neighborhood,starts_at,host_id').eq('cancelled', false).gte('starts_at', new Date(Date.now() - 6 * 3600e3).toISOString()).or(`title.ilike.${like},venue.ilike.${like},neighborhood.ilike.${like}`).order('starts_at').limit(25); error = r.error; out = (r.data || []).filter(e => !hid.has(e.host_id)) }
      if (kind === 'groups') { const r = await sb.from('communities').select('id,name,description,owner_id,community_members(count)').or(`name.ilike.${like},description.ilike.${like}`).limit(25); error = r.error; out = (r.data || []).filter(c => !hid.has(c.owner_id)) }
      setErr(error ? friendly(error) : ''); setRes(out); setBusy(false)
    }, 300)
    return () => clearTimeout(t)
  }, [s, kind])
  useEffect(() => {
    if (kind !== 'people') return
    if (s.length < 2) { setList([]); setErr(''); setBusy(false); return }
    setBusy(true)
    const t = setTimeout(async () => {
      const { data, error } = await sb.from('profiles').select('id,username,display_name,avatar_url,is_verified').neq('id', me.id)
        .or(`username.ilike.${s.replace(/ /g, '_')}%,display_name.ilike.${s}%`).limit(15)
      const hid = await hiddenIds(); setErr(error ? error.message : ''); setList((data || []).filter(x => !hid.has(x.id))); setBusy(false)
    }, 300)
    return () => clearTimeout(t)
  }, [s, kind])
  async function toggle(id) { const { error } = rel[id] ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); if (error) alert(friendly(error)); loadRel() }
  return <div className="disc"><h1 className="dmt">Discover</h1>
    <div className="isr"><input value={q} onChange={e => setQ(e.target.value)} placeholder={kind === 'people' ? '🔍 Search by name or @handle' : kind === 'tags' ? '🔍 Search hashtags' : '🔍 Search ' + KINDS.find(k => k[0] === kind)[1].toLowerCase()} aria-label="Search" autoCapitalize="none" autoCorrect="off" /></div>
    <div className="dkinds">{KINDS.map(([k, l, ic]) => <button key={k} aria-selected={kind === k} onClick={() => setKind(k)}><I n={ic} s={16} />{l}</button>)}</div>
    <button className="gl oppcard" onClick={openOpps}><img src={briefcase} alt="" className="obc" /><div><b>Opportunity Board</b><small>Get in the room: gigs, bookings, collabs</small></div></button>
    {s.length < 2 && <div className="onb"><h3>{kind === 'people' ? 'Find your people' : 'Search DAHUB'}</h3><p>{kind === 'people' ? 'Search a name or @handle to find someone. Your timeline starts when you follow people.' : 'Type at least 2 letters.'}</p></div>}
    {kind !== 'people' && s.length >= 2 && !busy && <div className="dres">{res.length === 0 && !err ? <div className="empty">Nothing found for "{q.trim()}".</div> : res.map(r =>
      kind === 'posts' ? <button key={r.id} className="drow dpost" onClick={() => openPost(r.id)}><Avatar p={r.author} size={40} /><div className="itx"><b>{r.author.display_name}{r.author.is_verified && <Verified />}</b><span>{r.body.slice(0, 140)}</span></div></button>
      : kind === 'tags' ? <button key={r.id} className="drow" onClick={() => window.dispatchEvent(new CustomEvent('open-tag', { detail: r.t }))}><span className="dtag">#</span><div className="itx"><b>#{r.t}</b><span>{r.c} recent {r.c === 1 ? 'post' : 'posts'}</span></div></button>
      : kind === 'events' ? <button key={r.id} className="drow" onClick={() => openEvent(r.id)}><span className="dtag"><I n="cal" s={22} /></span><div className="itx"><b>{r.title}</b><span>{new Date(r.starts_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}{r.venue ? ' · ' + r.venue : ''}</span></div></button>
      : <button key={r.id} className="drow" onClick={() => openCommunity(r.id)}><span className="dtag"><I n="people" s={22} /></span><div className="itx"><b>{r.name}</b><span>{r.community_members?.[0]?.count || 0} members{r.description ? ' · ' + r.description.slice(0, 60) : ''}</span></div></button>)}</div>}
    {err && <p className="msg">{err}</p>}{busy && <div className="skel"><i /></div>}
    {kind === 'people' && s.length >= 2 && !busy && list.map(p => <div key={p.id} className="drow"><Avatar p={p} size={56} onClick={() => openProfile(p.id)} />
      <div className="itx" onClick={() => openProfile(p.id)}><b>{p.display_name}{p.is_verified && <Verified />}</b><span>@{p.username}</span></div>
      <button className={'wb sm' + (rel[p.id] ? '' : ' p')} onClick={() => toggle(p.id)}>{rel[p.id] === 'accepted' ? 'Following' : rel[p.id] === 'pending' ? 'Requested' : 'Follow'}</button></div>)}
    {kind === 'people' && s.length >= 2 && !busy && !err && !list.length && <div className="empty">No one found for "{q.trim()}".</div>}</div>
}
