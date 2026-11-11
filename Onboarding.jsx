import { useEffect, useRef, useState } from 'react'
import { sb, upload, friendly } from './supabase'
import Avatar from './Avatar'
import Verified from './Verified'
import I from './Icons'
import wm from './wordmark.png'

// First-run welcome: photo + bio → what you're into → who to follow. Shown once (profiles.onboarded).
export const INTERESTS = [['food', '🦀 Food'], ['nightlife', '🌙 Nightlife'], ['music', '🎤 Music'], ['hustle', '💼 Hustle & jobs'], ['style', '✂️ Style & beauty'], ['games', '🎮 Games'], ['sports', '🏀 Sports'], ['events', '📅 Events'], ['podcasts', '🎧 Podcasts'], ['art', '🎨 Art & creators'], ['faith', '🙏 Faith & community'], ['business', '🏪 Local business']]

export default function Onboarding({ me, profile, done }) {
  const [step, setStep] = useState(0), [bio, setBio] = useState(profile?.bio || ''), [av, setAv] = useState(profile?.avatar_url || null), [ints, setInts] = useState(profile?.interests || [])
  const [sug, setSug] = useState(null), [fol, setFol] = useState({}), [busy, setBusy] = useState(false), [err, setErr] = useState(''), pick = useRef()
  useEffect(() => { if (step === 2) sb.rpc('suggest_follows', { p_interests: ints }).then(({ data, error }) => { if (error) return setErr(friendly(error)); setSug(data || []); setFol(Object.fromEntries((data || []).map(p => [p.id, p.following]))) }) }, [step])
  const photo = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return
    if (!f.type.startsWith('image/')) return setErr('Pick a photo.')
    setBusy(true); setErr('')
    try { const path = await upload('avatars', me.id, f); const { error } = await sb.from('profiles').update({ avatar_url: path }).eq('id', me.id); if (error) throw error; setAv(path) } catch (x) { setErr(friendly(x)) } finally { setBusy(false) }
  }
  const toggle = async p => {
    const on = !fol[p.id]; setFol(x => ({ ...x, [p.id]: on }))
    const { error } = on ? await sb.from('follows').insert({ follower_id: me.id, followee_id: p.id }) : await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', p.id)
    if (error && !/duplicate/i.test(error.message)) { setFol(x => ({ ...x, [p.id]: !on })); setErr(friendly(error)) }
  }
  const next = async () => {
    setErr('')
    if (step === 0) { setBusy(true); const { error } = await sb.from('profiles').update({ bio: bio.trim() || null }).eq('id', me.id); setBusy(false); if (error) return setErr(friendly(error)); return setStep(1) }
    if (step === 1) { setBusy(true); const { error } = await sb.from('profiles').update({ interests: ints }).eq('id', me.id); setBusy(false); if (error) return setErr(friendly(error)); return setStep(2) }
    setBusy(true); const { error } = await sb.from('profiles').update({ onboarded: true }).eq('id', me.id); setBusy(false); if (error) return setErr(friendly(error)); done()
  }
  const followed = Object.values(fol).filter(Boolean).length
  return <div className="onb2" role="dialog" aria-label="Welcome to DAHUB">
    <div className="onbtop"><img src={wm} alt="DAHUB" /><div className="onbsteps">{[0, 1, 2].map(i => <i key={i} className={i <= step ? 'on' : ''} />)}</div></div>
    <div className="onbbody" key={step}>
      {step === 0 && <>
        <h2>Welcome{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''} 👑</h2><p>Let people know it’s you. Add a photo and a quick line about yourself.</p>
        <button className="onbav" onClick={() => pick.current.click()} disabled={busy}><Avatar p={{ ...profile, avatar_url: av }} size={128} /><span><I n="camera" s={20} /></span></button>
        <input ref={pick} type="file" accept="image/*" hidden onChange={photo} />
        <textarea className="ctext" rows={3} maxLength={160} value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio: what you do, what you're about, where in Bmore 📍" />
      </>}
      {step === 1 && <>
        <h2>What are you into?</h2><p>Pick a few. We’ll use them to show you the right people and pages.</p>
        <div className="onbints">{INTERESTS.map(([k, l]) => <button key={k} aria-pressed={ints.includes(k)} onClick={() => setInts(x => x.includes(k) ? x.filter(y => y !== k) : [...x, k])}>{l}</button>)}</div>
      </>}
      {step === 2 && <>
        <h2>Follow your people</h2><p>Official pages are already followed for you. Add anyone else you want in your feed.</p>
        {sug === null ? <div className="skel"><i /><i /></div> : sug.length === 0 ? <p className="pnote">No suggestions yet. You can find people in Discover.</p>
          : <div className="onbppl">{sug.map(p => <div key={p.id} className="onbp"><Avatar p={p} size={48} /><span><b>{p.display_name}{p.is_verified && <Verified />}</b><small>@{p.username}{p.bio ? ' · ' + p.bio : ''}</small></span>
            <button className={fol[p.id] ? 'on' : ''} onClick={() => toggle(p)}>{fol[p.id] ? 'Following' : 'Follow'}</button></div>)}</div>}
      </>}
      {err && <p className="msg" role="alert">{err}</p>}
    </div>
    <div className="onbfoot">
      {step > 0 && <button className="wb" onClick={() => setStep(step - 1)} disabled={busy}>Back</button>}
      <button className="benter sm" onClick={next} disabled={busy}>{busy ? 'Saving…' : step === 2 ? `Let’s go${followed ? ` · ${followed} followed` : ''}` : step === 1 && !ints.length ? 'Skip' : 'Next'}</button>
    </div>
  </div>
}

// Invite friends: personal link + real count of people who joined with it.
export function InviteSheet({ profile, close }) {
  const [inv, setInv] = useState(null), [msg, setMsg] = useState('')
  const url = location.origin + '/?ref=' + encodeURIComponent(profile?.username || '')
  useEffect(() => { sb.rpc('my_invites').then(({ data }) => setInv(data || { count: 0, recent: [] })) }, [])
  const share = async () => {
    try { if (navigator.share) { await navigator.share({ title: 'Join me on DAHUB', text: 'Baltimore’s hub for every side of life. Pull up 👑', url }); return } } catch (e) { if (e?.name === 'AbortError') return }
    try { await navigator.clipboard.writeText(url); setMsg('Link copied. Paste it anywhere.') } catch { setMsg('Copy this link: ' + url) }
  }
  return <div className="scrim" onClick={close}><div className="msheet" onClick={e => e.stopPropagation()}>
    <h3 style={{ margin: 0 }}>Invite your people</h3>
    <p className="pnote" style={{ padding: 0 }}>Anyone who joins with your link counts for you.</p>
    <div className="invcount"><b>{inv ? inv.count : '…'}</b><span>{inv?.count === 1 ? 'person joined with your link' : 'people joined with your link'}</span></div>
    {inv?.recent?.length > 0 && <div className="invppl">{inv.recent.map(p => <Avatar key={p.username} p={p} size={34} />)}</div>}
    <div className="invlink">{url}</div>
    <button className="wb p" onClick={share}>Share my invite link</button>
    {msg && <p className="pnote" style={{ padding: 0 }}>{msg}</p>}
    <button className="wb" onClick={close}>Done</button>
  </div></div>
}
