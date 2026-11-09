import { useEffect, useRef, useState } from 'react'
import { sb, friendly } from './supabase'
import Avatar from './Avatar'
import ReportSheet from './ReportSheet'
import { RCAT, resumeAudio, joinRoom, useRoom, leaveRoom, endRoom, toggleMute, toggleHand, takeStage, invite, moveToAudience, decline, react, dismissSummary } from './roomsEngine'
import { MicI, meOf, LrTop } from './Rooms'
import I from './Icons'
import Verified from './Verified'
const EMO = ['🔥', '👏', '😂', '💯', '❤️']
const mins = (a, b) => { const m = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' hr ' + (m % 60) + ' min' }
const asP = m => ({ avatar_url: m?.avatar, display_name: m?.name })
const Wave = ({ n = 14 }) => <span className="lrwave" aria-hidden>{Array.from({ length: n }, (_, i) => <i key={i} style={{ animationDelay: (i * 0.09) % 0.8 + 's' }} />)}</span>
function RoomView({ me, back, openProfile }) {
  const a = useRoom().active, [showEmo, setShowEmo] = useState(false), [all, setAll] = useState(false), [rep, setRep] = useState(false), [sure, setSure] = useState(false), [copied, setCopied] = useState('')
  if (!a) return null
  const r = a.room, speakers = a.speakers.map(id => ({ id, ...(a.profiles[id] || {}), ...(a.members.get(id) || {}) })), inRoom = id => a.members.has(id)
  const listeners = [...a.members.values()].filter(m => !a.speakers.includes(m.uid)), hands = listeners.filter(m => m.hand)
  const mySpeaker = a.speakers.includes(a.me), myHand = a.members.get(a.me)?.hand
  const share = async () => { const url = location.origin + '/?room=' + a.id; try { if (navigator.share) await navigator.share({ title: r.title, url }); else { await navigator.clipboard.writeText(url); setCopied('Link copied'); setTimeout(() => setCopied(''), 1800) } } catch {} }
  const leave = async () => { if (a.isHost) return setSure(true); await leaveRoom() }
  if (a.status === 'ended' && a.summary) return <div className="sheet"><div className="bar"><button onClick={dismissSummary} aria-label="Close">←</button>Room ended</div><div className="sbody"><div className="empty rsum"><h3>{r.title}</h3><p>This room has ended.</p>
    <div className="rstats"><div><b>{mins(a.summary.started, a.summary.ended)}</b><small>Duration</small></div><div><b>{a.summary.peak}</b><small>Peak listeners</small></div></div>
    <button className="wb p" onClick={dismissSummary}>Back to Live Rooms</button></div></div></div>
  if (a.status === 'error') return <div className="sheet"><div className="bar"><button onClick={leaveRoom}>←</button>Live Room</div><div className="sbody"><div className="empty"><h3>Can’t join</h3>{a.error}<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={leaveRoom}>Back</button></div></div></div>
  const host = { ...(a.profiles[r.host_id] || {}), ...(a.members.get(r.host_id) || {}) }
  return <div className="sheet lrpage roomv"><div className="sbody lrbody">
    <LrTop back={back} backLabel="Minimize room" right={<button className="lrpill dark" onClick={leave}>{a.isHost ? 'End room' : 'Leave quietly'}</button>} />
    <div className="lrcard lrnow"><span className="lrhost"><Avatar p={asP(host)} size={84} /></span>
      <span className="lrinfo"><b>{r.title}</b><span className="lrtags"><i className="lrchip">{RCAT[r.category]}</i>{r.audience === 'followers' && <i className="lrchip alt">Followers</i>}</span>
        <small>Hosted by {host.name || 'host'}{host.verified && <Verified />}</small></span>
      <span className="lrcount"><em><I n="headphones" s={20} />{a.members.size}</em><Wave /></span></div>
    {a.status === 'connecting' && <p className="lrnote" role="status">Connecting…</p>}
    {a.hostGone && <p className="msg" role="status">The host seems to have disconnected. The room may end soon.</p>}
    {a.needTap && <button className="lrgo" onClick={resumeAudio}><I n="speaker" s={26} />Tap to hear the room</button>}
    {a.notice && <p className="rnotice" role="status">{a.notice}</p>}
    {(a.invited || (a.canSpeak && !a.hasMic)) && <button className="lrgo" onClick={takeStage}><I n="mic" s={26} />{a.isHost ? 'Turn on your mic' : 'You’re invited to speak. Tap to join'}</button>}
    <section className="lrcard lrstage">
      <div className="lrsh"><I n="people" s={28} /><b>Speakers</b></div>
      <div className="lrspk">{speakers.map(s => { const spk = a.speaking.has(s.id)
        return <div key={s.id} className="lrtile">
          <button className={'lrav' + (spk ? ' talk' : '') + (inRoom(s.id) ? '' : ' away')} onClick={() => openProfile(s.id)} aria-label={(s.name || 'Speaker') + (spk ? ', speaking' : '')}><Avatar p={asP(s)} size={76} />
            <i className={'lrmic' + (s.muted ? ' off' : '')}><MicI s={15} /></i></button>
          <b>{s.name || 'Speaker'}{s.verified && <Verified />}</b>{s.id === r.host_id && <small className="lrhostb">Host</small>}
          {a.isHost && s.id !== a.me && <button className="lrx" onClick={() => moveToAudience(s.id)} aria-label={'Move ' + (s.name || 'speaker') + ' to audience'}>Move to audience</button>}
        </div> })}</div>
      <div className="lrsh lis"><b>Listeners • {listeners.length}</b>{listeners.length > 5 && <button className="lrpill on sm" onClick={() => setAll(!all)}>{all ? 'Show less' : 'See all ›'}</button>}</div>
      {listeners.length === 0 ? <small className="lrdim">No listeners yet. Share the room to bring people in.</small> : <div className={'lrlis' + (all ? ' all' : '')}>{(all ? listeners : listeners.slice(0, 5)).map(m => <button key={m.uid} className="lrl" onClick={() => openProfile(m.uid)}><Avatar p={asP(m)} size={50} />{all && <small>{m.name}</small>}</button>)}{!all && listeners.length > 5 && <span className="lrmore">+{listeners.length - 5}</span>}</div>}
    </section>
    {a.isHost && r.allow_requests !== false && <section className="lrcard lrstage"><div className="lrsh"><I n="hand" s={26} /><b>Speaker requests</b>{hands.length > 0 && <i className="lrchip">{hands.length}</i>}</div>
      {hands.length === 0 ? <small className="lrdim">No hands raised.</small> : hands.map(m => <div key={m.uid} className="lrrq"><Avatar p={asP(m)} size={44} /><span className="lrinfo"><b>{m.name}</b><small>Wants to speak</small></span><button className="lrpill on sm" onClick={() => invite(m.uid)}>Invite</button><button className="lrpill sm" onClick={() => decline(m.uid)}>Decline</button></div>)}</section>}
    <div className="lrcard lrctl">
      {mySpeaker && a.hasMic ? <button className={'lrcb' + (a.muted ? ' off' : '')} onClick={toggleMute} aria-pressed={!a.muted}><i><I n="mic" s={30} /></i>{a.muted ? 'Unmute' : 'Mute'}</button>
        : !mySpeaker && r.allow_requests !== false ? <button className={'lrcb' + (myHand ? ' on' : '')} onClick={toggleHand} aria-pressed={!!myHand}><i><I n="hand" s={30} /></i>{myHand ? 'Lower Hand' : 'Raise Hand'}</button> : null}
      <button className="lrcb" onClick={() => setShowEmo(!showEmo)} aria-expanded={showEmo}><i><I n="smile" s={30} /></i>React</button>
      <button className="lrcb" onClick={share}><i><I n="share" s={28} /></i>{copied || 'Share'}</button>
      <button className="lrcb end" onClick={leave}><i><I n="phone" s={32} /></i>{a.isHost ? 'End' : 'Leave'}</button>
    </div>
    <p className="lrnote">Live audio is peer to peer. If someone can’t hear you, ask them to rejoin.</p>
    <button className="link lrrep" onClick={() => setRep(true)}>Report this room</button>
    </div>
    <div className="rfloat" aria-hidden>{a.reactions.map(x => <span key={x.id} style={{ left: x.left + '%' }}>{x.emoji}</span>)}</div>
    {showEmo && <div className="remo lremo" role="menu">{EMO.map(e => <button key={e} onClick={() => { react(e); setShowEmo(false) }}>{e}</button>)}</div>}
    {sure && <div className="pmodal" onClick={() => setSure(false)}><div className="pmbox" onClick={e => e.stopPropagation()}><b>End this room for everyone?</b><small className="pnote" style={{ padding: 0 }}>Listeners will see that the room has ended.</small>
      <button className="wb p" onClick={async () => { setSure(false); await endRoom() }}>End room</button><button className="wb" onClick={() => setSure(false)}>Keep going</button></div></div>}
    {rep && <ReportSheet me={me} type="room" targetId={a.id} reportedUser={r.host_id} close={() => setRep(false)} />}
  </div>
}
export function MiniPlayer({ open }) {
  const a = useRoom().active
  if (!a || a.status === 'error') return null
  const mySpeaker = a.speakers.includes(a.me), host = a.profiles[a.room.host_id] || {}
  return <div className="rmini lrmini" role="region" aria-label="Live room"><button className="rmmain" onClick={() => open(a.id)}><span className="lrminiav"><Avatar p={asP(host)} size={46} /></span><span className="lrminit"><b>{a.room.title}</b><small><i className="ldot" />{a.status === 'ended' ? 'ENDED' : 'LIVE'} · {a.members.size} {a.members.size === 1 ? 'listener' : 'listeners'}</small></span></button>
    <Wave n={12} />
    {mySpeaker && a.hasMic && a.status !== 'ended' && <button className="rmb" onClick={toggleMute} aria-label={a.muted ? 'Unmute' : 'Mute'}><I n={a.muted ? 'mute' : 'mic'} s={20} /></button>}
    <button className="rmb x" onClick={async () => { if (a.isHost && a.status !== 'ended') open(a.id); else { await leaveRoom() } }} aria-label="Leave room"><I n="x" s={22} /></button></div>
}

// Route target for a room: shows the live room if joined, otherwise a join screen (needed for deep links and notifications).
export function RoomGate({ id, me, profile, back, openProfile }) {
  const a = useRoom().active, [room, setRoom] = useState(undefined), [err, setErr] = useState(''), was = useRef(false), here = a?.id === id
  useEffect(() => { if (here) was.current = true; else if (was.current) back() }, [here])
  useEffect(() => { if (!here) sb.from('rooms').select('*,host:profiles!rooms_host_id_fkey(id,display_name,username,avatar_url)').eq('id', id).maybeSingle().then(({ data, error }) => { if (error) setErr(friendly(error)); setRoom(data || null) }) }, [id])
  if (here) return <RoomView me={me} back={back} openProfile={openProfile} />
  const join = async () => { try { let mic = null; if (room.host_id === me.id && room.status !== 'ended') mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null); await joinRoom(room, meOf(me, profile), mic) } catch (e) { setErr(e.message) } }
  return <div className="sheet lrpage"><div className="sbody lrbody"><LrTop back={back} /><div className="lrcard lrempty">
    {room === undefined && !err && 'Loading…'}{err && <p className="msg">{err}</p>}
    {room === null && 'This room is unavailable. It may have ended, or it is for followers only.'}
    {room && room.status === 'ended' && <><h3>{room.title}</h3>This room has ended.</>}
    {room && room.status === 'scheduled' && <><h3>{room.title}</h3>Scheduled for {new Date(room.scheduled_for).toLocaleString()}.</>}
    {room && room.status === 'live' && <><h3>{room.title}</h3>Hosted by {room.host.display_name || room.host.username}<br /><button className="lrgo" style={{ marginTop: 12 }} onClick={join}><I n="headphones" s={26} />Join room</button></>}
  </div></div></div>
}
