// Tap sounds: the owner's click on buttons/links/tiles and the toggle sound on switches, checkboxes and on/off options.
// Saved per device (Settings > Look and feel). Web Audio follows the phone's silent switch, so nothing plays on silent.
import clickUrl from './click.wav'
import toggleUrl from './toggle.wav'
const KEY = 'dahub.taps'
let on = (() => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } })()
let ctx = null
const SRC = { click: clickUrl, toggle: toggleUrl }, VOL = { click: 0.55, toggle: 0.6 }
const bytes = {}, bufs = {}, decoding = {}
for (const k in SRC) bytes[k] = fetch(SRC[k]).then(r => r.arrayBuffer()).catch(() => null)
export const tapsOn = () => on
export function setTaps(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0') } catch {} if (on) play('toggle') }
function ensure() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return } }
  if (ctx.state === 'suspended' && navigator.userActivation?.isActive !== false) ctx.resume().catch(() => {})
  for (const k in SRC) if (!bufs[k] && !decoding[k]) decoding[k] = bytes[k].then(b => b && new Promise((ok, no) => ctx.decodeAudioData(b.slice(0), ok, no))).then(b => { bufs[k] = b || null }).catch(() => { decoding[k] = null })
}
// decode ahead of time (allowed before any tap) so the very first tap already sounds
setTimeout(() => { try { ensure() } catch {} }, 0)
export function play(k = 'click') {
  if (!on) return; ensure(); const b = bufs[k]; if (!b) return
  const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = VOL[k] || 0.55; s.buffer = b; s.connect(g); g.connect(ctx.destination); s.start()
}
export const click = () => play('click')
const TOGGLE = '[role=switch],input[type=checkbox],input[type=radio],.swt,.tgl,[aria-pressed]'
document.addEventListener('pointerdown', e => {
  const el = e.target; if (!el.closest) return
  const lab = el.closest('label')
  if (el.closest(TOGGLE) || (lab && lab.querySelector('input[type=checkbox],input[type=radio]'))) {
    const t = el.closest(TOGGLE) || lab.querySelector('input'); if (t && !t.disabled) play('toggle'); return
  }
  const t = el.closest('button,a[href],[role=button],[role=tab],.mtile,.chipb')
  if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return
  play('click')
}, { capture: true, passive: true })
