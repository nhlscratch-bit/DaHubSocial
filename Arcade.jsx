import { useEffect, useRef, useState } from 'react'
import { sb, friendly } from './supabase'
import Avatar from './Avatar'
import I from './Icons'

// DAHUB Arcade (testing). Games live in the private 'arcade' bucket; storage RLS only lets the owner (admins)
// and people who entered the tester password read them. Layout/design is a placeholder until the owner's redesign.
export const GAMES = [
  { id: 'fight', name: 'DAHUB Fighters', blurb: '2.5D street brawler. Best of 3, Blazin’ moves, CPU on 3 levels.', emoji: '🥊' },
  { id: 'spades', name: 'DAHUB Spades', blurb: 'Lounge table vs 3 bots. Nil, bags, Jokers optional.', emoji: '♠️' }]

const sheet = (title, back, body, cls = '') => <div className={'sheet solid ' + cls}><div className="bar"><button onClick={back} aria-label="Back">←</button>{title}</div><div className="sbody">{body}</div></div>

function Unlock({ st, done }) {
  const [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  async function go(e) {
    e.preventDefault(); if (!pw.trim()) return; setBusy(true); setErr('')
    const { data, error } = await sb.rpc('arcade_unlock', { p_pass: pw.trim() }); setBusy(false)
    if (error) return setErr(friendly(error)); if (!data) return setErr('Wrong password. Try again.'); done()
  }
  return <form className="arc-lock" onSubmit={go}><div className="arc-ico"><I n="lock" s={34} /></div><h2>Arcade is in testing</h2>
    <p>Games are locked while they’re being finished. If you were given the tester password, enter it below.</p>
    {st?.pass_set === false ? <p className="msg">Testing hasn’t opened yet. Check back soon.</p> : <>
      <input type="password" autoComplete="off" placeholder="Tester password" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="gobtn" disabled={busy || !pw.trim()}>{busy ? 'Checking…' : 'Unlock Arcade'}</button></>}</form>
}

function OwnerPanel() {
  const [pw, setPw] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(''), [testers, setTesters] = useState(null), [passSet, setPassSet] = useState(null)
  const load = async () => {
    const [{ data, error }, { data: st }] = await Promise.all([sb.rpc('arcade_testers'), sb.rpc('arcade_status')])
    if (error) { setMsg(friendly(error)); setTesters([]) } else setTesters(data || []); setPassSet(!!st?.pass_set)
  }
  useEffect(() => { load() }, [])
  async function savePw() {
    setBusy('pw'); setMsg(''); const { error } = await sb.rpc('arcade_set_pass', { p_pass: pw.trim() }); setBusy('')
    if (error) return setMsg(friendly(error)); setPw(''); setPassSet(true); setMsg('Password saved. Testers who already unlocked keep access until you remove them.')
  }
  async function revoke(t) {
    if (!confirm(`Remove ${t.display_name || t.username} from Arcade testing?`)) return
    const { error } = await sb.rpc('arcade_revoke', { p_user: t.id }); if (error) return setMsg(friendly(error)); load()
  }
  async function sync() {
    setBusy('sync'); setMsg('')
    const { data, error } = await sb.functions.invoke('arcade-sync', { body: {} }); setBusy('')
    if (error || data?.error) return setMsg('Update failed: ' + (data?.error || error.message))
    setMsg(`Games updated (${data.uploaded} files)${data.failed?.length ? `, ${data.failed.length} failed` : ''}.`)
  }
  return <div className="arc-owner"><h3>Owner controls</h3>
    <label>Tester password {passSet === false && <em>(not set yet)</em>}
      <div className="arc-row"><input type="text" autoComplete="off" placeholder={passSet ? 'New password' : 'Set a password'} value={pw} onChange={e => setPw(e.target.value)} />
        <button className="gobtn" disabled={busy === 'pw' || pw.trim().length < 4} onClick={savePw}>{busy === 'pw' ? 'Saving…' : 'Save'}</button></div></label>
    <button className="arc-sync" disabled={busy === 'sync'} onClick={sync}>{busy === 'sync' ? 'Updating games…' : 'Update games from GitHub'}</button>
    {msg && <p className="msg" role="status">{msg}</p>}
    <h4>Testers {testers && `(${testers.length})`}</h4>
    {!testers ? <p className="arc-dim">Loading…</p> : !testers.length ? <p className="arc-dim">No testers yet. Share the password with friends and they’ll show up here once they unlock.</p>
      : testers.map(t => <div key={t.id} className="arc-tester"><Avatar p={t} size={34} /><span><b>{t.display_name || t.username}</b><small>@{t.username}</small></span><button onClick={() => revoke(t)}>Remove</button></div>)}</div>
}

export default function Arcade({ back, play }) {
  const [st, setSt] = useState(null), [err, setErr] = useState(''), [upd, setUpd] = useState('')
  const load = async () => { setErr(''); const { data, error } = await sb.rpc('arcade_status'); if (error) return setErr(friendly(error)); setSt(data) }
  useEffect(() => { load() }, [])
  // Pull the newest game files from GitHub automatically (the server only copies when main has a new commit).
  useEffect(() => {
    if (!st?.access) return
    let dead = false; setUpd('checking')
    sb.functions.invoke('arcade-sync', { body: { auto: true } }).then(({ data }) => { if (!dead) setUpd(data?.synced ? (data.failed?.length ? 'partial' : 'updated') : '') }).catch(() => { if (!dead) setUpd('') })
    return () => { dead = true }
  }, [st?.access])
  if (err) return sheet('Arcade', back, <div className="empty"><h3>Couldn’t open the Arcade</h3>{err}<p><button className="gobtn" onClick={load}>Try again</button></p></div>)
  if (!st) return sheet('Arcade', back, <div className="empty">Loading…</div>)
  if (!st.access) return sheet('Arcade', back, <Unlock st={st} done={load} />)
  return sheet('Arcade', back, <div className="arc">
    <p className="arc-tag">Testing build · only the owner and testers can play</p>
    {upd && <p className="arc-upd" role="status">{upd === 'checking' ? 'Checking for game updates…' : upd === 'updated' ? 'Games updated to the newest version.' : 'Some game files didn’t update. Try again in a minute.'}</p>}
    {GAMES.map(g => <button key={g.id} className="arc-card" onClick={() => play(g.id)}><span className="arc-emo">{g.emoji}</span><span><b>{g.name}</b><small>{g.blurb}</small></span><I n="chev" s={20} /></button>)}
    {st.admin && <OwnerPanel />}</div>)
}

// Loads a game's files from the private bucket and runs it in a sandboxed frame.
export function GamePlayer({ id, back }) {
  const game = GAMES.find(g => g.id === id), [src, setSrc] = useState(''), [err, setErr] = useState(''), [tick, setTick] = useState(0), urlRef = useRef('')
  useEffect(() => {
    document.body.classList.add('hidenav'); return () => document.body.classList.remove('hidenav')
  }, [])
  useEffect(() => {
    let dead = false; setErr(''); setSrc('')
    ;(async () => {
      try {
        if (!game) throw new Error('That game doesn’t exist.')
        const { data: blob, error } = await sb.storage.from('arcade').download(`${id}/index.html`)
        if (error || !blob) throw new Error(error?.message?.match(/not.?found|object/i) ? 'Game files aren’t uploaded yet. The owner needs to tap “Update games from GitHub”.' : 'You don’t have access to this game, or it failed to load.')
        let html = await blob.text()
        // Collect every asset under the game folder (up to 3 levels of subfolders) and sign them for this session.
        const paths = []
        const walk = async (dir, depth) => {
          const { data: items } = await sb.storage.from('arcade').list(dir, { limit: 1000 })
          for (const f of items || []) {
            const p = `${dir}/${f.name}`
            if (f.id) { if (p !== `${id}/index.html`) paths.push(p) }
            else if (depth < 3) await walk(p, depth + 1)
          }
        }
        await walk(id, 0)
        const assets = {}
        if (paths.length) {
          const { data: signed, error: se } = await sb.storage.from('arcade').createSignedUrls(paths, 4 * 3600)
          if (se) throw se
          for (const s of signed || []) if (s.signedUrl) assets[s.path.slice(id.length + 1)] = s.signedUrl
        }
        const inject = `<script>window.__ASSETS=${JSON.stringify(assets).replace(/</g, '\\u003c')}</script>`
        html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + inject) : inject + html
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
        if (dead) return URL.revokeObjectURL(url)
        urlRef.current = url; setSrc(url)
      } catch (e) { if (!dead) setErr(e.message || friendly(e)) }
    })()
    return () => { dead = true; if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = '' } }
  }, [id, tick])
  return <div className="arc-play">
    <div className="arc-pbar"><button onClick={back} aria-label="Leave game">← Arcade</button><b>{game?.name || 'Game'}</b><button onClick={() => setTick(t => t + 1)} aria-label="Restart game">↻</button></div>
    {err ? <div className="empty arc-perr"><h3>Couldn’t start the game</h3>{err}<p><button className="gobtn" onClick={() => setTick(t => t + 1)}>Try again</button></p></div>
      : !src ? <div className="empty arc-perr">Loading {game?.name}…</div>
      : <iframe key={src} title={game.name} src={src} sandbox="allow-scripts allow-pointer-lock" allow="autoplay; fullscreen" allowFullScreen />}
  </div>
}
