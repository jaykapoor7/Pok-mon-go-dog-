# StrayPaw One Health

Branch `claude/one-health-os`, November 2026. This document covers what the
BeST proposal asks for, how the existing product measured up, what was built,
the decisions behind it, and what still depends on people outside the codebase.

---

## 1. What BeST actually asks for

Source: *City-Wide Integrated Rabies Elimination Program: A Bengaluru Model for One
Health Action* (BeST Cluster, IISc). The brief also mentions an email from
Dr. Suresh; it was **not attached**, so nothing here relies on it.

### Confirmed in the proposal

| # | Requirement (proposal wording, condensed) | Who | Where in StrayPaw now |
|---|---|---|---|
| R1 | Integrated surveillance linking human health, animal health, laboratory and field data (Objective 1, Pillar 5) | All | One programme record: bites at facilities → animal follow-ups at NGOs → samples at the laboratory → alerts to coordinators (`oh_handoffs`, `oh_samples`) |
| R2 | Real-time geospatial surveillance, hotspot detection (Gap 2, Pillar 5) | Coordination | Bites by ward and week, confirmed cases by ward, overdue work by partner (`oh_programme_overview`). **Map layer not yet built**: wards are named localities, not polygons (see §6) |
| R3 | ≥70% dog vaccination coverage (Gap 4) | GBA, NGOs | Vaccination by ward from partner registers; coverage against the target shown **only** where a population estimate with method and source exists (`oh_ward_estimates`) |
| R4 | PEP tracking (KIMS role) | KIMS | Clinician-governed course: category, regimen as written, dates the clinician sets, dose record, did-not-return; nurse call list with consent-gated phone |
| R5 | Human health surveillance (KIMS role) | KIMS | Bite register per facility; programme sees suppressed counts only |
| R6 | Laboratory validation and diagnostics (KVAFSU role, Pillar 1) | Reference lab | Sample queue, enforced chain of custody, result with method, automatic notice to sender and coordinators |
| R7 | Surveillance beyond dogs: cats, cattle, wildlife (Pillar 3) | All | Species on bites and samples: dog, cat, cattle, monkey, wildlife, other |
| R8 | Workforce training and competency (Objective 2, Pillar 1) | KVAFSU, coordination | Training sessions by audience and participants on the programme record. Existing NGO course/assignment module (`training_lms` flag) retained |
| R9 | Community participation, bite reporting (Objective 3) | Citizens | Bite-help page: verified centres finder + optional notice to the ward's clinic. Still behind the clinical-review flag |
| R10 | Decision-support platform for monitoring, analytics, programme management (Objective 4) | Coordination | Programme overview, "needs a decision" list, follow-ups across partners, printable report |
| R11 | Demonstration zone, evidence for scale-up (Objective 5, Pillar 6) | Coordination | Programme has a ward list and status (`pilot`); every count is per programme, so a second zone or city is a second programme |
| R12 | Centralised dashboard integrating GBA, laboratory and hospital inputs (Expected outcomes) | All | `/programme/[slug]` |
| R13 | Multi-sectoral coordination, clear responsibilities (Gap 6, Partners) | All | Every institution carries its responsibilities; every handoff has a sender, a receiver, a due date and an outcome |
| R14 | Co-branding and equal visibility of partners | All | Partners listed with responsibilities on the overview and report. Logos not yet supported |

### Reasonable assumptions that need partner validation

* **A1 Patient identity.** Facilities identify patients by their own register (OPD) number; StrayPaw stores no name. *Validate with KIMS and the health department.*
* **A2 Reminders by phone.** Clinics call patients from the due list; nothing sends SMS or WhatsApp. *Validate who calls, and whether DLT-registered SMS is wanted.*
* **A3 Ward ownership.** Each ward has one NGO answering animal follow-ups (`oh_ward_assignments`). *Validate the ward split between GBA, Mission Rabies and CARE.*
* **A4 Suppression threshold.** Human counts below 5 are hidden outside the treating facility. *Validate with the ethics committee / data protection officer.*
* **A5 Service confirmation lasts 7 days** (database maximum 14). *Validate the cadence facilities can keep.*
* **A6 Laboratory result shape** (positive / negative / inconclusive + method). *Validate with the WoAH reference laboratory.*
* **A7 Regimen as free text.** No regimen list is built in. *A facility-approved protocol list could replace free text once KIMS supplies one.*

---

## 2. Critical evaluation of what existed

**Valuable and kept.** The animal register, ABC case workflow, vet attestation,
evidence and reviewer packages, field mode with offline outbox, AnimalID, the
spatial pipeline, RLS discipline, the audited Kaju action model and the
documentation habits are strong. The NGO and municipal workspaces are calmer and
better than most of what is in this market.

**Structural gaps for BeST.**

1. **Only two kinds of organisation.** `ngos` and `review_offices`. There was no
   hospital, health centre, laboratory, coordinating body or research unit, and so
   no way to say "this person is a clinician *at this hospital*".
2. **No human-health data model** and nowhere safe to put one. Existing tables sit in
   `public`, exposed through the API. Human bite data needs a stronger boundary.
3. **No concept of work passing between institutions.** Everything lived inside one
   organisation's queue, or went one way to a reviewing office.
4. **No laboratory.** Rabies confirmation, the most important surveillance signal,
   had no home.
5. **Vaccination "coverage" risk.** Registered dogs vaccinated is easy to mistake for
   population coverage. The new overview never does that.
6. **The bite-help page** was a careful prototype with no centres and no route into a
   clinic.

**Accumulated weight.**

* About **30,000 lines of CSS in roughly 25 stylesheets**. The application shell loads
  nine of them in sequence (`sp.css → shell.css → folk.css → mobile.css → sp3.css →
  shell3.css → app3.css → app4.css → system5.css`), and `DESIGN.md` carries three
  superseded design systems as "history".
* One element shows the cost: the five stage counts on NGO Today (`.jy`) had **four
  conflicting phone rules in one file**, the last forcing five columns with
  `!important`, which truncated "Treatment" and "Release" on every phone.
* `sp`, `sp3` and `sp4` component generations coexist; `/ngo` has 35 routes and a
  sidebar of 12 items plus tab groups of up to 6.
* Duplicate entry points, for example "Treatment & sign-off" and "Release evidence"
  both open `/ngo/verification` with a different query.

**Broken when audited.**

* **Quality gate red on `main`** for the last five pushes: a Kaju intent rewrote the
  bare question "programme report" into an order to prepare a PDF, and Kaju then said
  it had "prepared a PDF of recorded figures" even when the read had failed. **Fixed.**
* **Production health probe failing** from GitHub Actions with an HTML response, while
  the same URL returns healthy JSON from elsewhere. The cause is outside the code (most
  likely Vercel bot protection challenging GitHub's runners). **Not fixed here**: needs
  a firewall bypass rule for the probe, or an external monitor (see §7).
* The site-wide storage notice can cover a form's submit button on a phone until it is
  dismissed (seen during testing; not changed here).

---

## 3. What was built

### Architecture

```
            ┌──────────── public (API-exposed, RLS) ───────────────┐
            │ oh_programmes  oh_institutions  oh_members           │
 Citizens ──┤ oh_ward_assignments  oh_service_status  oh_handoffs  │
 (anon)     │ oh_samples  oh_sample_events  oh_ward_estimates      │
            │ oh_trainings      + existing ngos, ngo_members, dogs │
            └───────────────▲──────────────────────────────────────┘
                            │ SECURITY DEFINER functions check the caller's
                            │ institution and role on every read and write
            ┌───────────────┴─── health (NOT exposed, NOT granted) ─┐
            │ exposures  pep_courses  pep_doses  reminder_log       │
            │ citizen_notices  audit (append-only)                  │
            └───────────────────────────────────────────────────────┘
```

* **Institutions, not organisations.** A programme has institutions of a kind
  (coordinator, municipal, hospital, clinic, laboratory, ngo, research, training). An
  NGO institution points at an existing `ngos` row, so NGO staff keep their existing
  membership and roles; nothing is duplicated.
* **Roles per place.** `oh_my_memberships()` gives each person their role at each
  place: lead, coordinator, clinician, nurse, records, lab_scientist, analyst, field,
  trainer. NGO roles map automatically (vet → clinician, coordinator/admin →
  coordinator, others → field).
* **The `health` schema** is never granted to `anon` or `authenticated` and is not in
  the API's exposed schemas. Only the `oh_*` functions read or write it, and they check
  membership and role first. Opening a record writes an audit row.
* **Handoffs never carry patient data.** A bite at a facility creates an animal
  follow-up for the ward's NGO with the animal's description and place, built inside
  the database function. The behaviour test checks the register number, phone, sex
  and age band never appear in it.
* **Programme-local dates.** Each programme has a time zone; "today", "due" and
  "overdue" use it. Before this, a bite recorded between midnight and 05:30 IST failed
  against the server's UTC date with a raw constraint error.

### Clinical governance (enforced in the database, not the UI)

| Action | Who may | Notes |
|---|---|---|
| Register a presentation | clinician, nurse, records, lead | |
| Record the exposure category | clinician only | Recorded as the clinician's assessment; never derived |
| Prescribe | clinician only | Regimen as written; dates the clinician sets, in order, on or after exposure. **No schedule is generated.** |
| Record a dose given or missed | nurse, clinician | Not in the future; last dose completes the course |
| Close a course early | clinician | Did not return / stopped; remaining doses cancelled |
| Report a laboratory result | the receiving laboratory | Only after received → testing; method required |
| See human counts | programme partners | Aggregates only; under 5 suppressed |

### Experience

One idea runs through it: **a person works in one or more places.**

* **`/today`** lists every place a person works and what needs them there, as
  sentences ("11 doses due today or overdue", "1 follow-up overdue"). With one place
  it goes straight there.
* **Hospital or health centre** (`/workspace/[id]`): Today (doses due with call and
  log-call, public notices, presentations waiting for a clinician), Bite register,
  Record a bite (one form in the order it happens at the desk), the exposure record
  (assessment, prescription, dose timeline, animal follow-up outcome, audit history),
  Services (confirm availability for 7 days).
* **Laboratory**: one queue in the order samples move: arriving → received → testing
  → results; one press per step; a sample page with the full chain of custody.
* **NGO in a programme**: follow-ups with Accept and "Record what you found" (links the
  animal from its own register), and Send a sample, which can start from a follow-up.
  "Organisation workspace" goes back to the existing `/ngo`.
* **Programme** (coordinators, municipal, research): Needs a decision (confirmed cases,
  overdue work, expired confirmations, vaccine unavailable), five figures, bites by
  week and ward, vaccination by ward with honest coverage, partners and their open
  work, laboratory surveillance, training; Follow-ups across partners with "Ask a
  partner"; Services across facilities; a printable report.
* **Public**: `/bite-help` (still behind `citizen_bite_assist`) lists centres with each
  service's latest confirmation, "not verified" when expired, and an optional notice
  to the ward's clinic; the phone is stored only with consent.

**Design system.** `src/oh/oh.css` is one stylesheet scoped under `.oh`, built on the
DESIGN.md 4.0 foundations (white, ink, blue for action, flame only for urgency, green
only for done, amber only for waiting; Inter; 4px grid; hairlines, shadow only on
what floats). Components: page header, stat strip (unknown shows "Not read", never
0), rows, tables, segmented choices, sheet (drawer on desktop, bottom sheet on phone),
toast, bars with hatched suppressed values. Phones get a four-item tab bar plus
Places. Motion explains change and switches off under reduced motion.

### Existing product: removed, merged, retained

| Decision | What | Why |
|---|---|---|
| **Retained** | ABC workflow, register, field mode, AnimalID, evidence, packages, contracts, Kaju, research, connections, fundraising | Working, tested, used by NGOs and offices. None conflicts with BeST; several feed it (vaccination status, register, field team) |
| **Merged into the programme layer** | "Organisation" and "reviewing office" now sit under one institution model for programmes | One way to say who someone is and what they can do |
| **Fixed** | Kaju programme-report intent (CI red); NGO Today phone labels; timezone for programme dates | Real defects found during the audit |
| **Contextual instead of standalone** | Sending a sample starts from the follow-up it answers; "Patient came in" turns a public notice into a pre-filled presentation; programme tabs appear only for visitors (coordinators already have them in the sidebar) | Right action in the right place, one way to do each thing |
| **Not removed yet** | Older CSS generations and duplicate NGO entry points | Removing them safely needs signed-in visual regression on staging for every NGO and office route, which this session could not run (see §7). `src/oh` is the target the old screens should move onto |

**Billing, Kaju and WhatsApp.** Billing (ABC packages, contracts) stays: municipal ABC
claims are part of GBA's operations even though BeST does not mention them. Kaju is
not wired into the One Health workspaces: it has no human-health access by design,
and giving a model patient data needs a separate, explicit decision. WhatsApp stays
disconnected (Meta verification pending), so reminders are phone calls.

---

## 4. Verification

| Check | Result |
|---|---|
| Database behaviour tests, local PostgreSQL 16 (`supabase/tests/one_health/run.sh`) | **32/32 pass**; migration applied twice to prove it is re-runnable |
| Cross-institution journey, Playwright (`e2e/one-health.spec.ts`), phone and desktop | **6/6 pass on each**: clinician → NGO → laboratory → programme lead, nurse limits, public notice reaching the clinic |
| Typecheck, lint, production build, existing regression scripts, existing Playwright suite | See the PR description for the final run |

The journey runs against `scripts/oh-local`: a local PostgreSQL plus a small local
API that speaks the part of the Supabase HTTP API these pages use. Each request runs as
`anon` or `authenticated` with the caller's id, so the migration's own checks decide
access. It is a development harness, not a deployment path.

---

## 5. Run it locally

```bash
# PostgreSQL 16 on a socket in /tmp/pg, port 5433
export PGHOST=/tmp/pg PGPORT=5433 PGUSER=postgres
supabase/tests/one_health/run.sh          # behaviour tests
scripts/oh-local/setup.sh                 # local demo database
node scripts/oh-local/server.mjs &        # local API on :54321
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=local \
NEXT_PUBLIC_OH_LOCAL=1 NEXT_PUBLIC_OH_PUBLIC_PROGRAMME=bengaluru-demo \
SP_FLAGS=citizen_bite_assist NEXT_PUBLIC_SP_FLAGS=citizen_bite_assist npx next dev -p 3200
# open http://localhost:3200/today and choose who to be
OH_E2E=1 E2E_BASE_URL=http://localhost:3200 npx playwright test e2e/one-health.spec.ts
```

---

## 6. Next, in order

1. **Apply to staging** (owner action, §7), then run the journey against staging with
   real sessions.
2. **Ward polygons.** Load the GBA ward boundaries and draw bites, confirmed cases and
   coverage on the existing MapLibre map at ward level (the H3 pipeline already exists
   for animals).
3. **Missed-dose rescheduling** by the clinician (add a dose date to an active course).
4. **Partner logos** for co-branding on the overview and report.
5. **Move the NGO and municipal screens onto `src/oh`**, one route at a time with
   signed-in visual regression, and retire the old stylesheets as they empty.
6. **Facility protocol list** (A7) once KIMS supplies an approved one.
7. **Exports** for IDSP / IHIP reporting, once the required format is confirmed.

## 7. Genuine external blockers

| Blocker | Who | What it unlocks |
|---|---|---|
| Approval to apply `20261112090000_one_health.sql` to **staging**, then production | Owner (applying to shared staging was refused by this session's permission check) | Everything on a deployed build; until then deployed One Health pages say "not set up on this database yet" |
| Demo accounts `demo-oh-*@straypaw.invalid` with ids `e0000000-…-00000000000{1..9}` on staging, password in Vercel `DEMO_ONEHEALTH_PASSWORD` | Owner | The deployed demo sign-in (`docs/one-health/DEMO.md`) |
| Clinical review of bite-help wording and of the PEP workflow | KIMS / health department | Turning on `citizen_bite_assist` for the public |
| Verified list of anti-rabies centres and who confirms services | BBMP Health / KIMS | Real facilities in the finder |
| Ethics / data-protection sign-off: patient identifiers, suppression threshold, retention | IISc / KIMS ethics committee | Real human data |
| Laboratory result vocabulary and reporting obligations | WoAH reference laboratory (KVAFSU) | Real laboratory use |
| Ward split between NGOs; ward boundaries | GBA | Real follow-up routing; the map |
| SMS (MSG91 DLT) or WhatsApp (Meta verification) | Owner | Automatic reminders (currently phone calls only) |
| Health probe challenged from GitHub Actions | Owner (Vercel firewall bypass for the probe, or an external monitor) | A green scheduled probe |
| Dr. Suresh's email | Jay | It was referenced but not attached |
