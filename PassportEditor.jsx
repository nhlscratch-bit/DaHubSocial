import { useEffect, useState } from 'react'
import { sb, SEL, friendly } from './supabase'
import { Card, THEMES, FRAMES, DEFAULT } from './Passport'
import { ytId } from './media'
const SW = ['#1b9fb2', '#ff7a2f', '#a78bfa', '#ff4d6d', '#f5b400', '#2ecc71', '#ffffff', '#222222']
const EM = ['🔥', '⭐', '💎', '🎤', '🎧', '🎸', '🎬', '📸', '👑', '💯', '🦀', '🏀', '🍔', '✨', '🚀', '🌹']
const KIND = { message: 'Message me', opps: 'Opportunity Board', link: 'Link' }
export default function PassportEditor({ me, profile, back, saved }) {
  const [pp, setPp] = useState(null), [stats, setStats] = useState({ posts: 0, followers: 0 }), [mine, setMine] = useState([]), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [sk, setSk] = useState('')
  useEffect(() => { (async () => {
    const { data } = await sb.from('passports').select('*').eq('user_id', me.id).maybeSingle(); const p = { ...DEFAULT, ...(data || {}) }; setPp(p); setSk(p.skills.join(', '))
    const [a, b, m] = await Promise.all([sb.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', me.id), sb.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', me.id).eq('status', 'accepted'), sb.from('posts').select(SEL).eq('author_id', me.id).order('created_at', { ascending: false }).limit(30)])
    setStats({ posts: a.count || 0, followers: b.count || 0 }); setMine(m.data || [])
  })() }, [])
  if (!pp) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Customize Passport</div><div className="sbody"><div className="skel"><i /></div></div></div>
  const set = o => setPp(p => ({ ...p, ...o })), live = { ...pp, skills: sk.split(',').map(x => x.trim()).filter(Boolean).slice(0, 6) }
  const tog = (k, v, max) => set({ [k]: pp[k].includes(v) ? pp[k].filter(x => x !== v) : pp[k].length < max ? [...pp[k], v] : pp[k] })
  const btn = (i, o) => set({ buttons: pp.buttons.map((b, j) => j === i ? { ...b, ...o } : b) })
  async function save() {
    if (pp.song_url && !ytId(pp.song_url)) return setErr('The song link must be a YouTube link.'); if (pp.buttons.some(b => b.kind === 'link' && !/^https?:\/\//.test(b.url || ''))) return setErr('Link buttons need a link that starts with https://')
    setBusy(true); setErr('')
    const row = { user_id: me.id, theme: pp.theme, frame: pp.frame, accent: pp.accent, tagline: pp.tagline?.trim() || null, role_label: pp.role_label?.trim() || null, skills: live.skills, seeking: pp.seeking?.trim() || null, stickers: pp.stickers, song_url: pp.song_url?.trim() || null, song_title: pp.song_title?.trim() || null, buttons: pp.buttons.filter(b => b.label?.trim()).map(b => ({ label: b.label.trim().slice(0, 16), kind: b.kind, ...(b.kind === 'link' ? { url: b.url.trim() } : {}) })), featured_posts: pp.featured_posts, is_public: pp.is_public, updated_at: new Date().toISOString() }
    const { error } = await sb.from('passports').upsert(row, { onConflict: 'user_id' }); setBusy(false); error ? setErr(friendly(error)) : saved()
  }
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Customize Passport<button className="wb p sm" style={{ marginLeft: 'auto' }} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div><div className="sbody" style={{ paddingBottom: 120 }}>
    <Card pr={profile} pp={live} stats={stats} />
    <div className="form">
      {err && <p className="msg" role="alert">{err}</p>}
      <h4>Look</h4>
      <div className="chips" style={{ padding: 0 }}>{Object.entries(THEMES).map(([k, l]) => <button key={k} className="chipb" aria-selected={pp.theme === k} onClick={() => set({ theme: k })}>{l}</button>)}</div>
      <div className="chips" style={{ padding: 0 }}>{Object.entries(FRAMES).map(([k, l]) => <button key={k} className="chipb" aria-selected={pp.frame === k} onClick={() => set({ frame: k })}>{l} frame</button>)}</div>
      <div className="swr">{SW.map(c => <button key={c} className={'sw' + (pp.accent === c ? ' on' : '')} style={{ background: c }} onClick={() => set({ accent: c })} aria-label={'Accent ' + c} />)}</div>
      <label>Stickers (up to 6)</label><div className="emr">{EM.map(e => <button key={e} className={pp.stickers.includes(e) ? 'on' : ''} onClick={() => tog('stickers', e, 6)}>{e}</button>)}</div>
      <h4>About you</h4>
      <label>Tagline<input maxLength={80} value={pp.tagline || ''} onChange={e => set({ tagline: e.target.value })} placeholder="Baltimore producer. Beats for hire." /></label>
      <label>Your role (shows on the card)<input maxLength={30} value={pp.role_label || ''} onChange={e => set({ role_label: e.target.value })} placeholder="Artist, Barber, Photographer…" /></label>
      <label>Skills and services (comma separated, up to 6)<input value={sk} onChange={e => setSk(e.target.value)} placeholder="Mixing, Mastering, Cover art" /></label>
      <label>What are you looking for?<input maxLength={140} value={pp.seeking || ''} onChange={e => set({ seeking: e.target.value })} placeholder="Singers to collab, studio clients, bookings" /></label>
      <h4>Favorite song</h4>
      <label>YouTube link (plays only when someone taps it)<input value={pp.song_url || ''} onChange={e => set({ song_url: e.target.value })} placeholder="https://youtube.com/watch?v=…" inputMode="url" /></label>
      <label>Song name<input maxLength={60} value={pp.song_title || ''} onChange={e => set({ song_title: e.target.value })} placeholder="Artist, Song" /></label>
      <h4>Buttons (up to 3)</h4>
      {pp.buttons.map((b, i) => <div key={i} className="gl arow"><input className="anote" maxLength={16} value={b.label} onChange={e => btn(i, { label: e.target.value })} placeholder="Button name" />
        <select value={b.kind} onChange={e => btn(i, { kind: e.target.value })}>{Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        {b.kind === 'link' && <input className="anote" value={b.url || ''} onChange={e => btn(i, { url: e.target.value })} placeholder="https://" inputMode="url" />}
        <button className="link" onClick={() => set({ buttons: pp.buttons.filter((_, j) => j !== i) })}>Remove button</button></div>)}
      {pp.buttons.length < 3 && <button className="wb sm" onClick={() => set({ buttons: [...pp.buttons, { label: 'Book me', kind: 'message' }] })}>+ Add button</button>}
      <h4>Featured work (up to 4 of your posts)</h4>
      <div className="ppwork">{mine.map(p => { const m = [...p.post_media].sort((a, b) => a.position - b.position)[0], on = pp.featured_posts.includes(p.id); return <button key={p.id} className={on ? 'on' : ''} onClick={() => tog('featured_posts', p.id, 4)} style={m && m.media_type === 'image' ? { backgroundImage: `url(${sb.storage.from('post-media').getPublicUrl(m.storage_path).data.publicUrl})` } : undefined}>{(!m || m.media_type !== 'image') && <span>{(p.body || 'Post').slice(0, 50)}</span>}{on && <em>✓</em>}</button> })}{mine.length === 0 && <div className="empty">Post something first, then feature it here.</div>}</div>
      <label className="aact"><input type="checkbox" checked={pp.is_public} onChange={e => set({ is_public: e.target.checked })} /> Anyone on DAHUB can see my Passport</label>
      <button className="wb p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save Passport'}</button>
      <button className="link" onClick={() => { setPp({ ...DEFAULT }); setSk('') }}>Reset to default</button>
    </div></div></div>
}
