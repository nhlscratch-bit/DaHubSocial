import { sb, BUILD } from './supabase'
import I from './Icons'
import gear from './mi-gear.png'
import trophy from './mi-trophy.png'
import play from './mi-play.png'
import star from './mi-star.png'
import person from './mi-person.png'
import shieldlock from './mi-shieldlock.png'
import shieldx from './mi-shieldx.png'
import door from './mi-door.png'
import crown from './mi-crown.png'
export default function More({ go, openProfile, me, isAdmin }) {
  const T = [
    [gear, 'Settings & Activity', () => go('settings')],
    [trophy, 'Opportunity Board', () => go('opps')],
    [play, 'Media', () => go('media')],
    [null, 'Events', () => go('events')],
    [star, 'Get Featured', () => go('submit')],
    [person, 'My Profile', () => openProfile(me.id)],
    [shieldlock, 'Blocked & Muted', () => go('safety')],
    ...(isAdmin ? [[shieldx, 'Admin', () => go('admin')]] : []),
    [door, 'Sign Out', () => confirm('Sign out of DAHUB?') && sb.auth.signOut()]]
  return <div className="more">
    <div className="mtiles">{T.map(([img, label, fn]) => <button key={label} className="mtile" onClick={fn}>{img ? <img src={img} alt="" /> : <span className="mti"><I n="cal" s={30} /></span>}<b>{label}</b><I n="chev" s={20} /></button>)}</div>
    <div className="mdiv"><i /><img src={crown} alt="" /><i /></div><small className="mbuild">DAHUB {BUILD}</small></div>
}
