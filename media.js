import { sb } from './supabase'
export const CAT = { food: 'Food', music: 'Music', podcast: 'Podcast', beauty: 'Beauty', retail: 'Retail', services: 'Services', tech: 'Tech', events: 'Events', other: 'Local' }
export const subUrl = p => p ? sb.storage.from('media-submissions').getPublicUrl(p).data.publicUrl : null
export const SUBSEL = 'id,category,title,blurb,link_url,cover_path,media_path,media_type,neighborhood,status,review_note,created_at,reviewed_at,featured_until,author:profiles!submissions_author_id_fkey(id,username,display_name,avatar_url)'
