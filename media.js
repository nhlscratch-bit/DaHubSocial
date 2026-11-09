import { sb } from './supabase'
export const CAT = { food: 'Food', music: 'Music', podcast: 'Podcast', beauty: 'Beauty', retail: 'Retail', services: 'Services', tech: 'Tech', events: 'Events', other: 'Local' }
export const subUrl = p => p ? sb.storage.from('media-submissions').getPublicUrl(p).data.publicUrl : null
export const SUBSEL = 'id,category,title,blurb,link_url,cover_path,media_path,media_type,neighborhood,status,review_note,created_at,reviewed_at,featured_until,author:profiles!submissions_author_id_fkey(id,username,display_name,avatar_url)'
export const artistPhoto = p => p ? sb.storage.from('media-submissions').getPublicUrl(p).data.publicUrl : null
export const ytThumb = v => v.thumb_url || `https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`
export const mmss = s => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : ''
export const ytId = t => { const m = String(t || '').trim().match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/) || String(t).trim().match(/^([A-Za-z0-9_-]{11})$/); return m ? m[1] : null }
export const YTERR = { not_configured: 'YouTube is not set up yet.', quotaExceeded: 'YouTube daily limit reached. Try again tomorrow.', admin_only: 'Admins only.', keyInvalid: 'The YouTube key is not valid.', forbidden: 'YouTube rejected the key. Check its restrictions.' }
export async function yt(body) {
  const { data, error } = await sb.functions.invoke('youtube', { body })
  if (error) { let m = error.message; try { const j = await error.context.json(); m = YTERR[j.error] || j.error || m } catch {} throw new Error(m) }
  if (data?.error) throw new Error(YTERR[data.error] || data.error)
  return data.videos || []
}
export const ACCT = { standard: 'Standard member', business: 'Verified Business', media: 'Verified Media', creator: 'Verified Creator / Artist', official: 'DAHUB Official' }
export const SELV = '*,artist:media_artists(id,name,city,genres,photo_path)'
