import { useEffect, useState } from 'react'
import { sb, ago } from './supabase'
import { TYPES, TSHORT, COMP, oppSel, oppImg, dlabel, errMsg } from './opp'
import Avatar from './Avatar'
import I from './Icons'
import ReportSheet from './ReportSheet'
const RS = { sent: 'Sent', viewed: 'Viewed', accepted: 'Accepted', declined: 'Not a fit' }
const STATUSES = [['open', 'Open'], ['paused', 'Paused'], ['filled', 'Filled'], ['closed', 'Closed']]
export default function OpportunityDetail({ id, me, back, openProfile, openDM }) {
  const [o, setO] = useState(null), [mine, setMine] = useState(null), [resps, setResps] = useState([]), [saved, setSaved] = useState(false), [note, setNote] = useState('')
  const [ask, setAsk] = useState(false), [rep, setRep] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [gone, setGone] = useState(false)
  const load = async () => {
    const { data, error } = await sb.from('opportunities').select(oppSel).eq('id', id).maybeSingle()
    if (error) return setErr(error.message); if (!data) return setGone(true); setO(data)
    if (data.poster.id === me.id) {
      const { data: r } = await sb.from('opportunity_responses').select('id,message,status,created_at,responder:profiles!opportunity_responses_responder_id_fkey(id,username,display_name,avatar_url,is_verified)').eq('opportunity_id', id).order('created_at', { ascending: false }); setResps(r || [])
    } else {
      const { data: r } = await sb.from('opportunity_responses').select('id,status,message').eq('opportunity_id', id).eq('responder_id', me.id).maybeSingle(); setMine(r)
      const { data: sv } = await sb.from('opportunity_saves').select('opportunity_id').eq('user_id', me.id).eq('opportunity_id', id).maybeSingle(); setSaved(!!sv)
    }
  }
  useEffect(() => { load() }, [id])
  const run = async fn => { setBusy(true); setErr(''); const { error } = await fn(); setBusy(false); if (error) setErr(errMsg(error)); else load() }
  const interest = () => run(async () => { const r = await sb.from('opportunity_responses').insert({ opportunity_id: id, responder_id: me.id, message: note.trim() || null }); if (!r.error) { setAsk(false); setNote('') } return r })
  const withdraw = () => run(() => sb.from('opportunity_responses').delete().eq('id', mine.id))
  const toggleSave = () => run(() => saved ? sb.from('opportunity_saves').delete().eq('user_id', me.id).eq('opportunity_id', id) : sb.from('opportunity_saves').insert({ user_id: me.id, opportunity_id: id }))
  const setStatus = st => run(() => sb.from('opportunities').update({ status: st }).eq('id', id))
  const setResp = (rid, st) => run(() => sb.from('opportunity_responses').update({ status: st }).eq('id', rid))
  const del = async () => { if (!confirm('Delete this listing? This cannot be undone.')) return; const { error } = await sb.from('opportunities').delete().eq('id', id); if (error) setErr(errMsg(error)); else back() }
  const share = async () => { try { navigator.share ? await navigator.share({ title: o.title, url: location.origin }) : (await navigator.clipboard.writeText(location.origin), alert('Link copied')) } catch {} }
  const top = <div className="pvtop"><button className="ib" onClick={back} aria-label="Back"><I n="back" s={22} /></button><b className="ptitle">Opportunity</b><button className="ib" onClick={share} aria-label="Share"><I n="share" s={20} /></button></div>
  if (gone) return <div className="sheet clear">{top}<div className="empty">This listing is no longer available.</div></div>
  if (!o) return <div className="sheet clear">{top}{err ? <p className="msg">{err}</p> : <div className="skel"><i /></div>}</div>
  const isMine = o.poster.id === me.id, open = o.status === 'open'
  return <div className="sheet clear">{top}
    <div className="sbody obody2">
      {o.image_path && <img className="oimg" src={oppImg(o.image_path)} alt="" />}
      <div className="gl odet">
        <div className="obad"><span className={'tb t-' + o.type}>{TSHORT[o.type]}</span><span className={'tb c-' + o.compensation}>{o.compensation === 'paid' ? '$ Paid' : COMP[o.compensation]}</span>{!open && <span className="tb st">{o.status}</span>}</div>
        <h1>{o.title}</h1>
        <div className="ometa"><I n="pin" s={14} /> {o.is_remote ? 'Remote' : o.location || 'Location not set'}{o.is_remote && o.location ? ' · ' + o.location : ''} · Posted {ago(o.created_at)} ago</div>
        <div className="oposter" onClick={() => openProfile(o.poster.id)}><Avatar p={o.poster} size={46} /><div><b>{o.poster.display_name}{o.poster.is_verified && <span className="ver">✔</span>}</b><br /><small>@{o.poster.username}</small></div></div>
        <h4>About this opportunity</h4><p className="odesc full">{o.description}</p>
        {o.requirements && <><h4>Requirements</h4><p className="odesc full">{o.requirements}</p></>}
        <div className="orow"><span>Type</span><b>{TYPES[o.type]}</b></div>
        <div className="orow"><span>Pay</span><b>{COMP[o.compensation]}{o.compensation_note ? ' · ' + o.compensation_note : ''}</b></div>
        <div className="orow"><span>Category</span><b>{o.category}</b></div>
        {o.deadline && <div className="orow"><span>Deadline</span><b>{dlabel(o.deadline)}</b></div>}
      </div>
      {err && <p className="msg" role="alert">{err}</p>}
      {!isMine && <div className="gl odet">
        {!open && <p className="obanner">This opportunity is {o.status}. You can still message the poster.</p>}
        <div className="oact">
          {o.contact_method !== 'interest' && <button className="wb" onClick={() => openDM(o.poster.id)}><I n="comment" s={18} /> Message</button>}
          {o.contact_method !== 'dm' && !mine && open && !ask && <button className="wb p" onClick={() => setAsk(true)}>I'm interested</button>}
        </div>
        {ask && <div className="oask"><textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Add a short note (optional): who you are and why you fit" />
          <div className="oact"><button className="wb p" disabled={busy} onClick={interest}>{busy ? 'Sending…' : 'Send interest'}</button><button className="wb" onClick={() => setAsk(false)}>Cancel</button></div></div>}
        {mine && <div className="oact"><span className={'tb r-' + mine.status}>Interest sent · {RS[mine.status]}</span><button className="wb sm" disabled={busy} onClick={withdraw}>Withdraw</button></div>}
        <div className="oact"><button className="wb" onClick={toggleSave}><I n="bookmark" s={18} fill={saved} /> {saved ? 'Saved' : 'Save'}</button><button className="wb" onClick={() => setRep(true)}>Report</button></div>
      </div>}
      {isMine && <div className="gl odet"><h4 style={{ marginTop: 0 }}>Manage your listing</h4>
        <div className="seg">{STATUSES.map(([k, l]) => <button key={k} className={o.status === k ? 'wb p' : 'wb'} disabled={busy} onClick={() => setStatus(k)}>{l}</button>)}</div>
        <h4>Responses ({resps.length})</h4>
        {!resps.length && <p className="onote">No responses yet.</p>}
        {resps.map(r => <div key={r.id} className="oresp"><div className="oposter" onClick={() => openProfile(r.responder.id)}><Avatar p={r.responder} size={42} /><div><b>{r.responder.display_name}{r.responder.is_verified && <span className="ver">✔</span>}</b> <span className={'tb r-' + r.status}>{RS[r.status]}</span><br /><small>{ago(r.created_at)} ago</small></div></div>
          {r.message && <p className="odesc full">{r.message}</p>}
          <div className="oact"><button className="wb sm" onClick={() => openDM(r.responder.id)}>Message</button><button className="wb p sm" disabled={busy} onClick={() => setResp(r.id, 'accepted')}>Accept</button><button className="wb sm" disabled={busy} onClick={() => setResp(r.id, 'declined')}>Not a fit</button></div></div>)}
        <button className="wb" style={{ marginTop: 12, color: '#b3261e' }} onClick={del}>Delete listing</button></div>}
    </div>
    {rep && <ReportSheet me={me} type="opportunity" targetId={o.id} reportedUser={o.poster.id} close={() => setRep(false)} />}</div>
}
