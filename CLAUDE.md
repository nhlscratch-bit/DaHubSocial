# DAHUB 2.0: project handoff for Claude Code

DAHUB ("ONE HUB. EVERY SIDE OF LIFE.") is a Baltimore-focused social / networking PWA. The owner builds from a phone, is not a programmer, and wants finished, working features. Claude has done all the building so far (in the Claude app); this file carries that context over.

## How the owner likes to work
- Short replies, plain language, no jargon. Do the work, then say what changed in a few lines.
- When walking through image prompts, send only the next prompt after each image, not the whole list again.
- Ask only when a choice is truly theirs; otherwise pick a sensible default and say so.
- Every control must actually work, with loading, empty and error states.

## Product rules (from the owner's "Master Bible", v3.x)
- Real data only: never fake accounts, engagement, stats, live status or rankings.
- Label sponsored content. Every piece of user content can be reported and its author blocked/muted.
- Respect privacy, blocks/mutes (`hidden_ids()`), audience settings and moderation status everywhere, including Pulse and search.
- Brand: white/silver/chrome, turquoise accents (#19e0f0 / #0e7f90), glass cards. No orange as a primary color.

## Stack and layout
- React 18 + Vite 5, **flat project: every source file is in the repo root** (no src/ folder). `main.jsx` → `App.jsx`.
- Supabase backend (project ref `netegdwqbzqugjbjtrnb`). Client in `supabase.js` (also exports `SEL`, `upload`, `hiddenIds`, `friendly`, and the `BUILD` label).
- Deployed on Vercel from this GitHub repo: framework Vite, build `npm run build`, output `dist`.
- Env vars (set in Vercel, never commit values): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Optional TURN for calls/rooms: `VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_PASS`.
- `vite.config.js` emits `sw.js` (push) and the PWA manifest/icons.
- Bump `BUILD` in `supabase.js` on each release (currently `build 51`); it shows in Settings so the owner can confirm a deploy landed.
- `features.js` holds feature switches: `passport: false` (Clout Passport off for maintenance), `adNudity: true` (After Dark nudity kill switch).

## Navigation
`App.jsx` keeps a stack: `push({ t, id })` / `back()`. Route types include post, profile, inbox, chat, notifs, opps, opp, newopp, media, artist, submit, safety, admin, settings, saved, guidelines, tag, events, newevent, event, communities, newcommunity, community, passport, pulse, radar, rooms, newroom, room, afterdark, arcade, game. Deep links: `?post= ?profile= ?artist= ?event= ?chat= ?community= ?passport= ?room=`. Bottom nav: Home, Discover, +, Shorts, More (More.jsx tiles list the sections).

## Features built (all live)
Feed with photos/videos/polls, stories, comments/reactions/reposts/bookmarks, hashtags, Shorts, Discover, profiles (tabs incl. Shoutouts), DMs + voice/video calls (WebRTC via `call_signals`), notifications + web push (edge function `push`, VAPID in `push_config`, pg_net triggers), Opportunity Board, Media page + artist pages (YouTube via edge function `youtube`, key in Supabase secrets), Spotlight, Get Featured submissions, Events + RSVPs, Communities, Polls, Question of the Day, Shoutouts, account types + verification, suspend/ban, admin (submissions, reports, accounts, audit log, daily question, artists, live spotlights), DAHUB Pulse (Pulse Chamber + Radar, RPC `pulse_scan`), Live Rooms (Clubhouse-style audio, `roomsEngine.js`, peer-to-peer mesh, max 25), After Dark (18+ area, see below). Clout Passport exists but is switched off.

## Database conventions
- RLS on every table. Helper functions live in the `private` schema, `SECURITY DEFINER`, `set search_path = ''`.
- `private.is_admin()`, `private.no_inactive()` (blocks suspended/banned inserts), `private.burst(action, table, user_col)` + `rate_limits` table for rate limiting, `audit_log` for admin actions.
- `reports.target_type` and `notifications.type` are CHECK-constrained lists; extend them when adding content types. Reasons `minor` / `non_consensual` auto-hide a post (`posts.held`) until an admin reviews it.
- Public tables: ad_access, admins, audit_log, badge_catalog, blocks, bookmarks, call_signals, comment_reactions, comments, communities, community_members, conversation_members, conversations, event_rsvps, events, follows, media_artists, media_videos, message_reactions, messages, mutes, notifications, opportunities, opportunity_responses, opportunity_saves, passport_*, poll_options, poll_votes, post_media, post_reactions, posts, profiles, pulse_scans, push_config, push_subscriptions, qotd, rate_limits, reaction_types, reports, reposts, room_reminders, room_speakers, rooms, shoutouts, spotlights, stories, story_views, submissions.
- Buckets: avatars, covers, post-media, dm-media (private), opportunity-media, story-media, media-submissions, passport-photos, after-dark (private, signed URLs via `admedia.js`).

## After Dark (18+)
DOB gate (`ad_confirm`), opt-in/out (`ad_set`), posts flagged `after_dark` never appear outside After Dark (enforced in RLS and feed queries). Nudity (`sensitive`) only from admin ID-verified creators (`ad_verify`), blurred until tapped, kill switch in `features.js`. Before going public with nudity: real age verification (Yoti/Persona), lawyer review, FOSTA-SESTA compliance, NCMEC reporting process. Not app-store compatible.

## Pre-launch checklist (owner's list, still open)
- Own TURN server (Metered) for calls/rooms across networks; public Open Relay is unreliable.
- Confirm builds 44–50 on a real phone (shimmer, call fix, Pulse, Rooms, After Dark).
- Turn on leaked-password protection in Supabase Auth (dashboard only). Restrict/rotate the YouTube API key (Google Cloud console). Sample spotlight already deleted.

## Deferred features (owner said later)
Full After Dark parity (its own Shorts/Rooms/Stories/DMs/etc.), bookings, Passport replacement, notification preferences, Collab Board.

## Arcade (in the app, locked for testing)
More → Arcade (`Arcade.jsx`). Only admins and people who entered the tester password can play (`arcade_status`, `arcade_unlock`, `arcade_set_pass`, `arcade_testers`, `arcade_revoke`; access rows in `arcade_access`, bcrypt hash in `arcade_config`, 5 wrong tries per 15 min). Game files sit in the private `arcade` bucket (storage RLS via `private.arcade_ok()`), copied from `games/` on GitHub by edge function `arcade-sync` (owner taps "Update games from GitHub" in Arcade; syncs the `main` branch). `GamePlayer` downloads `index.html`, signs every asset, injects `window.__ASSETS`, and runs it in a sandboxed blob iframe, so game code must load assets through `A('path')`. Layout is a placeholder; the owner is designing the real look. Note: the repo is public, so the raw game files are visible on GitHub.

## Games
Source lives in `games/` (not part of the Vite build; served to the app through the Arcade):
- `games/fight/` "DAHUB Fighters", Def Jam-style 2.5D brawler. Canvas engine in `index.html`; `ROSTER` object holds fighters (KennDogg, Mabel, Fresh Prince) with sprites in `sprites/` (webp, per-pose anchor data inline) and Blazin' cutscene/win videos in `video/`. Moves: light/heavy/grab/block/Blazin' meter, CPU AI with 3 difficulties, best of 3, touch + keyboard controls.
- `games/spades/` "DAHUB Spades", lounge table vs 3 bots. DOM-based, images embedded as data URIs (artifact hosting would not serve its separate image files; `img/` keeps the originals). Full rules, nil, bags, optional Jokers & deuces, to 300/500. Fresh Prince fills all 4 seats for testing.
- Next for Spades: online multiplayer inside DAHUB (server-authoritative dealing/validation via Supabase RPCs so hands stay private), live voice (reuse `roomsEngine.js` patterns), seated art for each character (4 poses: idle/slap/celebrate/mad in their own chair, green screen), the owner's custom logo.
- Art pipeline: the owner generates images in ChatGPT on solid #00FF00 (magenta #FF00FF for green objects). Cut out with `tools/key.py` (fast chroma key) or `tools/key_tight.py` (keeps lime/green clothing). Videos come from Gemini Veo; trim and re-encode with ffmpeg (H.264, `-preset veryfast`). `games/art-kit-manifest.json` lists the full art kit, which lives outside the repo (too large).
