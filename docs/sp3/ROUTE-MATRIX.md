# StrayPaw 3.0 — route-by-route change matrix

Classification: **R** redesigned · **S** integrated into the new application
shell (inherits the 3.0 sidebar, top bar, StrayPaw AI and re-pointed tokens)
· **P** preserved with updated styling (new nav/footer + legacy bridge) ·
**C** consolidated with a redirect · **T** retained as a specialised tool ·
**N** new.

Every route below returned 200 on the local production build (`e2e/sp3.spec.ts`
"every public and app route answers 200"), unless marked otherwise.

## Public site

| Route | Class | What changed |
|---|---|---|
| `/` | R | Hero "Every intervention. Accounted for." + interactive product demo (dashboard, WhatsApp phone, AI); partner strip with relationship labels; product tour; use-case tabs; AI showcase; integrations with live status; platform screens; customer stories; trust; FAQ; footer CTA. Primary CTA: Request a government demo. |
| `/platform` | N | Three layers (Operations, AI, CareOS), modules, review, reports, integrations, security. |
| `/ai` | N | StrayPaw AI: what it does, the real tool list, guardrails. |
| `/whatsapp` | N | CareOS: flow, honest status table (built / waiting on Meta / not started). |
| `/solutions` | R | Solutions index (5 solutions + public tools + platform). |
| `/solutions/abc-arv`, `/solutions/rescue-care` | N | Solution pages. |
| `/for-governments`, `/for-ngos`, `/for-funders` | R | Municipalities, NGOs, Funders solution pages (no CSR pitch, no prices). |
| `/customers` | N | Partner evidence, relationship labels, stories. |
| `/customers/[slug]` | N | Case studies: Pawsome People Project, Kind Hour Foundation (problem, use, workflows, results with source, limitations, no unapproved quotes). |
| `/demo` | N | Demo / pilot request form → existing `/api/contact`. |
| `/docs` | N | Product documentation. |
| `/faq` | R | Same content, 3.0 layout, public chrome. |
| `/for-community`, `/for-feeders`, `/education`, `/our-story`, `/contact`, `/licences`, `/partner-programmes` | P | CoShell/AudiencePage on light 3.0 header, sans type, blue CTAs (flame kept for Report). |
| `/mission`, `/evidence`, `/explore`, `/get-involved`, `/the-network`, `/how-to-help`, `/data-governance`, `/research-standards` | P | New nav/footer; serif italics removed. |
| `/privacy`, `/terms`, `/cookies`, `/safety`, `/donate`, `/community-guidelines`, `/report-content` | P | Public chrome, new nav/footer. |
| `/partner-apply` | P | Public layout instead of the retired console frame. |
| `/embed/[slug]` | T | Unchanged (iframe artefact, no chrome). |
| `/offline` | T | Unchanged. |

## Entry and account

| Route | Class | What changed |
|---|---|---|
| `/sign-in` | N | Split screen: "Authorised users only" acknowledgement, then the existing email + code sign-in (`signInWithCode`, the same `/api/join` path as before); right side: What's new (shipped items only), app preview, partner story. |
| `/app` | R | Open App gateway: members → their workspace (`is_ngo_member`/`my_ngo`), others → sign in / join with code / request access / public tools. Was a redirect to `/community`. |
| `/join`, `/access` | R | Existing code flows inside the 3.0 entry frame. |
| `/reset-password` | P | Unchanged flow. |
| Sign-in sheet (`AuthProvider`) | R | Same logic, 3.0 styling; keeps the pending-action behaviour. |

## Application (all inside the 3.0 shell)

| Route(s) | Class | Notes |
|---|---|---|
| `/ngo` (Work), `/ngo/inbox`, `/ngo/animals`, `/ngo/animals/[id]`, `/ngo/cases/[id]`, `/ngo/cases/new`, `/ngo/programmes`, `/ngo/programmes/[id]`, `/ngo/field`, `/ngo/review`, `/ngo/proof`, `/ngo/map`, `/ngo/import`, `/ngo/team`, `/ngo/settings`, `/ngo/care`, `/ngo/quality`, `/ngo/evidence`, `/ngo/stories`, `/ngo/fundraising`, `/ngo/fundraising/new`, `/ngo/volunteers`, `/ngo/feeding`, `/ngo/projects`, `/ngo/surveys` | S | Sidebar: Work, Inbox, Animals, Programmes, Field operations, Evidence review, Reports, Map, StrayPaw AI; the rest in collapsible groups. Verified signed in against staging. |
| `/city` (Map), `/city/insights` (Overview), `/city/programmes`, `/city/programmes/[id]`, `/city/report` | S | Municipal workspace first in the switcher. |
| `/community`, `/community/report`, `/community/activity`, `/community/stories`, `/community/organisations[/slug]`, `/community/help`, `/community/feeding[/id]`, `/animal/[id]`, `/search` | S | Community workspace. |
| `/learn`, `/learn/courses/...`, `/learn/workshops`, `/learn/resources`, `/learn/playground` | S | Education workspace. |
| `/trust`, `/trust/console` | T | Moderation console inside the shell. |
| `/fundraisers`, `/fundraisers/[id]`, `/fundraisers/new`, `/surveys`, `/surveys/[id]`, `/surveys/[id]/collect` | S | Were in the retired 2.0 console (`AppShell`); now in the 3.0 shell. |
| `/assistant` | N | Full-screen StrayPaw AI. |

## APIs

| Route | Class | Notes |
|---|---|---|
| `/api/ai` | N | StrayPaw AI (caller-scoped reads, proposals, no service role). |
| `/api/ai/log` | N | Optional structured log; reports `not_deployed` until `supabase/proposed/ai_action_log.sql` is applied. |
| `/api/careos/webhook` | N | Meta handshake + signature check → `careos_enqueue`; 503 until configured. |
| All existing `/api/*` | — | Unchanged. |

## Redirects added (307, reversible)

`/product → /platform`, `/partners → /customers`, `/case-studies`, `/customer-stories → /customers`,
`/login`, `/signin`, `/log-in → /sign-in`, `/signup`, `/sign-up → /access`, `/book-a-demo`,
`/request-demo`, `/pricing → /demo`, `/security → /platform#security`,
`/integrations → /platform#integrations`, `/straypaw-ai → /ai`, `/careos → /whatsapp`,
`/documentation → /docs`, `/solutions/municipalities|ngos|funders → /for-*`.
Removed: `/app → /community` (now the gateway). All earlier redirects are kept.
