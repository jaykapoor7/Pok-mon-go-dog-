# StrayPaw 2.0 — traceability

Every approved FigJam workflow and decision, and every founder-approved creative
reference, mapped to what was built, where it lives, and how it was verified.

Status words follow the brief's output contract: **built** (code exists and
renders), **verified** (exercised in a browser at desktop and phone width, or by
a test), **blocked** (needs something outside this branch), **proposed only**,
**requires founder decision**.

FigJam source: the board was read from the founder's PDF export because the
Figma MCP hit the Starter plan rate limit and the REST API refused access. The
PDF text was extracted in full; diagram geometry that exists only as shapes, not
text, may be under-represented. See "What I still need" at the end.

## 1. FigJam workflows → implementation

| FigJam section / decision | What it asks | Implementation | Status |
|---|---|---|---|
| 013 One product, role-aware | One identity, four workspaces | `src/sp/shell/Shell.tsx`, `workspaces.ts`: one ink bar, workspace switcher, membership-aware NGO entry | verified |
| 014 Shell & navigation (left open in FigJam) | Desktop topology, mobile destinations, More | Adaptive shell: 3 destinations per workspace, Index sheet for the long tail, ⌘K / `/` Finder, phone thumb bar with the workspace's single action | verified · **requires founder decision** (014 is marked open on the board) |
| 015 Three destinations per workspace | Community Map/Report/Activity; NGO Work/Animals/Map; Municipality Map/Programmes/Insights; Education Learn/Workshops/Resources | Exactly these, in `workspaces.ts` | verified |
| 016 Progressive atlas | India → city → area → animal, only at source precision | `src/sp/atlas/Atlas.tsx`: national city stamps by evidence kind, H3 areas, animal dots only at area level, clinical city never drawn as areas | verified |
| 017 Progressive selection | Marker → inspector → record; keep camera, filters, return path; mobile sheet | Inspector (`Inspector.tsx`), URL state (`city, lens, area, animal, t, cmp, place`), `/animal/[id]?from=` back link, phone sheet | verified |
| 018 Progressive map controls, four lenses | Animals, Needs help, Open requests, Care; advanced contextual | `lenses.ts` `PUBLIC_LENSES` + "More" lenses; method line names the unit | verified |
| 019 One animal, two depths | Public documentary profile and professional casefile, same ID | `/animal/[id]` (`AnimalRecord.tsx`) and `/ngo/animals/[id]` (`Casefile.tsx`); casefile link shown only to the holding organisation | verified (casefile with synthetic member session) |
| 020 Adaptive reporting + tracking | Sighting vs needs-help, short questions, honest receipt | `/community/report` (`Report.tsx`): two doors, one question per screen, live draft, receipt ladder with only "Received" lit; `?help=1`, `?animal=`, `?lat&lng` | verified (e2e with `/api/report` mocked) |
| 008 Report receipt rules | Received ≠ accepted | Receipt and My Activity ladder; Help page copy | verified |
| 008B Case closure contract | Outcome, date, actor; exceptional closures reviewed | `NextStep.tsx` Outcome/Close forms via `update_case_status` / `review_case`; Review page | verified (harness) |
| 008C Cases and follow-ups separate | Follow-ups survive closure | Close form warns about follow-ups that stay due; casefile lists follow-ups independently | verified (harness) |
| 008D Routing and ownership | Who holds a case | Take / assign / reassign in `NextStep`, owner column and "Unowned" focus in Work | verified (harness) |
| 008E Unaccepted cases | An offer is not ownership | Inbox: nothing becomes a case on its own; Work shows "Nobody yet" | built · the offer/acceptance **ledger** itself is **blocked** (no backend) |
| 008F NGO case team structure | Leads, members, volunteers | `/ngo/team`: roles, codes, add/remove, role guide | verified (harness) |
| 008G Risk-based task acceptance | Accept by risk | Critical cohort first in the queue; explicit acceptance step | built · acceptance ledger **blocked** (no backend) |
| 021 Action-first NGO Work | Queue, not KPI wall | `/ngo` (`Work.tsx`) | verified |
| 022 Linked Animals / Map / Work | Shared selection context | Work map pane narrows the queue; inspector links to casefile and `/ngo/map?area=` | verified |
| 023 Municipality command centre | Geography + defensible evidence | `/city` Atlas `variant="city"` with layer index, evidence drawer, method line | verified |
| 024 CareOS / WhatsApp | Conversational workflow | Shown honestly as **not connected** (Inbox channel, Settings) | **blocked** (no backend; see `straypaw-2-careos.md`) |
| 025 Queue + inspector + immediate action | | Work inspector with receipts | verified |
| 026 Scoped membership, grants | | Team page; gates on every NGO page | built · temporary grants/expiry **blocked** (no backend) |
| 027 Presentation-ready reports | | `/city/report` printable; `/ngo/proof` documents | verified |
| 029–036 Phase 4 | Programmes, import, My Activity, education, triage, municipal layers, verification, task ledger | Programmes (`/ngo/programmes`, `/city/programmes`), Import (`/ngo/import`), Activity, Academy, Inbox/Review, city layers | verified except 035 progressive verification (**requires founder decision** on criteria) and 036 task ledger (**blocked**) |
| 037 Unified search | | Finder (⌘K) and `/search` | verified |
| 038 Human-reviewed identity | No automatic merges | Import per-row decisions; moderation "approve as that animal" with a warning; register footnote | verified · reviewed merge **tool** **blocked** (no API) |
| 039 Documentary stories | Real photos, no invented outcomes | `/community/stories` | verified |
| 040 Immersive with reduced motion | | Camera travel, sheets, playback; `prefers-reduced-motion` honoured in CSS and camera durations | verified (reduced-motion screenshots) |
| 041 Admin / trust workspace | Moderation, access, verification, audit | `/trust` moderation queue rebuilt; `/trust/console` carries the 1.0 console unchanged | built · console **not redesigned** |
| 042 Privacy embedded | | Sensitive photo veil everywhere, public locality only, feeding pins kept server-side, contact fields marked private | verified |
| 043 Preserve context, drafts, pending ≠ saved | | Report draft, field-mode offline drafts, `Receipt`/`Ack` everywhere | verified |
| 044 One original brand system | | `src/sp/sp.css` + workspace registers | verified |
| 01 · Community / Map | | Atlas, Stories, Organisations, Help, Feeding spots | verified |
| 02 · NGO / Workspace | | Work, Inbox, Review, Animals, Casefile, Cases, Map, Field, Import, Programmes, Proof, Team, Settings | verified (harness) |
| 03 · Clinical / partners | Clinical evidence tiers (009, 009B) | Casefile labels care as "recorded by an organisation, not clinician-signed"; Jamshedpur shown at city level only | built · clinician sign-off **blocked** (no backend) |
| 04 · Municipal / civic | | Map, Programmes, Insights, City report | verified |
| 06 · Education / outreach | Learn, Workshops, Resources | Academy (4 courses, 9 lessons, 9 exercises), Workshops, Resources, Playground | verified |
| 07 · Animal profile | Identity, history | `/animal/[id]` | verified |
| 08 · Messaging / WhatsApp | | Not connected states | **blocked** |
| 09 · Mobile / accessibility | | Phone thumb bar, sheets, 44px targets, keyboard, focus, labels | verified at 390px |
| 10 · Admin / trust | | `/trust` | built |

## 2. Creative references (01–14) → application

| # | Reference | Decision | Where it shows up |
|---|---|---|---|
| 01 | NYC Parks Tree Map | Strongly adopt colourful hand-drawn atlas | `cartography.ts` field inks (turmeric, indigo, leaf, terracotta), paper fibre ground, two-ink off-register echo rings, hatch for unknown, printed sterilisation pies per area |
| 02 | Opportunity Atlas | Adopt scale change, area comparison | Compare up to three areas in the inspector; national stamps coloured by evidence kind |
| 03 | Radio Garden | Fluid map motion, no globe | Camera fly between scales, flat India projection, minimal chrome |
| 04 | Flightradar24 | Connected inspectors, multi-select, playback | Inspector, compare, month playback over recorded months only; no animal tracks |
| 05 | Happywhale | Distinct animal identity | Animal record: StrayPaw ID strip, chronology by year, "who has recorded it" |
| 06 | Photo Ark | Documentary portraits, honest no-photo | `Portrait`: real photo large with credit, sensitive veil, typographic "No photograph recorded" plate |
| 07 | Linear | Task-first queue | Work queue, j/k/Enter/o/m keys, grouping, focus filters, inspector |
| 08 | EarthRanger | Queue/map coordination, field honesty | Work map pane, `/ngo/map`, Field mode with offline drafts labelled "not sent" |
| 09 | Global Fishing Watch | Municipal layers, presentable reports | City layer index, evidence drawer, City report |
| 10 | City Layers (substitute for layers.city) | Provenance, place-to-decision | Method line on every map and finding; evidence drawer ledger. Not attributed to layers.city |
| 11 | Bartosz Ciechanowski | Manipulable explanations | Academy exercises: unknown ledger, precision lens, model street |
| 12 | Ableton Learning Music | Full academy, no login | Courses, lessons, progress on device, playground, workshops for facilitators |
| 13 | Stripe Press | Living publication | Serif display type, numbered findings, City report with cover and contents, stories on a year spine |
| 14 | animations.dev | Purposeful motion | Report screen transitions, sheet motion, camera travel; reduced-motion alternatives |

## 3. Folk art

Folk art is the dominant identity **as commissioned work**, not as generated
imitation. Every place it belongs is an `ArtSlot` in `src/sp/ui/slots.ts`
(11 slots), currently rendering an original two-ink geometric plate labelled
"Artwork to be commissioned". No Gond, Warli, Madhubani, Pattachitra or Saura
motif was drawn or generated. See `ART_SLOTS.md` for the commission brief per
slot. The 1.0 CC0 museum art was not carried over, per the founder's
"start clean" answer.

## What I still need

- FigJam: confirmation that the PDF captured every connector and diagram label
  (sections 05 and the ERD/state-machine diagrams are partly geometric).
- Decision 014 (shell) and 035 (verification criteria) are open on the board.
- Commissioned artwork for the 11 slots.
