import { useEffect, useRef, useState } from 'react'
import { sb } from './supabase'
import wm from './wordmark.png'
import Avatar from './Avatar'
const CAT = { food: 'Food', music: 'Music', podcast: 'Podcast', beauty: 'Beauty', retail: 'Retail', services: 'Services', tech: 'Tech', events: 'Events', other: 'Local' }
const SEL = 'id,category,headline,subline,cta_label,cta_url,neighborhood,sponsored,ends_at,cover_path,profile:profiles!spotlights_profile_id_fkey(id,username,display_name,avatar_url,cover_url,is_verified)'
const left = t => { if (!t) return null; const ms = new Date(t) - Date.now(); if (ms <= 0 || ms > 48 * 36e5) return null; const m = Math.ceil(ms / 6e4); return m < 60 ? `ends in ${m}m` : `ends in ${Math.ceil(m / 60)}h` }
// Featured live card shown at the top of every profile.
export default function Spotlight({ me, openProfile }) {
  const [items, setItems] = useState(null), [i, setI] = useState(0), [viewers, setViewers] = useState(0), x0 = useRef(null), hold = useRef(false)
  const n = items ? items.length : 0, cur = n ? items[i % n] : null
  const load = async () => { const { data } = await sb.from('spotlights').select(SEL).order('position').order('created_at', { ascending: false }).limit(6); setItems(data || []) }
  useEffect(() => { load(); const ch = sb.channel('spots').on('postgres_changes', { event: '*', schema: 'public', table: 'spotlights' }, load).subscribe(); return () => { sb.removeChannel(ch) } }, [])
  useEffect(() => { if (n < 2) return; const t = setInterval(() => { if (!hold.current) setI(v => (v + 1) % n) }, 6000); return () => clearInterval(t) }, [n])
  useEffect(() => {
    if (!cur) return
    const ch = sb.channel('spot-' + cur.id, { config: { presence: { key: me.id } } })
    ch.on('presence', { event: 'sync' }, () => setViewers(Object.keys(ch.presenceState()).length)).subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ t: Date.now() }) })
    return () => { sb.removeChannel(ch); setViewers(0) }
  }, [cur?.id])
  if (items === null) return <div className="spot" />
  if (!cur) return <div className="spot open"><img src={wm} alt="DAHUB" /><h3>This spot is open</h3><p>Feature your business, music or podcast where everyone sees it.</p><button className="wb p sm" onClick={() => window.dispatchEvent(new Event('open-submit'))}>Get featured</button></div>
  const cover = cur.cover_path ? sb.storage.from('media-submissions').getPublicUrl(cur.cover_path).data.publicUrl : cur.profile.cover_url && sb.storage.from('covers').getPublicUrl(cur.profile.cover_url).data.publicUrl
  const go = () => { const u = cur.cta_url; u && /^https?:\/\//.test(u) ? window.open(u, '_blank', 'noopener') : openProfile(cur.profile.id) }
  const t = left(cur.ends_at)
  return <div className="spot" style={cover ? { backgroundImage: `url(${cover})` } : undefined}
    onTouchStart={e => { x0.current = e.touches[0].clientX; hold.current = true }}
    onTouchEnd={e => { const dx = e.changedTouches[0].clientX - x0.current; hold.current = false; if (n > 1 && Math.abs(dx) > 40) setI(v => (v + (dx < 0 ? 1 : n - 1)) % n) }}>
    <div className="sov" />
    {n > 1 && <div className="dots">{items.map((_, k) => <i key={k} className={k === i % n ? 'on' : ''} onClick={() => setI(k)} />)}</div>}
    <div className="sbody2">
      <div className="schips"><span className="chip t">{CAT[cur.category]}</span><span className="chip">{cur.sponsored ? 'Sponsored' : 'Featured'}</span>
        {viewers > 0 && <span className="chip live"><i />{viewers} viewing</span>}{t && <span className="chip">{t}</span>}</div>
      <h3>{cur.headline}</h3>{cur.subline && <p>{cur.subline}</p>}
      <div className="srow2"><div className="who" role="button" onClick={() => openProfile(cur.profile.id)}><Avatar p={cur.profile} size={34} /><span>{cur.profile.display_name}{cur.neighborhood && ` · ${cur.neighborhood}`}</span></div>
        <button className="wb p sm" onClick={go}>{cur.cta_label}</button></div></div></div>
}
