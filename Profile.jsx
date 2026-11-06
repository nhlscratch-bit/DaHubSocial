import { useEffect, useState } from 'react'
import { sb, SEL, upload } from '../supabase'
import PostCard from './PostCard'
import Avatar from './Avatar'
export default function Profile({ id, me, back, openPost, openProfile }) {
  const [pr, setPr] = useState(null), [posts, setPosts] = useState([]), [rel, setRel] = useState(null), [n, setN] = useState({ f: 0, g: 0 }), [edit, setEdit] = useState(false), [form, setForm] = useState({}), [err, setErr] = useState('')
  const own = id === me.id
  const load = async () => {
    const { data } = await sb.from('profiles').select('*').eq('id', id).single(); setPr(data); setForm({ display_name: data?.display_name, bio: data?.bio || '' })
    const { data: ps } = await sb.from('posts').select(SEL).eq('author_id', id).order('created_at', { ascending: false }); setPosts(ps || [])
    const c = col => sb.from('follows').select('*', { count: 'exact', head: true }).eq(col, id).eq('status', 'accepted')
    const [a, b] = await Promise.all([c('followee_id'), c('follower_id')]); setN({ f: a.count || 0, g: b.count || 0 })
    if (!own) { const { data: r } = await sb.from('follows').select('status').eq('follower_id', me.id).eq('followee_id', id).maybeSingle(); setRel(r?.status || null) }
  }
  useEffect(() => { load() }, [id])
  async function follow() { rel ? await sb.from('follows').delete().eq('follower_id', me.id).eq('followee_id', id) : await sb.from('follows').insert({ follower_id: me.id, followee_id: id }); load() }
  async function save() {
    const { error } = await sb.from('profiles').update({ display_name: form.display_name, bio: form.bio }).eq('id', id)
    if (error) setErr(error.message); else { setEdit(false); load() }
  }
  async function pic(e) { const f = e.target.files[0]; if (!f) return; try { const path = await upload('avatars', me.id, f); await sb.from('profiles').update({ avatar_url: path }).eq('id', id); load() } catch (x) { setErr(x.message) } }
  if (!pr) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Profile</div></div>
  return <div className="sheet"><div className="bar"><button onClick={back} aria-label="Back">←</button>@{pr.username}</div>
    <div className="sbody"><div className="cover" /><div className="pinfo">
      <Avatar p={pr} size={92} />
      <h2>{pr.display_name}{pr.is_verified && <span className="ver">✔</span>}</h2><small>@{pr.username}</small>
      {pr.bio && <p>{pr.bio}</p>}
      <p className="counts"><b>{posts.length}</b> posts · <b>{n.f}</b> followers · <b>{n.g}</b> following</p>
      {own ? <div className="prow"><button className="wb" onClick={() => setEdit(!edit)}>Edit Profile</button><button className="wb" onClick={() => sb.auth.signOut()}>Sign out</button></div>
        : <div className="prow"><button className="wb p" onClick={follow}>{rel === 'accepted' ? 'Following' : rel === 'pending' ? 'Requested' : 'Follow'}</button><button className="wb" onClick={() => alert('Messaging is a later milestone.')}>Message</button></div>}
      {edit && <div className="editf"><input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} maxLength={60} aria-label="Display name" /><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} maxLength={300} placeholder="Bio" /><label className="link">Change avatar<input type="file" accept="image/*" hidden onChange={pic} /></label><button className="wb p" onClick={save}>Save</button></div>}
      {err && <p className="msg">{err}</p>}</div>
      {posts.map(p => <PostCard key={p.id} post={p} me={me} openPost={openPost} openProfile={openProfile} />)}
      {!posts.length && <div className="empty">No posts to show.</div>}</div></div>
}
