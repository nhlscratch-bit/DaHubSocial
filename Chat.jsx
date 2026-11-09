import { useEffect, useRef, useState } from 'react'
import { sb, signed, friendly } from './supabase'
import Avatar from './Avatar'
import ReportSheet from './ReportSheet'
import Verified from './Verified'
const QUICK = ['❤️', '💯', '🔥', '😍', '👍'], EMO = ['😂', '😭', '😘', '🥺', '😩', '👀', '💙', '🙏', '🤝', '😎', '🔥', '💯', '😍', '😉', '😮', '🖕']
const tm = d => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const day = d => { const x = new Date(d), n = new Date(), y = new Date(Date.now() - 864e5); return x.toDateString() === n.toDateString() ? 'Today' : x.toDateString() === y.toDateString() ? 'Yesterday' : x.toLocaleDateString([], { month: 'short', day: 'numeric' }) }
function Voice({ src }) {
  const a = useRef(), [pl, setPl] = useState(false), [s, setS] = useState(0)
  return <div className="voice"><audio ref={a} src={src} preload="metadata" onEnded={() => setPl(false)} onTimeUpdate={e => setS(e.target.currentTime)} />
    <button onClick={() => { pl ? a.current.pause() : a.current.play(); setPl(!pl) }} aria-label={pl ? 'Pause' : 'Play'}>{pl ? '❚❚' : '▶'}</button>
    <div className="wave">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: 6 + ((i * 7) % 5) * 5 + (i % 3) * 3 }} />)}</div><small>{Math.floor(s / 60)}:{String(Math.floor(s % 60)).padStart(2, '0')}</small></div>
}
function Media({ m }) {
  const [u, setU] = useState(null); useEffect(() => { signed(m.media_path).then(setU) }, [m.media_path])
  if (!u) return <div className="mph" />
  return m.kind === 'video' ? <video className="mimg" src={u} controls playsInline /> : m.kind === 'audio' ? <Voice src={u} /> : <img className="mimg" src={u} alt="" />
}
export default function Chat({ id, me, online, back, openProfile }) {
  const [conv, setConv] = useState(null), [msgs, setMsgs] = useState([]), [rx, setRx] = useState([]), [t, setT] = useState(''), [sel, setSel] = useState(null)
  const [tray, setTray] = useState(false), [emo, setEmo] = useState(false), [rec, setRec] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const end = useRef(), fp = useRef(), fv = useRef()
  const loadMeta = async () => { const { data } = await sb.from('conversation_members').select('user_id,status,last_read_at,profile:profiles(id,username,display_name,avatar_url,is_verified)').eq('conversation_id', id)
    if (!data) return; const mine = data.find(m => m.user_id === me.id), o = data.find(m => m.user_id !== me.id); setConv({ other: o?.profile, otherRead: o?.last_read_at, status: mine?.status }) }
  const loadMsgs = async () => { const { data } = await sb.from('messages').select('*').eq('conversation_id', id).order('created_at').limit(300); setMsgs(data || []) }
  const loadRx = async () => { const { data } = await sb.from('message_reactions').select('message_id,user_id,emoji,messages!inner(conversation_id)').eq('messages.conversation_id', id); setRx(data || []) }
  const markRead = async () => { await sb.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', id).eq('user_id', me.id); window.dispatchEvent(new Event('dm-read')) }
  useEffect(() => {
    loadMeta(); loadMsgs(); loadRx(); markRead()
    const ch = sb.channel('chat-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, p => { setMsgs(m => m.some(x => x.id === p.new.id) ? m : [...m, p.new]); if (p.new.sender_id !== me.id) markRead(); loadMeta() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, p => setMsgs(m => m.filter(x => x.id !== p.old.id)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, loadRx).subscribe()
    const iv = setInterval(loadMeta, 15000); return () => { sb.removeChannel(ch); clearInterval(iv) }
  }, [id])
  useEffect(() => { end.current?.scrollIntoView() }, [msgs.length])
  async function send(kind = 'text', path = null) {
    const body = kind === 'text' ? t.trim() : ''; if (kind === 'text' && !body) return
    setBusy(true); setErr('')
    const { data, error } = await sb.from('messages').insert({ conversation_id: id, sender_id: me.id, body, kind, media_path: path }).select().single()
    setBusy(false); if (error) return setErr(friendly(error))
    setMsgs(m => m.some(x => x.id === data.id) ? m : [...m, data]); if (kind === 'text') setT(''); setEmo(false); setTray(false)
  }
  async function sendFile(file, kind) {
    if (!file) return; setBusy(true); setErr('')
    const path = `${id}/${me.id}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'bin').toLowerCase()}`
    const { error } = await sb.storage.from('dm-media').upload(path, file, { contentType: file.type }); setBusy(false)
    if (error) return setErr(error.message); send(kind, path)
  }
  const pick = e => { const f = e.target.files[0]; e.target.value = ''; if (f) sendFile(f, f.type.startsWith('video') ? 'video' : 'image') }
  async function toggleRec() {
    if (rec) { rec.mr.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm', mr = new MediaRecorder(stream, { mimeType: mime }), ch = []
      mr.ondataavailable = e => ch.push(e.data)
      mr.onstop = () => { stream.getTracks().forEach(x => x.stop()); setRec(null); const b = new Blob(ch, { type: mime }); if (b.size) sendFile(new File([b], 'voice.' + (mime === 'audio/mp4' ? 'm4a' : 'webm'), { type: mime }), 'audio') }
      mr.start(); setRec({ mr }); setTray(false)
    } catch (e) { setErr('Microphone not available: ' + e.message) }
  }
  async function react(mid, emoji) {
    const mine = rx.find(r => r.message_id === mid && r.user_id === me.id), q = sb.from('message_reactions')
    if (mine?.emoji === emoji) await q.delete().eq('message_id', mid).eq('user_id', me.id)
    else if (mine) await q.update({ emoji }).eq('message_id', mid).eq('user_id', me.id)
    else await q.insert({ message_id: mid, user_id: me.id, emoji })
    setSel(null); loadRx()
  }
  async function unsend(mid) { await sb.from('messages').delete().eq('id', mid); setMsgs(m => m.filter(x => x.id !== mid)); setSel(null) }
  async function accept() { await sb.from('conversation_members').update({ status: 'accepted' }).eq('conversation_id', id).eq('user_id', me.id); loadMeta() }
  async function decline() { await sb.from('conversation_members').delete().eq('conversation_id', id).eq('user_id', me.id); window.dispatchEvent(new Event('dm-read')); back() }
  const o = conv?.other, on = o && online.has(o.id), [menu, setMenu] = useState(false), [rep, setRep] = useState(false)
  const blockUser = async () => { setMenu(false); if (!confirm(`Block @${o?.username}? You'll both be unfollowed and they can't message you.`)) return; const { error } = await sb.from('blocks').insert({ blocker_id: me.id, blocked_id: o.id }); error ? alert('Could not block: ' + error.message) : back() }
  let last = ''
  return <div className="sheet clear"><div className="chd"><button className="ib" onClick={back} aria-label="Back">←</button>
    <Avatar p={o} size={58} online={on} onClick={() => o && openProfile(o.id)} />
    <div className="cn"><b>{o?.display_name || '…'}{o?.is_verified && <Verified />}</b><small className={on ? 'live' : ''}>{on ? '● Active now' : 'Offline'}</small></div>
    <button className="ib" onClick={() => o && window.dispatchEvent(new CustomEvent('start-call', { detail: { peer: o, video: false } }))} aria-label="Voice call">📞</button><button className="ib" onClick={() => o && window.dispatchEvent(new CustomEvent('start-call', { detail: { peer: o, video: true } }))} aria-label="Video call">🎥</button><button className="ib" onClick={() => setMenu(true)} aria-label="Chat options">⋯</button></div>
    {menu && <div className="scrim" onClick={() => setMenu(false)}><div className="msheet" onClick={e => e.stopPropagation()}><button className="wb" onClick={() => { setMenu(false); openProfile(o.id) }}>View profile</button><button className="wb" onClick={() => { setMenu(false); setRep(true) }}>Report @{o?.username}</button><button className="wb" onClick={blockUser}>Block @{o?.username}</button><button className="wb" onClick={() => setMenu(false)}>Cancel</button></div></div>}
    {rep && <ReportSheet me={me} type="profile" targetId={o.id} reportedUser={o.id} close={() => setRep(false)} />}
    {conv?.status === 'request' && <div className="reqb"><span><b>{o?.display_name}</b> wants to message you.</span><button className="wb p sm" onClick={accept}>Accept</button><button className="wb sm" onClick={decline}>Delete</button></div>}
    <div className="msgs" onClick={() => setSel(null)}>
      {msgs.map(m => { const mine = m.sender_id === me.id, d = day(m.created_at), sep = d !== last; last = d
        const rs = rx.filter(r => r.message_id === m.id), seen = conv?.otherRead && new Date(conv.otherRead) >= new Date(m.created_at)
        return <div key={m.id}>{sep && <div className="dsep"><span>{d}</span></div>}
          <div className={'mrow' + (mine ? ' mine' : '')}>{!mine && <Avatar p={o} size={40} />}
            <div className="mcol"><div className={'bm' + (m.kind !== 'text' ? ' media' : '')} onClick={e => { e.stopPropagation(); setSel(sel === m.id ? null : m.id) }}>{m.kind === 'text' ? m.body : <Media m={m} />}</div>
              {rs.length > 0 && <div className="rchips">{[...new Set(rs.map(r => r.emoji))].map(e => <span key={e}>{e}{rs.filter(r => r.emoji === e).length > 1 && rs.filter(r => r.emoji === e).length}</span>)}</div>}
              <small className="mt">{tm(m.created_at)}{mine && <span className={seen ? 'seen' : ''}> {seen ? '✓✓' : '✓'}</span>}</small>
              {sel === m.id && <div className="qr">{QUICK.map(e => <button key={e} onClick={() => react(m.id, e)}>{e}</button>)}{mine && <button className="un" onClick={() => unsend(m.id)}>Unsend</button>}</div>}</div></div></div> })}
      {!msgs.length && <div className="empty">Say hi to {o?.display_name || 'them'} 👋</div>}<div ref={end} /></div>
    {err && <p className="msg" role="alert">{err}</p>}
    {tray && <div className="tray">{[['🖼️', 'Photo', () => fp.current.click()], ['🎬', 'Video', () => fv.current.click()], ['🎵', 'Audio', toggleRec], ].map(([i, l, f]) => <button key={l} onClick={f}><span>{i}</span>{l}</button>)}</div>}
    {emo && <div className="emostrip">{EMO.map(e => <button key={e} onClick={() => setT(t + e)}>{e}</button>)}</div>}
    <div className="cmp">{rec ? <div className="recb"><span>● Recording…</span><button className="wb p sm" onClick={toggleRec}>Stop & send</button></div> :
      <><button className="ib plus" onClick={() => { setTray(!tray); setEmo(false) }} aria-label="Attach">+</button>
        <input value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message…" maxLength={4000} aria-label="Message" />
        <button className="ib" onClick={() => { setEmo(!emo); setTray(false) }} aria-label="Emoji">😊</button><button className="ib" onClick={() => fp.current.click()} aria-label="Photo">🖼️</button>
        <button className="go big" disabled={busy || !t.trim()} onClick={() => send()} aria-label="Send">➤</button></>}
      <input ref={fp} type="file" accept="image/*" hidden onChange={pick} /><input ref={fv} type="file" accept="video/*" hidden onChange={pick} /></div></div>
}
