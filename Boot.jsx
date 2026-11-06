import { useState } from 'react'
export default function Boot({ onDone }) {
  const [out, setOut] = useState(false)
  return <div className={'boot' + (out ? ' out' : '')}>
    <div className="bwm"><img src="/wordmark.png" alt="DAHUB" /><div className="shine" /></div>
    <div className="tg">ONE HUB. EVERY SIDE OF LIFE.</div>
    <button className="tap" onClick={() => { setOut(true); setTimeout(onDone, 450) }}>Tap to enter</button>
  </div>
}
