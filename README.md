# 🐾 StrayPaw Delhi

> **Every dog has a story. Start seeing them.**

A community-powered **web app** (a website — runs in any browser, deploys to a URL) where people discover, explore and upload sightings of Delhi's street dogs. Every sighting builds a living database of the city's dogs — tracking their location, health and care over time.

StrayPaw balances two goals:

1. 📸 A **viral, emotional, Instagram-like** experience for uploading and discovering dog sightings.
2. 🏥 A **structured civic-tech backend** for NGOs to track feeding, vaccination, sterilisation and rescue work.

---

## ✨ Features

| Area | What it does |
| --- | --- |
| **Landing page** | Hero, live animated Delhi map, animated city stats, "how it works", recent sightings feed and emotional CTAs. |
| **Interactive map** | Full Delhi map with **clustered** dog sightings that expand on zoom, status pins (🐕 🍗 🚑 ✂️ 💉), filters (recent / friendly / needs help / sterilised / vaccinated) and tap-to-open quick cards. |
| **Sightings feed** | Instagram-style feed — photo, location, nickname, mood tags, notes, likes. |
| **Report flow** | Photo + auto GPS + mood tags + notes → "**You helped track a dog 🐾**" celebration with confetti and paw burst. |
| **Dog profiles** | Aggregates sightings into one profile: best photos, zone, **timeline**, feeding history, vaccination & sterilisation status, community notes, actions and **"same dog?" merge suggestions**. |
| **NGO dashboard** | Help queue with **bulk updates**, sterilisation/vaccination tracking, volunteer activity, partner NGOs and an **underserved-area heatmap**. |
| **Smart system** | Trust scoring per sighting & profile, duplicate detection, merge-suggestion engine and sighting → profile clustering. |

---

## 🧱 Tech stack

- **Next.js 15** (App Router) · **TypeScript**
- **Tailwind CSS** — warm, emotional design system
- **Framer Motion** — smooth animations & microinteractions
- **Mapbox GL** (`react-map-gl`) — clustered map (with a stylised fallback when no token)
- **Supabase** — Postgres + storage, anonymous (no-login) writes via secure functions
- **canvas-confetti** — celebration effects
- Mobile-first, deploys to **Vercel**

---

## 🚀 Launch checklist (≈10 minutes)

This is a **real, public app** — uploads persist, photos are stored, and stats
reflect actual usage. No login is required for anyone to contribute.

**1. Create a Supabase project** — free tier at [app.supabase.com](https://app.supabase.com).

**2. Run the schema.** In the Supabase dashboard → **SQL Editor**, paste and run
[`supabase/schema.sql`](./supabase/schema.sql). This creates every table, the
photo storage bucket, Row Level Security, and the secure write functions
(`report_sighting`, `log_feed`, `get_city_stats`, …).

**3. (Optional) Seed real starter dogs** so the map isn't empty on day one —
run [`supabase/seed.sql`](./supabase/seed.sql). **Skip this to launch
completely fresh** — the app starts empty and fills with real sightings.
Already seeded and want a clean slate? Run [`supabase/reset.sql`](./supabase/reset.sql)
to wipe all data (schema is kept).

**4. Get a Mapbox token** — free at
[account.mapbox.com](https://account.mapbox.com/access-tokens/).

**5. Add environment variables** in Vercel → Project → Settings →
Environment Variables (copy from [`.env.example`](./.env.example)):

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase → Settings → API → anon public key
NEXT_PUBLIC_MAPBOX_TOKEN=         # Mapbox token (else: stylised fallback map)
```

**6. Redeploy.** Done — people can start reporting dogs.

> **Privacy & safety:** the anon key is meant to be public. All writes go
> through `SECURITY DEFINER` database functions, so the browser can only call
> the exact operations the app allows — it can't read or mutate anything else.

### Spam protection (recommended before sharing widely)

The report form can be gated with **Cloudflare Turnstile** (free, privacy-
friendly). It's verified **server-side** in the `/api/report` route, so it
can't be skipped by a bot hitting the API directly.

1. **Create a Turnstile site** at
   [dash.cloudflare.com → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
   → *Add site*. You'll get a **Site key** and a **Secret key**.
2. **Add three env vars** in Vercel:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=   # Turnstile site key (public)
   TURNSTILE_SECRET_KEY=             # Turnstile secret key (server only)
   SUPABASE_SERVICE_ROLE_KEY=        # Supabase → Settings → API → service_role
   ```
3. **Redeploy.** The form now shows a human check and the server rejects any
   submission that fails it.
4. **(Optional, defence-in-depth)** run [`supabase/secure-writes.sql`](./supabase/secure-writes.sql)
   to revoke direct anon access to the write function, so the *only* path to
   create a sighting is the Turnstile-protected route.

If these keys are absent the form still works — it just isn't spam-protected,
which is fine for local development.

### NGO operations — Cases (Phase 1: lifecycle + ownership)

An operational layer for NGOs, separate from the public map. A **Case** is a
unit of work (injury, sterilisation, rescue…) optionally linked to a dog for
continuity. Each case has a lifecycle (`unverified → assigned → in_progress →
resolved → closed`, plus reopen), an **assignee** (claim / ownership badge),
and a full **audit trail** (`case_updates`). Only the assignee can change a
case's status; every change records who/what/when.

- Run [`supabase/cases.sql`](./supabase/cases.sql) once in the SQL Editor.
- Reachable at **`/cases`** (and from the menu). Open a case from any dog
  profile via "Open a case".
- Identity reuses the existing lightweight sign-in (no new auth). Enforcement
  is server-recorded but soft (no passwords) — upgrade to Supabase Auth for
  hard enforcement later.

> Phases 2–5 (daily command dashboard, rule-based alerts, impact/CSV export,
> deeper dog continuity) build on this foundation.

### Moderation (sightings are reviewed before going public)

New sightings are created as **`pending`** and are invisible everywhere public.
A sighting only appears on the map/feed — and its dog profile is created or
matched — once it's **approved**. Existing sightings are migrated to `live`.

> **Already ran `schema.sql`?** Run [`supabase/add-moderation.sql`](./supabase/add-moderation.sql)
> once in the SQL Editor.

Approve/reject without a UI, either way:

- **SQL Editor:** `select approve_sighting('<sighting-uuid>');` (or `reject_sighting(...)`).
- **Protected endpoint** (set `ADMIN_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`):
  ```bash
  # list pending
  curl -H "Authorization: Bearer $ADMIN_SECRET" https://<site>/api/admin/sightings
  # approve / reject
  curl -X POST -H "Authorization: Bearer $ADMIN_SECRET" -H "Content-Type: application/json" \
       -d '{"action":"approve","id":"<sighting-uuid>"}' https://<site>/api/admin/sightings
  ```

### Deleting your own sightings (no login)

People can delete sightings **they created**, with no account. On upload the
browser generates a secret token, keeps it in `localStorage`, and the server
stores only a **SHA-256 hash** of it on the row. Deleting requires presenting
the token (the server re-hashes and compares), so the database never holds the
secret and only the original device can delete. A delete button appears on
owned sightings in the feed and on the dog profile timeline.

> **Already ran `schema.sql`?** Run the migration
> [`supabase/add-deletion.sql`](./supabase/add-deletion.sql) once in the SQL
> Editor to add the `owner_hash` column and the `delete_sighting` function.
> (Fresh installs of `schema.sql` already include it.)

### Local development

```bash
npm install
npm run dev          # → http://localhost:3000
```

By default the app starts **fresh and empty** — it shows only real data from
your Supabase project. To explore the UI offline with built-in sample dogs,
set `NEXT_PUBLIC_DEMO=1` in `.env.local` (never set this in production).

---

## 🗂️ Project structure

```
src/
├── app/                  # routes: / · /map · /feed · /report · /dog/[id] · /dashboard
├── components/
│   ├── nav/              # TopBar, BottomNav (mobile)
│   ├── map/              # DogMap, MapboxMap (clustering), FallbackMap, quick card
│   ├── feed/             # Instagram-style SightingCard
│   ├── dog/              # profile actions
│   ├── dashboard/        # NGO help queue + bulk updates
│   ├── landing/          # hero, stats
│   └── ui/               # DogPhoto, badges, trust ring, count-up
└── lib/
    ├── types.ts          # domain model (mirrors the SQL schema)
    ├── aggregation.ts    # 🧠 trust scoring, duplicate detection, merge & clustering
    ├── data.ts           # read layer (Supabase ↔ demo fallback)
    ├── actions.ts        # write layer: photo upload + secure RPC calls
    ├── demo-data.ts      # deterministic seeded city of dogs (local fallback)
    ├── delhi.ts          # Delhi bounds, zones, projection
    └── celebrate.ts      # confetti + paw burst
```

---

## 🧠 Aggregation logic (the heart of the product)

`src/lib/aggregation.ts` turns a raw stream of sightings into structured dog profiles:

- **`scoreSighting`** — reporter reputation + photo + notes + recency → 0–100.
- **`scoreProfile`** — averages sightings and rewards corroboration from distinct reporters.
- **`sightingSimilarity` / `dogSimilarity`** — blends spatial proximity (Haversine), nickname match, mood signature and look to estimate "same dog" likelihood.
- **`suggestMerges`** — surfaces the strongest duplicate candidates on each profile.
- **`clusterSightings`** — greedy single-link clustering of loose sightings into candidate dogs.

---

## 🔮 Future hooks

WhatsApp reporting · QR collars · public NGO API · donation-per-dog · government export reports · AI dog recognition.

---

Built with 🧡 for Delhi's street dogs.
