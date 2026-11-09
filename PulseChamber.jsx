import { useEffect, useState } from 'react'
import Avatar from './Avatar'
import { artistPhoto, subUrl } from './media'
import btnImg from './pulse-button.png'
import { FILTERS, FNAME, usePulse, setFilter, setArea, scan, ago } from './pulse'

export function Thumb({ it, size = 44 }) {
  const url = it.photo ? artistPhoto(it.photo) : it.cover ? subUrl(it.cover) : null
  if (url) return <span className="pth" style={{ width: size, height: size, backgroundImage: `url(${url})` }} />
  if (it.kind === 'person' || it.kind === 'post' || it.kind === 'room') return <Avatar p={{ avatar_url: it.img, display_name: it.kind === 'post' ? it.sub : it.title }} size={size} />
  return <span className="pth" style={{ width: size, height: size }}>{(it.title || '?')[0].toUpperCase()}</span>
}
export function Row({ it, onClick }) {
  return <button className="gl prow" onClick={onClick}><Thumb it={it} /><span className="evi"><b>{it.title}{it.verified && ' ✓'}</b>{it.sub && <small>{it.sub}</small>}<span className="evt"><i className={'gtag alt'}>{it.signal}</i></span></span></button>
}
function PulseButton({ phase, onPress, disabled }) {
  return <div className={'pbtn' + (phase === 'scanning' ? ' scanning' : '')}>
    <i className="pglow" /><i className="prip a" /><i className="prip b" />
    <button className="ppress" onClick={onPress} disabled={disabled} aria-label={phase === 'scanning' ? 'Scanning' : 'Scan with DH Pulse'}>
      <img className="pimg" src={btnImg} alt="DH Pulse" draggable="false" />
      <i className="psweep" />
    </button>
  </div>
}
export default function PulseChamber({ back, openRadar, open }) {
  const s = usePulse(), [pick, setPick] = useState(false), [draft, setDraft] = useState(s.area)
  const f = FILTERS.find(x => x[0] === s.filter), r = s.result, items = r?.items || []
  const live = false
  useEffect(() => { setDraft(s.area) }, [s.area])
  const needArea = s.filter === 'around' && !s.area.trim()
  const go = () => { if (needArea) return; scan() }
  return <div className="sheet pulsepg"><div className="bar"><button onClick={back}>←</button>DAHUB Pulse</div><div className="sbody">
    <div className="pchamber">
      <button className="pfsel" onClick={() => setPick(true)} aria-haspopup="dialog"><small>Scan</small><b>{f[1]}</b><span aria-hidden>▾</span></button>
      <PulseButton phase={s.phase} onPress={go} disabled={live || s.phase === 'scanning'} />
      <p className="phint" role="status">{s.phase === 'scanning' ? 'Scanning DAHUB…' : live ? 'Live Activity is not available yet.' : needArea ? 'Add an area below, then tap to scan.' : r ? 'Tap again to refresh.' : 'Tap DH PULSE to scan.'}</p>
    </div>
    {s.filter === 'around' && <form className="parea" onSubmit={e => { e.preventDefault(); setArea(draft.trim()) }}>
      <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Neighborhood or area (e.g. Hampden)" aria-label="Area" maxLength={60} />
      <button className="wb p sm" type="submit">Set</button></form>}
    {s.filter === 'around' && s.area && <p className="pnote">Matching “{s.area}” by neighborhood or location text. DAHUB doesn’t use your GPS.</p>}
    {s.filter === 'events' && <p className="pnote">Optional: set an area under Around Me to narrow events by neighborhood.</p>}
    {s.error && <p className="msg" role="alert">{s.error} <button className="link" onClick={() => scan()}>Retry</button></p>}
    {r?.note && !live && <p className="pnote">{r.note}</p>}
        {r && !live && <section className="pprev">
      <div className="phd"><b>{items.length ? `${items.length} result${items.length > 1 ? 's' : ''}` : 'No results'}</b><small>{s.stale ? 'Stale · ' : ''}Scanned {ago(r.scanned_at)}</small></div>
      {s.stale && <p className="pnote">The last scan failed. These are results from your previous scan.</p>}
      {items.length === 0 && !r.note && <div className="empty">Nothing matched {FNAME[s.filter]}{s.area && s.filter !== 'people' ? ` in “${s.area}”` : ''} right now.<br /><button className="wb sm" style={{ marginTop: 10 }} onClick={() => setPick(true)}>Change filter</button> <button className="wb p sm" onClick={() => scan()}>Scan again</button></div>}
      {items.slice(0, 4).map(it => <Row key={it.kind + it.id} it={it} onClick={() => open(it.dest)} />)}
      {items.length > 0 && <button className="wb p" style={{ marginTop: 10 }} onClick={openRadar}>Enter the Radar{items.length > 4 ? ` · all ${items.length}` : ''}</button>}
      <small className="pnote">Ranked by: {f[2].toLowerCase()}. Results reflect DAHUB data at scan time, not live activity.</small>
    </section>}
    {pick && <div className="pmodal" role="dialog" aria-label="Choose what to scan" onClick={() => setPick(false)}><div className="pmbox" onClick={e => e.stopPropagation()}>
      <b>What do you want to scan?</b>
      {FILTERS.map(([k, l, d]) => <button key={k} className="popt" aria-selected={s.filter === k} onClick={() => { if (k !== s.filter) setFilter(k); setPick(false) }}><span><b>{l}</b><small>{d}</small></span>{s.filter === k && <i>✓</i>}</button>)}
    </div></div>}
  </div></div>
}
