import { useEffect, useState } from 'react'
import { sb } from './supabase'
import Boot from './components/Boot'
import Auth from './components/Auth'
import Feed from './components/Feed'
import PostView from './components/PostView'
import Profile from './components/Profile'
import Avatar from './components/Avatar'
const NAV = [['home', '🏠', 'Home'], ['discover', '🧭', 'Discover'], ['create', '', ''], ['shorts', '▶️', 'Shorts'], ['more', '⋯', 'More']]
export default function App() {
  const [booted, setBooted] = useState(false), [session, setSession] = useState(undefined), [profile, setProfile] = useState(null)
  const [stack, setStack] = useState([]), [tab, setTab] = useState('home'), [fk, setFk] = useState(0)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setStack([]); setTab('home') } })
    return () => data.subscription.unsubscribe()
  }, [])
  const uid = session?.user?.id
  useEffect(() => { if (uid) sb.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data)) }, [uid])
  if (!booted) return <Boot onDone={() => setBooted(true)} />
  if (session === undefined) return null
  if (!session) return <Auth />
  const me = session.user, push = v => setStack(s => [...s, v]), back = () => setStack(s => s.slice(0, -1)), top = stack[stack.length - 1]
  const openPost = (id, focus) => push({ t: 'post', id, focus }), openProfile = id => push({ t: 'profile', id })
  const go = k => { setStack([]); if (k === 'create') { setTab('home'); setFk(x => x + 1) } else setTab(k) }
  return <div className="app">
    <header className="hdr"><img className="wm" src="/wordmark.png" alt="DAHUB" /><Avatar p={profile} size={44} onClick={() => openProfile(me.id)} /></header>
    <main hidden={tab !== 'home' || !!top}><Feed me={me} profile={profile} openPost={openPost} openProfile={openProfile} focusKey={fk} /></main>
    {tab !== 'home' && !top && <div className="stub"><h2>{tab === 'more' ? 'More' : tab[0].toUpperCase() + tab.slice(1)}</h2>
      {tab === 'more' ? <>{['Media', 'Arcade', 'Pets', 'Mind'].map(m => <button key={m} className="wb" onClick={() => alert(m + ' is a later milestone.')}>{m}</button>)}<button className="wb p" onClick={() => openProfile(me.id)}>My profile</button><button className="wb" onClick={() => sb.auth.signOut()}>Sign out</button></>
        : <p>Not built yet. Placeholder for a later milestone.</p>}</div>}
    {top?.t === 'post' && <PostView key={top.id} id={top.id} focus={top.focus} me={me} back={back} openProfile={openProfile} />}
    {top?.t === 'profile' && <Profile key={top.id} id={top.id} me={me} back={back} openPost={openPost} openProfile={openProfile} />}
    <nav>{NAV.map(([k, i, l]) => k === 'create' ? <button key={k} className="fabn" onClick={() => go(k)} aria-label="Create">+</button>
      : <button key={k} className="n" aria-current={tab === k && !top ? 'page' : undefined} onClick={() => go(k)}><i>{i}</i>{l}</button>)}</nav>
  </div>
}
