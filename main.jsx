import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// keep an invite code (?ref=username) until sign-up
try { const r = new URLSearchParams(location.search).get('ref'); if (r && /^[A-Za-z0-9_]{3,30}$/.test(r)) localStorage.setItem('dahub.ref', r) } catch {}
import './styles.css'
import './glow'
import './tapsound'
createRoot(document.getElementById('root')).render(<App />)
