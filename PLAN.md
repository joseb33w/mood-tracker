# Goal

Build a separate Mood Tracker SPA with email/password auth and an emoji-based daily log. After signing in, the user sees five emoji buttons (😀 😐 😢 😡 😴) and a horizontal row showing the last 7 days' moods. The main UI is gated behind authentication — unauthenticated visitors only see the sign-in / sign-up screen.

# Files to touch

- `package.json`, `vite.config.js`, `index.html` — Vite + React app scaffold.
- `src/main.jsx`, `src/App.jsx` — entry + auth-gated root.
- `src/components/AuthScreen.jsx` — sign-in / sign-up tabs (email + password).
- `src/components/Tracker.jsx` — main UI with 5 mood buttons and 7-day history row.
- `src/lib/supabase.js` — shared Supabase client (reads `VITE_` env vars).
- `src/lib/moods.js` — mood option config + date helpers (`lastNDays`, `dayKey`, `pickLatestPerDay`).
- `src/styles.css` — polished purple/violet theme.
- `.env.example`, `.env` (gitignored) — Supabase URL + anon key + table name.
- `README.md` — setup instructions.

# Backend

Single Supabase table `public."usr_nmexs7bytxq2_moods"`:

- `id uuid primary key default gen_random_uuid()`
- `user_id text not null` — matches `auth.uid()::text`
- `mood text not null` — one of `happy | neutral | sad | angry | tired`
- `created_at timestamptz not null default now()`

RLS enabled. Single policy `auth_user_access` scoped to `auth.uid()::text = user_id` for all CRUD on the `authenticated` role. Explicit `GRANT` to `authenticated` and `service_role`. Composite index on `(user_id, created_at DESC)` for the 7-day history query.

# Verification approach

1. Apply schema via `exec_sql` RPC and confirm the table is reachable via PostgREST.
2. Drive a real headless-browser flow with Playwright in `/workspace/verify/`:
   - Boot the built app served from `dist/` on a local port.
   - Verify unauthenticated visitor sees the AuthScreen, NOT the tracker UI.
   - Sign up a fresh test user (unique email per run).
   - Sign in → assert the tracker UI renders, 5 emoji buttons present, 7 history cells render.
   - Click a mood, assert the matching cell in the history row updates AND a row exists in Supabase.
   - Sign out and assert we're back at the AuthScreen.
3. RLS positive + negative: sign up a second user via SDK and confirm their `select` returns zero rows for the first user's data.
4. Clean up — delete the two test users via service-role admin API.
5. Build, upload `dist/` to R2 under `<BUILD_ID>/`, smoke-test the preview URL with `curl -I`.

# Out of scope

- Mood editing or deletion UI (only "log the latest mood per day" — re-tapping replaces today's entry visually but each tap is a separate row).
- Notes / timestamps / journaling.
- Streak counters or analytics beyond the 7-day strip.
- Social sharing.
- Push notifications.
- Multi-device push of mood logs (Supabase auto-syncs via RLS reads on refresh; no realtime channel).
