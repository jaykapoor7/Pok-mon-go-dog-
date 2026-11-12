# StrayPaw: product structure

12 November 2026. The structure every screen follows, by role. Bengaluru's BeST
programme informs it; nothing here is Bengaluru-specific (a programme is a
configuration: its partners, areas, modules and settings are rows).

The visual language is the product demo on the landing page
(`src/sp4/home/HeroDemo.tsx`): a light sidebar with the place, a blue **Quick
actions ⌘K**, modules with coloured squares, a **Platform** group; the pages you
have open as tabs; the work on a soft grey stage in white hairline cards; small
tags; Inter at weight 500; rows that pop in one after another. One design system,
`src/sp/shell/console.css` (frame) and the page parts in `src/sp/ui`.

---

## 1. Principles

1. **A place, then a role, then at most five things.** A person works in places
   (an NGO, a hospital, a laboratory, a municipal office, a programme cell). The
   sidebar shows the place's Today, at most four modules for their role, the
   programme they share with partners, and Platform (Kaju, team, everything else).
   Nothing is in the menu because it exists; everything else is one index (⌘K).
2. **Home is the morning brief.** Every role's home answers three questions:
   what changed since yesterday, what needs me today (each with its one action),
   and where the line of work stands. Then a line to ask Kaju.
3. **One record, connected.** An animal, a case, a bite (exposure), a sample, a
   package: each is one page that says where it is in its line, gives the one next
   step the person's role allows, tells its story down the page with who recorded
   what, and links to the records around it.
4. **Kaju where the work is.** Kaju reads with the person's permissions, shows the
   steps it runs, cites the records it used, and never saves without a person.
5. **Every figure has a source.** Provenance (imported, field, clinician, laboratory,
   Kaju-prepared), who approved what and when, and the uncertainty of an estimate
   are shown on the record, not in a manual.
6. **The phone is a first-class product** for field staff: a round of stops, one
   capture control, offline by default, follow-ups that come to them.
7. **Citizens get two doors**: report an animal, and get help after a bite. No
   account, no jargon.
8. **Three interactions.** Any common action is reachable in about three clicks
   or taps from where the person is: Quick actions (⌘K) and the open-page tabs
   are the short paths; a row's verb opens the step itself, not a page about it.
9. **Not everything is a dashboard.** Each feature takes the smallest form that
   does its job: a single-purpose screen (record a bite, capture an animal, sign a
   procedure), a drawer over the list it belongs to (peek a record, assign, add
   evidence), a command in Quick actions (new case, import, invite), or one button
   inside the workflow it serves (send to the vet, add to the package). Pages of
   cards and counts are kept for the few places where a person watches a whole
   line (Home, the board, a programme overview).
10. **10/20/30 on every screen** (adapted from Guy Kawasaki's rule for slides):
    at most **10** things compete for attention in the first view; a person knows
    what the screen is for and what to do within **20** seconds; no sentence is
    longer than **30** words, and most labels are under five. Explanations move
    into a tooltip, a fold, or Kaju.
11. **The landing demo is the product.** What the landing page shows (sidebar,
   tabs, the brief, Kaju's runs, results, packages) is what a person sees after
   signing in. Screenshots of both are compared on every visual pass.

## 1a. The journey that must work end to end

A citizen reports an animal (public, no account) → the area's NGO receives it in
Intake, a coordinator assigns it → a field worker finds the animal, records it on
the phone (offline if needed) → a veterinarian signs the procedure → the field
worker adds release evidence → the coordinator reviews and the record goes into
the month's package → the municipal reviewer accepts or queries the package →
a researcher reads the de-identified extract. Each handoff uses the real records,
roles and row-level permissions; no step is simulated.

## 2. Roles, homes and menus

| Role (place) | Home answers | Modules (≤4) | Programme | Phone |
|---|---|---|---|---|
| NGO coordinator / admin | Records ready for review, partner requests, the month's package, the line | Pipeline · Animals · Reports | Requests · Coverage · Care network | Today · Pipeline · New case · Kaju |
| Field worker (NGO member) | Today's round: follow-ups due, cases held | Round (field) · Pipeline · Animals | Requests | Round · Record · Animals · Kaju |
| Veterinarian (NGO) | Procedures waiting for sign-off | Sign-off · Animals · Care records | — | Today · Sign-off · Animals · Care |
| Hospital clinician / nurse | Doses due today and overdue, new bites, courses completed, vaccine confirmed | Today · Bite register · Record a bite · Services | Requests · Care network | same |
| Laboratory | Samples arriving, testing, results due | Samples · Results | Requests | same |
| Municipal reviewer | Packages waiting for a decision, coverage against target | Review · Contracts · Wards | Programmes | Today · Review · Wards |
| Programme cell (coordination) | Alerts needing a decision, work between partners | Overview · Work between partners · Coverage · Report | Care network · Research data · Setup | same |
| Researcher | Extracts available, data quality | Research data · Analytics | — | — |
| Citizen (public) | — | Report an animal · Help after a bite · Track my report | — | same |

## 3. Screen decisions

**Merged into the Pipeline (one board, views as tabs):** work queue (`/ngo/work`),
intake (`/ngo/inbox`), sign-off and evidence (`/ngo/verification`), decisions
(`/ngo/review`), field mode (`/ngo/field`, the round).

**Merged into Animals (views):** care ledger (`/ngo/care`), map (`/ngo/map`),
identity review (`/ngo/animals/identity`), data quality (`/ngo/quality`), scan
(`/ngo/animals/scan`).

**Merged into Reports (views):** packages (`/ngo/packages`), proof
(`/ngo/proof`), evidence (`/ngo/evidence`), contracts (`/ngo/contracts`).

**Into the field round:** offline (`/ngo/offline`), readiness checks.

**Settings (admin only, from the account menu):** team, settings, policies,
connections, import.

**Index only (⌘K, All sections), never in the menu:** projects, fundraising,
stories, volunteers, feeding, surveys, training (also offered in context).

**Municipal:** Today (`/city/insights`), Review (`/city/review`), Contracts,
Wards (`/city`); programmes, report and connections from the index.

**Public:** Community is reporting and help; feeding and stories stay public
pages, not destinations of the app.

## 4. Records and their lines

| Record | Line (rail) | Next step by role | Story |
|---|---|---|---|
| Case | New → In care → Closed (or on to vet, evidence, report for ABC) | assign, start, record outcome, close with reason | updates, care, follow-ups |
| Animal | — (its open case shows its place in the line) | open its case or a new one | cases, follow-ups, care, operations, source timeline |
| ABC record | New → In care → With the vet → Evidence → To report | vet signs; field adds evidence; coordinator reviews | procedure, evidence, approvals |
| Bite (exposure) | Recorded → Category → Course → Completed / Stopped | clinician sets category and course; nurse records doses | doses, reminders, calls |
| Sample | Collected → On its way → Received → Testing → Result | each custody step by its holder | custody, result with method |
| Package | Prepared → With the office → Accepted / Queried | coordinator submits; office accepts or queries | approvals and queries |

## 5. Reference per screen

Filled from the reference study (`docs/PRODUCT-STRUCTURE.md` §5 is updated with
sources when the study is complete).

## 6. Status

What is built against this structure is tracked in `docs/LEDGER.md`.
