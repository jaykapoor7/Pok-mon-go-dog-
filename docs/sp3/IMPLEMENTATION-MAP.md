# StrayPaw 3.0 — reference-to-StrayPaw implementation map

Written 2026-10-31 before the 3.0 build, after auditing the repository,
production (Supabase `toujthlzjmhmoyykmayx`, Vercel `pok-mon-go-dog`) and the
GovDash public site.

## What production actually holds today (re-verified, read-only SQL)

| Fact | Value | Consequence for 3.0 |
|---|---|---|
| `careos_*` functions in production | **0** | WhatsApp is shown as *not connected* everywhere. |
| `careos_*` functions in staging (`straypaw-staging`) | 19 | DB layer exists for testing; no Meta webhook or worker is deployed anywhere. |
| Meta / WhatsApp credentials on Vercel | none | Blocker for live WhatsApp. |
| `ANTHROPIC_API_KEY` on Vercel | none | StrayPaw AI runs on its deterministic record tools; the language model turns on when a key is added. |
| `cases` / native (non-import) | 23,200 / 5 | Never present imports as live usage. |
| `sightings` last 30 days | 0 | No "live activity" claims. |
| Organisations with a logged-in member | 4 of 22 | — |
| Operational partners (`partner_status`) | The Pawsome People Project | Only verified operational customer story. |

## Product thesis applied (founder note, 2026-10-31)

GovDash wins because it removes an expensive recurring workflow. StrayPaw's
first commercial workflow is the **municipal ABC/ARV programme**: an NGO
prepares the register, a municipal reviewer resolves incomplete records, and a
monthly report goes out. Every page leads with that one workflow. Rescue,
community, education and funders are expansion, reachable but secondary.
Savings are *not yet measured*; no page claims a time saving. Corporate CSR
funding is not pitched (founder instruction).

## GovDash pattern → StrayPaw implementation

| GovDash pattern | StrayPaw 3.0 |
|---|---|
| Off-white ground, left-aligned large sans hero, blue pill CTA + outline CTA | Cream-white ground `#fbf9f4`, DM Sans display, StrayPaw blue `#2457ce` primary, ink outline secondary. Flame stays reserved for urgency/Report. |
| Navbar: Platform ▾ · Solutions ▾ · Customers · Resources ▾ · Login · Book a demo | `Platform ▾ · StrayPaw AI · Solutions ▾ · Customers · Resources ▾ · Sign in · Book a demo` (`src/sp3/site/Nav.tsx`), replacing `SiteHeader` on every public page. |
| Hero product window: app sidebar + agent table + phone overlay | `HeroDemo`: municipal programme dashboard + WhatsApp phone + AI panel, interactive, labelled "Product demo". Figures come from the public Pawsome programme archive. |
| Underlined use-case tabs with explore links | Use-case tabs: Sterilisation · Vaccination · Rescue · Evidence review · Reporting. |
| "Give recurring work to agents" | StrayPaw AI section: questions, record search, prepared actions, summaries — each mapped to a real tool name. |
| Integrations grid | WhatsApp (status: not connected), Web & mobile, Excel/CSV import (live), Public map embed (live), Email (live). |
| Customer stories with stats + quotes | Pawsome (operational partner, historical register import + workspace) and The Kind Hour Foundation (historical register import). No quotes until approved. Results are record counts with source, not savings. |
| Security block | Provenance, review, RLS permissions, privacy, audit history, honest limitations. |
| Split-screen login | `/sign-in`: left form (existing email + code flow), right "What's new" (real commits shipped) + app preview. |
| App: refined sidebar, quick actions ⌘K, sections | New `Shell`: desktop sidebar (workspace switcher, primary nav, "More" groups, AI, account), clean topbar with breadcrumb, search and AI; phone keeps thumb bar. |
| Dash assistant panel / agents page | StrayPaw AI launcher → right panel → `/assistant` full page, same engine. |

## Architecture rules kept

- Operations (Supabase records) = system of record. AI = read tools under the
  caller's own session (RLS applies) + write *proposals* the person confirms,
  executed through the same RPCs the manual UI uses. CareOS = intake channel
  into the same `cases`/`sightings`.
- No new tables applied. An optional `ai_action_log` migration is drafted but
  **not applied** (`supabase/proposed/`).
- No URL is removed; consolidations are redirects.
