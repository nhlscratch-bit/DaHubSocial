self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {} } catch { d = { title: 'DAHUB', body: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.title || 'DAHUB', { body: d.body || '', icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag, renotify: !!d.tag, data: { url: d.url || '/' } }))
})
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of cs) { if ('focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url) } catch {} } return } }
    await self.clients.openWindow(url)
  })())
})
