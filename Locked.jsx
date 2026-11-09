import { sb } from './supabase'
import wm from './wordmark.png'
export default function Locked({ profile }) {
  const banned = profile.account_status === 'banned', until = profile.suspended_until && new Date(profile.suspended_until)
  return <div className="locked"><img src={wm} alt="DAHUB" />
    <h2>{banned ? 'This account has been banned' : 'Your account is suspended'}</h2>
    {!banned && until && <p>You can use DAHUB again on <b>{until.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</b>.</p>}
    {profile.status_reason && <p className="why">Reason: {profile.status_reason}</p>}
    <p>{banned ? 'If you think this is a mistake, contact the DAHUB team.' : 'Your posts stay hidden while you are suspended. Please review the community guidelines.'}</p>
    <button className="wb p" onClick={() => sb.auth.signOut()}>Log out</button></div>
}
