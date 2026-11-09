// Glow Mode: chrome edges around the app fade through four icy colors that sit with DAHUB's white/chrome/cyan look.
// The color changes every few seconds on <html>; CSS transitions do the smooth fade, so it costs almost nothing.
export const GLOW = [['Glacier', '#19e0f0'], ['Moonstone', '#7aa8ff'], ['Frost Orchid', '#c79bff'], ['Aurora Mint', '#5cf5c4']]
const KEY = 'dahub.glow', root = document.documentElement
let timer = null, i = 0
export const glowOn = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
function apply(on) {
  clearInterval(timer); timer = null
  root.classList.toggle('glow', on)
  if (!on) return root.style.removeProperty('--gx')
  root.style.setProperty('--gx', GLOW[i][1])
  timer = setInterval(() => { i = (i + 1) % GLOW.length; root.style.setProperty('--gx', GLOW[i][1]) }, 3000)
}
export function setGlow(on) { try { localStorage.setItem(KEY, on ? '1' : '0') } catch {} apply(on) }
apply(glowOn())
