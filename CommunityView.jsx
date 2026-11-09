import { useEffect, useState } from 'react'
import { sb, SEL, hiddenIds, friendly, upload } from './supabase'
import { CCAT, subUrl } from './media'
import PostCard from './PostCard'
import Avatar from './Avatar'
import ReportSheet from './ReportSheet'
export default function CommunityView({ id, me, back, openPost, openProfile, gone }) {
  const [c, setC] = useState(null), [role, setRole] = useState(null), [n, setN] = useState(0), [posts, setPosts] = useState(null), [err, setErr] = useState(''), [text, setText] = useState(''), [file, setFile] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [mem, setMem] = useState(null), [menu, setMenu] = useState(false), [rep, setRep] = useState(false)
  const load = async () => {
    const { data, error } = await sb.from('communities').select('*,owner:profiles!communities_owner_id_fkey(id,username,display_name,avatar_url)').eq('id', id).maybeSingle(); if (error || !data) return setErr('This community is not available.'); setC(data)
    const [m, k] = await Promise.all([sb.from('community_members').select('role').eq('community_id', id).eq('user_id', me.id).maybeSingle(), sb.from('community_members').select('user_id', { count: 'exact', head: true }).eq('community_id', id)])
    setRole(m.data?.role || null); setN(k.count || 0)
    const { data: ps } = await sb.from('posts').select(SEL).eq('community_id', id).order('created_at', { ascending: false }).limit(50); const hid = await hiddenIds(); setPosts((ps || []).filter(p => !hid.has(p.author.id)))
  }
  useEffect(() => { load() }, [id])
  const isMod = role === 'owner' || role === 'mod'
  async function join() { setMsg(''); const { error } = await sb.from('community_members').insert({ community_id: id, user_id: me.id }); error ? setMsg(friendly(error)) : load() }
  async function leave() { if (!confirm('Leave this community?')) return; const { error } = await sb.from('community_members').delete().eq('community_id', id).eq('user_id', me.id); error ? setMsg(error.message) : load() }
  async function post() {
    if (!text.trim() && !file) return; setBusy(true); setMsg('')
    try {
      const { data: p, error } = await sb.from('posts').insert({ author_id: me.id, body: text.trim(), kind: file ? 'photo' : 'text', audience: 'public', community_id: id }).select('id').single(); if (error) throw error
      if (file) { const path = await upload('post-media', me.id, file); await sb.from('post_media').insert({ post_id: p.id, storage_path: path, media_type: 'image', position: 0 }) }
      setText(''); setFile(null); load()
    } catch (e) { setMsg(friendly(e)) } setBusy(false)
  }
  async function rmPost(p) { if (!confirm('Remove this post from the community?')) return; const { error } = await sb.from('posts').delete().eq('id', p.id); error ? setMsg(error.message) : load() }
  async function members() { const { data } = await sb.from('community_members').select('role,joined_at,profile:profiles(id,username,display_name,avatar_url)').eq('community_id', id).order('joined_at').limit(200); setMem(data || []) }
  async function kick(m) { if (!confirm(`Remove ${m.profile.display_name} from the community?`)) return; const { error } = await sb.from('community_members').delete().eq('community_id', id).eq('user_id', m.profile.id); error ? setMsg(error.message) : (members(), load()) }
  async function del() { if (!confirm('Delete this community and all its posts?')) return; const { error } = await sb.from('communities').delete().eq('id', id); error ? setMsg(error.message) : gone() }
  const share = async () => { const u = location.origin + '/?community=' + id; try { navigator.share ? await navigator.share({ title: c.name, url: u }) : (await navigator.clipboard.writeText(u), alert('Link copied')) } catch {} }
  if (err) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Community</div><div className="sbody"><div className="empty">{err}</div></div></div>
  if (!c) return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Community</div><div className="sbody"><div className="skel"><i /><i /></div></div></div>
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>{c.name}<button className="ib" style={{ marginLeft: 'auto' }} onClick={() => setMenu(true)} aria-label="More">⋯</button></div><div className="sbody" style={{ paddingBottom: 120 }}>
    <div className="cvh">{c.cover_path && <div className="cvc" style={{ backgroundImage: `url(${subUrl(c.cover_path)})` }} />}
      <h2>{c.name}</h2><span className="gtag">{CCAT[c.category]}</span>{c.description && <p>{c.description}</p>}
      <div className="evact" style={{ padding: 0 }}><button className="wb sm" onClick={members}>{n} member{n !== 1 && 's'}</button>{role ? (role !== 'owner' && <button className="wb sm" onClick={leave}>Leave</button>) : <button className="wb p sm" onClick={join}>Join</button>}{role && <span className="gtag grn">{role === 'owner' ? 'You run this' : role === 'mod' ? 'Moderator' : 'Member'}</span>}</div></div>
    {msg && <p className="msg" role="alert">{msg}</p>}
    {role ? <div className="gl arow"><textarea className="anote" rows={2} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder={`Post to ${c.name}`} />
      <div className="aact"><input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} /><button className="wb p sm" disabled={busy || (!text.trim() && !file)} onClick={post}>{busy ? 'Posting…' : 'Post'}</button></div></div>
      : <p className="hint" style={{ margin: '10px 14px' }}>Join to post and take part. Anyone can read.</p>}
    {posts === null && <div className="skel"><i /><i /></div>}
    {posts?.length === 0 && <div className="empty">No posts yet. Start the conversation.</div>}
    {posts?.map(p => <div key={p.id}><PostCard post={p} me={me} openPost={openPost} openProfile={openProfile} />{isMod && p.author.id !== me.id && <button className="link" style={{ margin: '0 20px 8px' }} onClick={() => rmPost(p)}>Remove this post (moderator)</button>}</div>)}
    {mem && <div className="scrim" onClick={() => setMem(null)}><div className="msheet" style={{ maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}><h3 style={{ margin: 0 }}>Members</h3>
      {mem.map(m => <div key={m.profile.id} className="aact"><Avatar p={m.profile} size={40} onClick={() => { setMem(null); openProfile(m.profile.id) }} /><span style={{ flex: 1 }}><b>{m.profile.display_name}</b><br /><small>@{m.profile.username}{m.role !== 'member' && ` · ${m.role}`}</small></span>{isMod && m.role === 'member' && <button className="wb sm" onClick={() => kick(m)}>Remove</button>}</div>)}
      <button className="wb" onClick={() => setMem(null)}>Close</button></div></div>}
    {menu && <div className="scrim" onClick={() => setMenu(false)}><div className="msheet" onClick={e => e.stopPropagation()}><button className="wb" onClick={() => { setMenu(false); share() }}>Share</button>
      {role === 'owner' ? <button className="wb" onClick={() => { setMenu(false); del() }}>Delete community</button> : <button className="wb" onClick={() => { setMenu(false); setRep(true) }}>Report</button>}<button className="wb" onClick={() => setMenu(false)}>Cancel</button></div></div>}
    {rep && <ReportSheet me={me} type="community" targetId={c.id} reportedUser={c.owner_id} close={() => setRep(false)} />}
  </div></div>
}
