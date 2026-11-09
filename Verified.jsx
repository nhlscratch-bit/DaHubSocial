import badge from './verified.png'
// Verified badge (crowned check). `big` is the corner badge on a profile photo.
export default function Verified({ big }) {
  return <img src={badge} className={big ? 'vb' : 'ver'} alt="Verified" title="Verified" />
}
