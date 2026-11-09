import { useEffect, useState } from 'react'
import { sb, mediaUrl } from './supabase'
// After Dark media lives in a private bucket. Viewers who have After Dark on get short-lived signed links.
const cache = new Map()
export function useMediaUrls(media) {
  const priv = media.filter(m => m.bucket === 'after-dark').map(m => m.storage_path), key = priv.join('|')
  const [, bump] = useState(0)
  useEffect(() => {
    const need = priv.filter(p => { const c = cache.get(p); return !c || c.exp < Date.now() })
    if (!need.length) return
    sb.storage.from('after-dark').createSignedUrls(need, 3600).then(({ data }) => { for (const d of data || []) if (d.signedUrl) cache.set(d.path, { url: d.signedUrl, exp: Date.now() + 50 * 60e3 }); bump(x => x + 1) })
  }, [key])
  return m => m.bucket === 'after-dark' ? cache.get(m.storage_path)?.url || '' : mediaUrl(m.storage_path)
}
