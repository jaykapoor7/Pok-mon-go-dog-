# Operations UX reorganisation

This branch targets latest main `2f35e39b`. It preserves the homepage, mascot and existing backend workflows. Production deployment and merge require owner approval. No production data was changed.

## Diagnosis and product map

The old workspace definitions separately listed desktop navigation, three mobile destinations, a page index and section-tab groups. Unknown roles were treated as unrestricted in several places. Search and mobile discovery used the unfiltered definitions. Reports lived under Programmes on mobile but separately on desktop, and historical review could be confused with ABC evidence review. A field note could be cleared after a failed request; unscoped localStorage drafts could appear under another account.

`workspaces.ts` now owns one typed destination registry. Sidebar, mobile destinations, section navigation, breadcrumbs, utility discovery, Finder and Kaju navigation derive from it. Restricted links fail closed while roles load. URLs are retained. Secondary desktop destinations have named workflow disclosures. The mobile bar follows the same primary hierarchy; a header control opens grouped utilities. Essential actions remain section links.

| Role/workspace | Before | Current structure |
|---|---|---|
| NGO coordinator | Home, Work, Animals, Programmes, Reports, Team plus More; different mobile groupings | Today → Work → Animals → Programmes → Reports; organisation/outreach utilities; section links include intake, field, verification and exports |
| Veterinarian | Programmes changed destination to Verification | Today retains clinical pending actions; ABC evidence/authorisation has its own role-derived primary destination; programme destination stays predictable |
| Field worker | Field under mobile More; text drafts in shared localStorage | Work → Field mode; zone assignments directly linked; scoped local outbox, cached assignments and explicit synchronisation |
| Municipality | Public map home; reviewer link inconsistently discovered | Verified reviewers enter package review; Wards/map, Overview, Programmes and Reports remain available; review is hidden from unverified discovery |
| Community / education | Separate shells with duplicated definitions | Same distinct workspaces and routes, derived through the common registry; no municipal billing navigation added |

Retained destinations, roles and legacy-link handling: [route inventory](ROUTE-INVENTORY.md). The inventory distinguishes implementation inspection from functional verification; an HTTP 200 is not a workflow pass.

## WVS research and adoption

Primary references: [WVS Data Collection App](https://wvs.org.uk/data-collection-app/), [Rabies Launchpad](https://launchpad.wvs.org.uk/en), [Gibson et al., vaccinate–assess–move research](https://pmc.ncbi.nlm.nih.gov/articles/PMC4696259/). WVS documents offline field capture, geographical team organisation and a separate post-vaccination survey. We adapt that separation; its published thresholds are not hardcoded as a StrayPaw acceptance rule. We make no claim to WVS interoperability or in-country hosting.

| Capability | Adoption / files | Verification / limits |
|---|---|---|
| Offline field text | Improved: `Field.tsx`, `lib/field/outbox.ts`, the existing `sw.js` | User/org-scoped IndexedDB, shell/static assets only in service-worker cache; pending records remain distinct from submitted records |
| Offline private photos and location observations | New: `lib/field/sync.ts`, field evidence receipt migration | Blob bytes stay in IndexedDB; private deterministic upload paths; matching-file readback on retry; records and audit read independently; GPS requires an explicit user action |
| Interrupted sync / duplicates | New: note/evidence receipt RPCs | Actor/request lock and payload hash; failed and ambiguous sync retains the draft; retries reuse the same request |
| Working boundaries / staff | New: working-zone migration, `WorkingZones.tsx`, existing `FieldMap.tsx` | PostGIS geometry validation, programme-owned zones, same-organisation authorised staff, MapLibre overlays; no second map engine |
| Completion monitoring | New separate reported/supervisor states | Assigned staff report, coordinator reviews; neither is coverage, clinical certification or municipal acceptance |
| Existing ABC evidence / monthly packages | Reused | Existing veterinary and coordinator attestation, municipal query/answer/acceptance and reviewer exports remain separate |
| Surveys/census | Reused, moved under Programmes | Existing survey and collection routes retained. No new statistically validated coverage estimator is claimed |
| Fast clinical and ARV event recording | Existing clinical/care pages retained | New offline outbox currently supports notes and ABC evidence, not complete offline animal creation or a rapid ARV intervention register |
| Route tracking | Not implemented | No continuous background location collection; a consented operational requirement is needed |
| Contract/rate reconciliation | Not implemented | No configured authoritative contracts/rates; no payment processing or financial approval claim |
| Disposition/release exceptions | Existing workflow retained | A reviewed, versioned Indian ABC policy/exception model remains a gap; no new clinical rules were invented |

## Security and staging migrations

Four migrations were applied to staging only: `20261102120453_field_note_receipts`, `20261102121341_programme_work_zones`, `20261102122025_field_evidence_receipts`, and `20261102122918_scoped_case_assignment`. The assignment migration repairs staging drift found by actual field QA; production’s existing functions already had actor and tenant guards. The new implementation retains those guards and adds coordinator-only assignment and audit entries. Staging was refined again to preserve non-empty legacy assignee names and public-only legacy claim behavior. New tables have RLS; anonymous function execution and direct client writes are revoked. Each action uses current authenticated organisation and records an audit entry. These migrations must be reviewed and installed in the correct production project before this branch can be released. No production credentials were copied to Preview.

Field caching holds private records on the current browser/device. It is partitioned by user and organisation, and hidden when identity changes. Offline cached role information permits local viewing only; sync rechecks the current server session and database permissions. Shared-device data management and cache retention policy require further review before broad rollout. No API, evidence response, signed URL or auth endpoint is cached by the service worker.

## Verification so far

- TypeScript and lint passed during implementation.
- Eleven canonical navigation checks passed across unknown/member/veterinarian/coordinator/admin and reviewer states.
- Nine real staging note-sync checks passed: source/audit, replay, changed-payload rejection, anonymous denial, cross-org denial and receipt forgery denial.
- Twelve real staging working-zone checks passed: valid geometry, role/tenant checks, assignment, distinct report/review stages, source/audit and retry.
- Thirty real authenticated browser ABC checks passed at desktop and phone widths after the initial navigation changes: evidence, vet authorisation, coordinator review, monthly package, municipal query/answer/acceptance, actual reviewer PDF/XLSX and cross-org export denial.
- Two actual IndexedDB browser tests passed for offline persistence, reload and user/org isolation.
- Twenty-one Kaju reliability checks passed after sharing the destination registry; a denied navigation request no longer claims it opened a screen.

The completed build passed seven real offline-phone checks (note + private photo + location, fully offline reload, timestamped cached assignments, sync and file readback) and six real working-zone browser checks (coordinator create/assign, staff report, separate supervisor review, database state and existing map). Fifteen desktop/tablet/phone public/authenticated accessibility checks passed with no automated WCAG A/AA findings after correcting existing hero-demo contrast. Final CI results are recorded in the PR. Vercel rejected Preview builds with an account build-rate-limit error; no purchase or plan change was made. Earlier test passes do not certify later code changes. Full offline animal identification/creation, rapid ARV events, verified survey coverage, contract reconciliation and disposition exception templates are not complete. This PR is an operations foundation, not a claim that the entire master scope is finished.

The final field view loads assignment IDs from the authenticated case table rather than comparing display names. A shared display name cannot change whose cases are displayed.

Older unscoped localStorage drafts are not automatically attributed to a new user. They are retained and a recovery notice points to organisation-admin-assisted recovery with the original recorder. No legacy draft text is exposed to a different account.

CI on the earlier 15ef06f5 head passed 226 browser tests and skipped 15, with three failures: two detected a missing explicit verification destination and one detected narrow-phone header overflow. Both causes were corrected rather than hiding the tests. Final-head CI is still required. Vercel Preview creation is blocked by its account build-rate limit (the check links to `upgradeToPro=build-rate-limit`); a paid upgrade was not attempted.
