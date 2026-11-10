// Connection helpers (ICE servers) for calls, Live Rooms and table voice.
// TURN relays let phones on different networks (Wi-Fi vs cell, strict routers) connect. Credentials come from the
// `turn` edge function (Metered account key kept as a Supabase secret), refreshed every 30 min.
// Until that is set up, it falls back to Vercel env vars, then the free public Open Relay.
import { sb } from './supabase'
const env = import.meta.env
const STUN = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
const FALLBACK = [STUN, env.VITE_TURN_URL ? { urls: env.VITE_TURN_URL.split(','), username: env.VITE_TURN_USER, credential: env.VITE_TURN_PASS }
  : { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }]
let cur = FALLBACK, source = env.VITE_TURN_URL ? 'env' : 'openrelay', at = 0, inflight = null
export const iceServers = () => { if (Date.now() - at > 30 * 60e3) warmIce(); return cur }
export const iceSource = () => source
export function warmIce(force) {
  if (inflight && !force) return inflight
  inflight = sb.functions.invoke('turn', { body: {} }).then(({ data, error }) => {
    if (!error && Array.isArray(data?.iceServers) && data.iceServers.length) { cur = [STUN, ...data.iceServers]; source = data.source || 'metered'; at = Date.now() }
    else at = Date.now() - 25 * 60e3 // try again in ~5 min
  }).catch(() => { at = Date.now() - 25 * 60e3 }).finally(() => { inflight = null })
  return inflight
}
// back-compat for code that imported a static list
export const ICE = FALLBACK
