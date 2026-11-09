import { useEffect, useState } from 'react'
import { sb, upload } from './supabase'
import { artistPhoto, ytThumb, mmss, ytId, yt } from './media'
export default function MediaAdmin({ me }) {
  const [list, setList] = useState(null), [sel, setSel] = useState(null), [vids, setVids] = useState([]), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [f, setF] = useState({ name: '', city: 'Baltimore, MD', genres: '', bio: '', tagline: '', featured: false, links: '' }), [file, setFile] = useState(null), [link, setLink] = useState(''), [kind, setKind] = useState('music'), [qs, setQs] = useState(''), [res, setRes] = useState([])
  const load = async () => { const { data } = await sb.from('media_artists').select('*').order('created_at', { ascending: false }); setList(data || []) }
  const loadV = async id => { const { data } = await sb.from('media_videos').select('*').eq('artist_id', id).order('created_at', { ascending: false }); setVids(data || []) }
  useEffect(() => { load() }, [])
  useEffect(() => { if (sel) { loadV(sel.id); setF({ name: sel.name, city: sel.city, genres: sel.genres.join(', '), bio: sel.bio || '', tagline: sel.spotlight_tagline || '', featured: sel.featured, links: (sel.links || []).map(l => `${l.label} | ${l.url}`).join('\n') }) } }, [sel])
  const links = () => f.links.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[1] && /^https?:\/\//.test(x[1])).map(x => ({ label: x[0] || 'Link', url: x[1] }))
  async function save() {
    if (!f.name.trim()) return setMsg('Name is required.'); setBusy(true); setMsg('')
    try {
      const row = { name: f.name.trim(), city: f.city.trim() || 'Baltimore, MD', genres: f.genres.split(',').map(x => x.trim()).filter(Boolean).slice(0, 5), bio: f.bio.trim() || null, spotlight_tagline: f.tagline.trim() || null, featured: f.featured, links: links() }
      if (file) row.photo_path = await upload('media-submissions', me.id, file)
      const r = sel ? await sb.from('media_artists').update(row).eq('id', sel.id).select().single() : await sb.from('media_artists').insert(row).select().single()
      if (r.error) throw r.error; setMsg('Saved.'); setSel(r.data); setFile(null); load()
    } catch (e) { setMsg(e.message) } setBusy(false)
  }
  async function del() { if (!confirm('Delete this artist and all their videos?')) return; const { error } = await sb.from('media_artists').delete().eq('id', sel.id); if (error) return setMsg(error.message); setSel(null); load() }
  async function addVideos(vs) {
    const rows = vs.map(v => ({ artist_id: sel.id, youtube_id: v.youtube_id, title: v.title, thumb_url: v.thumb_url, duration_s: v.duration_s, kind })); const { error } = await sb.from('media_videos').insert(rows)
    if (error) return setMsg(error.code === '23505' ? 'That video is already added.' : error.message); setMsg('Video added.'); setLink(''); loadV(sel.id)
  }
  async function addLink() { const id = ytId(link); if (!id) return setMsg('That is not a YouTube link.'); setBusy(true); setMsg(''); try { const v = await yt({ action: 'video', ids: [id] }); if (!v.length) setMsg('YouTube could not find that video.'); else if (!v[0].embeddable) setMsg('That video does not allow embedding.'); else await addVideos(v) } catch (e) { setMsg(e.message) } setBusy(false) }
  async function search() { if (!qs.trim()) return; setBusy(true); setMsg(''); try { setRes(await yt({ action: 'search', q: qs })) } catch (e) { setMsg(e.message) } setBusy(false) }
  async function rm(v) { await sb.from('media_videos').delete().eq('id', v.id); loadV(sel.id) }
  async function star(v) { await sb.from('media_videos').update({ featured: !v.featured }).eq('id', v.id); loadV(sel.id) }
  const inp = (k, ph, o = {}) => <input className="anote" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} placeholder={ph} {...o} />
  return <div>
    {msg && <p className="msg" role="status">{msg}</p>}
    {!sel && <div className="aact" style={{ margin: '0 14px' }}><button className="wb p sm" onClick={() => { setSel({ id: null, name: '', city: 'Baltimore, MD', genres: [], links: [], featured: false }); setVids([]) }}>+ Add artist</button></div>}
    {!sel && (list === null ? <div className="skel"><i /></div> : list.length === 0 ? <div className="empty">No artists yet. Only add real artists who agreed to be featured.</div> : list.map(a => <button key={a.id} className="gl arow" style={{ textAlign: 'left' }} onClick={() => setSel(a)}><h4>{a.name} {a.featured && '★'}</h4><small>{a.city} · {a.genres.join(', ')}</small></button>))}
    {sel && <div className="gl arow">
      <button className="link" onClick={() => { setSel(null); setMsg('') }}>← All artists</button>
      <h4>{sel.id ? 'Edit artist' : 'New artist'}</h4>
      {inp('name', 'Artist name', { maxLength: 80 })}{inp('city', 'City')}{inp('genres', 'Genres, comma separated (max 5)')}{inp('tagline', 'Spotlight tagline (optional)', { maxLength: 80 })}
      <textarea className="anote" rows={3} maxLength={600} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} placeholder="Short bio, approved by the artist" />
      <textarea className="anote" rows={2} value={f.links} onChange={e => setF({ ...f, links: e.target.value })} placeholder={'Official links, one per line:\nInstagram | https://instagram.com/name'} />
      <label className="aact">Photo (artist approved) <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} /></label>
      {sel.photo_path && !file && <img className="mimg2" src={artistPhoto(sel.photo_path)} alt="" />}
      <label className="aact"><input type="checkbox" checked={f.featured} onChange={e => setF({ ...f, featured: e.target.checked })} /> Show in the Spotlight banner (needs a photo)</label>
      <div className="aact"><button className="wb p sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>{sel.id && <button className="wb sm" onClick={del}>Delete</button>}</div>
      {sel.id && <><h4>Videos</h4>
        <div className="aact"><select value={kind} onChange={e => setKind(e.target.value)} aria-label="Type"><option value="music">New Music</option><option value="video">Latest Videos</option></select></div>
        <input className="anote" value={link} onChange={e => setLink(e.target.value)} placeholder="Paste a YouTube link" /><button className="wb p sm" disabled={busy} onClick={addLink}>Add from link</button>
        <input className="anote" value={qs} onChange={e => setQs(e.target.value)} placeholder="Or search YouTube" /><button className="wb sm" disabled={busy} onClick={search}>Search</button>
        {res.map(v => <div key={v.youtube_id} className="aact"><img src={v.thumb_url} alt="" width="96" /><span style={{ flex: 1 }}><b>{v.title}</b><br /><small>{v.channel} · {mmss(v.duration_s)}</small></span><button className="wb p sm" onClick={() => addVideos([v])}>Add</button></div>)}
        {vids.map(v => <div key={v.id} className="aact"><img src={ytThumb(v)} alt="" width="96" /><span style={{ flex: 1 }}><b>{v.title}</b><br /><small>{v.kind === 'music' ? 'New Music' : 'Latest'}</small></span><button className="wb sm" onClick={() => star(v)}>{v.featured ? '★' : '☆'}</button><button className="wb sm" onClick={() => rm(v)}>✕</button></div>)}</>}
    </div>}
  </div>
}
