import { useState } from 'react'
import { sb, friendly } from './supabase'
export default function Poll({ p, me }) {
  const opts = [...(p.poll_options || [])].sort((a, b) => a.position - b.position)
  const [votes, setVotes] = useState(p.poll_votes || []), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  if (opts.length < 2) return null
  const mine = votes.find(v => v.user_id === me.id), closed = Date.now() - new Date(p.created_at) > 7 * 864e5, show = !!mine || closed, total = votes.length
  async function vote(o) {
    if (busy) return; setBusy(true); setErr('')
    const { error } = await sb.from('poll_votes').insert({ post_id: p.id, user_id: me.id, option_id: o.id }); setBusy(false)
    if (error) return setErr(error.code === '23505' ? 'You already voted.' : friendly(error)); setVotes(v => [...v, { user_id: me.id, option_id: o.id }])
  }
  return <div className="poll" onClick={e => e.stopPropagation()}>
    {opts.map(o => { const n = votes.filter(v => v.option_id === o.id).length, pct = total ? Math.round(n / total * 100) : 0
      return show ? <div key={o.id} className={'popt res' + (mine?.option_id === o.id ? ' mine' : '')}><i style={{ width: pct + '%' }} /><span>{o.text}{mine?.option_id === o.id && ' ✓'}</span><b>{pct}%</b></div>
        : <button key={o.id} className="popt" disabled={busy} onClick={() => vote(o)}><span>{o.text}</span></button> })}
    <small>{total} vote{total !== 1 && 's'} · {closed ? 'Poll closed' : show ? 'Closes 7 days after posting' : 'Votes cannot be changed'}</small>{err && <small className="msg" role="alert">{err}</small>}</div>
}
