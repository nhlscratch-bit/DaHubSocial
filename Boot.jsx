import wm from './wordmark.png'
import { useState } from 'react'
import { BUILD } from './supabase'
export default function Boot({ onDone }) {
  const [out, setOut] = useState(false)
  return <div className={'boot' + (out ? ' out' : '')}>
    <div className="bwm"><img src={wm} alt="DAHUB" /><div className="shine" /></div>
    <div className="tg">ONE HUB. EVERY SIDE OF LIFE.</div>
    <button className="tap" onClick={() => { setOut(true); setTimeout(onDone, 450) }}>Tap to enter</button>
    <small className="bld">{BUILD}</small>
  </div>
}
