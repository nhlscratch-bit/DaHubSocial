import { useEffect, useState } from 'react'
import { sb, hiddenIds } from './supabase'
import { CAT, SUBSEL, subUrl } from './media'
import Avatar from './Avatar'
import AutoVideo from './AutoVideo'
import ReportSheet from './ReportSheet'
export default function MediaPage({ me, back, openProfile, openSubmit }) {
  const [cat, setCat] = useState('all'), [items, setItems] = useState(null), [open, setOpen] = useState(null), [err, setErr] = useState(''), [rep, setRep] = useState(null)
  const load = async () => {
    setErr(''); const { data, error } = await sb.from('submissions').select(SUBSEL).eq('status', 'approved').order('reviewed_at', { ascending: false }).limit(60)
    if (error) return setErr(error.message); const hid = await hiddenIds(); setItems((data || []).filter(x => !hid.has(x.author.id)))
  }
  useEffect(() => { load() }, [])
  const list = (items || []).filter(x => cat === 'all' || x.category === cat)
  const live = x => x.featured_until && new Date(x.featured_until) > new Date()
  const card = x => <button key={x.id} className="gl mcard" onClick={() => setOpen(x)}>
    <div className="mcov" style={x.cover_path ? { backgroundImage: `url(${subUrl(x.cover_path)})` } : undefined}><span className="chip t">{CAT[x.category]}</span>{live(x) && <span className="chip">Featured</span>}</div>
    <b>{x.title}</b>{x.blurb && <small>{x.blurb}</small>}<span className="mby"><Avatar p={x.author} size={22} />{x.author.display_name}</span></button>
  const feat = list.filter(live)
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Media</div><div className="sbody">
    <div className="mhead"><p>Music, podcasts, businesses and drops from Baltimore. Free to submit. Every item is reviewed by a person.</p><button className="wb p sm" onClick={openSubmit}>Get featured</button></div>
    <div className="chips">{['all', ...Object.keys(CAT)].map(k => <button key={k} className="chipb" aria-selected={cat === k} onClick={() => setCat(k)}>{k === 'all' ? 'All' : CAT[k]}</button>)}</div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {items === null && !err && <div className="skel"><i /><i /></div>}
    {feat.length > 0 && <><h4 className="sec">Featured now</h4><div className="hscroll">{feat.map(card)}</div></>}
    {items && <><h4 className="sec">{cat === 'all' ? 'New on DAHUB' : CAT[cat]}</h4>{list.length ? <div className="mgrid2">{list.map(card)}</div> : <div className="empty">Nothing here yet. Be the first to submit.</div>}</>}
    {open && <div className="scrim" onClick={() => setOpen(null)}><div className="msheet mdet" onClick={e => e.stopPropagation()}>
      {open.cover_path && !open.media_path && <img className="mimg2" src={subUrl(open.cover_path)} alt="" />}
      {open.media_type === 'audio' && <audio controls src={subUrl(open.media_path)} preload="metadata" />}
      {open.media_type === 'video' && <AutoVideo src={subUrl(open.media_path)} />}
      {open.media_type === 'image' && <img className="mimg2" src={subUrl(open.media_path)} alt="" />}
      <span className="chip t">{CAT[open.category]}</span><h3 style={{ margin: '4px 0' }}>{open.title}</h3>{open.blurb && <p>{open.blurb}</p>}
      {open.neighborhood && <small>{open.neighborhood}</small>}
      <div className="who" role="button" onClick={() => { const id = open.author.id; setOpen(null); openProfile(id) }}><Avatar p={open.author} size={34} /><span>{open.author.display_name}</span></div>
      {open.link_url && <a className="wb p" href={open.link_url} target="_blank" rel="noopener noreferrer">Open link</a>}
      {open.author.id !== me.id && <button className="wb" onClick={() => { setRep(open.author.id); setOpen(null) }}>Report</button>}
      <button className="wb" onClick={() => setOpen(null)}>Close</button></div></div>}
    {rep && <ReportSheet me={me} type="profile" targetId={rep} reportedUser={rep} close={() => setRep(null)} />}
  </div></div>
}
