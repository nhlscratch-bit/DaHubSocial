import wm from './wordmark.png'
import { useState } from 'react'
import { sb } from './supabase'
import { checkPassword } from './pwcheck'
const authMsg = e => {
  const m = e?.message || String(e || '')
  if (/invalid login credentials/i.test(m)) return 'That email or password is wrong. Try again or tap “Forgot password?”.'
  if (/email not confirmed/i.test(m)) return 'Confirm your email first. Check your inbox (and spam) for the DAHUB link.'
  if (/already registered|already been registered|user already exists/i.test(m)) return 'That email already has an account. Sign in instead.'
  if (/rate limit|too many|for security purposes/i.test(m)) return 'Too many tries. Wait a minute and try again.'
  if (/valid email|invalid email|unable to validate email/i.test(m)) return 'That email doesn’t look right.'
  if (/password/i.test(m) && /weak|short|least/i.test(m)) return 'Pick a stronger password (8+ characters, mix letters and numbers).'
  if (/failed to fetch|network/i.test(m)) return 'No connection. Check your internet and try again.'
  return m
}
export default function Auth() {
  const [mode, setMode] = useState('in'), [f, setF] = useState({ email: '', password: '', username: '' }), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function go(e) {
    e.preventDefault(); setBusy(true); setMsg('')
    if (mode === 'reset') {
      const { error } = await sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: location.origin })
      setBusy(false); return setMsg(error ? authMsg(error) : 'If that email has a DAHUB account, a reset link is on its way. Check your inbox (and spam).')
    }
    if (mode === 'up') {
      const { data: free, error: ue } = await sb.rpc('username_available', { p_username: f.username.trim() })
      if (!ue && free === false) { setBusy(false); return setMsg('That username is taken. Try another one.') }
    }
    if (mode === 'up') { const bad = await checkPassword(f.password, { email: f.email, username: f.username }); if (bad) { setBusy(false); return setMsg(bad) } }
    const { data, error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
      : await sb.auth.signUp({ email: f.email.trim(), password: f.password, options: { data: { username: f.username.trim().toLowerCase(), display_name: f.username.trim() } } })
    setBusy(false)
    if (error) setMsg(authMsg(error))
    else if (mode === 'up' && !data.session) setMsg('Check your email to confirm your account, then sign in.')
  }
  return <div className="auth"><img src={wm} alt="DAHUB" />
    <form onSubmit={go}>
      {mode === 'up' && <input placeholder="Username (a-z, 0-9, _)" value={f.username} onChange={set('username')} pattern="[A-Za-z0-9_]{3,30}" required />}
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      {mode !== 'reset' && <input type="password" placeholder="Password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} minLength={8} required />}
      <button className="wb p" disabled={busy}>{busy ? (mode === 'in' ? 'Signing in…' : mode === 'reset' ? 'Sending…' : 'Checking…') : mode === 'in' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Create account'}</button>
      {msg && <p className="msg" role="alert">{msg}</p>}
    </form>
    {mode === 'in' && <button className="link" onClick={() => { setMode('reset'); setMsg('') }}>Forgot password?</button>}
    <button className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>{mode === 'in' ? 'New here? Create account' : 'Have an account? Sign in'}</button>
  </div>
}

// Shown after someone opens the password reset link from their email.
export function NewPassword({ done }) {
  const [a, setA] = useState(''), [b, setB] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [ok, setOk] = useState(false)
  async function save(e) {
    e.preventDefault(); setMsg('')
    if (a !== b) return setMsg('Those passwords don’t match.')
    setBusy(true); const bad = await checkPassword(a); if (bad) { setBusy(false); return setMsg(bad) }
    const { error } = await sb.auth.updateUser({ password: a }); setBusy(false)
    if (error) return setMsg(authMsg(error)); setOk(true)
  }
  return <div className="scrim"><div className="msheet" onClick={e => e.stopPropagation()}><h3 style={{ margin: 0 }}>Set a new password</h3>
    {ok ? <><p>Your password is updated. You’re signed in.</p><button className="wb p" onClick={done}>Continue</button></> : <form onSubmit={save} style={{ display: 'grid', gap: 10 }}>
      <input type="password" autoComplete="new-password" value={a} onChange={e => setA(e.target.value)} placeholder="New password" required />
      <input type="password" autoComplete="new-password" value={b} onChange={e => setB(e.target.value)} placeholder="Type it again" required />
      {msg && <p className="msg" role="alert">{msg}</p>}
      <button className="wb p" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button><button type="button" className="wb" onClick={done}>Not now</button></form>}</div></div>
}
