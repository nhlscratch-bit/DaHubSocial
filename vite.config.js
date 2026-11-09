import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
// Adds the home-screen install files at build time, so the project can stay flat (no folders).
const pwa = () => ({
  name: 'pwa-files',
  generateBundle() {
    for (const f of ['icon-192.png', 'icon-512.png']) this.emitFile({ type: 'asset', fileName: f, source: fs.readFileSync(f) })
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: fs.readFileSync('sw.js') })
    this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify({
      name: 'DAHUB', short_name: 'DAHUB', start_url: '/', display: 'standalone', background_color: '#DDEEF5', theme_color: "#DDEEF5",
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }) })
  }
})
export default defineConfig({ plugins: [react(), pwa()], publicDir: false })
