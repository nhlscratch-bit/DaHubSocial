import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
// Locked order — ids match public.reaction_types
export const REACTIONS = [['Love','❤️'],['Like','👍'],['Middle Finger','🖕'],['Sad','😢'],['Lick','👅'],['Wink','😉'],['Wow','😮']]
export const SEL = 'id,body,kind,audience,created_at,after_dark,sensitive,held,author:profiles!posts_author_id_fkey(id,username,display_name,avatar_url,is_verified),post_media(storage_path,media_type,position,bucket),poll_options(id,text,position),poll_votes(user_id,option_id),post_reactions(user_id,reaction_id),comments(count),reposts(user_id),bookmarks(user_id)'
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
// ad = After Dark DM: a separate 18+ conversation (its own key), only shown inside After Dark
export async function startDM(me, other, ad = false) {
  const key = (ad ? 'ad:' : '') + dmKey(me, other), find = () => sb.from('conversations').select('id').eq('dm_key', key).maybeSingle()
  const { data: c } = await find(); if (c) return c.id
  const { data, error } = await sb.from('conversations').insert({ created_by: me, dm_key: key, is_group: false, after_dark: !!ad }).select('id').single()
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

export const BUILD = 'build 80'

// People hidden from me: blocked, blocked-me (direction not revealed) and muted.
export async function hiddenIds() { const { data } = await sb.rpc('hidden_ids'); return new Set((data || []).map(x => (typeof x === 'string' ? x : Object.values(x)[0]))) }

// Plain-English version of database errors (rate limits, blocks).
export const friendly = e => {
  const m = e?.message || String(e || '')
  if (/^banned:/.test(m)) return 'This account has been banned.'
  if (/^suspended:/.test(m)) return 'Your account is suspended right now.'
  if (/rate_limit: post/.test(m)) return "You're posting too fast. Wait a minute and try again."
  if (/rate_limit: comment/.test(m)) return "You're commenting too fast. Wait a minute and try again."
  if (/rate_limit: follow_day/.test(m)) return "You've followed a lot of people today. Try again tomorrow."
  if (/rate_limit: follow/.test(m)) return "You're following people too fast. Try again in a bit."
  if (/rate_limit: report/.test(m)) return "You've sent a lot of reports today. Try again tomorrow."
  if (/rate_limit/.test(m)) return "You're going too fast. Try again in a bit."
  if (/blocked: /.test(m)) return m.replace(/^.*blocked: /, '')
  if (/follow this account/.test(m)) return "You can't follow this account."
  return m
}
