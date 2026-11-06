import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
// Locked order — ids match public.reaction_types
export const REACTIONS = [['Love','❤️'],['Like','👍'],['Middle Finger','🖕'],['Sad','😢'],['Lick','👅'],['Wink','😉'],['Wow','😮']]
export const SEL = 'id,body,kind,audience,created_at,author:profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified),post_media(storage_path,media_type,position),post_reactions(user_id,reaction_id),comments(count),reposts(user_id),bookmarks(user_id)'
export const mediaUrl = p => sb.storage.from('post-media').getPublicUrl(p).data.publicUrl
export const upload = async (bucket, uid, file) => {
  const path = `${uid}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'bin').toLowerCase()}`
  const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}
export const ago = t => { const s = (Date.now() - new Date(t)) / 1000; return s < 60 ? 'now' : s < 3600 ? Math.floor(s/60)+'m' : s < 86400 ? Math.floor(s/3600)+'h' : Math.floor(s/86400)+'d' }
