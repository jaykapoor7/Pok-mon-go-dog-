# BeST requirements: what StrayPaw does, how it was checked, what is blocked

Audit of 12 November 2026, branch `claude/brave-hawking-0ohpo5`. Sources:

- the proposal, *City-Wide Integrated Rabies Elimination Program: A Bengaluru Model for One Health Action* (BeST Cluster, IISc);
- Dr. Suresh Kumar Mendem's email after the live demo, which lists eight requested features.

Each requirement was checked in the product, on the staging demonstration (illustrative data), not taken from earlier notes.

A feature counts as **done** only when four things hold: it has a screen a person uses, it has a journey that ends somewhere, the database enforces its permissions, and it is connected to the backend. A table, a flag or a screen on its own does not count.

**Status**

- **Done, tested**: in the product and covered by an automated test or a recorded browser run.
- **Done**: in the product and walked through in the browser.
- **Partial**: the internal workflow works; one named piece is missing.
- **Blocked**: needs an external approval, dataset or integration. The workflow before it is built, and the screen says what is not connected.

**Evidence**

- **Journey:** `e2e/one-health.spec.ts`, run on staging, **14/14** passed on phone and desktop on 12 Nov. Clinician → NGO → laboratory → programme lead; nurse limits; another city refused; public finder.
- **Permissions:** `scripts/test-one-health-permissions.ts`, **19/19** passed against staging on 12 Nov.
- **Kaju isolation:** `scripts/test-kaju-automations.ts`, **12/12** passed: partner requests read the request only, never a clinical count or a patient record.
- **Guided demo:** played in a browser on desktop and phone, every chapter's highlight found (see §3).

## 1. Dr. Suresh's eight requests

| # | Request | Where it is in the product | Status |
|---|---|---|---|
| 1 | Human bite case reporting and management | **Hospital and health centre:** Record a bite, then the Bite register, then the bite record. Category, wound washing, animal and place, all against the facility's own register number. No patient name ever enters StrayPaw. The public can send a notice to a clinic from `/bite-help`. | **Done, tested.** The public notice is behind the `citizen_bite_assist` flag until KIMS reviews the public wording. |
| 2 | Vaccination coverage tracking | **Animal side:** the NGO's vaccination and ABC records carry evidence, vet sign-off and municipal verification. **Programme:** Vaccination coverage compares recorded vaccinations with each area's population estimate, against the programme's target (70%), and states the estimate's method and source. A coverage alert fires per area below target. The new **Where to act** map shades each area by coverage. | **Done.** Estimates must come from partners; demo estimates are illustrative. |
| 3 | Vaccination due alerts and reminders | **Facility Today:** doses due today and overdue, each with a Call button, a call log (where the person consented) and Record dose. **Programme:** "Doses past the date set" alert across facilities. **New this pass:** the **notifications centre** (bell in the top bar) lists them for everyone responsible. | **Done.** **Blocked:** automatic SMS (needs DLT registration) and WhatsApp (needs Meta verification). Today the reminders are logged calls, and the screens say SMS and WhatsApp are not connected. |
| 4 | Vaccination completion alerts | **Facility Today:** a "Completed" list of courses not yet told, closed by a logged completion call. **Programme:** "Courses completed" alert. Both appear in **notifications**. A missed dose blocks automatic completion. | **Done.** Messages to patients are blocked, as in #3. |
| 5 | Mapping of nearest referral hospitals | **Care network:** each facility on a map with its referral pathways, per service (for example Whitefield sends people to the teaching hospital for vaccine while it has none). **Fixed this pass:** the pathway lines never drew, because the map's worker was not set. **Public finder** `/bite-help`: centres nearest first (on the device), what each lacks and where it refers. | **Done, tested** (public finder in the journey test). **Partial:** pathways are configured per programme; there is no "refer this patient" action, and a transfer is not recorded per person. **Blocked:** the verified list of centres, from BBMP Health and KIMS. |
| 6 | Availability status of vaccines at healthcare facilities | **Services we offer**, at each facility: anti-rabies vaccine, immunoglobulin and wound washing. Each is confirmed by a named person for 1, 3 or 7 days. The finder, the care network and alerts show how old each confirmation is; once it lapses it reads "not confirmed recently". | **Done.** It is a person's confirmation, never a stock figure. **Blocked:** any stock-system feed (none is connected or approved). |
| 7 | Identification and mapping of wound-washing units | Wound washing is a service any facility confirms. Wound-washing-only units appear on the care network map, in their own colour. The public finder has "I need: wound washing now". | **Done, tested.** **Blocked:** the real list of units. |
| 8 | Alerts on PEP preparedness and response | **PEP readiness alert:** a facility with people mid-course has vaccine or immunoglobulin unavailable, limited, expired or never confirmed. The alert names its referral. Marking vaccine unavailable also raises a service-gap request to coordination. Shown on the programme overview, the facility's Today and in **notifications**, and can be acknowledged there (the person's name is recorded for every partner). | **Done.** |

## 2. The proposal

| Requirement (proposal section) | Where it is in the product | Status |
|---|---|---|
| Integrated surveillance linking human, animal, laboratory and field data (Objective 1; gap 1) | Bite at a facility, then an animal follow-up request to the NGO for that area (without patient details), then a sample, then a laboratory result, then an alert to coordination and the result to the sender | **Done, tested** (journey 14/14) |
| Laboratory validation (KVAFSU's role) | Laboratory: arriving, received, testing, result. A result needs its method; the chain of custody is kept; a positive alerts coordination | **Done, tested** |
| Surveillance beyond dogs: cats, cattle, wildlife (pillar 3) | Species on bites, samples and public notices (dog, cat, cattle, monkey, wildlife, other) | **Done.** Coverage and revaccination count dogs only |
| Geospatial intelligence and hotspot detection (gap 2; pillar 5) | **New: Where to act** on the programme overview. One map of bites (circle size), laboratory-confirmed cases (flame ring) and dog vaccination against estimates (area colour). Beside it, the areas to act on, ranked by stated reasons: rabies confirmed, bites among the most, coverage below target. Plus the care network map | **Done.** **Blocked:** official ward boundaries (GBA GIS). The demo uses approximate locality outlines, labelled as such |
| Workforce capacity: training (Objective 2; pillar 1) | Training sessions by audience (para-veterinarians, laboratory, healthcare, community), with participants and institutions, on the programme overview and report. The NGO Academy holds courses | **Done** |
| Community participation and awareness (Objective 3; pillars 2 and 4) | Public `/bite-help`: what to do, nearest care, a notice to the clinic. Citizen animal reports (`/community/report`) | **Done.** The public bite notice is flag-gated pending clinical review |
| Digital decision-support platform (Objective 4) | Programme overview: "Needs a decision", Where to act, work between partners, the 30-day, 90-day or 12-month period. Report: printable, with a period picker (new). Research extract: CSV, counts suppressed below the threshold | **Done** |
| Demonstration zone and scale-up (Objective 5; pillar 6) | Programmes nest (state, city). Each has its areas, modules, target, suppression threshold, follow-up days and revaccination interval as settings. **New:** a lead can create a programme inside one they lead (the database checks it too) | **Done** |
| Co-branding and equal visibility | Partners and their responsibilities on the overview and the report | **Partial:** no partner logos. **Blocked:** logos and co-branding terms from BeST and the partners |
| Centralised dashboard integrating GBA, laboratory and hospital inputs (expected outcome) | The programme overview, read by the coordination cell | **Done** |
| Multi-sectoral coordination (gap 6) | Requests between partners (follow-up, sample, vaccination, result, service gap) with owners and due dates. **New:** notifications. Kaju summarises what partners are waiting for | **Done, tested** |
| Dog revaccination reminders | A per-NGO alert when the programme sets an interval (off by default; the veterinary lead sets it) | **Partial:** no per-dog list of who is due |
| NGO and municipal ABC operations (existing, retained) | Field round on phones (works offline), Pipeline, vet sign-off, five evidence items, monthly package, municipal review with Kaju's pre-check | **Done, tested** (full suite) |

**Patient data stays with the facility.** Exposures, courses, doses and reminders live in a private `health` schema, reachable only through role-checked functions. NGOs, the programme lead and Kaju never open an individual exposure (permission checks 4, 8, 9 and 10). Counts under the threshold are suppressed (check 12).

## 3. The guided demo (demo.straypaw.org/try)

The demo is one story in seven chapters, signed in as each person in turn:

1. **Finding care.** A dog bites someone in HSR Layout. The public finder shows the nearest care and what each centre confirmed.
2. **The hospital.** The clinician records the bite and the course. The NGO is asked to follow up automatically.
3. **The NGO.** The request reaches the team for that area. Kaju is asked, on screen, what partners are waiting for.
4. **The laboratory.** The sample is confirmed positive, with its method.
5. **The programme.** The confirmed case, the health centre without vaccine and its referral, and the Where to act map.
6. **Vaccination.** The field team records each dog, with or without signal.
7. **Verification.** The municipal office reviews the evidence. Kaju drafts the notes; the office decides.

It takes about three minutes and 8 clicks: Start, six Next, one optional "Ask Kaju". A chapter card covers each change of person, and the visitor can leave the story and explore at any point. On staging, chapters 1 to 5 were played in a browser on desktop and phone with every highlight found. Chapters 6 and 7 use the ABC sample accounts; their screens and targets were checked on demo.straypaw.org, and the whole story is checked there after release.

## 4. What remains blocked, and who unblocks it

| Dependency | Who | Unblocks |
|---|---|---|
| Production database: One Health migrations v2.1 to v2.5 | Owner: GitHub, then Actions, then "Apply Supabase migration", then `one-health` | Programmes on straypaw.org. The demo already has them |
| Clinical review of the bite workflow and the public wording | KIMS / health department | Turning on `citizen_bite_assist` publicly; clinical use |
| Verified anti-rabies centres, wound-washing units and who confirms services | BBMP Health / KIMS | Real facilities and referral pathways |
| Official ward boundaries; ward split between NGOs | GBA | Ward maps; real follow-up routing |
| SMS (DLT registration) or WhatsApp (Meta verification) | Owner | Automatic reminders and completion messages |
| Ethics and data-protection sign-off | IISc / KIMS ethics committee | Real human data |
| Laboratory result vocabulary | WoAH reference laboratory (KVAFSU) | Real laboratory use |
| Revaccination interval; approved regimen list | Programme veterinary and clinical leads | Revaccination alerts; a regimen picker in place of free text |
| Partner logos and co-branding terms | BeST and partners | Logos on the overview and report |
