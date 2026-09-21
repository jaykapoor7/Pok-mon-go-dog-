# Sitemap review

Every public route, its one job, and the primary action it ends in. Produced
by walking the routes in the codebase against the placement map, and by
loading each public route in a real browser at 320 / 390 / 1280.

Status key: **OK** shipped and verified · **THIN** exists and works, content
or structure still owed · **TODO** specified but not built.

---

## Landing

| Route | Job | Primary action | Status |
|---|---|---|---|
| `/` | Convert: understand in five seconds, then act | Report a sighting | THIN — hero, map section, evidence and audience split are live; the trust strip with named partners, the testimonial component and the `SEC. —` divider system are not built |

## Product

| Route | Job | Primary action | Status |
|---|---|---|---|
| `/map` | The public live map | Report here | OK |
| `/app` | Community home: animals near you | Report an animal | OK |
| `/report` | File a sighting | Submit sighting | OK — photo skippable, migration applied in production; offline queue-and-sync not built |
| `/feed` | The public ledger | Open a record | OK — deduplicated |
| `/dog/[id]` | The atomic unit: one animal's record | Follow / open case | OK — SSR, indexable, schema.org, in the sitemap |
| `/following` | Saved animals | Find an animal | THIN |
| `/you` | Community dashboard, "My StrayPaw" | — | TODO — not built |

## Audiences

| Route | Job | Primary action | Status |
|---|---|---|---|
| `/for-ngos` | Why an NGO should partner | Apply to partner | OK |
| `/partnerships` | — | — | Redirects to `/for-ngos`; the pitch/reference split is not built |
| `/for-governments` | The municipal buyer | Request a pilot | OK |
| `/partner-apply` | NGO application | Submit application | OK |
| `/partners` | Named operational partners | Become a partner | OK |
| `/get-involved` | Individual pathways | Pick a route | OK |

## Evidence

| Route | Job | Primary action | Status |
|---|---|---|---|
| `/evidence` | What the numbers say | Read a source | OK |
| `/insights` | The sharp reads | Read the gap | OK |
| `/research` | The source library | Open a source | OK |
| `/gaps` | What is not known | Fund the work | OK |
| `/needs` | What closing a gap costs | Contact | OK |
| `/programmes` | The registers | Open a register | OK |
| `/stories` | Proof of care | Open a record | OK — only closed cases are published |
| `/news` | Outside coverage | Read | OK |

## Help and learn

| Route | Job | Primary action | Status |
|---|---|---|---|
| `/help` | Animals needing care | Offer help | THIN — cards say "Needs Help" without saying what is needed |
| `/resources` | Emergency utility | Call a helpline | OK — first-aid steps no longer obscured |
| `/learn` | Explainers | Read | OK — population figure reconciled |
| `/orgs` | Directory of organisations | Open an organisation | OK |

## Company

| Route | Job | Primary action | Status |
|---|---|---|---|
| `/about` | The humans | — | THIN — redirects to `/mission`; team, advisors, founder story and entity type are not built |
| `/mission` | Why this exists | Get involved | OK |
| `/what-we-do` | The journey | Report | OK |
| `/transparency` | The register, counted | Read the evidence | OK |
| `/data-governance` | DPDP posture | Request a removal | OK |
| `/changelog` | Momentum | See the register | OK |
| `/contact` | Talk to us | Send | OK |

## Legal (footer only)

`/privacy`, `/terms`, `/community-guidelines`, `/safety`, `/cookies`,
`/report-content` — all render, all reachable from the footer.

## Utility

`/offline` — served by the service worker when a navigation fails. OK.

---

## Findings

1. **No orphans among the pages checked.** `/transparency`, `/changelog` and
   `/data-governance` were added to the footer when they were created;
   `/for-governments` is in the header under the audience group.
2. **Duplication resolved once.** `/partnerships` no longer competes with
   `/for-ngos`. If the pitch/reference split is wanted later, it should be
   rebuilt deliberately rather than by restoring the old card wall.
3. **Zero horizontal overflow** across 17 representative public routes at
   320, 390 and 1280.
4. **The two biggest gaps** are `/you` (the community dashboard, not built)
   and `/about` (currently a redirect, owed a team and entity section).
   Both are listed as TODO above rather than quietly omitted.
