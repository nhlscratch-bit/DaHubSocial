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
// ---- Direct messages (uses existing conversations / conversation_members / messages tables) ----
export const dmKey = (a, b) => [a, b].sort().join(':')
export async function startDM(me, other) {
  const key = dmKey(me, other), find = () => sb.from('conversations').select('id').eq('dm_key', key).maybeSingle()
  const { data: c } = await find(); if (c) return c.id
  const { data, error } = await sb.from('conversations').insert({ created_by: me, dm_key: key, is_group: false }).select('id').single()
  if (error) { const { data: c2 } = await find(); if (c2) return c2.id; throw error }
  const { error: e2 } = await sb.from('conversation_members').insert([{ conversation_id: data.id, user_id: me }, { conversation_id: data.id, user_id: other }])
  if (e2) throw e2
  return data.id
}
const cache = new Map()
export async function signed(path) {
  if (cache.has(path)) return cache.get(path)
  const { data } = await sb.storage.from('dm-media').createSignedUrl(path, 3600)
  if (data) cache.set(path, data.signedUrl)
  return data?.signedUrl
}

export const BUILD = 'build 24'

// People hidden from me: blocked, blocked-me (direction not revealed) and muted.
export async function hiddenIds() { const { data } = await sb.rpc('hidden_ids'); return new Set((data || []).map(x => (typeof x === 'string' ? x : Object.values(x)[0]))) }
