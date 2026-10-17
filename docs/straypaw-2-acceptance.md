# StrayPaw 2.0 — acceptance

Release candidate on branch `claude/friendly-noether-u1c7u4`. Nothing was
deployed, merged, migrated or written to production.

## Checks

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` | pass (79 pages prerendered) |
| Types | `npm run typecheck` | pass |
| Lint, whole repo | `npm run lint` | pass, 0 warnings |
| Repository regression scripts (16) | `npm run test:*` (all except e2e) | 16/16 pass; the ones named "integration" use an in-memory fake client |
| 2.0 end-to-end, phone (Pixel 7) and desktop (1440) | `E2E_BASE_URL=http://localhost:3100 npx playwright test e2e/straypaw2.spec.ts` against `next start` | **56/56 pass**, twice in a row |
| Overflow sweep | every 2.0 route at 1440, 390 and 320 px, signed out and with a synthetic member | 0 px document overflow |

The e2e suite covers: 15 old URLs redirecting to their 2.0 homes; the landing
hero rendering; the Atlas drawing a map; a sighting sent (with `/api/report`
answered by the test) and the receipt saying "Received", not accepted; a
failed send keeping the answers and saying "Not sent"; `?help=1` opening the
needs-help questions; the signed-out NGO gate; completing an Academy lesson on
the device; seven pages rendering without errors or overflow.

## Journeys verified with a synthetic member session

A local harness (`e2e/harness/`) signs a fake member in and
answers database calls with records coded `TEST-…`; every write is captured
and any write it does not answer is blocked, so nothing reached production.

| Journey | Write captured | Receipt shown |
|---|---|---|
| Work: take / assign a case | `take_case`, `assign_case` | "Assigned to … by you" |
| Casefile: record care | `add_medical_event` | "Care event added to the history" |
| Open a case from an animal | `create_case_with_location` | redirect to the new case file |
| Review: close with a reason | `review_case` | per-row "Closed with a reason" |
| Field mode offline: note kept as draft, sent when online | none offline, `add_case_note` after | "1 note not sent" → sent |
| Import: preview, decide, commit | `/api/partner/import` preview + commit | batch receipt with imported / held / failed |
| Settings: save profile | `ngo_update_profile` | "Profile saved" |
| Moderation: wrong password, then reject | `/api/admin/sightings` | 401 shown; "Rejected", queue advances |

## Screenshots

`docs/straypaw-2/screens/` holds 56 captures from the production build, each
route at 1440 and 390 px: Atlas (India, Coimbatore), Report, My Activity,
animal record, Stories, Organisations, Help, City map (Ranchi), Insights,
City report, Programmes, Academy, a lesson, Workshops, Resources, Search,
Trust, and NGO Work, Animals, Casefile, Case file, Inbox, Review, Field,
Programmes, Import, Map (NGO screens with the synthetic member).

## Bugs found by this pass and fixed

- The 1.0 storage notice covered the report flow's buttons on phones; it is now hidden while reporting and sits above the thumb bar elsewhere.
- Controls scrolled into view landed under the fixed thumb bar; scroll padding now keeps them clear.
- `/search` had no page heading.
- The report flow's phone layout rule had been moved into the map picker's stylesheet and did not load on the first screen; restored.
- Overflow at 320 px: top bar, resources and search grids, and the animal record's fact pills.
- Insights' first draft presented the capped dataset as the whole record; every finding now discloses the loaded scope.
- Academy exercises updated the parent during render (React warning); fixed.
- A helpline number in my first draft did not match the published page; corrected and checked programmatically against the old page.
- `/partner/resources` was first mapped to learning resources; it is the evidence-files tool, now kept as a parked page.

## Failure states shown honestly

Not connected (no database) → "Not connected to the record. Nothing was saved."
Failed read → "Not read", never an empty list or a zero. Offline report →
draft kept, "has not been sent". Signed out / not a member → the NGO gate
explains, requests nothing private. Capped data → "Loaded scope" note.
WhatsApp → "Not connected".

## Not verified

- Real row-level security against a real database (no production access was used, by design).
- Feeding-spot pages with data: the record has no feeding spot yet.
- Organisation impact figures: they need the server key, absent locally; the page shows dashes and says a dash means not read.
- Printing the City report to paper/PDF beyond the print stylesheet.
- Real devices: all phone checks are browser emulation.

## Release blockers (founder decisions)

1. Decision 014 (shell) and 035 (verification criteria) are open on the FigJam board.
2. Commissioned folk art for 11 slots (`docs/straypaw-2/ART_SLOTS.md`).
3. A safe preview: preview builds on this Vercel project receive production secrets (`CURRENT_STATE_AUDIT.md`). The branch has preview deployments disabled in `vercel.json`; that line must be removed before merge, and a preview should only be enabled with scoped, non-production environment variables.
4. Staging run of e2e and RLS checks with real member accounts.
5. Backend work the brief calls for but 2.0 does not fake: CareOS, offer/acceptance ledger, identity-merge API, temporary grants, clinician sign-off, cross-device follows.

## Rollback

See `docs/straypaw-2/ROLLBACK.md`. Code only, no data restore; Vercel
Instant Rollback to the pre-release deployment, or `git revert -m 1` of the
merge. All 2.0 redirects are temporary (307).
