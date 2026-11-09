import { useCallback, useEffect, useRef, useState } from 'react'
import { sb, hiddenIds, friendly } from './supabase'
import { drawCard, drawBackground, drawIcon, STYLES, BACKGROUNDS, FRAMES, EFFECTS, PILLARS, BADGE_ICON, W, H } from './passportArt'
import ReportSheet from './ReportSheet'
const DEF = { name: 'My card', style: 'classic', background: 'skyline', frame: 'turquoise', effects: ['glow'], badges: [], pillars: [] }
const pUrl = p => sb.storage.from('passport-photos').getPublicUrl(p).data.publicUrl, aUrl = p => sb.storage.from('avatars').getPublicUrl(p).data.publicUrl
const since = t => new Date(t).toLocaleDateString([], { month: 'short', year: 'numeric' })
export const cardData = (prof, pp, d) => ({ ...d, photoUrl: pp.photo_path ? pUrl(pp.photo_path) : prof.avatar_url ? aUrl(prof.avatar_url) : null, zoom: pp.photo_zoom, px: pp.photo_x, py: pp.photo_y, name: prof.display_name, cardName: pp.card_name, number: pp.member_no, location: pp.show_location ? prof.location : null, since: since(prof.created_at) })
function PCard({ d, drag, onDrag, cls = '' }) {
  const ref = useRef(), key = JSON.stringify(d), st = useRef(null)
  useEffect(() => { let on = true; const t = requestAnimationFrame(() => on && ref.current && drawCard(ref.current, d)); return () => { on = false; cancelAnimationFrame(t) } }, [key])
  const down = e => { if (drag) { st.current = [e.clientX, e.clientY]; e.currentTarget.setPointerCapture(e.pointerId) } }
  const move = e => { if (!drag || !st.current) return; const k = W / e.currentTarget.getBoundingClientRect().width, dx = (e.clientX - st.current[0]) * k, dy = (e.clientY - st.current[1]) * k; st.current = [e.clientX, e.clientY]; onDrag(dx / 150, dy / 150) }
  return <div className={'pcv ' + cls + ((d.effects || []).includes('animate') ? ' anim' : '')}><canvas ref={ref} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={() => (st.current = null)} onPointerCancel={() => (st.current = null)} style={drag ? { touchAction: 'none', cursor: 'grab' } : undefined} aria-label="Clout Passport card" /></div>
}
function Sw({ kind, k, on, pick, label }) {
  const r = useRef()
  useEffect(() => { const c = r.current.getContext('2d'); c.clearRect(0, 0, 80, 80)
    if (kind === 'bg') { c.save(); c.scale(80 / W, 80 / W); drawBackground(c, k, W, W); c.restore() }
    else if (kind === 'style') { c.fillStyle = '#0a1620'; c.fillRect(0, 0, 80, 80); drawIcon(c, 'crown', 40, 42, 52, STYLES[k].crown[1], STYLES[k].crown[0]) }
    else { c.fillStyle = '#0a1620'; c.fillRect(0, 0, 80, 80); const g = c.createLinearGradient(0, 0, 80, 80); FRAMES[k].c.forEach((x, i) => g.addColorStop(i / 2, x)); c.strokeStyle = g; c.lineWidth = 11; c.strokeRect(6, 6, 68, 68) } }, [kind, k])
  return <button className={'swx' + (on ? ' on' : '')} onClick={pick} aria-label={label} aria-pressed={on}><canvas ref={r} width={80} height={80} /></button>
}
async function shrink(file) {
  const url = URL.createObjectURL(file); const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file could not be read as a photo.')); i.src = url })
  const k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url)
  return new Promise(res => c.toBlob(res, 'image/jpeg', 0.86))
}
async function loadOwn(me) {
  await sb.rpc('sync_my_badges')
  let { data: pp } = await sb.from('passports').select('*').eq('user_id', me.id).maybeSingle()
  if (!pp) { const r = await sb.from('passports').insert({ user_id: me.id }).select('*').single(); if (r.error) throw r.error; pp = r.data }
  let { data: ds } = await sb.from('passport_designs').select('*').eq('user_id', me.id).order('created_at'); ds = ds || []
  if (!ds.length) { const r = await sb.from('passport_designs').insert({ user_id: me.id, ...{ name: 'Classic', style: 'classic', background: 'skyline', frame: 'turquoise', effects: ['glow'] } }).select('*').single(); if (r.error) throw r.error; ds = [r.data] }
  if (!pp.primary_design_id || !ds.find(x => x.id === pp.primary_design_id)) { const r = await sb.from('passports').update({ primary_design_id: ds[0].id }).eq('user_id', me.id).select('*').single(); if (!r.error) pp = r.data }
  const [{ data: prof }, { data: cat }, { data: own }] = await Promise.all([sb.from('profiles').select('*').eq('id', me.id).single(), sb.from('badge_catalog').select('*').eq('active', true), sb.from('passport_badges').select('badge_key').eq('user_id', me.id)])
  return { pp, ds, prof, cat: cat || [], own: new Set((own || []).map(x => x.badge_key)) }
}
function ShareSheet({ id, pub, canvasData, close }) {
  const [msg, setMsg] = useState(''), url = location.origin + '/?passport=' + id
  const native = async () => { try { navigator.share ? await navigator.share({ title: 'My Clout Passport on DAHUB', url }) : (await navigator.clipboard.writeText(url), setMsg('Link copied')) } catch {} }
  const copy = async () => { try { await navigator.clipboard.writeText(url); setMsg('Link copied') } catch { setMsg('Could not copy. Long-press the link to copy it.') } }
  const asImage = async () => {
    setMsg('Making your image…'); try {
      const c = document.createElement('canvas'); c.width = W; c.height = H; await drawCard(c, canvasData); const blob = await new Promise(r => c.toBlob(r, 'image/png')); if (!blob) throw new Error('x')
      const f = new File([blob], 'clout-passport.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'My Clout Passport' }); setMsg('') } else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clout-passport.png'; a.click(); setMsg('Image saved to your downloads.') }
    } catch (e) { setMsg(e?.name === 'AbortError' ? '' : 'Could not make the image. Try again.') }
  }
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}><h3 style={{ margin: 0 }}>Share your Passport</h3>
    {!pub && <p className="hint" style={{ margin: 0 }}>Your Passport is set to private, so other people cannot open this link. Turn on "Anyone can see my Passport" to share it.</p>}
    <button className="wb p" onClick={native}>Share link</button><button className="wb" onClick={copy}>Copy link</button><button className="wb" onClick={asImage}>Share as image</button>
    {msg && <p className="msg" role="status" style={{ margin: 0 }}>{msg}</p>}<small style={{ wordBreak: 'break-all' }}>{url}</small><button className="wb" onClick={close}>Close</button></div></div>
}
function Members({ me, open }) {
  const [rows, setRows] = useState(null)
  useEffect(() => { (async () => {
    const { data } = await sb.from('passports').select('user_id,member_no,card_name,photo_path,photo_zoom,photo_x,photo_y,show_location,primary:passport_designs!passports_primary_fk(*),profile:profiles(id,username,display_name,avatar_url,location,created_at)').eq('is_public', true).not('primary_design_id', 'is', null).order('created_at', { ascending: false }).limit(12)
    const hid = await hiddenIds(), l = (data || []).filter(r => r.primary && r.profile && !hid.has(r.user_id) && r.user_id !== me.id)
    const { data: bs } = l.length ? await sb.from('passport_badges').select('user_id,badge_key').in('user_id', l.map(x => x.user_id)) : { data: [] }
    setRows(l.map(r => ({ r, d: cardData(r.profile, r, { ...r.primary, badges: (r.primary.badges || []).filter(b => (bs || []).some(x => x.user_id === r.user_id && x.badge_key === b)) }) })))
  })() }, [])
  if (rows === null) return <div className="skel"><i /></div>
  if (!rows.length) return <div className="empty">No other member cards yet. Share yours to get things started.</div>
  return <div className="vrow">{rows.map(({ r, d }) => <button key={r.user_id} className="pmini" onClick={() => open(r.user_id)}><PCard d={d} /></button>)}</div>
}
export default function Passport({ id, me, back, openPassport, openDM, openProfile }) {
  const own = id === me.id
  return own ? <Studio me={me} back={back} openPassport={openPassport} /> : <PublicView id={id} me={me} back={back} openDM={openDM} openProfile={openProfile} />
}
const Bar = ({ back, children }) => <div className="bar"><button onClick={back}>←</button>{children}</div>
const Head = () => <div className="pthead"><h1>CLOUT PASSPORT</h1><p>YOUR IDENTITY • YOUR CARD • YOUR CLOUT</p></div>
function PublicView({ id, me, back, openDM, openProfile }) {
  const [s, setS] = useState(null), [err, setErr] = useState(''), [rep, setRep] = useState(false), [share, setShare] = useState(false)
  const load = useCallback(async () => {
    setErr(''); setS(null)
    const { data: pp, error } = await sb.from('passports').select('*').eq('user_id', id).maybeSingle(); if (error) return setErr(error.message)
    if (!pp) return setS({ none: true }); const [{ data: prof }, { data: ds }, { data: own }, { data: cat }] = await Promise.all([sb.from('profiles').select('id,username,display_name,avatar_url,location,created_at,is_verified').eq('id', id).single(), sb.from('passport_designs').select('*').eq('id', pp.primary_design_id || '00000000-0000-0000-0000-000000000000'), sb.from('passport_badges').select('badge_key').eq('user_id', id), sb.from('badge_catalog').select('*')])
    const d = (ds || [])[0]; if (!d || !prof) return setS({ none: true }); const owned = new Set((own || []).map(x => x.badge_key))
    setS({ prof, d: cardData(prof, pp, { ...d, badges: d.badges.filter(b => owned.has(b)) }), badges: (cat || []).filter(c => owned.has(c.key)) })
  }, [id])
  useEffect(() => { load() }, [load])
  return <div className="sheet"><Bar back={back}>Clout Passport</Bar><div className="sbody" style={{ paddingBottom: 130 }}><Head />
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {!s && !err && <div className="skel"><i /><i /></div>}
    {s?.none && <div className="empty">This Passport is private or has not been created yet.</div>}
    {s?.d && <><div className="pone"><PCard d={s.d} /></div>
      <h3 style={{ margin: '4px 14px' }}>{s.prof.display_name} <small>@{s.prof.username}</small></h3>
      {s.badges.length > 0 && <div className="gl arow"><b>Badges</b>{s.badges.map(b => <div key={b.key}><b>{b.label}</b> <small>({b.kind})</small><br /><small>{b.rule}</small></div>)}</div>}
      <div className="evact"><button className="wb p sm" onClick={() => openDM(id)}>Message</button><button className="wb sm" onClick={() => openProfile(id)}>View profile</button><button className="wb sm" onClick={() => setShare(true)}>Share</button><button className="wb sm" onClick={() => setRep(true)}>Report</button></div></>}
    {share && s?.d && <ShareSheet id={id} pub canvasData={s.d} close={() => setShare(false)} />}
    {rep && <ReportSheet me={me} type="profile" targetId={id} reportedUser={id} close={() => setRep(false)} />}
  </div></div>
}
function Studio({ me, back, openPassport }) {
  const [S, setS] = useState(null), [err, setErr] = useState(''), [draft, setDraft] = useState(DEF), [activeId, setActiveId] = useState(null), [pp, setPp] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [adjust, setAdjust] = useState(false), [share, setShare] = useState(false), [dirty, setDirty] = useState(false)
  const load = useCallback(async () => {
    setErr(''); try { const r = await loadOwn(me); setS(r); setPp(r.pp); const a = r.ds.find(x => x.id === r.pp.primary_design_id) || r.ds[0]; setActiveId(a.id); setDraft(a); setDirty(false) } catch (e) { setErr(friendly(e)) }
  }, [me.id])
  useEffect(() => { load() }, [load])
  if (err) return <div className="sheet"><Bar back={back}>Clout Passport</Bar><div className="sbody"><div className="empty">{err}<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={load}>Retry</button></div></div></div>
  if (!S || !pp) return <div className="sheet"><Bar back={back}>Clout Passport</Bar><div className="sbody"><Head /><div className="skel"><i /><i /></div></div></div>
  const set = o => { setDraft(d => ({ ...d, ...o })); setDirty(true) }, setP = o => { setPp(p => ({ ...p, ...o })); setDirty(true) }
  const tog = (k, v, max) => set({ [k]: draft[k].includes(v) ? draft[k].filter(x => x !== v) : draft[k].length < max ? [...draft[k], v] : draft[k] })
  const data = cardData(S.prof, pp, { ...draft, badges: draft.badges.filter(b => S.own.has(b)) })
  async function persist(asNew) {
    setBusy(true); setMsg(''); try {
      const body = { name: (draft.name || 'My card').slice(0, 30), style: draft.style, background: draft.background, frame: draft.frame, effects: draft.effects, badges: draft.badges.filter(b => S.own.has(b)), pillars: draft.pillars }
      let id = activeId, row
      if (asNew) { const r = await sb.from('passport_designs').insert({ user_id: me.id, ...body, name: asNew }).select('*').single(); if (r.error) throw r.error; row = r.data; id = row.id }
      else { const r = await sb.from('passport_designs').update(body).eq('id', id).select('*').single(); if (r.error) throw r.error; row = r.data }
      const r2 = await sb.from('passports').update({ card_name: pp.card_name?.trim() || null, photo_path: pp.photo_path, photo_zoom: pp.photo_zoom, photo_x: pp.photo_x, photo_y: pp.photo_y, is_public: pp.is_public, show_location: pp.show_location, primary_design_id: id, updated_at: new Date().toISOString() }).eq('user_id', me.id).select('*').single(); if (r2.error) throw r2.error
      setPp(r2.data); setS(s => ({ ...s, ds: asNew ? [...s.ds, row] : s.ds.map(x => x.id === id ? row : x) })); setActiveId(id); setDraft(row); setDirty(false); setMsg(asNew ? 'Saved as a new design.' : 'Card updated.')
    } catch (e) { setMsg(friendly(e)) } setBusy(false)
  }
  async function upload(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (!/^image\//.test(f.type)) return setMsg('Choose a photo file.'); if (f.size > 25 * 1024 * 1024) return setMsg('That photo is too big. Choose one under 25 MB.')
    setBusy(true); setMsg('Preparing your photo…'); try {
      const blob = await shrink(f), path = `${me.id}/${crypto.randomUUID()}.jpg`, { error } = await sb.storage.from('passport-photos').upload(path, blob, { contentType: 'image/jpeg' }); if (error) throw error
      setP({ photo_path: path, photo_zoom: 1, photo_x: 0, photo_y: 0 }); setAdjust(true); setMsg('Photo added. Drag the card to position it, then tap Update Card.')
    } catch (e2) { setMsg(friendly(e2)) } setBusy(false)
  }
  async function del() { if (S.ds.length < 2) return setMsg('You need at least one design.'); if (!confirm('Delete this design?')) return; const { error } = await sb.from('passport_designs').delete().eq('id', activeId); if (error) return setMsg(error.message); await load() }
  const pick = d => { setActiveId(d.id); setDraft(d); setDirty(false); setMsg('') }
  const drag = (dx, dy) => setPp(p => ({ ...p, photo_x: Math.max(-1, Math.min(1, p.photo_x + dx)), photo_y: Math.max(-1, Math.min(1, p.photo_y + dy)) })) || setDirty(true)
  const owned = S.cat.filter(b => S.own.has(b.key)), locked = S.cat.filter(b => !S.own.has(b.key))
  return <div className="sheet"><Bar back={back}>Clout Passport</Bar><div className="sbody" style={{ paddingBottom: 140 }}><Head />
    <div className="pgrid">
      <div><PCard d={data} drag={adjust} onDrag={drag} /><small className="pnote">{adjust ? 'Drag the card to move your photo.' : 'This is your live card.'}</small></div>
      <div className="ppanel"><div className="pcust">Customize Your Card</div>
        <div className="psec"><b>Card Style</b><div className="p4">{Object.entries(STYLES).map(([k, v]) => <Sw key={k} kind="style" k={k} label={v.label} on={draft.style === k} pick={() => set({ style: k })} />)}</div><small>{STYLES[draft.style]?.label}</small></div>
        <div className="psec"><b>Background</b><div className="p4">{Object.entries(BACKGROUNDS).map(([k, v]) => <Sw key={k} kind="bg" k={k} label={v} on={draft.background === k} pick={() => set({ background: k })} />)}</div><small>{BACKGROUNDS[draft.background]}</small></div>
        <div className="psec"><b>Frame</b><div className="p4">{Object.entries(FRAMES).map(([k, v]) => <Sw key={k} kind="frame" k={k} label={v.label} on={draft.frame === k} pick={() => set({ frame: k })} />)}</div><small>{FRAMES[draft.frame]?.label}</small></div>
        <div className="psec"><b>Effects</b><div className="pfx">{Object.entries(EFFECTS).map(([k, v]) => <button key={k} className={'chipb' + (draft.effects.includes(k) ? ' on' : '')} aria-pressed={draft.effects.includes(k)} onClick={() => tog('effects', k, 4)}>{v}</button>)}</div></div>
        <div className="psec"><b>Badges</b>{owned.length ? <div className="p4">{owned.map(b => <button key={b.key} className={'bdg' + (draft.badges.includes(b.key) ? ' on' : '')} onClick={() => tog('badges', b.key, 5)} aria-label={b.label} aria-pressed={draft.badges.includes(b.key)} title={b.label}>{b.label.slice(0, 2)}</button>)}</div> : <small>You have not earned any badges yet.</small>}</div>
      </div></div>
    {msg && <p className="msg" role="status" style={{ margin: '8px 14px' }}>{msg}</p>}
    <div className="pbtns"><button className="wb p" disabled={busy || !dirty} onClick={() => persist(null)}>{busy ? 'Saving…' : dirty ? '⟳ Update Card' : '✓ Saved'}</button><button className="wb p" onClick={() => setShare(true)}>⇪ Share Your Passport</button></div>
    <h4 className="msec">Card details</h4>
    <div className="form">
      <label>Name on the card<input maxLength={24} value={pp.card_name || ''} onChange={e => setP({ card_name: e.target.value })} placeholder={S.prof.display_name} /></label>
      <div className="gl arow"><b>Photo</b><div className="aact"><label className="wb sm" style={{ cursor: 'pointer' }}>Upload photo<input type="file" accept="image/*" hidden onChange={upload} /></label><button className="wb sm" onClick={() => { setP({ photo_path: null, photo_zoom: 1, photo_x: 0, photo_y: 0 }); setAdjust(false) }}>Use my profile photo</button><button className={'wb sm' + (adjust ? ' p' : '')} onClick={() => setAdjust(a => !a)}>{adjust ? 'Done positioning' : 'Position photo'}</button></div>
        <label>Zoom<input type="range" min="1" max="3" step="0.01" value={pp.photo_zoom} onChange={e => setP({ photo_zoom: Number(e.target.value) })} /></label>
        <button className="link" onClick={() => setP({ photo_zoom: 1, photo_x: 0, photo_y: 0 })}>Reset position</button>
        <small>Background removal is not available yet. Your photo blends into the card art instead, so any normal photo works.</small></div>
      <div className="gl arow"><b>Your values (optional, you choose)</b><div className="pfx">{Object.entries(PILLARS).map(([k, v]) => <button key={k} className={'chipb' + (draft.pillars.includes(k) ? ' on' : '')} aria-pressed={draft.pillars.includes(k)} onClick={() => tog('pillars', k, 4)}>{v}</button>)}</div></div>
      <label className="aact"><input type="checkbox" checked={pp.is_public} onChange={e => setP({ is_public: e.target.checked })} /> Anyone on DAHUB can see my Passport</label>
      <label className="aact"><input type="checkbox" checked={pp.show_location} onChange={e => setP({ show_location: e.target.checked })} /> Show my location on the card{!S.prof.location && ' (add one in Edit profile)'}</label>
      <div className="gl arow"><b>Badges you can earn</b>{S.cat.map(b => <div key={b.key}><b>{S.own.has(b.key) ? '✓ ' : ''}{b.label}</b> <small>({b.kind})</small><br /><small>{b.rule}</small></div>)}</div>
    </div>
    <h4 className="msec">My cards</h4>
    <div className="vrow">{S.ds.map(d => <button key={d.id} className={'pmini' + (d.id === activeId ? ' on' : '')} onClick={() => pick(d)}><PCard d={cardData(S.prof, pp, { ...d, badges: d.badges.filter(b => S.own.has(b)) })} /><small>{d.name}{d.id === pp.primary_design_id && ' · Main'}</small></button>)}</div>
    <div className="evact"><button className="wb sm" disabled={busy || S.ds.length >= 12} onClick={() => { const n = prompt('Name this design', 'New design'); n && persist(n.trim().slice(0, 30) || 'New design') }}>Save as new design</button><button className="wb sm" onClick={del}>Delete this design</button></div>
    <p className="hint" style={{ margin: '0 14px' }}>Tap a card to preview it, then tap Update Card to make it your main card. New limited-edition designs will show up here.</p>
    <h4 className="msec">Member cards</h4><Members me={me} open={openPassport} />
    {share && <ShareSheet id={me.id} pub={pp.is_public} canvasData={data} close={() => setShare(false)} />}
  </div></div>
}
