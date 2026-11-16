# What exists today: the capabilities the One Health demo shows

Audited 16 November 2026 against the code on `main` plus this branch, the staging database behind
demo.straypaw.org, the deployment settings, and a full browser run of the guided demo (27 actions across the six
stages, against staging). It answers the grant's question: *describe your AI solution, show us what exists today,
and tell us which features have been tested and which you plan to test.*

| Mark | Means |
|---|---|
| **Live and tested** | In production use in StrayPaw and covered by its automated tests |
| **In staging** | Built, tested on the demonstration database, not yet in programme use (the One Health schema is applied to staging, not production) |
| **Planned for the pilot** | Part of the proposed six-month pilot; not built yet |
| **Awaiting integration** | Needs a partner's data, an approval or a third-party connection |

## 1 · Citizen reporting and AI intake

| Capability | Status | Evidence |
|---|---|---|
| Fixed first aid and danger-sign steps, nearest centres with dated service status (`/bite-help`) | In staging | Behind the `citizen_bite_assist` flag, demo only, awaiting clinical review of the wording |
| Kaju reads a free-text bite report and lists what is missing (place, time, animal, description) | In staging | New in this release: `src/oh/biteIntake.ts`, fixed rules on the device, no model; `npm run test:bite-intake` (5 checks) |
| Speaking instead of typing | In staging | The browser's dictation (Chrome uses Google's speech service), English; microphone allowed on `/bite-help` on demo builds only |
| The person confirms the notice; it reaches the nearest anti-rabies centre | In staging | `oh_submit_bite_notice`; verified in the browser run (notice appears on the hospital's Today) |
| Kaju Voice in English, Hindi and Kannada | Live and tested | `/talk` on straypaw.org (Sarvam, production only); it explains StrayPaw, it does not take bite reports |
| Bite reports by phone and in Kannada through Kaju Voice | Planned for the pilot | Needs clinical sign-off of the spoken wording |
| WhatsApp Business: messages, photos, voice notes, location into the NGO Inbox | Awaiting integration | Parser and intake built and tested with simulated traffic (`npm run test:kaju-intake`); live connection awaits Meta verification |
| A pasted WhatsApp message becomes a prepared case | Live and tested | Inbox → Paste a message |

## 2 · Hospital and human-health response

| Capability | Status | Evidence |
|---|---|---|
| Bite register; presentation recorded from the public notice; category in the clinician's name | In staging | `oh_record_exposure`; browser run |
| PEP course: regimen and every dose date entered by the clinician; doses due and overdue on Today | In staging | `oh_prescribe`, `oh_clinic_due`; StrayPaw never calculates a schedule |
| Reminder and completion calls, logged | In staging | `oh_log_reminder` |
| Automatic SMS or WhatsApp reminders | Awaiting integration | DLT registration or Meta verification |
| Referral pathways and referrals between facilities | In staging | `oh_refer_exposure`, programme Network tab |
| Vaccine, immunoglobulin and wound-washing confirmations with dates; preparedness alerts | In staging | `oh_verify_service`, `oh_alerts` |
| Real facility list and who confirms services | Awaiting integration | BBMP Health / KIMS |
| Patient details stay with the facility; partners see only animal facts | In staging | Database functions; `npm run test:one-health-permissions` (19 checks against staging) |

## 3 · Animal health and NGO field operations

| Capability | Status | Evidence |
|---|---|---|
| Animal register with identities, photos, places | Live and tested | ~30,000 animals in production |
| Vaccination, sterilisation and ABC records (capture, procedure, recovery, release) with evidence | Live and tested | ABC verification e2e and database tests |
| Veterinary sign-off and coordinator review | Live and tested | `abc_verification_queue` |
| Field mode, offline intake | Live and tested | `e2e/field-offline-staging.spec.ts` |
| The hospital's follow-up request reaches the area's NGO automatically; accept, record outcome | In staging | `oh_handoffs`, `oh_handoff_act` |
| Link the dog from the register to the request | In staging | New in this release (programme Work tab); browser run |

## 4 · Kaju

| Capability | Status | Evidence |
|---|---|---|
| Answers from records the person may see, by fixed rules, with links to every record | Live and tested | `npm run test:kaju-reliability` (47 checks) |
| Prepared work (cases, follow-ups, notes, care) saved only on a person's Confirm, in their name | Live and tested | `/api/ai/act`; audited |
| Daily checks ("Kaju noticed"), missions, approvals | Live and tested | `npm run test:kaju-automations` |
| Incident briefing: the request, the dog, what is missing, who does what, prepared next steps | In staging | New in this release: `src/sp3/ai/incident.ts`; `npm run test:kaju-incident` (6 checks, including that it never reads a request's free text, outcome, or any patient or dose record) |
| Free-form answers with a connected model | Planned for the pilot | Built (`src/lib/kaju/claude.ts`) but switched off: `STRAYPAW_AI_MODE=tools_only`, so no paid inference runs anywhere |
| Email, SMS and WhatsApp sending from missions | Awaiting integration | Needs the owner's connections |

## 5 · Municipality

| Capability | Status | Evidence |
|---|---|---|
| Programme overview, rule-based alerts, partners with overdue requests | In staging | `oh_programme_overview`, `oh_alerts` |
| Follow-up status of each request between partners | In staging | Programme Work tab |
| Dog vaccination coverage against dated estimates; no figure without an estimate | In staging | Programme Coverage tab |
| Municipal ABC evidence verification and ward coverage | Live and tested | `/gov/verification`, `/gov/overview` for ABC offices |
| Programme report, coverage by area, data export with small counts hidden | In staging | `/gov/reports` |
| Official ward boundaries and census estimates | Awaiting integration | GBA |

## 6 · One Health intelligence and research

| Capability | Status | Evidence |
|---|---|---|
| Surveillance by area and week, laboratory-confirmed cases, small counts suppressed | In staging | `/gov/surveillance`, programme Overview |
| Research extract: weekly exposures by area, animal and category, counts below 5 hidden | In staging | `oh_research_extract`; Research datasets for analysts |
| Steward-approved, versioned, revocable research access | In staging | Research → Requests |
| Ethics approval for real human data | Awaiting integration | IISc / KIMS ethics committee |
| Integration with IHIP and state surveillance | Awaiting integration | Health department |
| Pilot evaluation on partners' real data | Planned for the pilot | Six months |

## What this demo does not claim

The One Health programme is not operating across Bengaluru. No hospital is integrated. WhatsApp is not connected
live. Kaju makes no clinical decision, approves no data access and sends nothing without a person. No model runs on
the demo. The demonstration records are fictional and show no programme outcome.

## Tests run for this release

| Check | Result |
|---|---|
| Typecheck, lint | Pass (one older warning in `src/sp4/home/v7/FiveSteps.tsx`) |
| `test:bite-intake`, `test:kaju-incident` | 5 and 6 checks pass |
| Kaju suites (`reliability` 47, `automations`, `planner`, `polish`, `intake` 9, `prepare` 5, `inference-off` 8), `test:routes` 8 | Pass |
| Full guided demo in a real browser against staging, 1920×1080: 6 stages, 27 actions, every highlighted control used | Complete, no page or database errors |
| `e2e/demo-story.spec.ts` (OH_E2E=1) on https://demo.straypaw.org, deployment from commit a181fad2: the whole walkthrough, Start Demo to the closing card, including that one person's open records never follow into the next person's screens | Pass (1.4 min) |
