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
- **Supabase** — auth + Postgres (PostGIS) + storage
- **canvas-confetti** — celebration effects
- Mobile-first, deploys to **Vercel**

---

## 🚀 Getting started

```bash
npm install
npm run dev          # → http://localhost:3000
```

That's it — the app runs in a **rich demo mode** with a full city of seeded dogs, sightings, NGOs and events. **No keys required.**

### Going live (optional)

Copy `.env.example` → `.env.local` and fill in:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=        # live Mapbox map (else: stylised fallback)
NEXT_PUBLIC_SUPABASE_URL=        # live database (else: in-memory demo data)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Then apply the schema in [`supabase/schema.sql`](./supabase/schema.sql) (tables, PostGIS, RLS, storage bucket and a `dogs_near` nearby-search function).

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
    ├── data.ts           # data-access layer (Supabase ↔ demo)
    ├── demo-data.ts      # deterministic seeded city of dogs
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
