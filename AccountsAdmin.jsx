import { useEffect, useState } from 'react'
import { sb } from './supabase'
import { ACCT } from './media'
const AL = { grant_badge: 'Granted badge', revoke_badge: 'Removed badge', suspend: 'Suspended account', ban: 'Banned account', reinstate: 'Reinstated account', verify: 'Verified', revoke_verification: 'Revoked verification', change_account_type: 'Changed account type', remove_content: 'Removed content', dismiss_report: 'Dismissed report', action_report: 'Handled report', remove_spotlight: 'Removed spotlight', ad_verify: 'Verified After Dark creator', ad_unverify: 'Removed After Dark creator' }
export default function AccountsAdmin({ me, mode, openProfile }) {
  const [q, setQ] = useState(''), [res, setRes] = useState(null), [sel, setSel] = useState(null), [type, setType] = useState('standard'), [ver, setVer] = useState(false), [note, setNote] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [log, setLog] = useState(null), [days, setDays] = useState(7), [why, setWhy] = useState(''), [bdg, setBdg] = useState('launch'), [names, setNames] = useState({})
  async function find() { const s = q.replace(/[^\w ]/g, '').trim(); if (!s) return; setMsg(''); const { data, error } = await sb.from('profiles').select('id,username,display_name,is_verified,account_type,account_status,suspended_until,status_reason').or(`username.ilike.%${s}%,display_name.ilike.%${s}%`).limit(15); if (error) return setMsg(error.message); setRes(data || []) }
  const [ad, setAd] = useState(undefined)
  useEffect(() => { setAd(undefined); if (sel?.id) sb.from('ad_access').select('enabled,id_verified,confirmed_at').eq('user_id', sel.id).maybeSingle().then(({ data }) => setAd(data || null)) }, [sel?.id])
  async function adVerify(on) {
    if (on && !confirm(`Mark @${sel.username} as an ID-verified After Dark creator? Only do this after you have checked a government ID and confirmed they are 18+.`)) return
    setBusy(true); setMsg(''); const { error } = await sb.rpc('ad_verify', { p_user: sel.id, p_on: on }); setBusy(false)
    if (error) return setMsg(error.message); setAd(x => ({ ...x, id_verified: on })); setMsg(on ? 'Verified as After Dark creator. Recorded in the audit log.' : 'After Dark creator verification removed.')
  }
  const pick = p => { setSel(p); setType(p.account_type || 'standard'); setVer(!!p.is_verified); setNote(''); setMsg('') }
  async function save() {
    setBusy(true); setMsg(''); const { error } = await sb.rpc('set_account', { p_user: sel.id, p_type: type, p_verified: ver, p_note: note.trim() || null }); setBusy(false)
    if (error) return setMsg(error.message); setMsg('Saved and recorded in the audit log.'); const u = { ...sel, account_type: type, is_verified: ver }; setSel(u); setRes(r => r && r.map(x => x.id === u.id ? u : x))
  }
  async function status(st) {
    if (st !== 'active' && !confirm(st === 'banned' ? `Ban @${sel.username}? They will be locked out and hidden.` : `Suspend @${sel.username} for ${days} day(s)?`)) return
    setBusy(true); setMsg(''); const { error } = await sb.rpc('set_status', { p_user: sel.id, p_status: st, p_days: st === 'suspended' ? Number(days) : null, p_reason: why.trim() || null }); setBusy(false)
    if (error) return setMsg(error.message)
    const u = { ...sel, account_status: st, suspended_until: st === 'suspended' ? new Date(Date.now() + days * 864e5).toISOString() : null, status_reason: st === 'active' ? null : why.trim() || null }
    setSel(u); setRes(r => r && r.map(x => x.id === u.id ? u : x)); setWhy(''); setMsg(st === 'active' ? 'Reinstated.' : st === 'banned' ? 'Banned.' : 'Suspended.')
  }
  async function badge(g) { setBusy(true); setMsg(''); const { error } = await sb.rpc('grant_badge', { p_user: sel.id, p_badge: bdg, p_grant: g }); setBusy(false); setMsg(error ? error.message : g ? 'Badge granted.' : 'Badge removed.') }
  const cur = sel && (sel.account_status === 'banned' ? 'banned' : sel.account_status === 'suspended' && (!sel.suspended_until || new Date(sel.suspended_until) > new Date()) ? 'suspended' : 'active')
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
      <button className="wb p sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      <h4 style={{ marginTop: 10 }}>After Dark</h4>
      {ad === undefined ? <small>Loading…</small> : ad === null ? <small>Has not entered After Dark.</small> : <><small>Entered {new Date(ad.confirmed_at).toLocaleDateString()} · {ad.enabled ? 'On' : 'Turned off'} · {ad.id_verified ? 'ID-verified creator (can post nudity)' : 'Not ID-verified'}</small>
        <div className="aact">{ad.id_verified ? <button className="wb sm" disabled={busy} onClick={() => adVerify(false)}>Remove creator verification</button> : <button className="wb p sm" disabled={busy} onClick={() => adVerify(true)}>Verify ID (18+) as creator</button>}</div></>}
      <h4 style={{ marginTop: 10 }}>Passport badge</h4><div className="aact"><select value={bdg} onChange={e => setBdg(e.target.value)} aria-label="Badge"><option value="launch">DAHUB Launch (event)</option><option value="award_creator">Creator Award</option></select><button className="wb p sm" disabled={busy} onClick={() => badge(true)}>Grant</button><button className="wb sm" disabled={busy} onClick={() => badge(false)}>Remove</button></div>
      <h4 style={{ marginTop: 10 }}>Account status: {cur === 'active' ? 'Active' : cur === 'banned' ? 'Banned' : `Suspended until ${sel.suspended_until ? new Date(sel.suspended_until).toLocaleDateString() : 'further notice'}`}</h4>
      {sel.status_reason && cur !== 'active' && <small>Reason: {sel.status_reason}</small>}
      <input className="anote" value={why} onChange={e => setWhy(e.target.value)} maxLength={200} placeholder="Reason (shown to the person)" />
      <div className="aact">{cur === 'active' ? <><select value={days} onChange={e => setDays(e.target.value)} aria-label="Days">{[1, 3, 7, 14, 30, 90].map(d => <option key={d} value={d}>{d} day{d > 1 && 's'}</option>)}</select><button className="wb sm" disabled={busy} onClick={() => status('suspended')}>Suspend</button><button className="wb sm" disabled={busy} onClick={() => status('banned')}>Ban</button></> : <button className="wb p sm" disabled={busy} onClick={() => status('active')}>Reinstate</button>}</div></div>}
  </div>
}
