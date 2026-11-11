import wm from './wordmark.png'
import { useState } from 'react'
import { sb } from './supabase'
import { checkPassword } from './pwcheck'
export default function Auth() {
  const [mode, setMode] = useState('in'), [f, setF] = useState({ email: '', password: '', username: '' }), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function go(e) {
    e.preventDefault(); setBusy(true); setMsg('')
    if (mode === 'up') { const bad = await checkPassword(f.password, { email: f.email, username: f.username }); if (bad) { setBusy(false); return setMsg(bad) } }
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email: f.email, password: f.password })
      : await sb.auth.signUp({ email: f.email, password: f.password, options: { data: { username: f.username.toLowerCase(), display_name: f.username } } })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Check your email to confirm your account, then sign in.')
  }
  return <div className="auth"><img src={wm} alt="DAHUB" />
    <form onSubmit={go}>
      {mode === 'up' && <input placeholder="Username (a-z, 0-9, _)" value={f.username} onChange={set('username')} pattern="[A-Za-z0-9_]{3,30}" required />}
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input type="password" placeholder="Password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} minLength={8} required />
      <button className="wb p" disabled={busy}>{busy ? (mode === 'in' ? 'Signing in…' : 'Checking…') : mode === 'in' ? 'Sign in' : 'Create account'}</button>
      {msg && <p className="msg" role="alert">{msg}</p>}
    </form>
    <button className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>{mode === 'in' ? 'New here? Create account' : 'Have an account? Sign in'}</button>
  </div>
}
