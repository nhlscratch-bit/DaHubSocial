import wm from './wordmark.png'
import { useEffect, useState } from 'react'
import { sb, startDM } from './supabase'
import Boot from './Boot'
import Auth from './Auth'
import Feed from './Feed'
import PostView from './PostView'
import Profile from './Profile'
import Avatar from './Avatar'
import Inbox from './Inbox'
import Chat from './Chat'
import Discover from './Discover'
import I from './Icons'
const NAV = [['home', 'home', 'Home'], ['discover', 'compass', 'Discover'], ['create', '', ''], ['shorts', 'play', 'Shorts'], ['more', 'grid', 'More']]
export default function App() {
  const [booted, setBooted] = useState(false), [session, setSession] = useState(undefined), [profile, setProfile] = useState(null)
  const [stack, setStack] = useState([]), [tab, setTab] = useState('home'), [fk, setFk] = useState(0), [online, setOnline] = useState(new Set()), [badge, setBadge] = useState(0)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setStack([]); setTab('home') } })
    return () => data.subscription.unsubscribe()
  }, [])
  const uid = session?.user?.id
  useEffect(() => { if (uid) sb.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data)) }, [uid])
  useEffect(() => {
    if (!uid) return
    const ch = sb.channel('online', { config: { presence: { key: uid } } })
    ch.on('presence', { event: 'sync' }, () => setOnline(new Set(Object.keys(ch.presenceState())))).subscribe(s => { if (s === 'SUBSCRIBED') ch.track({ t: Date.now() }) })
    return () => { sb.removeChannel(ch) }
  }, [uid])
  useEffect(() => {
    if (!uid) return
    const refresh = async () => {
      const { data } = await sb.from('conversation_members').select('last_read_at,status,conversation:conversations(last_message_at,last_sender_id)').eq('user_id', uid)
      setBadge((data || []).filter(m => m.status === 'request' || (m.conversation && m.conversation.last_sender_id && m.conversation.last_sender_id !== uid && new Date(m.conversation.last_message_at) > new Date(m.last_read_at))).length)
    }
    refresh(); const ch = sb.channel('unread-' + uid).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refresh).subscribe()
    window.addEventListener('dm-read', refresh); return () => { sb.removeChannel(ch); window.removeEventListener('dm-read', refresh) }
  }, [uid])
  if (!booted) return <Boot onDone={() => setBooted(true)} />
  if (session === undefined) return null
  if (!session) return <Auth />
  const me = session.user, push = v => setStack(s => [...s, v]), back = () => setStack(s => s.slice(0, -1)), top = stack[stack.length - 1]
  const refreshProfile = () => sb.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data))
  const openPost = (id, focus) => push({ t: 'post', id, focus }), openProfile = id => push({ t: 'profile', id }), openChat = id => push({ t: 'chat', id })
  const openDM = async other => { try { const cid = await startDM(me.id, other); setStack(s => s[s.length - 1]?.t === 'chat' ? s : [...s.filter(x => x.t !== 'newdm'), { t: 'chat', id: cid }]) } catch (e) { alert('Could not open the conversation: ' + e.message) } }
  const go = k => { setStack([]); if (k === 'create') { setTab('home'); setFk(x => x + 1) } else setTab(k) }
  return <div className="app">
    <header className="hdr"><img className="wm" src={wm} alt="DAHUB" />
      <div className="hbar"><button className="ib" onClick={() => alert('Search is a later milestone.')} aria-label="Search"><I n="search" s={22} /></button>
        <button className="ib" onClick={() => alert('Notifications are a later milestone.')} aria-label="Notifications"><I n="bell" s={22} /></button>
        <button className="ib" onClick={() => push({ t: 'inbox' })} aria-label="Messages"><I n="chat" s={22} />{badge > 0 && <span className="badge">{badge}</span>}</button>
        <Avatar p={profile} size={48} online={online.has(me.id)} onClick={() => openProfile(me.id)} /></div></header>
    <main hidden={tab !== 'home' || !!top}><Feed me={me} profile={profile} openPost={openPost} openProfile={openProfile} focusKey={fk} goDiscover={() => setTab('discover')} active={tab === 'home' && !top} /></main>
    {tab === 'discover' && !top && <Discover me={me} openProfile={openProfile} />}
    {tab !== 'home' && tab !== 'discover' && !top && <div className="stub"><h2>{tab === 'more' ? 'More' : tab[0].toUpperCase() + tab.slice(1)}</h2>
      {tab === 'more' ? <>{['Media', 'Arcade', 'Pets', 'Mind'].map(m => <button key={m} className="wb" onClick={() => alert(m + ' is a later milestone.')}>{m}</button>)}<button className="wb p" onClick={() => openProfile(me.id)}>My profile</button><button className="wb" onClick={() => sb.auth.signOut()}>Sign out</button></>
        : <p>Not built yet. Placeholder for a later milestone.</p>}</div>}
    {top?.t === 'post' && <PostView key={top.id} id={top.id} focus={top.focus} me={me} profile={profile} back={back} openProfile={openProfile} />}
    {top?.t === 'profile' && <Profile key={top.id} id={top.id} me={me} back={back} openPost={openPost} openDM={openDM} onUpdated={refreshProfile} />}
    {top?.t === 'inbox' && <Inbox me={me} online={online} back={back} openChat={openChat} openDM={openDM} />}
    {top?.t === 'chat' && <Chat key={top.id} id={top.id} me={me} online={online} back={back} openProfile={openProfile} />}
    <nav className={top?.t === 'profile' ? 'over' : undefined}>{NAV.map(([k, i, l]) => k === 'create' ? <button key={k} className="fabn" onClick={() => go(k)} aria-label="Create"><I n="plus" s={34} /></button>
      : <button key={k} className="n" aria-current={tab === k && !top ? 'page' : undefined} onClick={() => go(k)}><I n={i} s={26} />{l}</button>)}</nav>
  </div>
}
