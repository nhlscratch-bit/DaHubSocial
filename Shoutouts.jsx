import { useEffect, useState } from 'react'
import { sb, hiddenIds, friendly, ago } from './supabase'
import { SOTAG } from './media'
import Avatar from './Avatar'
import ReportSheet from './ReportSheet'
import Verified from './Verified'
const SEL = '*,giver:profiles!shoutouts_giver_id_fkey(id,username,display_name,avatar_url,is_verified)'
export default function Shoutouts({ id, me, openProfile }) {
  const own = id === me.id, [rows, setRows] = useState(null), [err, setErr] = useState(''), [form, setForm] = useState(false), [rep, setRep] = useState(null), [msg, setMsg] = useState('')
  const load = async () => {
    setErr(''); const { data, error } = await sb.from('shoutouts').select(SEL).eq('recipient_id', id).order('created_at', { ascending: false }).limit(60); if (error) return setErr(error.message)
    const hid = await hiddenIds(); setRows((data || []).filter(r => !hid.has(r.giver.id)))
  }
  useEffect(() => { load() }, [id])
  const mine = rows?.find(r => r.giver.id === me.id)
  async function hide(r) { const { error } = await sb.from('shoutouts').update({ hidden: !r.hidden }).eq('id', r.id); error ? setMsg(error.message) : load() }
  async function del(r) { if (!confirm(own ? 'Delete this shoutout?' : 'Delete your shoutout?')) return; const { error } = await sb.from('shoutouts').delete().eq('id', r.id); error ? setMsg(error.message) : load() }
  return <div>
    {!own && <div className="evact"><button className="wb p sm" onClick={() => setForm(true)}>{mine ? 'Edit your shoutout' : '📣 Give a shoutout'}</button></div>}
    <p className="hint" style={{ margin: '4px 14px' }}>Shoutouts are personal opinions from other members. They are not verified reviews.</p>
    {msg && <p className="msg" role="alert">{msg}</p>}
    {err && <p className="msg" role="alert">{err} <button className="link" onClick={load}>Retry</button></p>}
    {rows === null && !err && <div className="skel"><i /><i /></div>}
    {rows?.length === 0 && <div className="empty">{own ? 'No shoutouts yet. When someone gives you one, it shows here.' : 'No shoutouts yet. Be the first to give one.'}</div>}
    {rows?.map(r => <div key={r.id} className={'gl so' + (r.hidden ? ' dim' : '')}>
      <div className="soh"><Avatar p={r.giver} size={40} onClick={() => openProfile(r.giver.id)} /><span><b>{r.giver.display_name}</b>{r.giver.is_verified && <Verified />}<br /><small>{ago(r.created_at)}</small></span><span className="gtag">{SOTAG[r.tag][0]} {SOTAG[r.tag][1]}</span></div>
      <p>{r.body}</p>{r.hidden && <small>Hidden from your profile. Only you and {r.giver.display_name} can see it.</small>}
      <div className="aact">{own && <button className="wb sm" onClick={() => hide(r)}>{r.hidden ? 'Show' : 'Hide'}</button>}{r.giver.id === me.id || own ? <button className="wb sm" onClick={() => del(r)}>Delete</button> : null}{r.giver.id !== me.id && <button className="wb sm" onClick={() => setRep(r)}>Report</button>}</div></div>)}
    {form && <Form id={id} me={me} cur={mine} close={() => setForm(false)} done={() => { setForm(false); load() }} />}
    {rep && <ReportSheet me={me} type="shoutout" targetId={rep.id} reportedUser={rep.giver.id} close={() => setRep(null)} />}
  </div>
}
function Form({ id, me, cur, close, done }) {
  const [tag, setTag] = useState(cur?.tag || 'vibes'), [body, setBody] = useState(cur?.body || ''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function save() {
    if (body.trim().length < 3) return setErr('Write a few words.'); setBusy(true); setErr('')
    const r = cur ? await sb.from('shoutouts').update({ tag, body: body.trim() }).eq('id', cur.id) : await sb.from('shoutouts').insert({ giver_id: me.id, recipient_id: id, tag, body: body.trim() }); setBusy(false)
    r.error ? setErr(r.error.code === '23505' ? 'You already gave this person a shoutout. Edit it instead.' : friendly(r.error)) : done()
  }
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}><h3 style={{ margin: 0 }}>{cur ? 'Edit your shoutout' : 'Give a shoutout'}</h3>
    <div className="pfx">{Object.entries(SOTAG).map(([k, [e, l]]) => <button key={k} className={'chipb' + (tag === k ? ' on' : '')} aria-pressed={tag === k} onClick={() => setTag(k)}>{e} {l}</button>)}</div>
    <textarea className="anote" rows={3} maxLength={140} value={body} onChange={e => setBody(e.target.value)} placeholder="Say something real and kind (140 characters)" /><small>{body.length}/140 · Public on their profile</small>
    {err && <p className="msg" role="alert" style={{ margin: 0 }}>{err}</p>}<button className="wb p" disabled={busy} onClick={save}>{busy ? 'Posting…' : cur ? 'Save' : 'Post shoutout'}</button><button className="wb" onClick={close}>Cancel</button></div></div>
}
