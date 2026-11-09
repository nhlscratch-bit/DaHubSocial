import { useEffect, useState } from 'react'
import { sb, friendly } from './supabase'
export function QotdCard({ openPost }) {
  const [q, setQ] = useState(null)
  useEffect(() => { sb.from('qotd').select('id,question,post_id,created_at').order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => { if (data && data.post_id && Date.now() - new Date(data.created_at) < 30 * 36e5) setQ(data) }) }, [])
  if (!q) return null
  return <button className="qotd" onClick={() => openPost(q.post_id, true)}><small>💬 QUESTION OF THE DAY</small><b>{q.question}</b><span className="watch sm">Answer ›</span></button>
}
export default function DailyAdmin({ me }) {
  const [text, setText] = useState(''), [list, setList] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const load = async () => { const { data } = await sb.from('qotd').select('*').order('created_at', { ascending: false }).limit(20); setList(data || []) }
  useEffect(() => { load() }, [])
  async function post() {
    const t = text.trim(); if (t.length < 5) return setMsg('Write a question first.'); setBusy(true); setMsg('')
    try {
      const { data: p, error } = await sb.from('posts').insert({ author_id: me.id, body: '💬 Question of the Day: ' + t, kind: 'text', audience: 'public' }).select('id').single(); if (error) throw error
      const { error: e2 } = await sb.from('qotd').insert({ question: t, post_id: p.id, created_by: me.id }); if (e2) { await sb.from('posts').delete().eq('id', p.id); throw e2 }
      setText(''); setMsg('Posted. It shows at the top of everyone\'s home feed for about a day.'); load()
    } catch (e) { setMsg(friendly(e)) } setBusy(false)
  }
  async function rm(x) { if (!confirm('Remove this question and its post?')) return; if (x.post_id) await sb.from('posts').delete().eq('id', x.post_id); await sb.from('qotd').delete().eq('id', x.id); load() }
  return <div>{msg && <p className="msg" role="status">{msg}</p>}
    <div className="gl arow"><h4>Question of the Day</h4><p className="hint" style={{ margin: 0 }}>Post one question. Everyone answers in the comments. A new question replaces the old one on the home feed.</p>
      <input className="anote" value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Best spot for crab cakes in Baltimore?" /><button className="wb p sm" disabled={busy} onClick={post}>{busy ? 'Posting…' : 'Post question'}</button></div>
    {list && list.map(x => <div key={x.id} className="gl arow"><b>{x.question}</b><small>{new Date(x.created_at).toLocaleString()}</small><div className="aact"><button className="wb sm" onClick={() => rm(x)}>Remove</button></div></div>)}</div>
}
