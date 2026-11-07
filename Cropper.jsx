import { useEffect, useRef, useState } from 'react'
// Drag to move, pinch or slide to zoom. shape: 'circle' (profile photo) or 'wide' (cover).
export default function Cropper({ src, shape, onCancel, onSave }) {
  const circle = shape === 'circle', W = circle ? 300 : 340, H = circle ? 300 : 136, OUT = circle ? [512, 512] : [1500, 600]
  const [img, setImg] = useState(null), [z, setZ] = useState(1), [pos, setPos] = useState({ x: 0, y: 0 }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const ptr = useRef(new Map()), last = useRef(null)
  const base = img ? Math.max(W / img.naturalWidth, H / img.naturalHeight) : 1, s = base * z
  const clamp = (x, y, sc) => ({ x: Math.min(0, Math.max(W - img.naturalWidth * sc, x)), y: Math.min(0, Math.max(H - img.naturalHeight * sc, y)) })
  useEffect(() => {
    const i = new Image(); i.crossOrigin = 'anonymous'
    i.onload = () => { setImg(i); const sc = Math.max(W / i.naturalWidth, H / i.naturalHeight); setPos({ x: (W - i.naturalWidth * sc) / 2, y: (H - i.naturalHeight * sc) / 2 }) }
    i.onerror = () => setErr('Could not load that image.'); i.src = src
  }, [src])
  const zoomTo = nz => { const ns = base * nz, cx = (W / 2 - pos.x) / s, cy = (H / 2 - pos.y) / s; setZ(nz); setPos(clamp(W / 2 - cx * ns, H / 2 - cy * ns, ns)) }
  const down = e => { e.currentTarget.setPointerCapture(e.pointerId); ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); last.current = null }
  const move = e => {
    if (!img || !ptr.current.has(e.pointerId)) return
    const prev = ptr.current.get(e.pointerId); ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...ptr.current.values()]
    if (pts.length === 2) { const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); if (last.current) zoomTo(Math.min(4, Math.max(1, z * d / last.current))); last.current = d }
    else setPos(p => clamp(p.x + e.clientX - prev.x, p.y + e.clientY - prev.y, s))
  }
  const up = e => { ptr.current.delete(e.pointerId); last.current = null }
  async function save() {
    setBusy(true); setErr('')
    try {
      const c = document.createElement('canvas'); c.width = OUT[0]; c.height = OUT[1]
      c.getContext('2d').drawImage(img, -pos.x / s, -pos.y / s, W / s, H / s, 0, 0, OUT[0], OUT[1])
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)); if (!blob) throw new Error('export failed')
      await onSave(blob)
    } catch (e) { setErr('Could not save this image. Try choosing the photo again.'); setBusy(false) }
  }
  return <div className="crop"><div className="cbox"><h3>{circle ? 'Adjust photo' : 'Adjust cover'}</h3><p>Drag to move. Pinch or use the slider to zoom.</p>
    <div className={'cframe ' + shape} style={{ width: W, height: H }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {img && <img src={img.src} alt="" draggable={false} style={{ width: img.naturalWidth * s, height: img.naturalHeight * s, transform: `translate(${pos.x}px,${pos.y}px)` }} />}</div>
    <input type="range" min="1" max="4" step="0.01" value={z} onChange={e => zoomTo(+e.target.value)} aria-label="Zoom" style={{ width: W }} disabled={!img} />
    {err && <p className="msg" role="alert">{err}</p>}
    <div className="crow"><button className="wb" onClick={onCancel}>Cancel</button><button className="wb p" disabled={!img || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div></div></div>
}
