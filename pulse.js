import { useSyncExternalStore } from 'react'
import { sb, friendly } from './supabase'
export const FILTERS = [
  ['around', 'Around Me', 'Events, opportunities and members in an area you type'],
  ['people', 'People', 'Members gaining new followers'],
  ['convos', 'Conversations', 'Public posts with the most recent comments'],
  ['boards', 'Popular Boards', 'Communities by members and recent joins'],
  ['biz', 'Restaurants & Businesses', 'Verified businesses and local spotlights'],
  ['events', 'Events', 'Upcoming events, soonest first'],
  ['music', 'Music & Artists', 'Artists from the DAHUB Media catalog'],
  ['live', 'Live Activity', 'Live rooms happening now']
]
export const FNAME = Object.fromEntries(FILTERS.map(f => [f[0], f[1]]))
const ls = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const lset = (k, v) => { try { localStorage.setItem(k, v) } catch {} }
let st = { filter: ls('pulse.filter', 'people'), area: ls('pulse.area', ''), phase: 'idle', result: null, stale: false, error: '', last: 0 }
const subs = new Set(); const emit = () => subs.forEach(f => f())
const set = p => { st = { ...st, ...p }; emit() }
export const usePulse = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f) }, () => st)
export const pulseState = () => st
export function setFilter(f) { lset('pulse.filter', f); set({ filter: f, result: null, stale: false, error: '', phase: 'idle' }) }
export function setArea(a) { lset('pulse.area', a); set({ area: a }) }
export function resetPulse() { set({ result: null, stale: false, error: '', phase: 'idle' }) }
let inflight = false
// Runs a real scan on the server. Debounced: ignores taps while a scan is running or within 1.2s of the last one.
export async function scan() {
  if (inflight || Date.now() - st.last < 1200) return
  inflight = true; const keep = st.result
  set({ phase: 'scanning', error: '', last: Date.now() })
  const t0 = Date.now()
  try {
    const { data, error } = await sb.rpc('pulse_scan', { p_filter: st.filter, p_area: st.area })
    if (error) throw error
    const wait = 1400 - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait))
    if (data.filter !== st.filter) return set({ phase: 'idle' })
    set({ phase: 'done', result: data, stale: false, last: Date.now() })
  } catch (e) {
    const m = /rate_limit/.test(e?.message || '') ? 'Easy there. Too many scans in a minute. Try again shortly.' : (friendly ? friendly(e) : e.message) || 'Scan failed.'
    set({ phase: 'error', error: m, result: keep, stale: !!keep })
  } finally { inflight = false }
}
export const ago = iso => { const s = Math.max(0, (Date.now() - new Date(iso)) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.floor(s / 60) + ' min ago' : Math.floor(s / 3600) + ' hr ago' }
