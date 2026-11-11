import { useEffect, useState } from 'react'
import { sb, friendly, ago } from './supabase'
import I from './Icons'
import Avatar from './Avatar'
import moon from './mi-afterdark.png'

// Live banner across Home: team announcements + a late-night nudge toward After Dark (11pm–4am, dismissible per night).
const KIND = { update: ['UPDATE', 'info'], live: ['LIVE', 'live'], message: ['MESSAGE', 'chat'], event: ['EVENT', 'cal2'], drop: ['NEW DROP', 'star'] }
export const LINKS = [['', 'No link'], ['afterdark', 'After Dark'], ['rooms', 'Live Rooms'], ['events', 'Events'], ['pulse', 'DAHUB Pulse'], ['arcade', 'Arcade'], ['opps', 'Opportunity Board'], ['media', 'Media'], ['communities', 'Communities'], ['submit', 'Get Featured']]
const lateNight = (d = new Date()) => d.getHours() >= 23 || d.getHours() < 4
const nightKey = () => { const d = new Date(); if (d.getHours() < 12) d.setDate(d.getDate() - 1); return 'dahub.adnudge.' + d.toISOString().slice(0, 10) }
const ls = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } }

export default function Banner({ go }) {
  const [items, setItems] = useState([]), [i, setI] = useState(0), [ad, setAd] = useState(null), [, tick] = useState(0)
  const load = async () => { const { data } = await sb.from('announcements').select('id,body,kind,link,created_at').eq('active', true).gt('ends_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(8); setItems(data || []) }
  useEffect(() => {
    load(); sb.rpc('ad_status').then(({ data }) => setAd(data || {}))
    const ch = sb.channel('banner').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load).subscribe()
    const t = setInterval(() => tick(x => x + 1), 60e3)
    return () => { sb.removeChannel(ch); clearInterval(t) }
  }, [])
  const nudge = lateNight() && ad && !ls.get(nightKey()) && (ad.ok ? null : { id: 'ad', kind: 'night', body: ad.confirmed ? 'After Dark is open. Turn it back on and slide through 🌙' : '18+? After Dark is open late. Tap in if you’re grown 🌙', link: 'afterdark' })
  const openAd = lateNight() && ad?.ok ? { id: 'adopen', kind: 'night', body: 'After Dark is open 🌙 See who’s up tonight', link: 'afterdark' } : null
  const list = [...items, ...(nudge ? [nudge] : openAd && !ls.get(nightKey()) ? [openAd] : [])]
  useEffect(() => { if (list.length < 2) return; const t = setInterval(() => setI(x => (x + 1) % list.length), 5500); return () => clearInterval(t) }, [list.length])
  if (!list.length) return null
  const cur = list[i % list.length], k = cur.kind === 'night' ? ['AFTER DARK', null] : KIND[cur.kind] || KIND.update
  const tap = () => { if (!cur.link) return; if (/^https?:\/\//.test(cur.link)) window.open(cur.link, '_blank', 'noopener'); else go(cur.link) }
  const dismissNight = e => { e.stopPropagation(); ls.set(nightKey(), '1'); setI(0); tick(x => x + 1) }
  return <div className={'hbanner k-' + cur.kind} role="status" aria-live="polite">
    <button className="hbmain" onClick={tap} key={cur.id}>
      <span className="hbtag">{k[1] ? <I n={k[1]} s={13} /> : <img src={moon} alt="" />}{cur.kind === 'live' && <u />}{k[0]}</span>
      <span className="hbtext">{cur.body}</span>
      {cur.link && <I n="chev" s={18} />}
    </button>
    {cur.kind === 'night' ? <button className="hbx" onClick={dismissNight} aria-label="Hide for tonight"><I n="x" s={16} /></button>
      : list.length > 1 && <span className="hbdots">{list.map((_, j) => <i key={j} className={j === i % list.length ? 'on' : ''} />)}</span>}
  </div>
}

// Team screen: post to the banner, manage what's up, and (admins) choose the team.
export function TeamPanel({ me, isAdmin, back }) {
  const [f, setF] = useState({ body: '', kind: 'update', link: '', hours: 24 }), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [list, setList] = useState(null), [team, setTeam] = useState(null), [who, setWho] = useState('')
  const load = async () => {
    const { data } = await sb.from('announcements').select('id,body,kind,link,created_at,ends_at,active,author:profiles!announcements_created_by_fkey(username,display_name)').order('created_at', { ascending: false }).limit(30); setList(data || [])
    const { data: t } = await sb.rpc('team_list'); setTeam(t || [])
  }
  useEffect(() => { load() }, [])
  const post = async () => {
    if (f.body.trim().length < 2) return setMsg('Write something first.')
    setBusy(true); setMsg('')
    const { error } = await sb.from('announcements').insert({ body: f.body.trim(), kind: f.kind, link: f.link || null, ends_at: new Date(Date.now() + f.hours * 3600e3).toISOString() })
    setBusy(false); if (error) return setMsg(friendly(error)); setF({ ...f, body: '' }); setMsg('Posted. Everyone sees it on Home now.'); load()
  }
  const end = async a => { const { error } = await sb.from('announcements').update({ active: false }).eq('id', a.id); if (error) return setMsg(friendly(error)); load() }
  const setStaff = async (u, on) => { setMsg(''); const { error } = await sb.rpc('set_staff', { p_username: u, p_on: on }); if (error) return setMsg(friendly(error)); setWho(''); load() }
  const live = a => a.active && new Date(a.ends_at) > new Date()
  return <div className="sheet solid"><div className="bar"><button onClick={back} aria-label="Back">←</button>Team · Home banner</div><div className="sbody" style={{ padding: '10px 14px 140px' }}>
    <div className="gl fcard"><label htmlFor="tb">Post to the banner</label>
      <textarea id="tb" className="ctext" maxLength={160} rows={2} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} placeholder="e.g. Live Room with local DJs at 9pm 🎧" />
      <small className="pnote" style={{ padding: 0 }}>{160 - f.body.length} characters left · everyone on DAHUB sees this</small>
      <div className="chips" style={{ padding: 0, flexWrap: 'wrap' }}>{Object.entries(KIND).map(([k2, [l]]) => <button key={k2} className="chipb" aria-pressed={f.kind === k2} aria-selected={f.kind === k2} onClick={() => setF({ ...f, kind: k2 })}>{l}</button>)}</div>
      <label>Tapping it opens<select value={f.link} onChange={e => setF({ ...f, link: e.target.value })}>{LINKS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label>Show it for<select value={f.hours} onChange={e => setF({ ...f, hours: +e.target.value })}>{[[3, '3 hours'], [12, '12 hours'], [24, '1 day'], [72, '3 days'], [168, '1 week']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button className="wb p" disabled={busy} onClick={post}>{busy ? 'Posting…' : 'Post to Home'}</button>
      {msg && <p className="msg" role="status" style={{ padding: 0 }}>{msg}</p>}</div>
    <h3 style={{ margin: '18px 4px 6px' }}>On the banner</h3>
    {list === null ? <div className="skel"><i /></div> : list.filter(live).length === 0 ? <p className="pnote">Nothing up right now.</p>
      : list.filter(live).map(a => <div key={a.id} className="gl arow"><b>{KIND[a.kind]?.[0]}</b> {a.body}<br /><small>by @{a.author?.username} · {ago(a.created_at)} ago · ends {new Date(a.ends_at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</small><div className="aact"><button className="wb sm" onClick={() => end(a)}>Take it down</button></div></div>)}
    <h3 style={{ margin: '18px 4px 6px' }}>The team</h3>
    <p className="pnote">Team members can post to the banner. {isAdmin ? 'Only admins can add or remove them.' : ''}</p>
    {team?.map(t => <div key={t.id} className="gl arow" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar p={t} size={36} /><span style={{ flex: 1 }}><b>{t.display_name}</b> <small>@{t.username}</small></span>{isAdmin && <button className="wb sm" onClick={() => setStaff(t.username, false)}>Remove</button>}</div>)}
    {isAdmin && <div className="gl fcard"><label htmlFor="tw">Add someone by username</label><input id="tw" value={who} onChange={e => setWho(e.target.value)} placeholder="@username" /><button className="wb p sm" disabled={!who.trim()} onClick={() => setStaff(who, true)}>Add to team</button></div>}
  </div></div>
}
