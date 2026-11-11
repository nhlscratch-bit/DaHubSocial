// Password safety for sign-up and password changes (stands in for Supabase's paid leaked-password protection).
// 1) basic strength rules, 2) a check against the public list of leaked passwords (Have I Been Pwned).
// Only the first 5 characters of the password's SHA-1 hash leave the phone; the password itself never does.
// If the check can't be reached, sign-up still goes through on the basic rules.
const COMMON = new Set(['password', 'password1', 'password12', 'password123', '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', '11111111', '00000000', 'iloveyou', 'abc12345', 'baltimore', 'baltimore1', 'dahub123', 'letmein1', 'welcome1', 'football', 'baseball', 'princess', 'sunshine', 'trustno1', 'superman', 'whatever', 'qwerty12', '1q2w3e4r', 'zaq12wsx', 'passw0rd', 'p@ssw0rd'])
async function sha1Hex(s) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}
async function leakCount(pw) {
  if (!crypto?.subtle) return 0
  const h = await sha1Hex(pw), pre = h.slice(0, 5), suf = h.slice(5)
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000)
  try {
    const r = await fetch('https://api.pwnedpasswords.com/range/' + pre, { headers: { 'Add-Padding': 'true' }, signal: ctl.signal })
    if (!r.ok) return 0
    for (const line of (await r.text()).split('\n')) { const [s, n] = line.trim().split(':'); if (s === suf) return parseInt(n, 10) || 0 }
    return 0
  } catch { return 0 } finally { clearTimeout(t) }
}
// Returns an error message to show, or '' if the password is OK.
export async function checkPassword(pw, { email = '', username = '' } = {}) {
  const p = String(pw || ''), low = p.toLowerCase()
  if (p.length < 8) return 'Use at least 8 characters.'
  if (/^(.)\1+$/.test(p)) return 'That password is too easy to guess.'
  if (COMMON.has(low)) return 'That password is too common. Pick something only you would know.'
  const name = (email.split('@')[0] || '').toLowerCase(), user = String(username || '').toLowerCase()
  if ((name.length >= 4 && low.includes(name)) || (user.length >= 4 && low.includes(user))) return 'Don’t use your email name or username in your password.'
  if (p.length < 12 && !(/[a-z]/i.test(p) && /[0-9\W_]/.test(p))) return 'Mix letters with numbers or symbols, or use 12+ characters.'
  const n = await leakCount(p)
  if (n > 0) return 'That password has shown up in a data leak somewhere else. Please choose a different one.'
  return ''
}
