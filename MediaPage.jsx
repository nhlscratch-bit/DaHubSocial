import { useEffect, useMemo, useState } from 'react'
import { sb, hiddenIds } from './supabase'
import { CAT, SUBSEL, subUrl, artistPhoto, ytThumb, mmss, SELV } from './media'
import Avatar from './Avatar'
import AutoVideo from './AutoVideo'
import ReportSheet from './ReportSheet'
export function Player({ v, close, openArtist }) {
  return <div className="scrim" onClick={close}><div className="msheet mdet" onClick={e => e.stopPropagation()}>
    <div className="ytwrap"><iframe src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?autoplay=1&playsinline=1&rel=0`} title={v.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /></div>
    <h3 style={{ margin: '6px 0 2px' }}>{v.title}</h3>
    {v.artist && <button className="who" onClick={() => { close(); openArtist(v.artist.id) }}><span>🎤 {v.artist.name}</span><small>{v.artist.city}</small></button>}
    <small>Plays from YouTube. DAHUB does not host this video.</small>
    <a className="wb" href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noopener noreferrer">Open in YouTube</a>
    <button className="wb" onClick={close}>Close</button></div></div>
}
export default function MediaPage({ me, back, openProfile, openSubmit, openArtist, openSearch }) {
  const [artists, setArtists] = useState(null), [vids, setVids] = useState([]), [subs, setSubs] = useState([]), [err, setErr] = useState(''), [q, setQ] = useState(''), [city, setCity] = useState('all'), [genre, setGenre] = useState('all'), [onlyFeat, setOnlyFeat] = useState(false), [play, setPlay] = useState(null), [slide, setSlide] = useState(0), [open, setOpen] = useState(null), [rep, setRep] = useState(null)
  const load = async () => {
    setErr('')
    const [a, v, s] = await Promise.all([
      sb.from('media_artists').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('media_videos').select(SELV).order('created_at', { ascending: false }).limit(120),
      sb.from('submissions').select(SUBSEL).eq('status', 'approved').order('reviewed_at', { ascending: false }).limit(30)])
    if (a.error || v.error) return setErr((a.error || v.error).message)
    const hid = await hiddenIds(); setArtists(a.data || []); setVids(v.data || []); setSubs((s.data || []).filter(x => !hid.has(x.author.id)))
  }
  useEffect(() => { load() }, [])
  const cities = useMemo(() => [...new Set((artists || []).map(a => a.city))], [artists])
  const genres = useMemo(() => [...new Set((artists || []).flatMap(a => a.genres))].sort(), [artists])
  const ql = q.trim().toLowerCase()
  const okA = a => (city === 'all' || a.city === city) && (genre === 'all' || a.genres.includes(genre)) && (!onlyFeat || a.featured) && (!ql || a.name.toLowerCase().includes(ql) || a.genres.some(g => g.toLowerCase().includes(ql)))
  const okV = v => v.artist && (city === 'all' || v.artist.city === city) && (genre === 'all' || v.artist.genres.includes(genre)) && (!onlyFeat || v.featured) && (!ql || v.title.toLowerCase().includes(ql) || v.artist.name.toLowerCase().includes(ql))
  const A = (artists || []).filter(okA), V = vids.filter(okV), music = V.filter(v => v.kind === 'music'), other = V.filter(v => v.kind === 'video')
  const spot = (artists || []).filter(a => a.featured && a.photo_path && okA(a)), cur = spot.length ? spot[slide % spot.length] : null
  const spotVid = cur && vids.find(v => v.artist_id === cur.id && v.featured) || cur && vids.find(v => v.artist_id === cur.id)
  useEffect(() => { if (spot.length < 2) return; const t = setInterval(() => setSlide(s => s + 1), 6000); return () => clearInterval(t) }, [spot.length])
  const row = (list, big) => <div className="vrow">{list.map(v => <button key={v.id} className="vcard" onClick={() => setPlay(v)}><span className="vth"><img src={ytThumb(v)} alt="" loading="lazy" /><i className="ytp" /><em>{mmss(v.duration_s)}</em></span><b>{v.title}</b><small>{v.artist?.name} · YouTube</small></button>)}</div>
  const empty = artists && !A.length && !V.length
  return <div className="sheet mediaV2"><div className="bar"><button onClick={back}>←</button>Media</div><div className="sbody">
    <input className="msearch" value={q} onChange={e => setQ(e.target.value)} placeholder="Search Media, Artists, Tracks…" aria-label="Search Media" />
    <div className="mfilters">
      <button className="mf on" aria-selected={city === 'all' && genre === 'all' && !onlyFeat && !q} onClick={() => { setCity('all'); setGenre('all'); setOnlyFeat(false); setQ('') }}>All</button>
      <select className="mf" value={city} onChange={e => setCity(e.target.value)} aria-label="City"><option value="all">All cities</option>{cities.map(c => <option key={c}>{c}</option>)}</select>
      <select className="mf" value={genre} onChange={e => setGenre(e.target.value)} aria-label="Genre"><option value="all">Genre</option>{genres.map(g => <option key={g}>{g}</option>)}</select>
      <button className={'mf' + (onlyFeat ? ' on' : '')} onClick={() => setOnlyFeat(x => !x)}>★ Featured</button></div>
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {artists === null && !err && <div className="skel"><i /><i /></div>}
    {cur && <div className="spot" style={{ backgroundImage: `linear-gradient(90deg,#000d 10%,#0000 80%),url(${artistPhoto(cur.photo_path)})` }}>
      <span className="spl">★ DAHUB SPOTLIGHT</span><h2>{cur.name}</h2><p>{cur.spotlight_tagline || cur.city}</p>
      <button className="watch" onClick={() => spotVid ? setPlay({ ...spotVid, artist: cur }) : openArtist(cur.id)}>{spotVid ? 'Watch Now ▶' : 'See artist ›'}</button>
      {spot.length > 1 && <div className="dots">{spot.map((_, i) => <i key={i} className={i === slide % spot.length ? 'on' : ''} onClick={() => setSlide(i)} />)}</div>}</div>}
    {music.length > 0 && <><h4 className="msec">New Music</h4>{row(music)}</>}
    {A.length > 0 && <><h4 className="msec">Artists to Discover</h4><div className="vrow">{A.map(a => <button key={a.id} className="acard" onClick={() => openArtist(a.id)}>
      <span className="aph" style={a.photo_path ? { backgroundImage: `url(${artistPhoto(a.photo_path)})` } : undefined} /><b>{a.name}</b><small>📍 {a.city}</small><span className="gtags">{a.genres.slice(0, 2).map(g => <i key={g} className="gtag">{g}</i>)}</span></button>)}</div></>}
    {other.length > 0 && <><h4 className="msec">Latest Videos</h4>{row(other)}</>}
    {empty && <div className="empty">{ql || city !== 'all' || genre !== 'all' || onlyFeat ? 'Nothing matches. Clear the filters.' : 'No artists have been added yet. Check back soon, or apply to be featured below.'}</div>}
    <div className="local" onClick={() => { const c = cities[0]; if (c) setCity(c) }}><div><h4>📍 Local Scene</h4><p>Baltimore's music. Our city.</p></div><button className="watch sm">Explore B-More ›</button></div>
    <div className="mhead"><p>Are you an artist or a local business? Apply to be featured. Free, and every submission is reviewed by a person.</p><button className="wb p sm" onClick={openSubmit}>Get featured</button></div>
    {subs.length > 0 && <><h4 className="msec">From the community</h4><div className="vrow">{subs.map(x => <button key={x.id} className="gl mcard" onClick={() => setOpen(x)}>
      <div className="mcov" style={x.cover_path ? { backgroundImage: `url(${subUrl(x.cover_path)})` } : undefined}><span className="chip t">{CAT[x.category]}</span></div><b>{x.title}</b><span className="mby"><Avatar p={x.author} size={22} />{x.author.display_name}</span></button>)}</div></>}
    <div style={{ height: 120 }} />
    {play && <Player v={play} close={() => setPlay(null)} openArtist={openArtist} />}
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
