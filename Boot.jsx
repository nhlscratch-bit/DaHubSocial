import { useEffect, useState } from 'react'
import wm from './wordmark.png'
import { BUILD } from './supabase'
import I from './Icons'
import iFood from './mi-events.png'
import iRooms from './mi-rooms.png'
import iArcade from './mi-arcade.png'
import iPulse from './mi-pulse.png'
import iComm from './mi-communities.png'
import iNight from './mi-afterdark.png'

// Android/desktop Chrome fires this once, early: keep it so "Install" can open the real install prompt.
let deferred = null
if (typeof window !== 'undefined') addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e })
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
function platform() {
  const ua = navigator.userAgent || ''
  if (/Instagram|FBAN|FBAV|Snapchat|TikTok|Twitter|Line\//i.test(ua)) return 'inapp'
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return /CriOS|FxiOS|EdgiOS/i.test(ua) ? 'ios-other' : 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}
const SIDES = [[iFood, 'Food'], [iNight, 'Nightlife'], [iRooms, 'Live Rooms'], [iPulse, 'Pulse'], [iComm, 'Communities'], [iArcade, 'Games']]

function InstallSheet({ close }) {
  const p = platform(), [msg, setMsg] = useState('')
  const native = async () => { if (!deferred) return; deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; if (r?.outcome === 'accepted') { setMsg('Installed! Find DAHUB on your home screen.'); setTimeout(close, 1600) } }
  const Step = ({ n, children }) => <li><b>{n}</b><span>{children}</span></li>
  return <div className="bsheet-scrim" onClick={close}><div className="bsheet" onClick={e => e.stopPropagation()} role="dialog" aria-label="Add DAHUB to your home screen">
    <button className="bx" onClick={close} aria-label="Close"><I n="x" s={22} /></button>
    <div className="bapp"><img src="/icon-192.png" alt="" /><span><b>DAHUB</b><small>Full screen, faster, and you get notifications</small></span></div>
    <h3>Put DAHUB on your home screen</h3>
    {p === 'inapp' && <ol><Step n="1">Tap <b>⋯</b> (top right) and choose <b>Open in browser</b> (Safari on iPhone, Chrome on Android).</Step><Step n="2">Then come back to this button and follow the steps there.</Step></ol>}
    {p === 'ios' && <ol>
      <Step n="1">Tap the <b>Share</b> button <span className="bico"><I n="share" s={18} /></span> at the bottom of Safari (top right on iPad).</Step>
      <Step n="2">Scroll down and tap <b>Add to Home Screen</b> <span className="bico"><I n="plus" s={16} /></span></Step>
      <Step n="3">Tap <b>Add</b>. Open DAHUB from your home screen from now on.</Step></ol>}
    {p === 'ios-other' && <ol>
      <Step n="1">Tap the <b>Share</b> button <span className="bico"><I n="share" s={18} /></span> in your browser's menu.</Step>
      <Step n="2">Tap <b>Add to Home Screen</b>, then <b>Add</b>.</Step>
      <Step n="3">Don't see it? Open this page in <b>Safari</b> and do the same there.</Step></ol>}
    {(p === 'android' || p === 'desktop') && (deferred ? <><p className="bnote">Your phone can install DAHUB in one tap.</p><button className="benter sm" onClick={native}><I n="plus" s={20} /> Install DAHUB</button></> : <ol>
      <Step n="1">Tap the <b>⋮</b> menu (top right in Chrome).</Step>
      <Step n="2">Tap <b>Install app</b> or <b>Add to Home screen</b>.</Step>
      <Step n="3">Tap <b>Install</b>. DAHUB shows up with your other apps.</Step></ol>)}
    {msg && <p className="bnote ok">{msg}</p>}
  </div></div>
}

export default function Boot({ onDone }) {
  const [out, setOut] = useState(false), [side, setSide] = useState(0), [sheet, setSheet] = useState(false)
  const showInstall = !standalone()
  useEffect(() => { const t = setInterval(() => setSide(s => (s + 1) % SIDES.length), 1600); return () => clearInterval(t) }, [])
  const enter = () => { if (out) return; setOut(true); setTimeout(onDone, 700) }
  return <div className={'boot2' + (out ? ' out' : '')}>
    <div className="b2bg" aria-hidden><i className="beam b1" /><i className="beam b2" /><i className="beam b3" />{Array.from({ length: 18 }, (_, i) => <u key={i} style={{ left: (i * 53) % 100 + '%', animationDelay: -(i * 0.7) + 's', animationDuration: 6 + (i % 5) + 's' }} />)}</div>
    <div className="b2main">
      <div className="b2logo"><span className="halo" /><img src={wm} alt="DAHUB" /><span className="glint" /></div>
      <h1 className="b2tag">{['ONE', 'HUB.', 'EVERY', 'SIDE', 'OF', 'LIFE.'].map((w, i) => <span key={i} style={{ animationDelay: 0.9 + i * 0.12 + 's' }}>{w}</span>)}</h1>
      <div className="b2sides" aria-hidden>{SIDES.map(([ic, l], i) => <span key={l} className={i === side ? 'on' : i === (side + SIDES.length - 1) % SIDES.length ? 'was' : ''}><img src={ic} alt="" />{l}</span>)}</div>
      <button className="benter" onClick={enter}><span>Enter DAHUB</span><I n="chev" s={22} /></button>
      {showInstall && <button className="binstall" onClick={() => setSheet(true)}><I n="plus" s={16} />Add DAHUB to your home screen</button>}
      <p className="b2city">Made in Baltimore 🦀</p>
    </div>
    <small className="bld">{BUILD}</small>
    {sheet && <InstallSheet close={() => setSheet(false)} />}
  </div>
}
