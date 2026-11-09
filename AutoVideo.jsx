import { useEffect, useRef, useState } from 'react'
let soundOn = false
// Plays by itself when ~60% on screen, pauses when scrolled away. Tap toggles sound.
export default function AutoVideo({ src }) {
  const v = useRef(), [muted, setMuted] = useState(!soundOn), [pct, setPct] = useState(0)
  const play = () => { const el = v.current; if (!el) return; el.play().catch(() => { el.muted = true; setMuted(true); el.play().catch(() => {}) }) }
  useEffect(() => {
    const el = v.current
    const io = new IntersectionObserver(([e]) => { e.isIntersecting && e.intersectionRatio >= 0.6 ? play() : el.pause() }, { threshold: [0, 0.6] })
    io.observe(el); return () => io.disconnect()
  }, [])
  const tap = () => { const el = v.current; if (el.muted) { el.muted = false; soundOn = true; setMuted(false); play() } else { el.muted = true; soundOn = false; setMuted(true) } }
  return <div className="av2"><video ref={v} src={src + '#t=0.1'} loop muted={muted} playsInline preload="metadata" onClick={tap} onTimeUpdate={e => setPct(e.target.duration ? e.target.currentTime / e.target.duration * 100 : 0)} />
    <span className="vmute" aria-hidden="true">{muted ? '🔇' : '🔊'}</span><i className="vbar"><b style={{ width: pct + '%' }} /></i></div>
}
