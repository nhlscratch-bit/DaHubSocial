import { useEffect, useRef, useState } from 'react'
import { sb, upload, friendly, ago, BUILD } from './supabase'
import Avatar from './Avatar'

// Send feedback (text + optional screenshot) → Admin › Feedback
export function FeedbackSheet({ me, close }) {
  const [body, setBody] = useState(''), [shot, setShot] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState(false), pick = useRef()
  const send = async () => {
    if (body.trim().length < 2) return setErr('Tell us what happened or what you want.')
    setBusy(true); setErr('')
    try {
      const shot_path = shot ? await upload('feedback', me.id, shot) : null
      const { error } = await sb.from('feedback').insert({ body: body.trim(), shot_path, build: BUILD, device: navigator.userAgent.slice(0, 200) }); if (error) throw error
      setOk(true)
    } catch (e) { setErr(friendly(e)) } finally { setBusy(false) }
  }
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}>
    <h3 style={{ margin: 0 }}>Send feedback</h3>
    {ok ? <><p>Got it, thank you 🙏 The team reads every one.</p><button className="wb p" onClick={close}>Done</button></> : <>
      <p className="pnote" style={{ padding: 0 }}>Something broken, confusing, or an idea? It goes straight to the DAHUB team.</p>
      <textarea className="ctext" rows={4} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} placeholder="What happened? What screen were you on?" />
      <input ref={pick} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) setShot(f) }} />
      <button className="wb sm" onClick={() => pick.current.click()}>{shot ? '📷 Screenshot added · change' : '📷 Add a screenshot'}</button>
      {err && <p className="msg" role="alert" style={{ padding: 0 }}>{err}</p>}
      <button className="wb p" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send to the team'}</button>
      <button className="wb" onClick={close}>Cancel</button></>}
  </div></div>
}

// Request a verified badge (business / media / creator) → Admin › Verify
const KINDS = [['business', 'Business', 'A shop, restaurant, salon or service'], ['creator', 'Creator / Artist', 'Music, art, content, comedy'], ['media', 'Media', 'Podcast, blog, news, photographer']]
export function VerifySheet({ me, profile, close }) {
  const [mine, setMine] = useState(undefined), [f, setF] = useState({ kind: 'business', name: profile?.display_name || '', details: '', link: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const load = () => sb.from('verification_requests').select('*').eq('user_id', me.id).order('created_at', { ascending: false }).limit(1).then(({ data }) => setMine(data?.[0] || null))
  useEffect(() => { load() }, [])
  const send = async () => {
    if (f.name.trim().length < 2) return setErr('Add the business or creator name.')
    setBusy(true); setErr('')
    const { error } = await sb.from('verification_requests').insert({ kind: f.kind, name: f.name.trim(), details: f.details.trim() || null, link: f.link.trim() || null })
    setBusy(false); if (error) return setErr(/one_pending|duplicate/i.test(error.message) ? 'You already have a request waiting.' : friendly(error)); load()
  }
  const pending = mine?.status === 'pending'
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}>
    <h3 style={{ margin: 0 }}>Get verified</h3>
    {profile?.is_verified ? <p>You’re already verified 👑</p> : mine === undefined ? <div className="skel"><i /></div> : pending ? <p>Your request is in review. We’ll update your profile as soon as it’s approved.</p> : <>
      {mine?.status === 'rejected' && <p className="msg" style={{ padding: 0 }}>Last request wasn’t approved{mine.note ? `: ${mine.note}` : '.'} You can try again.</p>}
      <p className="pnote" style={{ padding: 0 }}>Verified accounts get the crowned badge and show up in everyone’s For You feed.</p>
      <div className="vkinds">{KINDS.map(([k, l, d]) => <button key={k} aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })}><b>{l}</b><small>{d}</small></button>)}</div>
      <input value={f.name} maxLength={80} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Business or creator name" />
      <textarea className="ctext" rows={3} maxLength={1000} value={f.details} onChange={e => setF({ ...f, details: e.target.value })} placeholder="Tell us about it: what you do, where, how long" />
      <input value={f.link} maxLength={300} onChange={e => setF({ ...f, link: e.target.value })} placeholder="Website, Instagram or proof link (optional)" />
      {err && <p className="msg" role="alert" style={{ padding: 0 }}>{err}</p>}
      <button className="wb p" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send request'}</button></>}
    <button className="wb" onClick={close}>Close</button>
  </div></div>
}

// Admin tabs
export function FeedbackAdmin({ openProfile }) {
  const [rows, setRows] = useState(null), [show, setShow] = useState('open'), [urls, setUrls] = useState({})
  const load = async () => {
    const { data } = await sb.from('feedback').select('*,who:profiles!feedback_user_id_fkey(id,username,display_name,avatar_url)').eq('status', show).order('created_at', { ascending: false }).limit(60)
    setRows(data || [])
    const paths = (data || []).map(r => r.shot_path).filter(Boolean)
    if (paths.length) { const { data: s } = await sb.storage.from('feedback').createSignedUrls(paths, 3600); setUrls(Object.fromEntries((s || []).map(x => [x.path, x.signedUrl]))) }
  }
  useEffect(() => { load() }, [show])
  const mark = async (r, st) => { await sb.from('feedback').update({ status: st }).eq('id', r.id); load() }
  return <div style={{ padding: '0 12px 120px' }}>
    <div className="chips" style={{ padding: '0 0 8px' }}>{[['open', 'Open'], ['done', 'Done']].map(([k, l]) => <button key={k} className="chipb" aria-selected={show === k} onClick={() => setShow(k)}>{l}</button>)}</div>
    {rows === null ? <div className="skel"><i /></div> : rows.length === 0 ? <div className="empty">{show === 'open' ? 'No new feedback.' : 'Nothing marked done yet.'}</div>
      : rows.map(r => <div key={r.id} className="gl arow">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar p={r.who} size={30} onClick={() => openProfile(r.who.id)} /><b>{r.who?.display_name}</b><small>@{r.who?.username} · {ago(r.created_at)} · {r.build}</small></div>
        <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{r.body}</p>
        {r.shot_path && urls[r.shot_path] && <a href={urls[r.shot_path]} target="_blank" rel="noreferrer"><img src={urls[r.shot_path]} alt="Screenshot" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 12 }} /></a>}
        <div className="aact">{show === 'open' ? <button className="wb p sm" onClick={() => mark(r, 'done')}>Mark done</button> : <button className="wb sm" onClick={() => mark(r, 'open')}>Reopen</button>}</div>
      </div>)}
  </div>
}
export function VerifyAdmin({ openProfile }) {
  const [rows, setRows] = useState(null), [note, setNote] = useState({}), [msg, setMsg] = useState('')
  const load = async () => { const { data } = await sb.from('verification_requests').select('*,who:profiles!verification_requests_user_id_fkey(id,username,display_name,avatar_url,account_type)').eq('status', 'pending').order('created_at').limit(60); setRows(data || []) }
  useEffect(() => { load() }, [])
  const act = async (r, ok) => { setMsg(''); const { error } = await sb.rpc('review_verification', { p_id: r.id, p_approve: ok, p_note: note[r.id] || null }); if (error) return setMsg(friendly(error)); setMsg(ok ? `Approved @${r.who.username}. Badge is live.` : 'Rejected.'); load() }
  return <div style={{ padding: '0 12px 120px' }}>
    {msg && <p className="msg" role="status">{msg}</p>}
    {rows === null ? <div className="skel"><i /></div> : rows.length === 0 ? <div className="empty">No verification requests waiting.</div>
      : rows.map(r => <div key={r.id} className="gl arow">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar p={r.who} size={34} onClick={() => openProfile(r.who.id)} /><b>{r.name}</b><small>@{r.who?.username} · wants <b>{r.kind}</b> · {ago(r.created_at)}</small></div>
        {r.details && <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{r.details}</p>}
        {r.link && <a className="link" href={/^https?:/.test(r.link) ? r.link : 'https://' + r.link} target="_blank" rel="noreferrer">{r.link}</a>}
        <input className="anote" value={note[r.id] || ''} onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))} placeholder="Note (shown if rejected)" maxLength={200} />
        <div className="aact"><button className="wb p sm" onClick={() => act(r, true)}>Approve + badge</button><button className="wb sm" onClick={() => act(r, false)}>Reject</button></div>
      </div>)}
  </div>
}
