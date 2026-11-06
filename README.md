# DAHUB 2.0 — Social MVP
Standalone social-first app. React + Vite + Supabase. Light grey / white / teal theme per the DAHUB New App Bible.

## Run
```
npm install
cp .env.example .env
npm run dev
```
Deploy (Vercel/Netlify): build `npm run build`, output `dist`, set the two `VITE_` env vars.

## Supabase
Project `DaHub` (ref `netegdwqbzqugjbjtrnb`) already has the schema, RLS and storage buckets (`avatars`, `covers`, `post-media`).
In Authentication settings: enable leaked-password protection; decide whether email confirmation is required; add your deploy URL to Redirect URLs.

## Built
Boot screen, email sign up/in, Home feed (For You / Following / Trending), composer (text, photo/video, audience), seven reactions (tap to change/remove), repost, bookmark, Post View with comments, profiles (follow, edit, avatar upload).
## Not built yet
Discover, Shorts, More modules, Nearby, DMs, Live, comment reactions UI, notifications, search, stories (UI placeholders only).
