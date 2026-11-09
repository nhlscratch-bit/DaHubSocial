import { useEffect, useMemo, useRef, useState } from 'react'
import { sb, SEL, upload, hiddenIds, friendly } from './supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
import { FEATURES } from './features'
import { RCAT } from './roomsEngine'
const RULES = ['18+ only. Never post or share anyone under 18, real or not. We report it to NCMEC and law enforcement.',
  'Consent always. Only post people who agreed to be posted. No hidden cameras, leaks or revenge content.',
  'No buying or selling sex, escort ads or links to them.',
  'Nudity only from ID-verified creators, and it stays blurred until someone taps.',
  'Everything here stays inside After Dark. It never shows on Home, Discover, Shorts or Pulse.']
export const isNight = (d = new Date()) => d.getHours() >= 22 || d.getHours() < 4
function Gate({ st, done }) {
  const [dob, setDob] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function enter() {
    setErr(''); setBusy(true)
    const { error } = st?.confirmed ? await sb.rpc('ad_set', { p_on: true }) : await sb.rpc('ad_confirm', { p_birth: dob })
    setBusy(false); if (error) return setErr(friendly(error)); done()
  }
  const max = new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10)
  return <div className="adgate"><div className="admoon">🌙</div><h2>After Dark</h2><p>DAHUB’s 18+ space for grown conversation, nightlife and adult content. It’s off unless you turn it on.</p>
    <ul>{RULES.map(r => <li key={r}>{r}</li>)}</ul>
    {!st?.confirmed && <label className="adl">Your date of birth<input type="date" value={dob} max={max} onChange={e => setDob(e.target.value)} /></label>}
    <label className="adck"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I’m 18 or older and I agree to the After Dark rules.</label>
    {err && <p className="msg" role="alert">{err}</p>}
    <button className="gobtn" disabled={busy || !ok || (!st?.confirmed && !dob)} onClick={enter}>{busy ? 'Checking…' : st?.confirmed ? 'Turn After Dark back on' : 'Enter After Dark'}</button>
    <small>Your date of birth is private. Once saved it can’t be changed without contacting DAHUB. Lying about your age gets your account banned.</small></div>
}
function Composer({ me, profile, creator, posted }) {
  const [text, setText] = useState(''), [files, setFiles] = useState([]), [nude, setNude] = useState(false), [aud, setAud] = useState('public'), [busy, setBusy] = useState(false), [err, setErr] = useState(''), inp = useRef()
  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]); useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls])
  async function go() {
    if (!text.trim() && !files.length) return; setBusy(true); setErr('')
    try {
      const kind = files.some(f => f.type.startsWith('video')) ? 'video' : files.length ? 'photo' : 'text'
      const { data: p, error } = await sb.from('posts').insert({ author_id: me.id, body: text.trim(), kind, audience: aud, after_dark: true, sensitive: nude && files.length > 0 }).select('id').single(); if (error) throw error
      for (const [i, f] of files.entries()) { const path = await upload('after-dark', me.id, f); const { error: me2 } = await sb.from('post_media').insert({ post_id: p.id, storage_path: path, media_type: f.type.startsWith('video') ? 'video' : 'image', position: i, bucket: 'after-dark' }); if (me2) throw me2 }
      setText(''); setFiles([]); setNude(false); posted()
    } catch (e) { setErr(friendly(e)) } finally { setBusy(false) }
  }
  return <div className="adcomp"><div className="crow"><Avatar p={profile} size={40} /><textarea value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Say it After Dark…" aria-label="After Dark post" /></div>
    {files.length > 0 && <div className="thumbs">{files.map((x, i) => <div className="th" key={i}>{x.type.startsWith('video') ? <video src={urls[i] + '#t=0.1'} muted playsInline /> : <img src={urls[i]} alt="" />}<button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label="Remove">✕</button></div>)}</div>}
    <div className="crow sub"><button className="wb sm" onClick={() => inp.current.click()}>+ Photo/Video</button>
      <select value={aud} onChange={e => setAud(e.target.value)} aria-label="Audience"><option value="public">Everyone in After Dark</option><option value="followers">Followers in After Dark</option></select>
      <input ref={inp} type="file" hidden multiple accept="image/*,video/*" onChange={e => { const n = [...e.target.files]; e.target.value = ''; setFiles(f => [...f, ...n].slice(0, 4)) }} /></div>
    {files.length > 0 && FEATURES.adNudity && (creator ? <label className="adck"><input type="checkbox" checked={nude} onChange={e => setNude(e.target.checked)} /> Contains nudity (blurred until tapped). Everyone shown is 18+ and agreed to this.</label>
      : <small className="adsm">No nudity. Only ID-verified creators can post it. Posting nudity without verification gets removed.</small>)}
    {err && <p className="msg" role="alert">{err}</p>}
    <button className="gobtn sm" disabled={busy || (!text.trim() && !files.length)} onClick={go}>{busy ? 'Posting…' : 'Post After Dark'}</button></div>
}
export default function AfterDark({ me, profile, back, openPost, openProfile, openRoom, openEvent }) {
  const [st, setSt] = useState(undefined), [tab, setTab] = useState('feed'), [posts, setPosts] = useState(null), [tn, setTn] = useState(null), [err, setErr] = useState(''), [menu, setMenu] = useState(false)
  const status = async () => { const { data, error } = await sb.rpc('ad_status'); if (error) return setErr(friendly(error)); setSt(data) }
  const load = async () => { setErr(''); const { data, error } = await sb.from('posts').select(SEL).eq('after_dark', true).order('created_at', { ascending: false }).limit(40); if (error) return setErr(friendly(error)); const hid = await hiddenIds(); setPosts((data || []).filter(p => !hid.has(p.author.id))) }
  const loadT = async () => {
    const until = new Date(Date.now() + 12 * 3600e3).toISOString()
    const [r, e] = await Promise.all([sb.rpc('list_rooms'), sb.from('events').select('id,title,venue,neighborhood,starts_at').eq('cancelled', false).gte('starts_at', new Date(Date.now() - 3 * 3600e3).toISOString()).lte('starts_at', until).order('starts_at').limit(20)])
    setTn({ rooms: r.data?.live || [], events: e.data || [] })
  }
  useEffect(() => { status() }, [])
  useEffect(() => { if (st?.ok) { load(); loadT() } }, [st?.ok])
  const off = async () => { setMenu(false); if (!confirm('Turn off After Dark? Its posts will be hidden from you until you turn it back on.')) return; const { error } = await sb.rpc('ad_set', { p_on: false }); if (error) return setErr(friendly(error)); back() }
  return <div className="sheet adpg"><div className="bar adbar"><button onClick={back} aria-label="Back">←</button><span style={{ flex: 1 }}>🌙 After Dark{isNight() && <small className="adopen"> · open late</small>}</span>{st?.ok && <button className="ib" onClick={() => setMenu(!menu)} aria-label="After Dark settings">⋯</button>}</div>
    {menu && <div className="pmenu admenu"><button onClick={off}>Turn off After Dark</button><button onClick={() => { setMenu(false); setTab('rules') }}>Rules</button><button onClick={() => setMenu(false)}>Cancel</button></div>}
    <div className="sbody">
      {st === undefined && !err && <div className="skel"><i /><i /></div>}
      {err && <p className="msg" role="alert">{err} <button className="link" onClick={() => { status(); st?.ok && load() }}>Retry</button></p>}
      {st && !st.ok && <Gate st={st} done={status} />}
      {st?.ok && <>
        <div className="chips">{[['feed', 'Feed'], ['tonight', 'Tonight'], ['rules', 'Rules']].map(([k, l]) => <button key={k} className="chipb" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === 'feed' && <><Composer me={me} profile={profile} creator={st.creator} posted={load} />
          {posts === null && <div className="skel"><i /><i /></div>}
          {posts?.length === 0 && <div className="empty">Quiet tonight. Be the first to post After Dark.</div>}
          <div style={{ paddingBottom: 140 }}>{posts?.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}</div></>}
        {tab === 'tonight' && <div className="adt2" style={{ paddingBottom: 140 }}>
          <h3>Live rooms now</h3>{!tn ? <div className="skel"><i /></div> : tn.rooms.length ? tn.rooms.map(r => <button key={r.id} className="gl prow" onClick={() => openRoom(r.id)}><Avatar p={r.host} size={44} /><span className="evi"><b>{r.title}</b><small>#{RCAT[r.category]} · 🎧 {r.listeners}</small></span></button>) : <p className="pnote">No live rooms right now.</p>}
          <h3>Happening in the next 12 hours</h3>{tn && (tn.events.length ? tn.events.map(e => <button key={e.id} className="gl prow" onClick={() => openEvent(e.id)}><span className="pth" style={{ width: 44, height: 44 }}>📅</span><span className="evi"><b>{e.title}</b><small>{new Date(e.starts_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}{e.venue && ' · ' + e.venue}</small></span></button>) : <p className="pnote">No events coming up tonight.</p>)}
          <button className="wb sm" style={{ margin: '12px 14px' }} onClick={loadT}>Refresh</button></div>}
        {tab === 'rules' && <div className="adgate"><h3>After Dark rules</h3><ul>{RULES.map(r => <li key={r}>{r}</li>)}</ul><small>See something that breaks these? Use Report on the post. Reports about minors or non-consent hide the post right away until DAHUB reviews it.</small></div>}
      </>}
    </div></div>
}
