import { sb } from './supabase'
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map(c => c.charCodeAt(0))) }
export const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
export const isiOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
export const registerSW = () => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}) }
export async function current() { if (!supported()) return null; try { const reg = await navigator.serviceWorker.getRegistration(); return reg ? await reg.pushManager.getSubscription() : null } catch { return null } }
export async function enable(me) {
  if (!supported()) throw new Error('This browser does not support push notifications.')
  if (isiOS() && !standalone()) throw new Error('On iPhone, first add DAHUB to your Home Screen (Share, then Add to Home Screen), then open it from there.')
  const perm = await Notification.requestPermission(); if (perm !== 'granted') throw new Error('Notifications are blocked. Turn them on for DAHUB in your phone settings.')
  const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready
  const { data, error } = await sb.functions.invoke('push', { body: { action: 'key' } }); if (error || !data?.key) throw new Error('Could not reach the notification service. Try again.')
  let sub = await reg.pushManager.getSubscription(); if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(data.key) })
  const j = sub.toJSON(); const { error: e2 } = await sb.from('push_subscriptions').upsert({ user_id: me.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' })
  if (e2) throw new Error(e2.message)
}
export async function disable() { const sub = await current(); if (sub) { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe() } }
