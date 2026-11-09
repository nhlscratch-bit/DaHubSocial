import { useEffect, useState } from 'react'
import { sb } from './supabase'
import { artistPhoto, ytThumb, mmss } from './media'
import ReportSheet from './ReportSheet'
export default function ArtistPage({ id, me, back, play, openProfile }) {
  const [a, setA] = useState(null), [vids, setVids] = useState([]), [err, setErr] = useState(''), [rep, setRep] = useState(false)
  useEffect(() => { (async () => {
    const r = await sb.from('media_artists').select('*').eq('id', id).maybeSingle(); if (r.error || !r.data) return setErr('Artist not found.')
    setA(r.data); const v = await sb.from('media_videos').select('*').eq('artist_id', id).order('created_at', { ascending: false }); setVids(v.data || [])
  })() }, [id])
  const share = async () => { const u = location.origin + '/?artist=' + id; try { navigator.share ? await navigator.share({ title: a.name, url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  if (err) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Artist</div><div className="sbody"><div className="empty">{err}</div></div></div>
  if (!a) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Artist</div><div className="sbody"><div className="skel"><i /><i /></div></div></div>
  const feat = vids.find(v => v.featured) || vids[0], links = (a.links || []).filter(l => /^https?:\/\//.test(l.url))
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>{a.name}</div><div className="sbody">
    <div className="art-hero" style={a.photo_path ? { backgroundImage: `url(${artistPhoto(a.photo_path)})` } : undefined}><div><h2>{a.name}</h2><small>📍 {a.city}</small></div></div>
    <div className="art-tags">{a.genres.map(g => <span key={g} className="gtag">{g}</span>)}</div>
    {a.bio && <p className="art-bio">{a.bio}</p>}
    <div className="art-act">{a.profile_id && <button className="wb p sm" onClick={() => openProfile(a.profile_id)}>View DAHUB profile</button>}<button className="wb sm" onClick={share}>Share</button><button className="wb sm" onClick={() => setRep(true)}>Report</button></div>
    {feat && <><h4 className="sec">Featured</h4><button className="vth big" onClick={() => play(feat)}><img src={ytThumb(feat)} alt="" /><i className="ytp" /><em>{mmss(feat.duration_s)}</em></button><p className="vt" style={{ margin: '4px 14px' }}>{feat.title}</p></>}
    <h4 className="sec">Videos</h4>{vids.length ? <div className="vgrid">{vids.map(v => <button key={v.id} className="vcard" onClick={() => play(v)}><span className="vth"><img src={ytThumb(v)} alt="" loading="lazy" /><i className="ytp" /><em>{mmss(v.duration_s)}</em></span><b>{v.title}</b><small>YouTube</small></button>)}</div> : <div className="empty">No videos yet.</div>}
    {links.length > 0 && <><h4 className="sec">Official links</h4><div className="art-links">{links.map((l, i) => <a key={i} className="wb sm" href={l.url} target="_blank" rel="noopener noreferrer">{l.label || 'Link'}</a>)}</div></>}
    {rep && <ReportSheet me={me} type="artist" targetId={a.id} reportedUser={null} close={() => setRep(false)} />}
  </div></div>
}
