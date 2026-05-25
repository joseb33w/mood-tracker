# Goal

Make the mood tracker more interactive by letting users:

1. Optionally jot a short note when they log a mood (typed input above the emoji row).
2. Tap any day in the 7-day history strip to expand a detail panel showing that day's mood, time, and note.

Both interactions add depth without breaking the existing single-tap-to-log flow.

# Files to touch

- `src/components/Tracker.jsx` — add note state + input, expand history cells into buttons with a selectable detail panel, pass the note on insert, include `note` in SELECT.
- `src/lib/moods.js` — no API change needed; `pickLatestPerDay` already returns whole rows (with `note` once selected).
- `src/styles.css` — styles for the new note input, history-cell button affordance, and detail panel.
- `README.md` — document the schema column add and the new behavior.

## Backend

- Added column `note text` (nullable) to `public."usr_nmexs7bytxq2_moods"` via Supabase `exec_sql` RPC. No new RLS policy needed — the existing `auth_user_access` policy covers all columns.

# Verification approach

- **Typecheck/lint**: project has no tsconfig and no lint script, skip pre-flight static checks.
- **Backend**: as a freshly-created test Supabase user, insert a mood with a note via PostgREST, then SELECT and assert the note round-trips. Insert one without a note and assert null. Confirm `auth.uid()`-scoped RLS still rejects another user's read.
- **Frontend (Playwright)**: sign up a fresh test user, type a note, tap a mood, assert the history cell for today shows the right emoji, click the cell, assert the detail panel shows the note text. Take screenshots before/after.
- Clean up the test user with the service-role admin API at the end.

# Out of scope

- Editing or deleting past mood entries.
- Note length limits beyond a soft cap (we'll cap at 280 chars client-side; backend stays unconstrained for forward compatibility).
- Search/filter on notes.
- Multiple notes per day surfaced (we keep the existing "latest per day" semantics; the detail panel shows the latest entry's note, matching the strip).
