# StrayPaw 2.0 — current state audit

Audited 17 October 2026 against `main` at `0bc010c` ("Keep app privacy notice
unobtrusive"), the same commit as the latest READY production deployment
(`dpl_DhWR1urHDMT4nBSHPFpATyQddYos`). Work branch: `claude/friendly-noether-u1c7u4`
(see "Branch and deployment safety" below).

**FigJam:** not accessible from this environment (the Figma connector is not
authorised for this session). Nothing in this audit or the build claims to
have read the board. The supplied Master Build Brief (decisions 013–048),
Creative Direction v1.1, Folk Art v1.0 and Phase 4 decisions were used as the
portable equivalent.

Status keys: **working** (code path exercised in this audit), **partial**
(code exists, some parts unverified or known-limited), **unverified** (code
exists, needs an authorised session to exercise), **new backend required**.

## Branch and deployment safety

| Fact | Evidence |
| --- | --- |
| Production deploys from `main` only | Vercel project `pok-mon-go-dog`, latest production deployment targets `main`; domains straypaw.org / www |
| Other branches build *preview* deployments | `vercel.json` has no branch restriction except `dev`; `scripts/vercel-ignore.sh` builds whenever app paths change |
| Previews are SSO-protected | `ssoProtection: all_except_custom_domains` |
| Risk | Preview builds use the project's Preview environment variables. If those include the production Supabase service-role key, a team member submitting a report on a preview writes to production. Do not submit forms on the preview; see `docs/straypaw-2-acceptance.md` for the founder decision. |

This redesign therefore lives on the non-production branch above. Nothing was
merged, deployed, migrated or written to the database.

## Repository at a glance

* Next.js 15 App Router, React 19, MapLibre 6 + react-map-gl, Supabase JS,
  h3-js, framer-motion, Tailwind 3 + layered plain CSS.
* **96 page routes, 47 API routes** (re-counted at HEAD; matches the dated
  audit). 31 `/partner` routes.
* One post–Open App shell: `src/components/app/AppShell.tsx` with spaces from
  `src/components/shell/spaces.ts` (`community`, `feeder`, `educator`, `ngo`,
  `city`). Styles layered `shell.css → dark.css → paper.css → record.css →
  calm.css`, plus five older layers still imported for legacy classes.
* Landing `/` is outside the shell (`SiteHeader`, landing components). "Open
  app" in `SiteHeader` leads into the shell. **Untouched by this work.**

## Live database facts (read-only SQL, 17 Oct 2026)

| Table / object | Count / state | Meaning |
| --- | --- | --- |
| `dogs` | 30,288 | Animal *profiles*, mixing native and imported records. Not a count of unique living animals. |
| `cases` | 23,200 | Incidents/requests; native and imported historical coexist. |
| `animal_timeline_events` | 88,955 | Chronology across reports, care and outcomes. |
| `animal_followups` | 1,630 | Includes imported historical dates (`isHistoricalFollowup`). |
| `evidence_items` | 0 | Evidence capture does not exist yet → no automated outcome claims. |
| `ngos` / `ngo_members` | 22 / 7 | Roles in use: `admin`, `member` only. |
| `careos_*` RPCs, `care_inbox` | **absent** | WhatsApp/Telegram workspace integration is a contract, not live. |
| Tables without RLS | `spatial_ref_sys` only | Known PostGIS advisory; out of scope, no change made. |

## Data and spatial contracts (verified in code)

* Public map reads are bounded: `/api/livingmap?kind=cities` (national
  aggregates), `?city=` (complete per-H3 r8 aggregates), `?kind=area&h3=`
  (one area's animals/cases). No coordinate finer than an H3 cell reaches the
  public browser; area dots are seeded **schematic** positions and the map
  says so (`LivingMap.tsx`).
* Evidence kinds per city (`AtlasRegister.kindOf`): rescue, campaign, clinical
  (city-centroid register — Jamshedpur — drawn hollow), photo, register.
* Three states kept apart: value, zero, unknown (`lib/livingmap/types.ts`).
* Organisation scope: same API with the member's bearer token
  (`scope=org`), RLS-scoped server reads.
* Regression scripts guard bounded reads (`test:no-full-register`,
  `test:public-map-footprint`, `test:bounded-supabase-fetch`, `test:spatial`).

## Permission model (verified in code, RLS not externally validated)

* Browser uses the anon client; service-role only in server routes.
* `PartnerGate` / `usePartnerAccess` decide member state; signed-out visitors
  see an explanatory empty workspace (no private rows).
* Case writes go through RPCs (`take_case`, `update_case_status`,
  `assign_case`, `add_case_note`, follow-up RPCs) that return a server value.
  **Caveat found:** several helpers in `lib/case-actions.ts` return `true`
  when Supabase is not configured (`if (!supa) return true`). StrayPaw 2.0's
  Work inspector never treats that as a saved state: it checks `IS_LIVE`
  and the RPC's returned value before showing "Saved".
* Role vocabularies overlap (`admin`/`member` in DB; `lead`/`volunteer` in
  invite tooling). Not reconciled here; no role picker was added.

## Feature inventory → StrayPaw 2.0 home

| Existing capability | Route / code | State | 2.0 home |
| --- | --- | --- | --- |
| Living map (India → city → area → animal) | `/map`, `LivingMap`, `Panel` | working | Community **Map** (illustrated Field Atlas) |
| Nearby place page | `/app`, `CommunityDash` | working | Community secondary ("Nearby") |
| Report (guided, Turnstile, receipt) | `/report`, `lib/actions.reportSighting` | working (not submitted in audit) | Community **Report** |
| Saved animals, device reports, guest receipt | `/following`, `FollowingClient` | working, device-local | Community **My Activity** |
| Animal record | `/dog/[id]`, `LivingRecord` | working | Documentary profile |
| Stories | `/stories`, `StoryAtlas` | working | Community secondary, living publication |
| Insights | `/insights`, `PlaceBrief` | working | Municipality **Insights** (also community) |
| Programmes | `/programmes`, `/programmes/[id]` | working | Municipality **Programmes** |
| City brief | `/municipality`, `MunicipalBrief` | working | Municipality publishable **report** (`/municipality/report`); `/municipality` becomes the command **Map** |
| NGO Today queue + open-work map | `/partner`, `OpsRoom` | unverified (needs member) | NGO **Work** (queue + inspector) |
| Cases, case file, new case, follow-ups, medical, review, records, quality | `/partner/*` | unverified | NGO Work secondary (all routes retained) |
| Animal register + record | `/partner/animals`, `/partner/animals/[id]` | unverified | NGO **Animals** |
| Org map | `/partner/map` (LivingMap org scope) | unverified | NGO **Map** |
| Field today, tasks, camps | `/partner/field` | unverified | NGO Work field mode (retained) |
| Import / reconciliation | `/partner/import`, `lib/master-import` | unverified | NGO organisation utilities |
| Team, volunteers, codes, settings | `/partner/team` etc. | unverified | NGO organisation menu |
| Web incoming reports | `/partner/incoming`, `IncomingClient` | unverified | NGO Work (live fallback) |
| CareOS inbox | `/partner/inbox`, `CareInbox` | partial: shows disconnected | unchanged; **new backend required** |
| Lesson studio (Kind Hour PDFs, guides) | `/learn` | working | Education **Learn** → Learning Academy; materials kept in **Resources** |
| Public education page | `/education` | working | unchanged public page, links into Academy |
| Guides & emergency contacts | `/resources` | working | Community secondary; Education Resources links to it |
| Moderation | `/moderate` | unverified (admin) | unchanged |
| Admin | `/admin` | unverified (admin) | unchanged |
| Art credits | `/art-credits`, `lib/art/sources.ts` | working | extended with the commissioned-art slot register |

## Art and rights inventory

`public/art` holds CC0 Cleveland Museum of Art works (Rajasthani dog
paintings, Company-school hoopoe, Mithila paintings) and Gond paintings from
Wikimedia Commons (CC BY-SA 4.0 adaptations, plus one CC BY 4.0 Durga Bai Vyam
work). All are listed on `/art-credits`. These are legitimately licensed, but
**none is a StrayPaw commission**; the Commons Gond works are credited to an
uploader handle whose relationship to the original artist should be verified
before they carry the identity further. 2.0 keeps them where they already
appear and adds explicit, labelled commissioned-art slots for the dominant
folk-art identity (`src/lib/art/slots.ts`).

## Gaps that need new backend or founder decisions

1. CareOS (WhatsApp/Telegram) workspace RPCs, `care_inbox`, Meta group
   eligibility — **new backend required**; 2.0 keeps the disconnected state.
2. Authenticated cross-device My Activity — follows are device-local today.
3. Case offer → acceptance ledger (Decision 033/036) — no offer table; the
   Work inspector uses the existing `take_case` (claim) and status RPCs and
   labels them as such.
4. Identity merge review (Decision 038) — no reversible merge API exists;
   2.0 shows identity state and does not offer merges.
5. Evidence items (0 rows) — municipal reports cannot claim outcomes beyond
   recorded statuses.
6. An authorised NGO test account and a staging Supabase branch are needed to
   exercise every write path end to end.
