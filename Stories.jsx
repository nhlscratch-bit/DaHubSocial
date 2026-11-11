import { useCallback, useEffect, useRef, useState } from 'react'
import { sb, upload, ago, startDM, hiddenIds } from './supabase'
import Avatar from './Avatar'
import I from './Icons'
export const storyUrl = p => sb.storage.from('story-media').getPublicUrl(p).data.publicUrl
const SELS = 'id,author_id,media_path,media_type,caption,created_at,author:profiles!stories_author_id_fkey(id,username,display_name,avatar_url)'
const SECS = 5000

export default function Stories({ me, profile }) {
  const [groups, setGroups] = useState([]), [seen, setSeen] = useState(new Set()), [view, setView] = useState(null), [draft, setDraft] = useState(null), [err, setErr] = useState('')
  const pick = useRef()
  const load = useCallback(async () => {
    const { data } = await sb.from('stories').select(SELS).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true })
    const { data: v } = await sb.from('story_views').select('story_id').eq('viewer_id', me.id)
    setSeen(new Set((v || []).map(x => x.story_id)))
    const hid = await hiddenIds()
    const m = new Map(); (data || []).filter(s => !hid.has(s.author_id)).forEach(s => { if (!m.has(s.author_id)) m.set(s.author_id, { author: s.author, items: [] }); m.get(s.author_id).items.push(s) })
    setGroups([...m.values()])
  }, [me.id])
  useEffect(() => {
    load(); const ch = sb.channel('stories-' + me.id).on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, load).subscribe()
    const add = () => pick.current?.click(); window.addEventListener('add-story', add); window.addEventListener('focus', load)
    return () => { sb.removeChannel(ch); window.removeEventListener('add-story', add); window.removeEventListener('focus', load) }
  }, [load])
  const unseen = g => g.items.some(s => !seen.has(s.id))
  const sorted = [...groups].sort((a, b) => (b.author.id === me.id) - (a.author.id === me.id) || unseen(b) - unseen(a))
  const choose = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return; setErr('')
    if (!/^(image|video)\//.test(f.type)) return setErr('Pick a photo or a video.')
    if (f.size > 120 * 1024 * 1024) return setErr('That file is over 120 MB.')
    setDraft({ file: f, url: URL.createObjectURL(f) })
  }
  return <>
    <div className="stories">
      <div className="st" role="button" tabIndex={0} onClick={() => pick.current.click()} aria-label="Add story"><span className="ring plain"><I n="plus" s={32} /></span><small>Add Story</small></div>
      {sorted.map((g, i) => <div key={g.author.id} className="st" role="button" tabIndex={0} onClick={() => setView({ gs: sorted, i })} aria-label={'View story'}>
        <span className={'ring' + (unseen(g) ? '' : ' seen')}><Avatar p={g.author} size={68} /></span>
        <small>{g.author.id === me.id ? 'Your Story' : g.author.display_name.split(' ')[0]}</small></div>)}
    </div>
    {err && <p className="msg" role="alert" style={{ margin: '0 16px' }}>{err}</p>}
    <input ref={pick} type="file" hidden accept="image/*,video/*" onChange={choose} />
    {draft && <Creator draft={draft} me={me} close={() => { URL.revokeObjectURL(draft.url); setDraft(null) }} done={() => { URL.revokeObjectURL(draft.url); setDraft(null); load() }} />}
    {view && <Viewer groups={view.gs} start={view.i} seen={seen} me={me} close={() => { setView(null); load() }} refresh={load} markSeen={id => setSeen(s => new Set(s).add(id))} />}
  </>
}

function Creator({ draft, me, close, done }) {
  const [cap, setCap] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const isV = draft.file.type.startsWith('video')
  async function share() {
    setBusy(true); setErr('')
    try {
      const path = await upload('story-media', me.id, draft.file)
      const { error } = await sb.from('stories').insert({ author_id: me.id, media_path: path, media_type: isV ? 'video' : 'image', caption: cap.trim() || null })
      if (error) throw error
      done()
    } catch (e) { setErr(e.message || 'Could not post your story.'); setBusy(false) }
  }
  return <div className="sv" role="dialog" aria-label="New story">
    <div className="svm">{isV ? <video src={draft.url} autoPlay muted loop playsInline /> : <img src={draft.url} alt="" />}</div>
    <div className="svtop"><button className="svb" onClick={close} aria-label="Cancel">✕</button></div>
    <div className="svfoot col">
      {err && <p className="msg" role="alert">{err}</p>}
      <input value={cap} onChange={e => setCap(e.target.value)} maxLength={200} placeholder="Add a caption…" aria-label="Caption" />
      <button className="wb p" disabled={busy} onClick={share}>{busy ? 'Posting…' : 'Share to your story'}</button></div></div>
}

function Viewer({ groups, start, seen, me, close, refresh, markSeen }) {
  const firstUnseen = i => { const k = groups[i].items.findIndex(s => !seen.has(s.id)); return k < 0 ? 0 : k }
  const [gi, setGi] = useState(start), [si, setSi] = useState(() => firstUnseen(start)), [p, setP] = useState(0), [paused, setPaused] = useState(false), [muted, setMuted] = useState(false)
  const [reply, setReply] = useState(''), [note, setNote] = useState(''), [views, setViews] = useState([]), [sheet, setSheet] = useState(false)
  const g = groups[gi], s = g?.items[si], own = g?.author.id === me.id
  const vid = useRef(), pausedRef = useRef(false), nextRef = useRef(), hold = useRef(), held = useRef(false), down = useRef(null)
  pausedRef.current = paused || sheet
  const next = () => { if (si < g.items.length - 1) setSi(si + 1); else if (gi < groups.length - 1) { setGi(gi + 1); setSi(firstUnseen(gi + 1)) } else close() }
  const prev = () => { if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0) } else { setP(0); if (vid.current) vid.current.currentTime = 0 } }
  nextRef.current = next
  useEffect(() => { document.body.classList.add('hidenav'); document.body.style.overflow = 'hidden'; return () => { document.body.classList.remove('hidenav'); document.body.style.overflow = '' } }, [])
  useEffect(() => {
    if (!s) return; setP(0); setSheet(false); setNote(''); setReply(''); setViews([])
    if (!own) sb.from('story_views').upsert({ story_id: s.id, viewer_id: me.id }, { onConflict: 'story_id,viewer_id', ignoreDuplicates: true }).then(() => markSeen(s.id))
    else sb.from('story_views').select('created_at,viewer:profiles!story_views_viewer_id_fkey(id,username,display_name,avatar_url)').eq('story_id', s.id).order('created_at', { ascending: false }).then(({ data }) => setViews(data || []))
    const nx = g.items[si + 1]; if (nx && nx.media_type === 'image') new Image().src = storyUrl(nx.media_path)
    if (s.media_type === 'video') return
    let raf, last = performance.now(), el = 0
    const tick = now => { if (!pausedRef.current) el += now - last; last = now; const q = Math.min(el / SECS, 1); setP(q); if (q >= 1) return nextRef.current(); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [gi, si])
  useEffect(() => { const v = vid.current; if (!v) return; paused || sheet ? v.pause() : v.play().catch(() => {}) }, [paused, sheet, gi, si])
  if (!s) return null
  const down_ = e => { down.current = { x: e.clientX, y: e.clientY }; held.current = false; hold.current = setTimeout(() => { held.current = true; setPaused(true) }, 220) }
  const up_ = e => {
    clearTimeout(hold.current); const d = down.current; down.current = null; if (!d) return
    const dy = e.clientY - d.y, dx = e.clientX - d.x
    if (held.current) { setPaused(false); held.current = false; if (dy < 90) return }
    if (dy > 90 && dy > Math.abs(dx)) return close()
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) e.clientX < window.innerWidth * 0.33 ? prev() : next()
  }
  async function dm(text) {
    if (!text.trim()) return
    try { const cid = await startDM(me.id, g.author.id); const { error } = await sb.from('messages').insert({ conversation_id: cid, sender_id: me.id, body: text, kind: 'text' }); if (error) throw error; setNote('Sent ✓'); setReply('') }
    catch (e) { setNote('Could not send.') }
  }
  async function del() {
    if (!confirm('Delete this story?')) return
    const { error } = await sb.from('stories').delete().eq('id', s.id); if (error) return alert('Could not delete: ' + error.message)
    sb.storage.from('story-media').remove([s.media_path]); refresh(); close()
  }
  return <div className="sv" role="dialog" aria-label="Story">
    <div className="svm" key={s.id}>{s.media_type === 'video'
      ? <video ref={vid} src={storyUrl(s.media_path)} autoPlay playsInline muted={muted} onTimeUpdate={e => setP(e.target.duration ? e.target.currentTime / e.target.duration : 0)} onEnded={next} onLoadedData={e => e.target.play().catch(() => { setMuted(true); e.target.muted = true; e.target.play().catch(() => {}) })} />
      : <img src={storyUrl(s.media_path)} alt="" />}</div>
    <div className="svtap" onPointerDown={down_} onPointerUp={up_} onPointerCancel={() => { clearTimeout(hold.current); setPaused(false) }} />
    <div className="svtop">
      <div className="svbars">{g.items.map((x, i) => <i key={x.id}><b style={{ width: (i < si ? 100 : i === si ? p * 100 : 0) + '%' }} /></i>)}</div>
      <div className="svhd"><Avatar p={g.author} size={36} /><b>{own ? 'Your Story' : g.author.display_name}</b><small>{ago(s.created_at)}</small><span style={{ flex: 1 }} />
        {s.media_type === 'video' && <button className="svb" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>}
        {own && <button className="svb" onClick={del} aria-label="Delete story">🗑</button>}
        <button className="svb" onClick={close} aria-label="Close">✕</button></div></div>
    {s.caption && <div className="svcap">{s.caption}</div>}
    <div className="svfoot">
      {own ? <button className="svviews" onClick={() => setSheet(true)}>👁 {views.length} {views.length === 1 ? 'view' : 'views'}</button>
        : <><input value={reply} onChange={e => setReply(e.target.value)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onKeyDown={e => e.key === 'Enter' && dm('Replied to your story: ' + reply)} placeholder={`Reply to ${g.author.display_name.split(' ')[0]}…`} aria-label="Reply" />
          {['❤️', '🔥', '😂'].map(e => <button key={e} className="svb em" onClick={() => dm('Reacted ' + e + ' to your story')} aria-label={'React ' + e}>{e}</button>)}
          <button className="svb" disabled={!reply.trim()} onClick={() => dm('Replied to your story: ' + reply)} aria-label="Send reply"><I n="send" s={20} fill /></button></>}
      {note && <small className="svnote">{note}</small>}</div>
    {sheet && <div className="svsheet" onClick={() => setSheet(false)}><div onClick={e => e.stopPropagation()}><h4>Viewed by</h4>
      {views.length === 0 ? <p className="empty">No views yet.</p> : views.map(v => <div className="svrow" key={v.viewer.id}><Avatar p={v.viewer} size={38} /><div><b>{v.viewer.display_name}</b><small>@{v.viewer.username} · {ago(v.created_at)}</small></div></div>)}</div></div>}
  </div>
}
