import { useEffect, useRef, useState } from 'react'
import { sb, friendly } from './supabase'
import Avatar from './Avatar'
import I from './Icons'
import { useTableVoice, joinTableVoice, leaveTableVoice, setTableMic, resumeTableAudio } from './tableVoice'

// DAHUB Arcade (testing). Games live in the private 'arcade' bucket; storage RLS only lets the owner (admins)
// and people who entered the tester password read them. Layout/design is a placeholder until the owner's redesign.
export const GAMES = [
  { id: 'fight', name: 'DAHUB Fighters', blurb: '2.5D street brawler. Best of 3, Blazin’ moves, CPU on 3 levels.', emoji: '🥊' },
  { id: 'spades', name: 'DAHUB Spades', blurb: 'Lounge table vs 3 bots. Nil, bags, Jokers optional.', emoji: '♠️' },
  { id: 'liars', name: 'CAP or Not', blurb: 'Cap or no cap? Lay cards face down, call the liars, survive the penalty.', emoji: '🃏' }]

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
    {upd && <p className="arc-upd" role="status">{upd === 'checking' ? 'Checking for game updates… games open in a moment.' : upd === 'updated' ? 'Games updated to the newest version.' : 'Some game files didn’t update. Try again in a minute.'}</p>}
    {GAMES.map(g => <button key={g.id} className="arc-card" disabled={upd === 'checking'} onClick={() => play(g.id)}><span className="arc-emo">{g.emoji}</span><span><b>{g.name}</b><small>{g.blurb}</small></span><I n="chev" s={20} /></button>)}
    {st.admin && <OwnerPanel />}</div>)
}

// Loads a game's files from the private bucket and runs it in a sandboxed frame.
// Online play bridge: games run in a sandboxed frame with no login, so they ask the app to call
// whitelisted server functions and to forward live table updates.
// Online games: which server calls each game may make, its tables for live updates, its voice channel and invite link.
const NET = {
  spades: { rpc: new Set(['sp_create', 'sp_join', 'sp_set_char', 'sp_start', 'sp_bid', 'sp_play', 'sp_tick', 'sp_leave', 'sp_rematch', 'sp_state', 'sp_events_since', 'sp_my_hand', 'sp_my_tables']), events: 'spades_events', seats: 'spades_seats', tables: 'spades_tables', voice: 'spv', link: 'spades', title: 'DAHUB Spades', text: 'Pull up to my Spades table. Code ' },
  liars: { rpc: new Set(['cap_create', 'cap_join', 'cap_set_char', 'cap_start', 'cap_lay', 'cap_call', 'cap_tick', 'cap_emote', 'cap_leave', 'cap_rematch', 'cap_state', 'cap_events_since', 'cap_my_tables']), events: 'cap_events', seats: 'cap_seats', tables: 'cap_tables', voice: 'cpv', link: 'capornot', title: 'CAP or Not', text: 'Pull up to my CAP or Not table. Code ' }
}
function useGameBridge(frameRef, code, gameId) {
  useEffect(() => {
    const N = NET[gameId]; let ch = null, me = null
    const post = m => frameRef.current?.contentWindow?.postMessage(m, '*')
    const unsub = () => { if (ch) { sb.removeChannel(ch); ch = null } }
    const onMsg = async e => {
      const w = frameRef.current?.contentWindow; if (!w || e.source !== w) return
      const m = e.data; if (!m || typeof m !== 'object' || m.dh !== 1) return
      if (m.type === 'hello') {
        if (!me) { const { data: { user } } = await sb.auth.getUser(); const { data: p } = user ? await sb.from('profiles').select('id,display_name,username,avatar_url').eq('id', user.id).maybeSingle() : { data: null }; me = p ? { id: p.id, name: p.display_name || p.username, username: p.username, avatar: p.avatar_url ? sb.storage.from('avatars').getPublicUrl(p.avatar_url).data.publicUrl : null } : null }
        return post({ dh: 1, type: 'hello', me, join: code || null, origin: location.origin })
      }
      if (m.type === 'rpc') {
        if (!N || !N.rpc.has(m.fn)) return post({ dh: 1, type: 'res', id: m.id, error: 'not allowed' })
        const { data, error } = await sb.rpc(m.fn, m.args || {})
        return post({ dh: 1, type: 'res', id: m.id, data, error: error ? friendly(error) : null })
      }
      if (m.type === 'sub' && N && typeof m.table === 'string' && /^[0-9a-f-]{36}$/.test(m.table)) {
        unsub()
        ch = sb.channel(N.voice + '-' + m.table)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: N.events, filter: 'table_id=eq.' + m.table }, p => post({ dh: 1, type: 'evt', row: p.new }))
          .on('postgres_changes', { event: '*', schema: 'public', table: N.seats, filter: 'table_id=eq.' + m.table }, () => post({ dh: 1, type: 'seats' }))
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: N.tables, filter: 'id=eq.' + m.table }, () => post({ dh: 1, type: 'seats' }))
          .subscribe(s => post({ dh: 1, type: 'live', status: s }))
        return
      }
      if (m.type === 'unsub') return unsub()
      if (m.type === 'voice') {
        if (m.on && N && typeof m.table === 'string' && /^[0-9a-f-]{36}$/.test(m.table) && me?.id) joinTableVoice(m.table, me.id, v => post({ dh: 1, type: 'voice', state: v }), N.voice)
        else if (!m.on) leaveTableVoice()
        return
      }
      if (m.type === 'share' && N && typeof m.code === 'string') {
        const url = location.origin + '/?' + N.link + '=' + encodeURIComponent(m.code)
        try { if (navigator.share) { await navigator.share({ title: N.title, text: N.text + m.code, url }); return post({ dh: 1, type: 'shared', how: 'share' }) } } catch (x) { if (x?.name === 'AbortError') return }
        try { await navigator.clipboard.writeText(url); post({ dh: 1, type: 'shared', how: 'copied' }) } catch { post({ dh: 1, type: 'shared', how: 'failed', url }) }
      }
    }
    addEventListener('message', onMsg)
    return () => { removeEventListener('message', onMsg); unsub(); leaveTableVoice() }
  }, [code, gameId])
}

// Table voice controls in the game's top bar (only while you're at an online table)
function VoiceBar() {
  const v = useTableVoice()
  if (!v.active) return null
  const talking = v.speaking.length > 0
  return <span className="arc-voice">
    {v.needTap ? <button className="arc-vtap" onClick={resumeTableAudio}>Tap to hear the table</button>
      : <small className={talking ? 'on' : ''}>{v.status === 'connecting' ? 'Voice connecting…' : v.status === 'error' ? 'Voice reconnecting…' : v.peers ? `Voice · ${v.peers + 1} here${talking ? ' · talking' : ''}` : 'Voice · just you'}</small>}
    <button className={'arc-mic' + (v.micOn ? ' on' : '')} onClick={() => setTableMic(!v.micOn)} aria-pressed={v.micOn} aria-label={v.micOn ? 'Mute your mic' : 'Turn on your mic'}><I n={v.micOn ? 'mic' : 'micoff'} s={20} /><span>{v.micOn ? 'Mic on' : 'Talk'}</span></button>
    {v.error && <em role="alert">{v.error}</em>}
  </span>
}

export function GamePlayer({ id, back, code }) {
  const game = GAMES.find(g => g.id === id), [src, setSrc] = useState(''), [err, setErr] = useState(''), [tick, setTick] = useState(0), urlRef = useRef(''), frameRef = useRef(null)
  useGameBridge(frameRef, code, id)
  useEffect(() => {
    document.body.classList.add('hidenav'); return () => document.body.classList.remove('hidenav')
  }, [])
  useEffect(() => {
    let dead = false; setErr(''); setSrc('')
    ;(async () => {
      try {
        if (!game) throw new Error('That game doesn’t exist.')
        // Always fetch the newest index.html (no browser cache), so a fresh update shows right away.
        const { data: su, error: ue } = await sb.storage.from('arcade').createSignedUrl(`${id}/index.html`, 60)
        const r = su?.signedUrl ? await fetch(su.signedUrl + '&v=' + Date.now(), { cache: 'no-store' }).catch(() => null) : null
        const blob = r?.ok ? await r.blob() : null, error = ue || (r && !r.ok ? { message: r.status === 400 || r.status === 404 ? 'not found' : 'denied' } : null)
        if (error || !blob) throw new Error(error?.message?.match(/not.?found|object/i) ? 'Game files aren’t ready yet. Open the Arcade once so it can update the games.' : 'You don’t have access to this game yet. Go back and unlock the Arcade, or try again.')
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
    <div className="arc-pbar"><button onClick={back} aria-label="Leave game">← Arcade</button><b>{game?.name || 'Game'}</b><VoiceBar /><button onClick={() => setTick(t => t + 1)} aria-label="Restart game">↻</button></div>
    {err ? <div className="empty arc-perr"><h3>Couldn’t start the game</h3>{err}<p><button className="gobtn" onClick={() => setTick(t => t + 1)}>Try again</button></p></div>
      : !src ? <div className="empty arc-perr">Loading {game?.name}…</div>
      : <iframe ref={frameRef} key={src} title={game.name} src={src} sandbox="allow-scripts allow-pointer-lock" allow="autoplay; fullscreen" allowFullScreen />}
  </div>
}
