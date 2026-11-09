import { useEffect, useState } from 'react'
import { sb } from './supabase'
import { ACCT } from './media'
const AL = { verify: 'Verified', revoke_verification: 'Revoked verification', change_account_type: 'Changed account type', remove_content: 'Removed content', dismiss_report: 'Dismissed report', action_report: 'Handled report', remove_spotlight: 'Removed spotlight' }
export default function AccountsAdmin({ me, mode, openProfile }) {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [sel, setSel] = useState(null), [type, setType] = useState('standard'), [ver, setVer] = useState(false), [note, setNote] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [log, setLog] = useState(null), [names, setNames] = useState({})
  async function find() { const s = q.replace(/[^\w ]/g, '').trim(); if (!s) return; setMsg(''); const { data, error } = await sb.from('profiles').select('id,username,display_name,is_verified,account_type').or(`username.ilike.%${s}%,display_name.ilike.%${s}%`).limit(15); if (error) return setMsg(error.message); setRes(data || []) }
  const pick = p => { setSel(p); setType(p.account_type || 'standard'); setVer(!!p.is_verified); setNote(''); setMsg('') }
  async function save() {
    setBusy(true); setMsg(''); const { error } = await sb.rpc('set_account', { p_user: sel.id, p_type: type, p_verified: ver, p_note: note.trim() || null }); setBusy(false)
    if (error) return setMsg(error.message); setMsg('Saved and recorded in the audit log.'); const u = { ...sel, account_type: type, is_verified: ver }; setSel(u); setRes(r => r && r.map(x => x.id === u.id ? u : x))
  }
  useEffect(() => { if (mode !== 'audit') return; (async () => {
    const { data } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100); setLog(data || [])
    const ids = [...new Set((data || []).flatMap(x => [x.admin_id, x.target_type === 'profile' ? x.target_id : null]).filter(Boolean))]
    if (ids.length) { const { data: p } = await sb.from('profiles').select('id,username').in('id', ids); setNames(Object.fromEntries((p || []).map(x => [x.id, x.username]))) }
  })() }, [mode])
  if (mode === 'audit') return <div>{log === null ? <div className="skel"><i /></div> : log.length === 0 ? <div className="empty">No admin actions recorded yet.</div> : log.map(x => <div key={x.id} className="gl arow"><h4>{AL[x.action] || x.action}</h4>
    <small>By @{names[x.admin_id] || 'admin'} · {new Date(x.created_at).toLocaleString()}</small>
    <small>{x.target_type}{x.target_type === 'profile' && names[x.target_id] ? ` @${names[x.target_id]}` : ''}</small>{x.note && <p>{x.note}</p>}</div>)}</div>
  return <div>
    {msg && <p className="msg" role="status">{msg}</p>}
    {!sel && <><div className="gl arow"><p className="hint" style={{ margin: 0 }}>Find an account, choose its category, and turn the badge on or off. The badge, the category and any feature access are separate. Every change is recorded.</p>
      <input className="anote" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && find()} placeholder="Search name or @username" /><button className="wb p sm" onClick={find}>Search</button></div>
      {res && (res.length === 0 ? <div className="empty">No accounts found.</div> : res.map(p => <button key={p.id} className="gl arow" style={{ textAlign: 'left' }} onClick={() => pick(p)}><h4>{p.display_name} {p.is_verified && '✔'}</h4><small>@{p.username} · {ACCT[p.account_type || 'standard']}</small></button>))}</>}
    {sel && <div className="gl arow"><button className="link" onClick={() => { setSel(null); setMsg('') }}>← Back to search</button>
      <h4>{sel.display_name}</h4><small>@{sel.username}</small><button className="link" onClick={() => openProfile(sel.id)}>View profile</button>
      <label className="aact">Account category<select value={type} onChange={e => { setType(e.target.value); if (e.target.value !== 'standard') setVer(true) }}>{Object.entries(ACCT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="aact"><input type="checkbox" checked={ver} onChange={e => setVer(e.target.checked)} /> Show the verified badge</label>
      <input className="anote" value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Why (saved in the audit log)" />
      <button className="wb p sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>}
  </div>
}
