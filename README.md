# Mood Tracker

A tiny, opinionated mood tracker.

- 🔐 Email + password sign-in (Supabase Auth) — the main UI is gated behind login.
- 😀 Five mood emoji to tap: Happy, Neutral, Sad, Angry, Tired.
- 📝 Optional note (up to 280 characters) attached to each mood log.
- 📅 Horizontal strip of the last 7 days showing the latest mood logged each day — tap a day to expand a detail panel with the mood, time, and note.
- ⚛️ Vite + React + Supabase, no backend code to deploy.

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/)
- [Supabase JS](https://supabase.com/docs/reference/javascript) for auth + Postgres reads/writes
- One Postgres table with Row-Level Security so every user only ever sees their own moods

## Schema

Single table (RLS-enabled). The literal table name embeds a per-user prefix; change `VITE_MOODS_TABLE` if you're hosting your own Supabase project.

```sql
CREATE TABLE IF NOT EXISTS public."<table-name>" (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  mood text not null,
  note text,
  created_at timestamptz not null default now()
);

ALTER TABLE public."<table-name>" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_user_access" ON public."<table-name>"
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public."<table-name>" TO authenticated;

CREATE INDEX ON public."<table-name>" (user_id, created_at DESC);
```

## Run locally

```bash
git clone https://github.com/joseb33w/mood-tracker.git
cd mood-tracker
cp .env.example .env
# Edit .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Then open the URL Vite prints (defaults to `http://127.0.0.1:5173/`).

## Build for production

```bash
npm run build
# output → dist/
```

Drop `dist/` on any static host (Cloudflare Pages, Netlify, Vercel, GitHub Pages, R2, S3, …).

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | yes | The HTTPS URL of your Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | yes | The Supabase "anon" / public API key. |
| `VITE_MOODS_TABLE` | no | Override the moods table name. Defaults to the value baked into `src/lib/supabase.js`. |

`.env` is gitignored. `.env.example` is committed for reference.

## Project layout

```
src/
├── App.jsx                    Auth-gated root — boots, reads session, picks AuthScreen vs Tracker
├── main.jsx                   React entry
├── styles.css                 Theme + components
├── lib/
│   ├── supabase.js            createClient() + the table name constant
│   └── moods.js               Mood option config + date helpers
└── components/
    ├── AuthScreen.jsx         Sign-in / sign-up tabs
    └── Tracker.jsx            5 mood buttons + 7-day history strip
```

## License

MIT — see [LICENSE](./LICENSE).
