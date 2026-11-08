import { useRef, useState } from 'react'
import { sb, upload } from './supabase'
import Avatar from './Avatar'
import Cropper from './Cropper'
const pub = (b, p) => sb.storage.from(b).getPublicUrl(p).data.publicUrl
export default function EditProfile({ pr, me, close, saved }) {
  const [f, setF] = useState({ display_name: pr.display_name || '', username: pr.username || '', bio: pr.bio || '', location: pr.location || '', link: pr.link || '' })
  const [cur, setCur] = useState(pr), [crop, setCrop] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const meta = shape => shape === 'circle' ? ['avatar_url', 'avatars'] : ['cover_url', 'covers']
  const choose = shape => e => { const file = e.target.files[0]; e.target.value = ''; if (file) setCrop({ src: URL.createObjectURL(file), shape }) }
  const adjust = shape => { const [col, b] = meta(shape); setCrop({ src: pub(b, cur[col]) + '?t=' + Date.now(), shape }) }
  async function saveImg(blob) {
    const [col, bucket] = meta(crop.shape), old = cur[col]
    const path = await upload(bucket, me.id, new File([blob], 'img.jpg', { type: 'image/jpeg' }))
    const { error } = await sb.from('profiles').update({ [col]: path }).eq('id', me.id); if (error) throw error
    if (old) sb.storage.from(bucket).remove([old])
    setCur({ ...cur, [col]: path }); setCrop(null); saved()
  }
  async function remove(shape) {
    const [col, bucket] = meta(shape), old = cur[col]; if (!old) return
    await sb.from('profiles').update({ [col]: null }).eq('id', me.id); sb.storage.from(bucket).remove([old]); setCur({ ...cur, [col]: null }); saved()
  }
  async function save() {
    const username = f.username.trim().replace(/^@/, '').toLowerCase(), name = f.display_name.trim()
    if (!/^[a-z0-9_]{3,30}$/.test(username)) return setErr('Handle must be 3–30 letters, numbers or underscores.')
    if (!name) return setErr('Add a display name.')
    setBusy(true); setErr('')
    const { error } = await sb.from('profiles').update({ display_name: name, username, bio: f.bio.trim() || null, location: f.location.trim() || null, link: f.link.trim() || null }).eq('id', me.id)
    setBusy(false)
    if (error) return setErr(error.code === '23505' ? 'That handle is already taken.' : error.message)
    saved(); close()
  }
  const hasAv = !!cur.avatar_url, hasCv = !!cur.cover_url
  return <div className="sheet solid"><div className="bar"><button onClick={close} aria-label="Close">✕</button><span style={{ flex: 1 }}>Edit Profile</span><button className="wb p sm" disabled={busy} onClick={save}>Save</button></div>
    <div className="sbody ed">
      <div className="edcov" style={{ backgroundImage: hasCv ? `url(${pub('covers', cur.cover_url)})` : undefined }}>{!hasCv && <small>No cover yet</small>}</div>
      <div className="edbtn"><label className="wb sm">{hasCv ? 'Change cover' : 'Add cover'}<input type="file" accept="image/*" hidden onChange={choose('wide')} /></label>
        {hasCv && <><button className="wb sm" onClick={() => adjust('wide')}>Adjust</button><button className="wb sm" onClick={() => remove('wide')}>Remove</button></>}</div>
      <div className="edav"><Avatar p={cur} size={96} /><div className="edbtn"><label className="wb sm">{hasAv ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" hidden onChange={choose('circle')} /></label>
        {hasAv && <><button className="wb sm" onClick={() => adjust('circle')}>Adjust</button><button className="wb sm" onClick={() => remove('circle')}>Remove</button></>}</div></div>
      <label>Display name<input value={f.display_name} onChange={set('display_name')} maxLength={60} /></label>
      <label>Handle<div className="hnd"><span>@</span><input value={f.username} onChange={set('username')} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck="false" /></div><small>Letters, numbers and underscores. People find you by this.</small></label>
      <label>Bio<textarea value={f.bio} onChange={set('bio')} maxLength={300} rows={3} placeholder="Tell people about you" /></label>
      <label>Location<input value={f.location} onChange={set('location')} maxLength={60} placeholder="City, State" /></label>
      <label>Link<input value={f.link} onChange={set('link')} maxLength={120} placeholder="yoursite.com" autoCapitalize="none" /></label>
      {err && <p className="msg" role="alert">{err}</p>}
      <button className="wb p" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
      <button className="wb" onClick={() => sb.auth.signOut()}>Sign out</button></div>
    {crop && <Cropper src={crop.src} shape={crop.shape} onCancel={() => setCrop(null)} onSave={saveImg} />}</div>
}
