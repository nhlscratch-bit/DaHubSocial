const RULES = [
  ['Be real', 'No fake accounts, fake followers or invented numbers. Nobody can buy popularity on DAHUB.'],
  ['Be clear about money', 'If something is paid, sponsored or an ad, it says so. Pay on opportunities is always shown, and never hidden in the details.'],
  ['Respect people', 'No harassment, threats, hate or discrimination. You can block, mute or report anyone at any time.'],
  ['No scams', 'No fraud, misleading offers or impersonation. Reports about scams get looked at first.'],
  ['Keep it Baltimore-proud', 'Share your work, your business and your ideas. Featured spots are free, reviewed by a person and rotate.'],
  ['Your content, your control', 'You can delete your posts and stories, make your account private, and decide who follows you.']]
export default function Guidelines({ back }) {
  return <div className="sheet"><div className="bar"><button onClick={back}>←</button>Community guidelines</div><div className="sbody">
    {RULES.map(([t, d]) => <div key={t} className="gl arow"><h4>{t}</h4><p>{d}</p></div>)}</div></div>
}
