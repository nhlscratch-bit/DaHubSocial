import wm from './wordmark.png'
import briefcase from './briefcase.png'
import { useCallback, useEffect, useState } from 'react'
import { sb, ago } from './supabase'
import { TYPES, TSHORT, COMP, CATS, oppSel, oppImg } from './opp'
import I from './Icons'
import ReportSheet from './ReportSheet'
const CHIPS = [['all', 'All'], ['paid', 'Paid'], ['collab', 'Collab'], ['booking', 'Booking'], ['network', 'Network'], ['saved', 'Saved'], ['mine', 'Mine']]
export default function Opportunities({ me, back, openOpp, newOpp }) {
  const [chip, setChip] = useState('all'), [q, setQ] = useState(''), [rows, setRows] = useState(null), [err, setErr] = useState(''), [fo, setFo] = useState(false)
  const [flt, setFlt] = useState({ cat: '', remote: false, local: false }), [saved, setSaved] = useState(new Set()), [menu, setMenu] = useState(null), [rep, setRep] = useState(null)
  const s = q.replace(/[^\w ]/g, ' ').trim(), savedKey = chip === 'saved' ? [...saved].join(',') : ''
  const loadSaved = async () => { const { data } = await sb.from('opportunity_saves').select('opportunity_id').eq('user_id', me.id); setSaved(new Set((data || []).map(x => x.opportunity_id))) }
  useEffect(() => { loadSaved() }, [])
  const load = useCallback(async () => {
    setErr('')
    let r = sb.from('opportunities').select(oppSel).order('created_at', { ascending: false }).limit(40)
    if (chip === 'saved') { const ids = [...saved]; if (!ids.length) return setRows([]); r = r.in('id', ids) }
    else if (chip === 'mine') r = r.eq('poster_id', me.id)
    else { r = r.eq('status', 'open'); if (chip === 'paid') r = r.eq('compensation', 'paid'); else if (['collab', 'booking', 'network'].includes(chip)) r = r.eq('type', chip) }
    if (flt.cat) r = r.eq('category', flt.cat)
    if (flt.remote) r = r.eq('is_remote', true)
    if (flt.local) r = r.ilike('location', '%baltimore%')
    if (s.length >= 2) r = r.or(`title.ilike.%${s}%,description.ilike.%${s}%`)
    const { data, error } = await r; if (error) return setErr(error.message); setRows(data || [])
  }, [chip, s, flt, savedKey])
  useEffect(() => { const t = setTimeout(load, s ? 300 : 0); return () => clearTimeout(t) }, [load])
  async function toggleSave(o) { const has = saved.has(o.id); has ? await sb.from('opportunity_saves').delete().eq('user_id', me.id).eq('opportunity_id', o.id) : await sb.from('opportunity_saves').insert({ user_id: me.id, opportunity_id: o.id }); setMenu(null); loadSaved() }
  const filtered = flt.cat || flt.remote || flt.local || s.length >= 2
  const card = o => <article key={o.id} className="gl ocard" onClick={() => openOpp(o.id)}>
    <div className="oth">{o.image_path ? <img src={oppImg(o.image_path)} alt="" loading="lazy" /> : <span>{TSHORT[o.type][0]}</span>}</div>
    <div className="otx"><div className="obad"><span className={'tb t-' + o.type}>{TSHORT[o.type]}</span><span className={'tb c-' + o.compensation}>{o.compensation === 'paid' ? '$ Paid' : COMP[o.compensation]}</span>{o.status !== 'open' && <span className="tb st">{o.status}</span>}</div>
      <h3>{o.title}</h3><div className="ometa"><I n="pin" s={14} /> {o.is_remote ? 'Remote' : o.location || 'Location not set'}{o.is_remote && o.location ? ' · ' + o.location : ''} · {ago(o.created_at)}</div></div>
    <button className="ib om" aria-label="More options" onClick={e => { e.stopPropagation(); setMenu(o) }}><I n="more" s={18} /></button>
    <p className="odesc">{o.description}</p>
    <div className="ofoot"><span>{TYPES[o.type]}{o.compensation_note ? ' · ' + o.compensation_note : ''}</span><button className="wb p sm" onClick={e => { e.stopPropagation(); openOpp(o.id) }}>View Details →</button></div></article>
  return <div className="sheet clear">
    <div className="pvtop"><button className="ib" onClick={back} aria-label="Back"><I n="back" s={22} /></button><img src={wm} alt="DAHUB" /><span style={{ width: 46 }} /></div>
    <div className="sbody obody2">
      <div className="gl ohd"><img src={briefcase} alt="" className="obc" /><div className="ohdt"><h1>Opportunity Board</h1><small>Get In The Room</small></div><button className="wb p sm" onClick={newOpp}><I n="plus" s={18} /> Post</button></div>
      <div className="ochips">{CHIPS.map(([k, l]) => <button key={k} className="tab" aria-selected={chip === k} onClick={() => setChip(k)}>{l}</button>)}</div>
      <div className="osrch"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search opportunities…" aria-label="Search opportunities" /><button className={'ib' + (flt.cat || flt.remote || flt.local ? ' act' : '')} onClick={() => setFo(true)} aria-label="Filters"><I n="filter" s={20} /></button></div>
      {err && <p className="msg" role="alert">{err}</p>}{rows === null && !err && <div className="skel"><i /><i /></div>}
      {rows?.map(card)}
      {rows && !rows.length && <div className="empty">{chip === 'mine' ? "You haven't posted anything yet." : chip === 'saved' ? 'Nothing saved yet.' : filtered ? 'No matches. Try different filters.' : 'No opportunities yet. Be the first to post one.'}
        {!filtered && chip !== 'saved' && <div style={{ marginTop: 12 }}><button className="wb p" onClick={newOpp}>Post an opportunity</button></div>}</div>}</div>
    {menu && <div className="scrim" onClick={() => setMenu(null)}><div className="msheet" onClick={e => e.stopPropagation()}>
      <b>{menu.title}</b><button className="wb" onClick={() => toggleSave(menu)}>{saved.has(menu.id) ? 'Remove from saved' : 'Save for later'}</button>
      {menu.poster.id !== me.id && <button className="wb" onClick={() => { setRep(menu); setMenu(null) }}>Report listing</button>}<button className="wb" onClick={() => setMenu(null)}>Cancel</button></div></div>}
    {fo && <div className="scrim" onClick={() => setFo(false)}><div className="msheet" onClick={e => e.stopPropagation()}>
      <b>Filters</b><select value={flt.cat} onChange={e => setFlt({ ...flt, cat: e.target.value })} aria-label="Category"><option value="">All categories</option>{CATS.map(c => <option key={c}>{c}</option>)}</select>
      <label className="chk"><input type="checkbox" checked={flt.remote} onChange={e => setFlt({ ...flt, remote: e.target.checked })} /> Remote only</label>
      <label className="chk"><input type="checkbox" checked={flt.local} onChange={e => setFlt({ ...flt, local: e.target.checked })} /> Baltimore only</label>
      <button className="wb p" onClick={() => setFo(false)}>Done</button><button className="wb" onClick={() => { setFlt({ cat: '', remote: false, local: false }); setFo(false) }}>Reset</button></div></div>}
    {rep && <ReportSheet me={me} type="opportunity" targetId={rep.id} reportedUser={rep.poster.id} close={() => setRep(null)} />}</div>
}
