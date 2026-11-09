// Clout Passport card renderer. One canvas drawing path is used for the live preview, thumbnails, and "share as image".
// To add a new style, background, frame or badge, add an entry below. No other code changes are needed.
import wordmark from './wordmark.png'
export const W = 600, H = 840
export const STYLES = { classic: { label: 'Classic', accent: '#31e0ee', text: '#ffffff', glow: '#31e0ee', crown: ['#d9fbff', '#31e0ee'] }, chrome: { label: 'Chrome', accent: '#d5dde3', text: '#f4f8fb', glow: '#9fb4c2', crown: ['#ffffff', '#9aa8b3'] }, royal: { label: 'Royal', accent: '#f2c14e', text: '#fff2cc', glow: '#f2c14e', crown: ['#fff0b3', '#d4a017'] }, street: { label: 'Street', accent: '#b266ff', text: '#f3e6ff', glow: '#b266ff', crown: ['#ecd2ff', '#9b4dff'] } }
export const BACKGROUNDS = { skyline: 'Skyline', neon: 'Neon city', smoke: 'Dark smoke', crown: 'Crown design' }
export const FRAMES = { turquoise: { label: 'Turquoise chrome', c: ['#a8f7ff', '#18a9bd', '#0a4f5a'] }, gold: { label: 'Gold metallic', c: ['#ffe9a0', '#d4a017', '#6e4e00'] }, purple: { label: 'Purple metallic', c: ['#e6c4ff', '#8e44d6', '#37175f'] }, silver: { label: 'Silver metallic', c: ['#ffffff', '#a9b6bf', '#46535c'] } }
export const EFFECTS = { glow: 'Glow', holo: 'Holographic', shine: 'Metallic shine', animate: 'Animated shine' }
export const PILLARS = { loyalty: 'Loyalty', hustle: 'Hustle', creativity: 'Creativity', culture: 'Culture', community: 'Community', respect: 'Respect' }
export const BADGE_ICON = { founding: 'crown', verified: 'check', official: 'star', first_post: 'flame', followers25: 'diamond', event_host: 'cal', community_founder: 'shield', launch: 'star', award_creator: 'crown' }
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g }
export function drawIcon(c, kind, cx, cy, s, fill, stroke = '#00000088') {
  c.save(); c.translate(cx, cy); c.scale(s / 24, s / 24); c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 1.2; c.lineJoin = 'round'; c.beginPath()
  const P = {
    crown: () => { c.moveTo(-11, 8); c.lineTo(-12, -6); c.lineTo(-5, 0); c.lineTo(0, -10); c.lineTo(5, 0); c.lineTo(12, -6); c.lineTo(11, 8); c.closePath() },
    diamond: () => { c.moveTo(-8, -9); c.lineTo(8, -9); c.lineTo(12, -2); c.lineTo(0, 11); c.lineTo(-12, -2); c.closePath() },
    shield: () => { c.moveTo(0, -11); c.lineTo(10, -7); c.lineTo(9, 3); c.quadraticCurveTo(7, 9, 0, 12); c.quadraticCurveTo(-7, 9, -9, 3); c.lineTo(-10, -7); c.closePath() },
    star: () => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 12; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r) } c.closePath() },
    flame: () => { c.moveTo(0, -12); c.quadraticCurveTo(10, -2, 8, 5); c.quadraticCurveTo(6, 12, 0, 12); c.quadraticCurveTo(-8, 12, -8, 4); c.quadraticCurveTo(-8, -2, -3, -4); c.quadraticCurveTo(-3, -8, 0, -12); c.closePath() },
    cal: () => { c.rect(-10, -9, 20, 19); c.rect(-10, -9, 20, 6) },
    check: () => { c.arc(0, 0, 11, 0, 7) }
  }; (P[kind] || P.star)(); c.fill(); c.stroke()
  if (kind === 'check') { c.beginPath(); c.strokeStyle = '#fff'; c.lineWidth = 2.6; c.moveTo(-5, 0); c.lineTo(-1, 4.5); c.lineTo(6, -4); c.stroke() }
  c.restore()
}
export function drawBackground(c, key, w, h, y0 = 0) {
  const R = rng(key.length * 977 + 13)
  if (key === 'smoke') {
    c.fillStyle = '#0a0b0f'; c.fillRect(0, y0, w, h)
    for (let i = 0; i < 16; i++) { const x = R() * w, y = y0 + R() * h, r = 90 + R() * 190, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(190,196,204,${0.16 + R() * 0.16})`); g.addColorStop(1, 'rgba(190,196,204,0)'); c.fillStyle = g; c.fillRect(0, y0, w, h) }
    return
  }
  if (key === 'crown') {
    c.fillStyle = lg(c, 0, y0, w, y0 + h, [[0, '#0b0d14'], [1, '#1a1f2b']]); c.fillRect(0, y0, w, h)
    for (let gy = 0; gy < 9; gy++) for (let gx = 0; gx < 6; gx++) drawIcon(c, 'crown', 50 + gx * 100 + (gy % 2 ? 50 : 0), y0 + 40 + gy * 80, 38, '#ffffff0d', '#ffffff1c')
    drawIcon(c, 'crown', w / 2, y0 + h * 0.4, 360, '#ffffff10', '#ffffff30'); return
  }
  const neon = key === 'neon'
  c.fillStyle = neon ? lg(c, 0, y0, 0, y0 + h, [[0, '#06041c'], [0.6, '#0f1a55'], [1, '#2a0f5a']]) : lg(c, 0, y0, 0, y0 + h, [[0, '#03101c'], [0.55, '#0b3d63'], [1, '#2aa6c4']]); c.fillRect(0, y0, w, h)
  const base = y0 + h * 0.78
  for (let layer = 0; layer < 2; layer++) {
    let x = -10; const col = layer ? '#050d16' : neon ? '#0b0f33' : '#0a2540'
    while (x < w) {
      const bw = 34 + R() * 56, bh = (layer ? 120 + R() * 250 : 70 + R() * 150); c.fillStyle = col; c.fillRect(x, base - bh, bw, bh + 60)
      if (neon && layer) { c.strokeStyle = R() > 0.5 ? '#ff2bd6' : '#2be4ff'; c.lineWidth = 2; c.shadowColor = c.strokeStyle; c.shadowBlur = 10; c.strokeRect(x, base - bh, bw, bh); c.shadowBlur = 0 }
      for (let wy = base - bh + 12; wy < base - 6; wy += 16) for (let wx = x + 7; wx < x + bw - 7; wx += 11) if (R() > 0.62) { c.fillStyle = neon ? (R() > 0.5 ? '#ff7bec' : '#7df3ff') : '#bff6ff'; c.globalAlpha = 0.5 + R() * 0.5; c.fillRect(wx, wy, 4, 7); c.globalAlpha = 1 }
      x += bw + 3
    }
  }
  const wg = lg(c, 0, base, 0, y0 + h, [[0, neon ? '#3d1c8a' : '#1d8bab'], [1, '#04121c']]); c.fillStyle = wg; c.fillRect(0, base, w, y0 + h - base)
  if (neon) { c.strokeStyle = '#ffffffee'; c.lineWidth = 4; c.shadowColor = '#7df3ff'; c.shadowBlur = 24; c.beginPath(); let lx = w * 0.62, ly = y0; c.moveTo(lx, ly); while (ly < base - 40) { lx += (R() - 0.5) * 90; ly += 40 + R() * 40; c.lineTo(lx, ly) } c.stroke(); c.shadowBlur = 0 }
}
const imgs = {}
export const loadImg = src => src ? (imgs[src] ||= new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src })) : Promise.resolve(null)
export async function drawCard(canvas, d, o = {}) {
  const c = canvas.getContext('2d'), S = STYLES[d.style] || STYLES.classic, F = FRAMES[d.frame] || FRAMES.turquoise, fx = d.effects || [], bg = BACKGROUNDS[d.background] ? d.background : 'skyline'
  const [photo, wm] = await Promise.all([loadImg(d.photoUrl), loadImg(wordmark)])
  c.clearRect(0, 0, W, H); c.save(); rr(c, 0, 0, W, H, 46); c.clip()
  drawBackground(c, bg, W, H)
  if (photo) {
    const ax = 18, ay = 70, aw = W - 36, ah = 590, sc = Math.max(aw / photo.width, ah / photo.height) * (d.zoom || 1), pw = photo.width * sc, ph = photo.height * sc
    const dx = ax + (aw - pw) / 2 + (d.px || 0) * (pw - aw) / 2, dy = ay + (ah - ph) / 2 + (d.py || 0) * (ph - ah) / 2
    // Feather the photo's edges so the card background shows around the person (no AI cutout needed).
    const t = document.createElement('canvas'); t.width = aw; t.height = ah; const tc = t.getContext('2d'); tc.drawImage(photo, dx - ax, dy - ay, pw, ph)
    tc.globalCompositeOperation = 'destination-in'; tc.save(); tc.translate(aw / 2, ah * 0.46); tc.scale(1, 1.32); const mg = tc.createRadialGradient(0, 0, aw * 0.16, 0, 0, aw * 0.5); mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(0.55, 'rgba(0,0,0,.92)'); mg.addColorStop(1, 'rgba(0,0,0,0)'); tc.fillStyle = mg; tc.fillRect(-aw, -ah, aw * 2, ah * 2); tc.restore()
    c.drawImage(t, ax, ay)
  } else { c.fillStyle = '#ffffff12'; c.font = '700 200px Outfit, sans-serif'; c.textAlign = 'center'; c.fillText((d.name || '?').slice(0, 1).toUpperCase(), W / 2, 420) }
  c.fillStyle = lg(c, 0, 520, 0, 700, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(2,8,14,.88)']]); c.fillRect(0, 520, W, 320)
  c.fillStyle = lg(c, 0, 0, 0, 130, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, 130)
  // brand pill + number
  c.fillStyle = 'rgba(255,255,255,.88)'; rr(c, 30, 28, 150, 54, 18); c.fill(); if (wm) { const k = Math.min(126 / wm.width, 38 / wm.height); c.drawImage(wm, 42 + (126 - wm.width * k) / 2, 36 + (38 - wm.height * k) / 2, wm.width * k, wm.height * k) }
  drawIcon(c, 'crown', W - 52, 52, 40, S.crown[1], '#000a'); c.fillStyle = S.text; c.textAlign = 'right'; c.font = '800 40px Outfit, sans-serif'; c.shadowColor = '#000c'; c.shadowBlur = 8; c.fillText('#' + String(d.number || 0).padStart(4, '0'), W - 84, 66); c.shadowBlur = 0
  // pillars (member chosen)
  const pl = (d.pillars || []).slice(0, 4); if (pl.length) { c.fillStyle = 'rgba(2,10,16,.62)'; rr(c, 24, 400, 230, 26 + pl.length * 46, 18); c.fill(); c.strokeStyle = S.accent + '88'; c.lineWidth = 2; c.stroke(); pl.forEach((p, i) => { drawIcon(c, ['crown', 'flame', 'diamond', 'shield'][i], 56, 438 + i * 46, 30, S.accent); c.fillStyle = '#fff'; c.textAlign = 'left'; c.font = '700 24px Outfit, sans-serif'; c.fillText((PILLARS[p] || p).toUpperCase(), 84, 447 + i * 46) }) }
  // badges
  const bs = (d.badges || []).slice(0, 5); bs.forEach((b, i) => { const x = W - 46 - i * 56; c.fillStyle = 'rgba(2,10,16,.7)'; c.beginPath(); c.arc(x, 626, 25, 0, 7); c.fill(); c.strokeStyle = S.accent; c.lineWidth = 2.5; c.stroke(); drawIcon(c, BADGE_ICON[b] || 'star', x, 626, 30, S.crown[0]) })
  // name
  const nm = (d.cardName || d.name || 'Member'), grad = lg(c, 0, 650, 0, 740, [[0, '#ffffff'], [0.5, S.text], [1, S.accent]])
  let fs = 92; c.font = `italic 800 ${fs}px Outfit, sans-serif`; while (c.measureText(nm).width > W - 70 && fs > 36) { fs -= 4; c.font = `italic 800 ${fs}px Outfit, sans-serif` }
  c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = '#020a10'; c.shadowColor = S.glow; c.shadowBlur = 22; c.strokeText(nm, W / 2, 735); c.fillStyle = grad; c.fillText(nm, W / 2, 735); c.shadowBlur = 0
  c.fillStyle = '#ffffffee'; c.font = '700 28px Outfit, sans-serif'; const sub = d.location ? '★  ' + d.location.toUpperCase() + '  ★' : d.since ? 'MEMBER SINCE ' + d.since.toUpperCase() : 'DAHUB MEMBER'; c.fillText(sub, W / 2, 790)
  if (d.location && d.since) { c.font = '600 18px Outfit, sans-serif'; c.fillStyle = '#ffffffaa'; c.fillText('MEMBER SINCE ' + d.since.toUpperCase(), W / 2, 818) }
  // effects
  if (fx.includes('holo')) { c.globalCompositeOperation = 'screen'; c.fillStyle = lg(c, 0, 0, W, H, [[0, 'rgba(255,0,200,.0)'], [0.25, 'rgba(255,60,200,.22)'], [0.42, 'rgba(60,255,220,.22)'], [0.6, 'rgba(255,230,80,.18)'], [0.8, 'rgba(120,120,255,.22)'], [1, 'rgba(255,0,200,0)']]); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over' }
  if (fx.includes('shine')) { c.fillStyle = lg(c, 0, 0, W, H, [[0, 'rgba(255,255,255,0)'], [0.34, 'rgba(255,255,255,0)'], [0.46, 'rgba(255,255,255,.34)'], [0.52, 'rgba(255,255,255,.08)'], [0.6, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(0, 0, W, H) }
  c.restore()
  // frame
  c.save(); if (fx.includes('glow')) { c.shadowColor = S.glow; c.shadowBlur = 34 }
  rr(c, 9, 9, W - 18, H - 18, 40); c.lineWidth = 20; c.strokeStyle = lg(c, 0, 0, W, H, [[0, F.c[0]], [0.35, F.c[1]], [0.55, F.c[0]], [0.8, F.c[1]], [1, F.c[2]]]); c.stroke(); c.restore()
  rr(c, 19, 19, W - 38, H - 38, 32); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke(); rr(c, 1.5, 1.5, W - 3, H - 3, 46); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)'; c.stroke()
  if (o.done) o.done()
}
