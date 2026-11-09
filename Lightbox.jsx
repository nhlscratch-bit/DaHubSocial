import { useEffect, useRef } from 'react'
// Full-screen photo viewer: swipe between photos, tap the X or the dark area to close.
export default function Lightbox({ urls, start = 0, close }) {
  const ref = useRef()
  useEffect(() => {
    document.body.style.overflow = 'hidden'; const k = e => e.key === 'Escape' && close(); window.addEventListener('keydown', k)
    ref.current && (ref.current.scrollLeft = start * ref.current.clientWidth)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k) }
  }, [])
  return <div className="lb" role="dialog" aria-label="Photo viewer" onClick={close}>
    <button className="svb lbx" onClick={close} aria-label="Close">✕</button>
    <div className="lbs" ref={ref}>{urls.map(u => <div key={u} className="lbp"><img src={u} alt="" onClick={e => e.stopPropagation()} /></div>)}</div>
    {urls.length > 1 && <small className="lbn">Swipe for more · {urls.length} photos</small>}</div>
}
