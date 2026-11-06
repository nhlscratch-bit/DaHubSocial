import { sb } from '../supabase'
export default function Avatar({ p, size = 44, onClick }) {
  const src = p?.avatar_url ? sb.storage.from('avatars').getPublicUrl(p.avatar_url).data.publicUrl : null
  return <button className="av" style={{ width: size, height: size, fontSize: size / 2.6 }} onClick={onClick} aria-label={p?.display_name || 'Profile'}>
    {src ? <img src={src} alt="" /> : (p?.display_name || '?').slice(0, 2).toUpperCase()}</button>
}
