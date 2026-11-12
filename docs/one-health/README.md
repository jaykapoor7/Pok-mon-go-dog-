# StrayPaw: one product for every place in an animal-health and One Health programme

Branch `claude/brave-hawking-0ohpo5`, 11 November 2026. This replaces the earlier
One Health notes on `claude/one-health-os`. Bengaluru's BeST proposal is the
reference: the product is built so that Bengaluru is **one configuration** of
StrayPaw, not a separate app.

---

## 1. What the programme actually needs

Sources: *City-Wide Integrated Rabies Elimination Program: A Bengaluru Model for
One Health Action* (BeST Cluster, IISc) and Dr. Suresh Kumar Mendem's email after
the demo.

### Confirmed requirements and where they live now

| Requirement | Source | In StrayPaw |
|---|---|---|
| Human bite case reporting and management | Email; proposal (KIMS role) | Hospital and health-centre places: Today, bite register, desk form, exposure record |
| PEP tracking under clinical control | Proposal (KIMS) | Clinician-only category and prescription; dates the clinician sets; nurse records doses; clinician adds a date after a missed dose or closes a course |
| Vaccination due alerts and reminders | Email | Doses due today and overdue on the facility's Today, with consented phone and call log; programme alert per facility |
| Vaccination completion alerts | Email | "Courses completed" on the facility's Today with a completion call; programme alert |
| Dog vaccination coverage tracking | Email; proposal (≥70%) | Coverage page: partner registers against population estimates with method and source; never shown without an estimate |
| Dog vaccination due | Email (reminders) | Revaccination alert per NGO when the programme sets an interval (off by default; set by the veterinary lead) |
| Nearest referral hospitals | Email | Referral pathways between facilities (configured per programme); public finder sorts by distance on the device |
| Vaccine availability at facilities | Email | Facilities confirm vaccine, immunoglobulin and wound washing for up to a week; expired confirmations show as "not confirmed recently" |
| Wound-washing units mapped | Email | Any facility can confirm wound washing; units appear on the care-network map and in the public finder ("I need: wound washing now") |
| PEP preparedness and response alerts | Email | Alerts when a facility with people in a course has vaccine or immunoglobulin unavailable, limited, expired or never confirmed, naming its referral |
| Integrated surveillance: human, animal, laboratory, field | Objective 1, Pillar 5 | One record: bite at a facility → animal follow-up to the area's NGO → sample → laboratory result → alert to coordination |
| Surveillance beyond dogs | Pillar 3 | Species on exposures and samples: dog, cat, cattle, monkey, wildlife |
| Laboratory validation | Proposal (KVAFSU) | Laboratory place: arriving → received → testing → result with method; chain of custody; positives alert coordination |
| Geospatial intelligence | Gap 2, Pillar 5 | Care-network map; bites by area and week; confirmed cases by area. Ward boundaries not loaded (see §6) |
| Training and capacity | Objective 2, Pillar 1 | Training sessions by audience on the programme; existing NGO course module kept |
| Community participation, bite reporting | Objective 3 | Public bite-help finder and optional notice to the area's clinic (behind the clinical-review flag) |
| Decision support and programme management | Objective 4 | Overview "Needs a decision", work between partners, report, research extract |
| Demonstration zone, scale-up | Objective 5, Pillar 6 | Programmes nest (state → city); each has its areas, modules and settings |
| Co-branding and equal visibility | Proposal | Partners and responsibilities on the overview and the report. Logos not yet supported |

### Assumptions that need partner validation

Patient identity by facility register number only; reminder calls from the clinic
(no SMS); one NGO per area for animal follow-ups; suppression below 5; service
confirmations last up to 7 days; laboratory result vocabulary; regimen as free
text; revaccination interval as a programme setting.

---

## 2. What was wrong with the product for this work

* **Organisation types, not places.** A person was "NGO" or "Government". A clinician
  working at a hospital and a health centre, or an NGO that also takes part in a city
  programme, had nowhere to stand.
* **Sidebar by feature.** The NGO sidebar mixed a five-step ABC sequence with
  duplicate entries (two links to one verification page, Ask Kaju as a page and a
  button). Nothing in it said "a hospital is waiting for you".
* **One Health arrived as a second app.** The earlier branch built its own frame,
  stylesheet and navigation under `/today`; it would have split the product in two.
  Its schema (v1) was also superseded: staging runs a v2 schema whose source was in
  no branch.
* **Defects found**: opening a bite record on staging failed for everyone (a read-only
  function wrote an audit row); success messages on the new pages never showed; actions
  by NGO staff were attributed to "A team member".

---

## 3. What changed

### One shell, organised by places
`src/sp/shell/Shell.tsx` + `src/oh/places.tsx`.

* **Places**: the switcher lists every place a person works (NGO workspace, municipal
  review office, each hospital, laboratory, coordination cell, state cell) with their
  role. `/today` is the home for anyone with more than one place; one place goes
  straight there.
* **Navigation follows the place** (`placeNav`): a hospital has Today, Bite register,
  Record a bite, Services; a laboratory has Samples; a coordination cell has Overview,
  Care network, Work between partners, Coverage, Report, Research data, Setup.
* **One sidebar pattern everywhere** (`designedNav`, `placeNav`): **Today** first;
  **Work**, at most four everyday things chosen by role; **Programme**, the same
  links for everyone in a programme (Programme, Care network, Requests with a live
  count); no "More" list: everything else is one organised index, **All sections**, inside
  search (⌘K, in the top bar), so nothing is more than two clicks away. An NGO's work is
  one **Pipeline** board; its queue, intake and sign-off are views of it.
  The frame is one piece (`src/sp/shell/console.css`): sidebar, top bar and a status line
  around one sheet; the sidebar tucks into a handle. The top bar holds search and the single
  primary action and pages do not repeat it. See `screens/sidebars-same-pattern.png`.
* **The NGO's own Today** carries a line from the programme ("2 requests from programme
  partners · 1 overdue"), so a hospital's request reaches the field team where they look.

### StrayPaw OS chrome (`src/sp/shell/os.css`, loaded last)
Place card with initials and role; a selection highlight that glides between pages;
counts that pop in; glass top bar; spring menus with staggered items; page arrival;
thumb-bar icon bounce on phones. Programme components add pulsing urgent alerts, bars
that fill, pins that drop, timeline ticks, a rolling number when a count changes
(never counting up from zero), and cards whose arrows nudge. All of it stops under
`prefers-reduced-motion`.

### Data model (reusable, multi-programme)
Recovered byte-for-byte from staging (`20261110230441…`, `…230655…`, `…230829…`) and
extended:

* **v2.1–2.3** areas (country → state → city → zone → ward → locality), organisations
  of nine kinds, programmes that nest, participations (one organisation in many
  programmes), area duties, members with roles, capability table with per-organisation
  overrides, invites; private `health` schema (exposures, courses, doses, reminders,
  notices, append-only audit) reachable only through role-checked functions;
  handoffs, samples with chain of custody, service confirmations, estimates, training.
* **v2.4** (`20261111100000`) referral pathways, alert acknowledgements, derived
  alerts (`oh_alerts`), care-network read (`oh_programme_network`), finder with
  referrals; programme settings `dog_revaccination_days`, `alert_window_days`.
* **v2.5** (`20261111120000`) record opening fixed; alert wording; attribution.

Nothing is Bengaluru-specific: a programme's modules, target, suppression threshold,
follow-up days and revaccination interval are settings; its partners, areas and area
duties are rows; a state programme sees its cities' shared counts.

### Removed, merged, retained

| Decision | What | Why |
|---|---|---|
| Removed | v1 One Health schema, seed, local harness and its separate frame (`src/oh/Shell.tsx`) | Superseded by the staging v2 schema and by the one shell |
| Merged | "Treatment & sign-off" and "Release evidence" now sit under Vaccination & ABC as two views of one page; Ask Kaju is a top-bar button and his corner, not a sidebar row; programme follow-ups and services are part of each place | One way to do each thing |
| Moved | Map, care ledger, data quality, import and review under Animal register; proof, evidence and contracts under Report packages; surveys, feeding and projects under Drives & zones | The sidebar lists the work; detail lives on the page |
| Retained | ABC workflow, register, field mode, AnimalID, evidence and packages, contracts and billing, Kaju, research, connections, fundraising | Working and used; ABC billing is part of municipal operations even though BeST does not mention it |
| Not connected | SMS, WhatsApp, stock systems, ward boundaries, IHIP export | Said on the screens that would use them |

Kaju stays on the animal side of a programme. Its one programme tool (`partner_requests`) reads which partners are waiting on the person's organisations and each request's title, place and due date. It never reads a request's free text, an exposure, a course, a dose, a reminder or the clinical counts a place carries; `scripts/test-kaju-automations.ts` fails if it does.

---

## 4. Verification (this branch)

| Check | Result |
|---|---|
| Typecheck, lint | Pass (one pre-existing warning in `src/sp/city/OfficeStrip.tsx`) |
| Production build without database (as CI) | Pass |
| Full browser suite on the production build | **239 passed, 0 failed**, 29 skipped by design (re-run after the sidebar simplification) |
| CI regression scripts (16) and workspace registry (12) | All pass |
| Cross-institution journey on staging, `e2e/one-health.spec.ts` | **14/14** (desktop and phone together, each following its own sample): clinician records a category III bite → NGO receives the request without patient details, closes it, sends a sample → laboratory reports positive → programme lead sees the confirmed case and the care network; nurse cannot assess or prescribe; another city's lead is refused; public finder refers |
| Permissions at the database, `scripts/test-one-health-permissions.ts` | **19/19** against staging |

Of the ten failures in the first full run, two came from the new navigation (tests
updated to the new model), six from the page-arrival wrapper on full-bleed map pages
(fixed: map and report pages skip it; baseline `main` was run to confirm), and two
from the CreIndia check failing because the search page repeats the query (test now
asserts nothing is found or linked).

---

## 5. Run it

```bash
# against staging (demonstration data only)
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
NEXT_PUBLIC_OH_DEMO=1 NEXT_PUBLIC_OH_PUBLIC_PROGRAMME=bengaluru-demo \
SP_FLAGS=citizen_bite_assist NEXT_PUBLIC_SP_FLAGS=citizen_bite_assist \
DEMO_ACCOUNT_PASSWORD=… DEMO_ONEHEALTH_PASSWORD=… npx next dev -p 3300
OH_E2E=1 E2E_BASE_URL=http://localhost:3300 npx playwright test e2e/one-health.spec.ts
STAGING_URL=… STAGING_ANON_KEY=… DEMO_ONEHEALTH_PASSWORD=… npm run test:one-health-permissions
```

Demo guide: `DEMO.md`. Screens: `screens/` (after) and `before/`.

---

## 6. Genuine external dependencies

| Dependency | Who | Unlocks |
|---|---|---|
| Approval to apply v2.1–2.5 to **production** | Owner | Programmes on straypaw.org (staging has them; production does not) |
| `DEMO_ONEHEALTH_PASSWORD` on the demo deployment (Vercel preview/demo env) with `NEXT_PUBLIC_OH_DEMO=1`, `NEXT_PUBLIC_OH_PUBLIC_PROGRAMME=bengaluru-demo`, `citizen_bite_assist` in both flag variables | Owner | The deployed demo sign-in; the password was given to the owner separately and is not in the repository |
| Clinical review of the bite workflow and public wording | KIMS / health department | Turning on `citizen_bite_assist` publicly; real clinical use |
| Verified list of anti-rabies centres, wound-washing units and who confirms services | BBMP Health / KIMS | Real facilities and referral pathways |
| Ethics and data-protection sign-off (identifiers, suppression, retention) | IISc / KIMS ethics committee | Real human data |
| Laboratory result vocabulary and reporting obligations | WoAH reference laboratory (KVAFSU) | Real laboratory use |
| Ward split between NGOs; official ward boundaries | GBA | Real follow-up routing; ward-level maps |
| Revaccination interval and approved regimen list | Programme veterinary and clinical leads | Revaccination alerts; a regimen picker in place of free text |
| SMS (DLT registration) or WhatsApp (Meta verification) | Owner | Automatic reminders (today: logged phone calls) |
| Partner logos and co-branding terms | BeST and partners | Logos on the overview and report |
