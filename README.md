# Kiss / Marry / Kill: AI

A live, public-opinion experiment for LLMs. Pick one to **kiss**, one to **marry**, one to **kill**. Watch the rankings change in real time. Monthly snapshots get frozen forever in the archive, with awards.

The digital descendant of a physical voting board from a summit, designed to feel less like a benchmark dashboard and more like a yearbook page the entire internet is signing.

---

## Quick start (demo mode — no setup)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll see the full UI with seeded fake votes and reactions. The site runs in **demo mode** — votes, reactions, and even past months are stored in memory and reset whenever the server restarts. Perfect for iterating on design.

## Production mode (Supabase)

1. Create a project at <https://supabase.com>.
2. In the Supabase SQL editor, paste and run **`supabase/schema.sql`** then **`supabase/seed.sql`**.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose)
   - `CRON_SECRET` (any long random string; protects the snapshot endpoint)
4. Restart `npm run dev`. The demo-mode banner disappears and writes hit Postgres.

## Features

### Voting
- Pick one Kiss / one Marry / one Kill
- Optional 240-char reason per pick
- One vote per person per month, resets at monthly snapshot
- Casual enforcement: cookie + localStorage + IP rate limit + salted IP hash

### Vote Card (share image)
- After voting, a personalised 1200×630 PNG is generated via `next/og`
- Endpoint: `GET /api/share/og?kiss=grok&marry=claude&kill=copilot`
- Modal offers: share to X, share to Threads, native share, download image, copy link/caption

### Reaction system
- Visitors react to other people's reasons with 🔥 / 💀 / 😭
- One of each reaction per visitor per reason (toggle)
- Stored in `reason_reactions` with a unique constraint
- The Reason Wall has three sort modes: **Hot Takes** (reactions/age), **Top** (all-time), **Recent**
- Category filter: All / Kiss / Marry / Kill

### Monthly Awards
- Auto-computed by the snapshot job, both in Postgres (`snapshot_month()`) and the in-memory fallback (`src/lib/awards.ts`):
  - **Most Kissed**, **Most Married**, **Most Killed**
  - **Most Controversial** (best combined kiss+kill rank)
  - **Underdog of the Month** (highest marry-to-total ratio outside the top 3)
- Each award has its own shareable badge image at `GET /api/award/og?key=most_married&model=claude&month=2026-05`
- Shown in archive cards — click any badge to open a share modal

### Embeddable widget
- Iframe-friendly leaderboard at `/embed`
- Optional params: `?cat=marry`, `?cat=kill&limit=5`, `?theme=light`
- A "for builders" section on the homepage shows copy-pastable embed code

### Public read-only API (CORS-enabled, edge-cached)
- `GET /api/public/leaderboard` — current month's totals
- `GET /api/public/archive` — every frozen month + awards
- `GET /api/public/models` — the LLM roster

### Sound + confetti + easter eggs
- Synthesised Web Audio click on pick, arpeggio on vote, tap on reaction
- Mute toggle in the navbar (persisted in localStorage)
- Canvas confetti burst on successful vote (no dependency, ~2KB)
- Easter-egg toasts on specific combos — see `src/lib/easterEggs.ts` to add more

## Monthly snapshots

At 00:05 UTC on the 1st of each month, call:

```http
POST /api/cron/snapshot
Authorization: Bearer <CRON_SECRET>
```

This invokes the `snapshot_month()` Postgres function which freezes the previous month's leaderboard **and awards** into `monthly_snapshots`.

Easiest hosts to wire this up on:

- **Vercel Cron** — add to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/snapshot", "schedule": "5 0 1 * *" }] }
  ```
- **Upstash Schedules**, **Supabase Cron Jobs**, **GitHub Actions** — all work the same way.

## Project layout

```
src/
  app/
    api/
      vote/                POST a vote
      leaderboard/         GET current month leaderboard
      reasons/             GET reasons feed (sort + category)
      reactions/           POST toggle a reaction
      archive/             GET frozen monthly snapshots
      share/og/            GET personalised Vote Card image
      award/og/            GET monthly award badge image
      cron/snapshot/       POST (cron-only) freeze previous month
      public/leaderboard/  GET (CORS) public read-only
      public/archive/      GET (CORS)
      public/models/       GET (CORS)
    embed/                 iframe-friendly leaderboard widget
    page.tsx               the whole site
    layout.tsx
    globals.css
  components/              all UI (Hero, VoteForm, ShareCard, Leaderboards, ReasonWall,
                           Archive (with awards), EmbedAndApi, Tribute, NavBar,
                           Footer, Toast, MuteToggle, LiveTicker, CountUp, BoardProvider)
  lib/
    models.ts              the LLM catalog (edit here to add/retire)
    awards.ts              award computation (mirrors the SQL function)
    storage/               pluggable backend (Supabase OR in-memory demo)
    voteToken.ts           cookie-based voter identity + IP hashing
    rateLimit.ts           in-process IP rate limit
    sound.ts               synthesised UI sounds + mute persistence
    confetti.ts            self-contained canvas confetti burst
    easterEggs.ts          combo → toast rules
    publicApi.ts           CORS / cache helpers for the public API
    month.ts               UTC month helpers
    types.ts               shared types
supabase/
  schema.sql               tables + RLS + snapshot_month() + reactions
  seed.sql                 model catalog seed (idempotent)
```

## Casual vote enforcement (the trade-off)

This ships with the **casual** anti-double-vote tier:

- httpOnly cookie issued on first visit
- `localStorage` flag mirrored client-side
- IP rate limit (5 votes / minute, in-process)
- Salted SHA-256 hash of IP stored on each vote (never raw IPs)
- Unique `(voter_token, month)` constraint in Postgres

Determined users can still cheat by clearing cookies + switching networks. To upgrade to **strict** (require sign-in), wire Supabase Auth and use the auth user id as `voter_token`. The schema already accommodates this.

## Adding or removing a model

1. Edit `src/lib/models.ts`.
2. Re-run `supabase/seed.sql` (it upserts by slug).
3. Done — no other code changes needed.

## Origin / tribute section

The bottom of the page shows three placeholder photos for the original summit board. To swap in the real ones:

1. Drop your images into `public/origin/` (e.g. `board.jpg`).
2. Edit `src/components/Tribute.tsx` and replace each `<PlaceholderPhoto />` with `<img src="/origin/...jpg" />`.
3. Update the captions.
