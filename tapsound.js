// Tap sound: the owner's click on buttons and tiles around the app. Saved per device (Settings > Look and feel).
// Uses Web Audio, which follows the phone's silent switch, so it never plays when the phone is on silent.
import clickUrl from './click.wav'
const KEY = 'dahub.taps'
let on = (() => { try { return localStorage.getItem(KEY) !== '0' } catch { return true } })()
let ctx = null, buf = null, decoding = null
const bytes = fetch(clickUrl).then(r => r.arrayBuffer()).catch(() => null)
// decode ahead of time (allowed before any tap) so the very first tap already clicks
setTimeout(() => { try { ensure() } catch {} }, 0)
export const tapsOn = () => on
export function setTaps(v) { on = !!v; try { localStorage.setItem(KEY, on ? '1' : '0') } catch {} if (on) click() }
function ensure() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return } }
  if (ctx.state === 'suspended' && navigator.userActivation?.isActive !== false) ctx.resume().catch(() => {})
  if (!buf && !decoding) decoding = bytes.then(b => b && new Promise((ok, no) => ctx.decodeAudioData(b.slice(0), ok, no))).then(b => { buf = b || null }).catch(() => { decoding = null })
}
export function click() {
  if (!on) return; ensure(); if (!buf) return
  const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = 0.55; s.buffer = buf; s.connect(g); g.connect(ctx.destination); s.start()
}
document.addEventListener('pointerdown', e => {
  const t = e.target.closest && e.target.closest('button,a[href],[role=button],[role=switch],[role=tab],.mtile,.chipb')
  if (!t || t.disabled || t.getAttribute('aria-disabled') === 'true') return
  click()
}, { capture: true, passive: true })
