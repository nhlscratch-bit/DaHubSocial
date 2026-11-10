import { useState } from 'react'
import { sb } from './supabase'
import wm from './wordmark.png'
import I from './Icons'
import EditProfile from './EditProfile'
import { BUILD } from './supabase'
import { useEffect } from 'react'
import { supported, current, enable, disable } from './push'
import { glowOn, setGlow } from './glow'
import { tapsOn, setTaps } from './tapsound'
import { warmIce, iceSource } from './ice'

export default function Settings({ me, profile, isAdmin, back, go, onUpdated }) {
  const [q, setQ] = useState(''), [edit, setEdit] = useState(false), [pw, setPw] = useState(false), [priv, setPriv] = useState(!!profile?.is_private), [err, setErr] = useState('')
  const [pushOn, setPushOn] = useState(false), [glow, setGlowS] = useState(glowOn())
  const toggleGlow = () => { const v = !glow; setGlow(v); setGlowS(v) }
  const [relay, setRelay] = useState('')
  const checkRelay = () => { setRelay('checking'); warmIce(true).then(() => setRelay(iceSource())) }
  useEffect(() => { if (isAdmin) checkRelay() }, [isAdmin])
  const RELAY = { checking: 'Checking…', metered: 'Private relay (Metered) is on. Calls connect across networks.', static: 'Private relay is on.', env: 'Using the relay from Vercel settings.', openrelay: 'Using the free public relay. Set up Metered for reliable calls.' }
  const [taps, setTapsS] = useState(tapsOn()), toggleTaps = () => { const v = !taps; setTaps(v); setTapsS(v) }
  useEffect(() => { current().then(s => setPushOn(!!s)) }, [])
  async function togglePush() {
    setErr(''); if (pushOn) { await disable(); setPushOn(false); return }
    try { await enable(me); setPushOn(true) } catch (e) { setErr(e.message) }
  }
  async function togglePrivate() {
    const v = !priv; setPriv(v); setErr('')
    const { error } = await sb.from('profiles').update({ is_private: v }).eq('id', me.id)
    if (error) { setPriv(!v); setErr(error.message) } else onUpdated?.()
  }
  const SECTIONS = [
    ['Your account', [
      ['user', 'Edit profile', 'Photo, name, @handle, bio, links', () => setEdit(true), 'photo name handle bio username'],
      ['key', 'Password', 'Change your password', () => setPw(true), 'security login'],
      ['lock', 'Private account', priv ? 'On: people must request to follow you' : 'Off: anyone can follow you', togglePrivate, 'privacy follow requests', priv, true]]],
    ['How you use DAHUB', [
      ['bookmark', 'Saved', 'Posts you bookmarked', () => go('saved'), 'bookmarks'],
      ['bell', 'Notifications', 'Likes, follows, requests, replies', () => go('notifs'), 'alerts'],
      ...(supported() ? [['bell', 'Push notifications', pushOn ? 'On: alerts for messages, calls and activity' : 'Off: tap to get alerts when the app is closed', togglePush, 'alerts phone push messages calls', pushOn, true]] : []),
      ['chat', 'Messages', 'Your conversations', () => go('inbox'), 'dm inbox']]],
    ['Look and feel', [
      ['star', 'Glow Mode', glow ? 'On: edges shift through Glacier, Moonstone, Frost Orchid and Aurora Mint' : 'Off: classic white chrome and cyan', toggleGlow, 'rgb glow colors theme lights led', glow, true],
      ['bell', 'Tap sounds', taps ? 'On: a soft click when you tap buttons (off when your phone is on silent)' : 'Off: no tap sounds', toggleTaps, 'sound click tap audio haptic', taps, true]]],
    ['Grow your hustle', [
      ['compass', 'Opportunity Board', 'Gigs, collabs, bookings, talent calls', () => go('opps'), 'jobs gigs'],
      ['play', 'Media', 'Music, podcasts, businesses and drops', () => go('media'), 'music podcast'],
      ['star', 'Get featured', 'Submit your work for the Spotlight', () => go('submit'), 'spotlight submit']]],
    ['Privacy and safety', [
      ['block', 'Blocked and muted', 'People you blocked or muted', () => go('safety'), 'block mute'],
      ['shield', 'Community guidelines', 'How DAHUB keeps it real', () => go('guidelines'), 'rules policy terms'],
      ...(isAdmin ? [['info', 'Admin', 'Review submissions and reports', () => go('admin'), 'moderation review'], ['shield', 'Call relay (admin)', RELAY[relay] || 'Tap to check', checkRelay, 'turn relay calls rooms voice metered']] : [])]],
    ['Log in', [['logout', 'Log out', null, () => confirm('Log out of DAHUB?') && sb.auth.signOut(), 'sign out']]]]
  const s = q.trim().toLowerCase()
  const shown = SECTIONS.map(([t, rows]) => [t, rows.filter(r => !s || (r[1] + ' ' + (r[2] || '') + ' ' + r[4]).toLowerCase().includes(s))]).filter(([, r]) => r.length)
  return <div className="sheet clear setg">
    <div className="setgtop"><button className="ib" onClick={back} aria-label="Back"><I n="back" s={22} /></button><img src={wm} alt="DAHUB" /></div>
    <div className="sbody"><h2 className="setgh">Settings and Activity</h2>
      <label className="setsrch"><I n="search" s={20} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search settings" aria-label="Search settings" /></label>
      {err && <p className="msg" role="alert" style={{ margin: '0 14px' }}>{err}</p>}
      {shown.map(([t, rows]) => <section key={t}><div className="setpill">{t}</div>
        <div className="gl setpanel">{rows.map(([ic, label, sub, fn, , on, sw]) => <button key={label} className="setrow" onClick={fn} role={sw ? 'switch' : undefined} aria-checked={sw ? on : undefined}>
          <span className="seti"><I n={ic} s={22} /></span><span className="sett"><b>{label}</b>{sub && <small>{sub}</small>}</span>
          {sw ? <span className={'tgl' + (on ? ' on' : '')}><i /></span> : <I n="chev" s={18} />}</button>)}</div></section>)}
      {shown.length === 0 && <div className="empty">No settings match "{q}".</div>}
      <small className="bld inl" style={{ display: 'block', textAlign: 'center', margin: '16px 0 120px' }}>DAHUB {BUILD}</small></div>
    {edit && <EditProfile pr={profile} me={me} close={() => setEdit(false)} saved={() => onUpdated?.()} />}
    {pw && <PasswordSheet close={() => setPw(false)} />}</div>
}

function PasswordSheet({ close }) {
  const [a, setA] = useState(''), [b, setB] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false)
  async function save() {
    setErr(''); if (a.length < 8) return setErr('Use at least 8 characters.'); if (a !== b) return setErr('Those passwords do not match.')
    setBusy(true); const { error } = await sb.auth.updateUser({ password: a }); setBusy(false); error ? setErr(error.message) : setOk(true)
  }
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}><h3 style={{ margin: 0 }}>Change password</h3>
    {ok ? <><p>Password updated.</p><button className="wb p" onClick={close}>Done</button></> : <>
      <input type="password" autoComplete="new-password" value={a} onChange={e => setA(e.target.value)} placeholder="New password" />
      <input type="password" autoComplete="new-password" value={b} onChange={e => setB(e.target.value)} placeholder="Confirm new password" />
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="wb p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Update password'}</button><button className="wb" onClick={close}>Cancel</button></>}</div></div>
}
