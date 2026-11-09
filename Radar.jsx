import { useMemo, useState } from 'react'
import { Thumb, Row } from './PulseChamber'
import badge from './verified.png'
import { FILTERS, FNAME, usePulse, scan, ago } from './pulse'
const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h }
export default function Radar({ back, open }) {
  const s = usePulse(), [view, setView] = useState('radar'), [sel, setSel] = useState(null)
  const r = s.result, items = r?.items || [], f = FILTERS.find(x => x[0] === s.filter)
  const nodes = useMemo(() => items.slice(0, 16).map((it, i, a) => {
    const rad = a.length === 1 ? 0.5 : 0.24 + 0.62 * (i / (a.length - 1)), ang = (i * 137.5 + (hash(it.id) % 40)) * Math.PI / 180
    return { it, x: 50 + Math.cos(ang) * rad * 46, y: 50 + Math.sin(ang) * rad * 46 }
  }), [r])
  const cur = items.find(i => i.id === sel)
  return <div className="sheet pulsepg"><div className="bar"><button onClick={back} aria-label="Back to Pulse Chamber">←</button>Radar · {FNAME[s.filter]}
    <button className="wb sm" style={{ marginLeft: 'auto' }} onClick={() => scan()} disabled={s.phase === 'scanning'}>{s.phase === 'scanning' ? 'Scanning…' : 'Refresh'}</button></div>
    <div className="sbody">
      {!r && <div className="empty">No scan yet.<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={back}>Back to Pulse Chamber</button></div>}
      {r && <>
        <div className="chips"><button className="chipb" aria-selected={view === 'radar'} onClick={() => setView('radar')}>Radar</button><button className="chipb" aria-selected={view === 'list'} onClick={() => setView('list')}>List</button></div>
        {s.error && <p className="msg" role="alert">{s.error} <button className="link" onClick={() => scan()}>Retry</button></p>}
        <p className="pnote" style={{ margin: '0 14px 6px' }}>{s.stale ? 'Stale results · ' : ''}Scanned {ago(r.scanned_at)}. {items.length} result{items.length !== 1 && 's'}.</p>
        {items.length === 0 && <div className="empty">Nothing matched right now.<br /><button className="wb p sm" style={{ marginTop: 10 }} onClick={back}>Back to Pulse Chamber</button></div>}
        {items.length > 0 && view === 'radar' && <>
          <div className={'rfield' + (s.phase === 'scanning' ? ' scanning' : '')} role="group" aria-label="Radar results">
            <i className="rr r1" /><i className="rr r2" /><i className="rr r3" /><i className="rsw" /><i className="rcore" />
            {nodes.map(({ it, x, y }) => <button key={it.id} className={'blip' + (it.verified ? ' vblip' : '') + (sel === it.id ? ' on' : '')} style={{ left: x + '%', top: y + '%' }} onClick={() => setSel(it.id)} aria-label={it.title + (it.verified ? ', verified' : '')}><Thumb it={it} size={40} />{it.verified && <img className="blipv" src={badge} alt="" />}</button>)}
          </div>
          <p className="pnote" style={{ textAlign: 'center' }}>Closer to the center = ranks higher in this scan. Position around the ring is only for spacing.{items.length > 16 ? ' Showing the top 16. See all in List.' : ''}</p>
          {cur ? <div className="rprev"><Row it={cur} onClick={() => open(cur.dest)} /><button className="wb p sm" onClick={() => open(cur.dest)}>Open</button></div> : <p className="pnote" style={{ textAlign: 'center' }}>Tap a point to preview it.</p>}
        </>}
        {items.length > 0 && view === 'list' && <div style={{ padding: '0 0 120px' }}>{items.map(it => <Row key={it.kind + it.id} it={it} onClick={() => open(it.dest)} />)}</div>}
        <button className="wb" style={{ margin: '10px 14px 120px' }} onClick={back}>Back to Pulse Chamber</button>
      </>}
    </div></div>
}
