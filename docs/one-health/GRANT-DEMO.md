# The One Health product demo (grant applications)

**Address:** `/demo/one-health` (for example `https://www.straypaw.org/demo/one-health` once deployed).
No sign-in, no database: it runs the same on every deployment, on a phone or a projector.

One dog bite is followed through a city One Health programme, in the order the work travels:

| # | Role | What the demo shows | Link to the chapter |
|---|---|---|---|
| 1 | **Citizen** | Reports a dog bite in Kannada through Kaju's voice and chat interface (**proposed**) | `#citizen` |
| 2 | **Hospital** | Receives the report, reviews clinical urgency, manages the PEP pathway | `#hospital` |
| 3 | **Veterinary team and NGO** | Investigates the animal and opens its vaccination record | `#vet-ngo` |
| 4 | **Municipality** | Tracks assigned actions, vaccination coverage and unresolved cases | `#municipality` |
| 5 | **Researchers** | Evaluate an intervention on approved, privacy-protected data | `#research` |
| 6 | **Kaju** | Coordination across the whole case, and what Kaju never does | `#kaju` |

A single step can be linked too: `#hospital/3` is the clinician signing Category III.
`?play=1` starts it playing. It plays in about 3½ minutes.

**Everything in it is illustrative.** People, places, numbers and dates are invented; institutions are named by role
(as in `DEMO.md`); the case code `BX-2611-4F2A` is the same sample bite the signed-out bite register shows. Every
screen says "Illustrative".

**Today versus proposed.** Every Kaju action carries one of two marks, and anything proposed is drawn with a dashed
edge wherever it appears. Reviewers can see at a glance what the grant would fund and what already works.

---

## Presenting it

* **Play** (top right, or space) runs the whole story; **Pause** holds it. The arrow keys move one step; the
  chapter line and each step's own entry on the left jump anywhere. Home returns to the cover.
* The left column says what is happening, step by step, and what Kaju did in this chapter. The screen on the right is
  the workspace of the person doing the work, drawn the way StrayPaw draws it.
* Each chapter from the hospital on ends with a link to the same screen in StrayPaw, with sample data when signed
  out (`/health/bites`, `/ngo/inbox`, `/gov/overview`, `/research/datasets`).

### Narration (read over the playing demo, about 3½ minutes)

> **Cover.** One dog bite, one shared record. This is how a citizen, a hospital, a veterinary team, the
> municipality and researchers work on the same case in StrayPaw, with Kaju coordinating.

> **1 · Citizen.** A resident of Jayanagar is bitten at a bus stop. She calls Kaju and speaks Kannada. Kaju gives the
> fixed, clinically reviewed first-aid steps and asks one danger-sign question. A bite on the hand is a danger sign,
> so Kaju sends her to the nearest centre that confirmed vaccine and immunoglobulin today. With her consent, her report
> goes ahead of her, as an intake in English and Kannada that lists what the call did not cover. This chapter is the
> proposal: Kaju already speaks Kannada; taking bite reports is what we are asking to build.

> **2 · Hospital.** At the clinic her report is already on the bite register. The clinician opens it, asks the
> questions Kaju flagged, examines the wound and signs Category III in their own name. They prescribe immunoglobulin
> and the vaccine course and enter every dose date: StrayPaw records clinical decisions and never makes them. The
> nurse gives the first dose, and the area's animal team is asked to find the dog, with no patient details.

> **3 · Veterinary team and NGO.** The request reaches the NGO's inbox: a place and a description of the dog. Kaju
> suggests a registered dog seen 140 metres away; the coordinator confirms it. Its record shows an anti-rabies
> vaccination in March from the ward drive. The field vet finds it by its ear notch; Kaju prepares the day 3, 7 and 10
> checks and the coordinator approves them. On day 10 the dog is alive and well, and the outcome goes back to the
> hospital.

> **4 · Municipality.** The programme officer sees every action between partners, with its owner and due date; the
> Jayanagar follow-up is closed. Coverage is shown against the 70% target, and Kaju flags that Jayanagar's figure rests
> on a population estimate 22 months old. What is still unresolved is in one list. Kaju drafts the weekly brief; the
> officer confirms before anything is sent.

> **5 · Researchers.** The epidemiology unit sees only datasets the programme's steward approved, each with a version
> and an end date. Bite exposures and vaccination coverage sit on one timeline, so an intervention can be evaluated.
> This morning's bite is one count in Jayanagar's week; counts below five are hidden and never added into a total.
> Kaju drafts a request for one more dataset; the steward decides.

> **6 · Kaju.** Every step Kaju took on this case, and who confirmed it. Kaju prepares; people decide. It never
> assesses a wound, reads a clinical record, approves data access or sends anything without a person's confirmation.

---

## What is in StrayPaw today, and what is proposed

| In StrayPaw today | Proposed in this application |
|---|---|
| Bite register; clinician-entered PEP courses; dose reminders as logged calls | Bite reports by voice and chat in Kannada through Kaju |
| Follow-up requests between partners, without patient details | Kaju's intake for clinics, with the questions still to ask |
| Animal register with vaccination and sterilisation history | Kaju flags on old or missing programme data; weekly briefs |
| Dog vaccination coverage against the 70% target, by dated estimate | Kaju-drafted data requests for the steward |
| Aggregated research datasets with small counts hidden | |
| Kaju's suggested matches, prepared follow-ups and approvals | |

**Before real use** (from `README.md` §6): clinical review of the Kannada wording and first-aid steps; ethics and
data-protection approval; a verified list of anti-rabies centres and who confirms their services; official ward
boundaries and the ward split between NGOs; SMS or WhatsApp registration for reminders.

The Kannada lines were written for this demo and should be checked by a native speaker and the clinical reviewer
before the demo is shown to a Kannada-speaking panel.

---

## Recording a video

```bash
npm run build && npm run start -- -p 3100
DEMO_BASE_URL=http://localhost:3100 npm run demo:one-health   # demo-footage/straypaw-one-health-demo.mp4
```

The recording is 1920×1080, starts on the first step and ends on Kaju's summary.

## Where it lives

| File | What it holds |
|---|---|
| `src/app/demo/one-health/page.tsx` | The route (no index), and the Kannada face (Noto Sans Kannada) |
| `src/sp/demo/onehealth/story.ts` | The case, the six chapters, every step's words and timing, Kaju's actions marked today or proposed |
| `src/sp/demo/onehealth/screens.tsx` | The six screens, step by step |
| `src/sp/demo/onehealth/OneHealthStory.tsx` | The player: chapters, play and pause, keys, links |
| `src/sp/demo/onehealth/onehealth.css` | StrayPaw 4.0 tokens; dashed edge for proposed; nothing moves under reduced motion |
| `e2e/one-health-demo.spec.ts` | Every step by keyboard, links, play, no database reads, phone width, reduced motion, axe |
| `scripts/record-one-health-demo.ts` | The video recording |

To change the story, edit `story.ts` (words and timing) and the matching screen in `screens.tsx`.
