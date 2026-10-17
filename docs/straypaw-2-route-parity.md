# StrayPaw 2.0 — route and feature parity

Every 1.0 route after "Open app", where it goes now, and whether the work it
did survives. Redirects live in `next.config.mjs`, all temporary (307) so a
rollback is not fought by cached permanent redirects. Query strings are
carried. Tests: `e2e/straypaw2.spec.ts` checks the redirects marked ✓e2e.

Parity: **full** (everything the old screen did is possible in 2.0),
**partial** (named gap), **parked** (1.0 page kept, reachable, not redesigned),
**kept** (public site page, outside the app).

## Community

| 1.0 route | 2.0 destination | Parity | Notes |
|---|---|---|---|
| `/app` | `/community` ✓e2e | full | Community home is the Atlas |
| `/map`, `/explore`, `/atlas`, `/feed` | `/community` ✓e2e (`/map`) | full | `?city=` carried |
| `/report` | `/community/report` ✓e2e | full | Sighting and needs-help doors; `?animal=`, `?lat&lng`, new `?help=1` |
| `/following`, `/account` | `/community/activity` ✓e2e | full | Device reports + account reports + follows. Cross-device follows still not supported (as before) |
| `/dog/:id` | `/animal/:id` ✓e2e | full | Public documentary depth; casefile link for the holding organisation |
| `/stories`, `/journey`, `/timeline`, `/outcomes`, `/rescues`, `/care` | `/community/stories` | full | Same published-story reads and count; city filter; cursor pagination |
| `/orgs`, `/adopt` | `/community/organisations` ✓e2e | full | Directory ledger with impact units |
| `/org/:slug` | `/community/organisations/:slug` | full | Impact, areas, programmes, activity, animals |
| `/help` | `/community/help` | full | Steps, helplines, bite steps, flagged animals |
| `/feeding`, `/feeding/new`, `/feeder` | `/community/feeding` | full | Spots by **area**; pin kept server-side (deliberate privacy change) |
| `/feeding/:id` | `/community/feeding/:id` | full | Volunteer days, withdraw, fed-today check-in. Not verified with data: no feeding spot exists in the record yet |

## NGO

| 1.0 route | 2.0 destination | Parity | Notes |
|---|---|---|---|
| `/partner`, `/dashboard`, `/partner/operations`, `/partner/cases`, `/cases` | `/ngo` ✓e2e | full | Action-first queue, cohorts, inspector, map pane, keys |
| `/partner/followups` | `/ngo?focus=followup` | partial | Overdue scheduled follow-ups are in the queue and each casefile; the dedicated historical-follow-up list is not rebuilt |
| `/partner/cases/new`, `/cases/new` (`?dog`, `?dogId`) | `/ngo/cases/new?dog=` ✓e2e | full | Pin, animal link, informer contact |
| `/partner/cases/:id`, `/cases/:id` | `/ngo/cases/:id` | full | Next step, follow-ups, full chronology, related cases |
| `/partner/animals`, `/partner/records` | `/ngo/animals` | full | Register with filters, CSV page export |
| `/partner/animals/:id` | `/ngo/animals/:id` | full | Casefile: cases, follow-ups, timeline, care form, needs-help flag |
| `/partner/map` | `/ngo/map` | full | Atlas with the member's token (`scope=org`) |
| `/partner/inbox`, `/partner/incoming` | `/ngo/inbox` | full | Triage, file into drive, open case; WhatsApp shown as not connected |
| `/partner/review` | `/ngo/review` ✓e2e | full | Three cohorts incl. reasonless closures |
| `/partner/field` | `/ngo/field` | full | Plus offline note drafts |
| `/partner/import` | `/ngo/import` | full | Preview, mapping, per-row identity decision, commit |
| `/partner/drives`, `/partner/drives/:id` | `/ngo/programmes`, `/ngo/programmes/:id` | full | Partition strips, create, archive, CSV |
| `/partner/reports` | `/ngo/proof` | full | Same export services |
| `/partner/team`, `/partner/codes` | `/ngo/team` | full | Members, roles, codes, invite |
| `/partner/settings` | `/ngo/settings` | full | Profile through `ngo_update_profile` |
| `/partner/medical` | kept | parked | Organisation-wide care ledger; per-animal care is in the casefile |
| `/partner/quality` | kept | parked | Data-quality checks |
| `/partner/volunteers` | kept | parked | Volunteer sign-ups |
| `/partner/stories` | kept | parked | Choosing which case stories are public |
| `/partner/resources` | kept | parked | Evidence files |
| `/partner/fundraising`, `/partner/fundraisers/new` | kept | parked | Architecture doc: fundraising parked |
| `/partner/surveys`, `/partner/projects` | kept | parked | |
| `/partner/feeding` | kept | parked | Organisation feeding spots |

Parked NGO tools are linked from the NGO Index under "Not yet redesigned" and
still run inside the 1.0 partner layout and gate.

## Municipality

| 1.0 route | 2.0 destination | Parity | Notes |
|---|---|---|---|
| `/municipality` | `/city` ✓e2e | full | Geographic layers, evidence drawer |
| `/insights`, `/transparency` | `/city/insights` ✓e2e | full | Findings with method; loaded-scope disclosure added |
| `/programmes`, `/interventions`, `/studies` | `/city/programmes` ✓e2e | full | Time axis, honest units |
| `/programmes/:id` | `/city/programmes/:id` | full | |

## Education

| 1.0 route | 2.0 destination | Parity | Notes |
|---|---|---|---|
| `/learn` | `/learn` (replaced in place) | full | Academy; Kind Hour material moved to Workshops, credited |
| `/resources` | `/learn/resources` ✓e2e | full | Helplines and bite steps identical; national welfare-organisation directory (`lib/platform/orgs`) with state and text filters. The 1.0 "Data & research" links live on `/evidence` |
| `/education` | kept | kept | Public editorial page |

## Trust

| 1.0 route | 2.0 destination | Parity | Notes |
|---|---|---|---|
| `/moderate` | `/trust` ✓e2e | full | Same `/api/admin/sightings` contract |
| `/admin` | `/trust/console` | parked | 1.0 console mounted unchanged |

## Public site (kept, untouched)

`/` (landing hero unchanged), `/about`, `/access`, `/art-credits`, `/contact`,
`/cookies`, `/data-governance`, `/donate`, `/education`, `/embed/[slug]`,
`/evidence`, `/faq`, `/for-funders`, `/for-governments`, `/for-ngos`,
`/get-involved`, `/how-to-help`, `/join`, `/offline`, `/partner-apply`,
`/partners`, `/partnerships`, `/privacy`, `/report-content`,
`/research-standards`, `/reset-password`, `/safety`, `/terms`, `/the-network`,
`/fundraisers` (+`[id]`, `new`), `/surveys` (+`[id]`, `collect`).

## Removed code

1.0 page files for every redirected route, and 144 components no remaining
route reaches (found by an import-graph walk from `src/app` and `src/sp`).
`src/lib` is kept whole: it is the data and permission logic 2.0 runs on.
`src/lib/livingmap/stories.ts` was removed (it depended on deleted 1.0 map
components and nothing imported it).
