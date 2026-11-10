import wm from './wordmark.png'
import { useEffect, useRef, useState } from 'react'
import { sb, startDM, BUILD } from './supabase'
import Boot from './Boot'
import Auth from './Auth'
import Feed from './Feed'
import PostView from './PostView'
import Profile from './Profile'
import Avatar from './Avatar'
import Inbox from './Inbox'
import Chat from './Chat'
import Discover from './Discover'
import PulseChamber from './PulseChamber'
import Radar from './Radar'
import Rooms, { NewRoom } from './Rooms'
import AfterDark from './AfterDark'
import Arcade, { GamePlayer } from './Arcade'
import { RoomGate, MiniPlayer } from './RoomView'
import { warmIce } from './ice'
import Notifications from './Notifications'
import Opportunities from './Opportunities'
import OpportunityDetail from './OpportunityDetail'
import NewOpportunity from './NewOpportunity'
import I from './Icons'
import Admin from './Admin'
import MediaPage from './MediaPage'
import Submit from './Submit'
import Safety from './Safety'
import Settings from './Settings'
import More from './More'
import Topic from './Topic'
import Shorts from './Shorts'
import Locked from './Locked'
import { FEATURES } from './features'
import Passport from './Passport'
import Communities, { NewCommunity } from './Communities'
import CommunityView from './CommunityView'
import { registerSW } from './push'
import Events, { NewEvent } from './Events'
import EventView from './EventView'
import ArtistPage from './ArtistPage'
import { Player } from './MediaPage'
import CallManager from './Call'
import Saved from './Saved'
import Guidelines from './Guidelines'
const NAV = [['home', 'home', 'Home'], ['discover', 'compass', 'Discover'], ['create', '', ''], ['shorts', 'play', 'Shorts'], ['more', 'grid', 'More']]
export default function App() {
  const [booted, setBooted] = useState(false), [session, setSession] = useState(undefined), [profile, setProfile] = useState(null)
  const [stack, setStack] = useState([]), [tab, setTab] = useState('home'), [fk, setFk] = useState(0), [online, setOnline] = useState(new Set()), [badge, setBadge] = useState(0), [nb, setNb] = useState(0)
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
  useEffect(() => {
    if (!uid) return
    const refresh = async () => { const { count } = await sb.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).is('read_at', null); setNb(count || 0) }
    refresh(); const ch = sb.channel('notif-' + uid).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, refresh).subscribe()
    window.addEventListener('notif-read', refresh); return () => { sb.removeChannel(ch); window.removeEventListener('notif-read', refresh) }
  }, [uid])
  useEffect(() => { document.body.classList.toggle('inshorts', tab === 'shorts' && !stack.length); return () => document.body.classList.remove('inshorts') }, [tab, stack.length])
  const [playV, setPlayV] = useState(null)
  useEffect(() => { if (uid) registerSW() }, [uid])
  const [isAdmin, setIsAdmin] = useState(false), sy = useRef(0), prevLen = useRef(0)
  useEffect(() => { if (stack.length === 0 && prevLen.current > 0) requestAnimationFrame(() => window.scrollTo(0, sy.current)); prevLen.current = stack.length }, [stack.length])
  useEffect(() => { const f = e => setStack(s => [...s, { t: 'tag', tag: e.detail }]); window.addEventListener('open-tag', f); return () => window.removeEventListener('open-tag', f) }, [])
  useEffect(() => { if (uid) sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle().then(({ data }) => setIsAdmin(!!data)) }, [uid])
  useEffect(() => { const f = () => setStack(s => s[s.length - 1]?.t === 'submit' ? s : [...s, { t: 'submit' }]); window.addEventListener('open-submit', f); return () => window.removeEventListener('open-submit', f) }, [])
  useEffect(() => { if (uid) warmIce() }, [uid])
  useEffect(() => {
    if (!uid) return
    const q = new URLSearchParams(location.search), post = q.get('post'), prof = q.get('profile'), art = q.get('artist'), evn = q.get('event'), cht = q.get('chat'), cmn = q.get('community'), psp = q.get('passport'), rom = q.get('room'), spd = q.get('spades')
    if (spd) { setStack([{ t: 'arcade' }, { t: 'game', id: 'spades', code: spd.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) }]); history.replaceState(null, '', '/'); return }
    if (post || prof || art || evn || cht || cmn || psp || rom) { setStack([rom ? { t: 'room', id: rom } : psp ? { t: 'passport', id: psp } : cmn ? { t: 'community', id: cmn } : cht ? { t: 'chat', id: cht } : post ? { t: 'post', id: post } : evn ? { t: 'event', id: evn } : art ? { t: 'artist', id: art } : { t: 'profile', id: prof }]); history.replaceState(null, '', '/') }
  }, [uid])
  if (!booted) return <Boot onDone={() => setBooted(true)} />
  if (session === undefined) return null
  if (!session) return <Auth />
  if (profile && (profile.account_status === 'banned' || (profile.account_status === 'suspended' && (!profile.suspended_until || new Date(profile.suspended_until) > new Date())))) return <Locked profile={profile} />
  const me = session.user, push = v => { if (!stack.length) sy.current = window.scrollY; setStack(s => [...s, v]) }, back = () => setStack(s => s.slice(0, -1)), top = stack[stack.length - 1]
  const refreshProfile = () => sb.from('profiles').select('*').eq('id', uid).single().then(({ data }) => setProfile(data))
  const openDest = d => d && push({ t: d.t, id: d.id })
  const openOpp = id => push({ t: 'opp', id }), openOpps = () => push({ t: 'opps' }), newOpp = () => push({ t: 'newopp' }), oppCreated = id => setStack(s => [...s.slice(0, -1), { t: 'opp', id }])
  const openPost = (id, focus) => push({ t: 'post', id, focus }), openProfile = id => push({ t: 'profile', id }), openChat = id => push({ t: 'chat', id })
  const openDM = async other => { try { const cid = await startDM(me.id, other); setStack(s => s[s.length - 1]?.t === 'chat' ? s : [...s.filter(x => x.t !== 'newdm'), { t: 'chat', id: cid }]) } catch (e) { alert('Could not open the conversation: ' + e.message) } }
  const go = k => { sy.current = 0; setStack([]); if (k === 'create') { setTab('home'); setFk(x => x + 1) } else setTab(k) }
  return <div className="app">
    <header className="hdr"><img className="wm" src={wm} alt="DAHUB" />
      <div className="hbar"><button className="ib" onClick={() => go('discover')} aria-label="Search"><I n="search" s={22} /></button>
        <button className="ib" onClick={() => push({ t: 'notifs' })} aria-label="Notifications"><I n="bell" s={22} />{nb > 0 && <span className="badge">{nb > 99 ? '99+' : nb}</span>}</button>
        <button className="ib" onClick={() => push({ t: 'inbox' })} aria-label="Messages"><I n="chat" s={22} />{badge > 0 && <span className="badge">{badge}</span>}</button>
        <span className="ringav"><Avatar p={profile} size={46} online={online.has(me.id)} onClick={() => openProfile(me.id)} /></span></div></header>
    <main hidden={tab !== 'home' || !!top}><Feed me={me} profile={profile} openPost={openPost} openProfile={openProfile} focusKey={fk} goDiscover={() => setTab('discover')} active={tab === 'home' && !top} /></main>
    {tab === 'discover' && <div hidden={!!top}><Discover me={me} openProfile={openProfile} openOpps={openOpps} /></div>}
    {tab === 'more' && !top && <More go={k => push(k === 'passport' ? { t: 'passport', id: me.id } : { t: k })} openProfile={openProfile} me={me} isAdmin={isAdmin} />}
    {tab === 'shorts' && <div hidden={!!top}><Shorts me={me} active={tab === 'shorts' && !top} openPost={openPost} openProfile={openProfile} goCreate={() => go('create')} /></div>}
    {tab !== 'home' && tab !== 'discover' && tab !== 'more' && tab !== 'shorts' && !top && <div className="stub"><h2>{tab === 'more' ? 'More' : tab[0].toUpperCase() + tab.slice(1)}</h2>
      {tab === 'more' ? <><button className="wb p" onClick={() => push({ t: 'settings' })}>Settings and Activity</button><button className="wb p" onClick={openOpps}>Opportunity Board</button><button className="wb p" onClick={() => push({ t: 'media' })}>Media</button><button className="wb" onClick={() => push({ t: 'submit' })}>Get featured</button><button className="wb p" onClick={() => openProfile(me.id)}>My profile</button><button className="wb" onClick={() => push({ t: 'safety' })}>Blocked & muted</button>{isAdmin && <button className="wb p" onClick={() => push({ t: 'admin' })}>Admin</button>}<button className="wb" onClick={() => sb.auth.signOut()}>Sign out</button><small className="bld inl">DAHUB {BUILD}</small></>
        : <p>Not built yet. Placeholder for a later milestone.</p>}</div>}
    {top?.t === 'post' && <PostView key={top.id} id={top.id} focus={top.focus} me={me} profile={profile} back={back} openProfile={openProfile} />}
    {top?.t === 'profile' && <Profile openPassport={pid => push({ t: 'passport', id: pid })} key={top.id} id={top.id} me={me} back={back} openSettings={() => push({ t: 'settings' })} openPost={openPost} openDM={openDM} openProfile={openProfile} onUpdated={refreshProfile} />}
    {top?.t === 'inbox' && <Inbox me={me} online={online} back={back} openChat={openChat} openDM={openDM} />}
    {top?.t === 'notifs' && <Notifications me={me} back={back} openPost={openPost} openProfile={openProfile} openOpp={openOpp} openRoom={id => push({ t: 'room', id })} />}
    {top?.t === 'opps' && <Opportunities me={me} back={back} openOpp={openOpp} newOpp={newOpp} />}
    {top?.t === 'opp' && <OpportunityDetail key={top.id} id={top.id} me={me} back={back} openProfile={openProfile} openDM={openDM} />}
    {top?.t === 'newopp' && <NewOpportunity me={me} back={back} created={oppCreated} />}
    {top?.t === 'tag' && <Topic key={top.tag} tag={top.tag} me={me} back={back} openPost={openPost} openProfile={openProfile} />}
    {top?.t === 'media' && <MediaPage me={me} back={back} openProfile={openProfile} openSubmit={() => push({ t: 'submit' })} openArtist={id => push({ t: 'artist', id })} />}
    {top?.t === 'events' && <Events me={me} back={back} open={id => push({ t: 'event', id })} create={() => push({ t: 'newevent' })} />}
    {top?.t === 'newevent' && <NewEvent me={me} back={back} created={id => setStack(s => [...s.slice(0, -1), { t: 'event', id }])} />}
    {top?.t === 'event' && <EventView key={top.id} id={top.id} me={me} back={back} openProfile={openProfile} deleted={back} />}
    {top?.t === 'pulse' && <PulseChamber back={back} openRadar={() => push({ t: 'radar' })} open={openDest} />}
    {top?.t === 'radar' && <Radar back={back} open={openDest} />}
    {top?.t === 'afterdark' && <AfterDark me={me} profile={profile} back={back} openPost={openPost} openProfile={openProfile} openRoom={id => push({ t: 'room', id })} openEvent={id => push({ t: 'event', id })} />}
    {top?.t === 'arcade' && <Arcade back={back} play={id => push({ t: 'game', id })} />}
    {top?.t === 'game' && <GamePlayer key={top.id} id={top.id} code={top.code} back={back} />}
    {top?.t === 'rooms' && <Rooms me={me} profile={profile} back={back} create={() => push({ t: 'newroom' })} open={id => push({ t: 'room', id })} />}
    {top?.t === 'newroom' && <NewRoom me={me} profile={profile} back={back} created={id => id ? setStack(s => [...s.slice(0, -1), { t: 'room', id }]) : back()} />}
    {top?.t === 'room' && <RoomGate key={top.id} id={top.id} me={me} profile={profile} back={back} openProfile={openProfile} />}
    {top?.t === 'communities' && <Communities me={me} back={back} open={id => push({ t: 'community', id })} create={() => push({ t: 'newcommunity' })} />}
    {top?.t === 'newcommunity' && <NewCommunity me={me} back={back} created={id => setStack(s => [...s.slice(0, -1), { t: 'community', id }])} />}
    {top?.t === 'community' && <CommunityView key={top.id} id={top.id} me={me} back={back} openPost={openPost} openProfile={openProfile} gone={back} />}
    {top?.t === 'passport' && !FEATURES.passport && <div className="sheet"><div className="bar"><button onClick={back}>←</button>Clout Passport</div><div className="sbody"><div className="empty"><h3>Back soon</h3>Clout Passport is being updated. Check back later.</div></div></div>}
    {top?.t === 'passport' && FEATURES.passport && <Passport key={top.id} id={top.id} me={me} back={back} openPassport={pid => push({ t: 'passport', id: pid })} openDM={openDM} openProfile={openProfile} />}
    {top?.t === 'artist' && <ArtistPage key={top.id} id={top.id} me={me} back={back} openProfile={openProfile} play={v => setPlayV(v)} />}
    {playV && <Player v={playV} close={() => setPlayV(null)} openArtist={id => { setPlayV(null); push({ t: 'artist', id }) }} />}
    {top?.t === 'submit' && <Submit me={me} back={back} />}
    {top?.t === 'settings' && <Settings me={me} profile={profile} isAdmin={isAdmin} back={back} go={k => push({ t: k })} onUpdated={refreshProfile} />}
    {top?.t === 'saved' && <Saved me={me} back={back} openPost={openPost} openProfile={openProfile} />}
    {top?.t === 'guidelines' && <Guidelines back={back} />}
    {top?.t === 'safety' && <Safety me={me} back={back} />}
    {top?.t === 'admin' && isAdmin && <Admin me={me} back={back} openPost={openPost} openProfile={openProfile} openOpp={openOpp} />}
    {top?.t === 'chat' && <Chat key={top.id} id={top.id} me={me} online={online} back={back} openProfile={openProfile} />}
    {top?.t !== 'room' && <MiniPlayer open={id => push({ t: 'room', id })} />}
    <CallManager me={me} />
    <nav className={top?.t === 'profile' || top?.t === 'passport' ? 'over' : undefined}>{NAV.map(([k, i, l]) => k === 'create' ? <button key={k} className="fabn" onClick={() => go(k)} aria-label="Create"><I n="plus" s={34} /></button>
      : <button key={k} className="n" aria-current={tab === k && !top ? 'page' : undefined} onClick={() => go(k)}><I n={i} s={26} />{l}</button>)}</nav>
  </div>
}
