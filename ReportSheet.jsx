import { useState } from 'react'
import { sb } from './supabase'
import { REASONS, errMsg } from './opp'
export default function ReportSheet({ me, type, targetId, reportedUser, close }) {
  const [reason, setReason] = useState(''), [details, setDetails] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(''), [err, setErr] = useState('')
  async function send() {
    if (!reason) return setErr('Choose a reason.')
    setBusy(true); setErr('')
    const { error } = await sb.from('reports').insert({ reporter_id: me.id, target_type: type, target_id: targetId, reported_user_id: reportedUser || null, reason, details: details.trim() || null })
    setBusy(false)
    if (error) return error.code === '23505' ? setDone('You already reported this. We have it.') : setErr(errMsg(error))
    setDone('Thanks. Your report was saved.')
  }
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}>
    <h3 style={{ margin: 0 }}>Report</h3>
    {done ? <><p>{done}</p><button className="wb p" onClick={close}>Close</button></> : <>
      <select value={reason} onChange={e => setReason(e.target.value)} aria-label="Reason"><option value="">Why are you reporting this?</option>{Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="Anything else we should know? (optional)" />
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="wb p" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Submit report'}</button><button className="wb" onClick={close}>Cancel</button></>}
  </div></div>
}
