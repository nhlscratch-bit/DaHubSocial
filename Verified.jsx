import I from './Icons'
import crown from './mi-crown.png'
import badge from './verified.png'
// Verified badge (crowned check). `big` is the corner badge on a profile photo.
export default function Verified({ big }) {
  return <img src={badge} className={big ? 'vb' : 'ver'} alt="Verified" title="Verified" />
}

// Account-type badge (profile header): chrome glass pill with a colored icon coin.
const AT = { official: ['DAHUB Official', null], business: ['Verified Business', 'briefcase'], media: ['Verified Media', 'play'], creator: ['Creator / Artist', 'music'] }
export function AcctBadge({ type }) {
  const t = AT[type]; if (!t) return null
  return <span className={'acctb ' + type}><i>{t[1] ? <I n={t[1]} s={13} /> : <img src={crown} alt="" />}</i>{t[0]}</span>
}
