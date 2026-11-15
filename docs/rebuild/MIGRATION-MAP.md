# Classic → new app: route and capability migration map

Every classic route under `src/app/(app)/`, where its work goes in the new app, and the server functions it relies on.
The new app is built under `/next/*` while this work is in progress; when Classic is removed every `/next/...` path becomes
its canonical path without the prefix (`/next/ngo/cases` → `/ngo/cases`). Public pages keep their public addresses and are
rebuilt on the public site kit (`src/sp4`), outside the app frame.

Rule: a classic route is deleted only after its replacement works and is tested. No redirect to Classic, no placeholder.
Records, audit history, permissions, exports, storage buckets and API routes are kept: only the old interface goes.

Legend: **Reads** / **Writes** name the RPC (`rpc`) or table the replacement must use. `DB decides` = the RPC checks the
caller's role itself; the UI only hides what the role cannot do.

## NGO workspace

| Classic | New home | Writes the replacement must offer |
| --- | --- | --- |
| `/ngo` (Brief) | `/next/ngo/today` | Kaju prepared work (schedule follow-ups singly and all: `kaju_confirm_action` via `/api/ai/act`), Kaju checks seen (`kaju_mark_check_seen`, leads: `kaju_check_delivery`), setup steps (import, team, field). |
| `/ngo/work` (queue + inspector) | `/next/ngo/cases` (views + drawer) | Next step for a case: still active / close with reason (`review_case`), claim (`upsert_volunteer`, `take_case`), take, start work (`update_case_status` in_progress, undo → assigned), record outcome with photo (`uploadPhoto` bucket `sightings`, `update_case_status` resolved), assign/reassign (`my_org_members`, `assign_case`, undo), set reason, add note (`add_case_note`), schedule follow-up (`add_case_followup`). Views: open, mine, unassigned, critical, follow-up due, needs a decision (stale), imported/history, missing reason, resolved. |
| `/ngo/review` | `/next/ngo/cases` views "Needs a decision", "Imported", "Missing reason" | `review_case` (still_active, closed_done, closed_no_action, other_ngo, set_reason). |
| `/ngo/cases/[id]` | `/next/ngo/cases/[id]` | Everything in Next step; follow-ups Done/Missed/+7 days (`update_case_followup_status`), delete follow-up; delete case / timeline / care with reason and Undo (`remove_record`, `restore_record`); care and movement events (`operations_record_event`, review `operations_review_event`); ABC evidence tab (below); record thread. |
| `/ngo/cases/new` | `/next/ngo/cases/new` | `upsert_volunteer` + `create_case_with_location` (city, h3_r8 via `locationCell`, title, description, dog, zone, lat/lng, severity, category, informer contact, hospital, costs). Prefill from `?dog&lat&lng&zone&title&note`. |
| `/ngo/add` (paste a message) | `/next/ngo/inbox` "Paste a message" | Kaju reads the text (`/api/ai`), proposal confirmed via `/api/ai/act`. |
| `/ngo/inbox` | `/next/ngo/inbox` | File reports into a drive (`file_sightings_to_campaign`, optional claim), open a case from one report, WhatsApp items (`careos_inbox_list`, `careos_inbox_act`: claim, open_case, dismiss with reason). |
| `/ngo/animals` | `/next/ngo/animals` | Server filters via `org_animals(p_search,p_ster,p_vacc,p_zone,p_from,p_to,p_needs,p_limit,p_offset)`, zones `org_zones`, revaccination lens `org_revaccination_setting` / `org_revaccination_due`, CSV exports. |
| `/ngo/animals/[id]` | `/next/ngo/animals/[id]` | Needs help on/off (`ngo_set_dog_care`), record care (`add_medical_event`), delete care/follow-up/timeline (`remove_record`), identifiers add/retire (`add_animal_identifier`, `retire_animal_identifier`; flag `animal_identifiers`), start a case, operations events read-only. |
| `/ngo/animals/identity` | `/next/ngo/animals` view "Identity review" | `operations_record_event(kind identification)`; photo search (`animalid_request_search`, `animalid_decide`, `animalid_reverse`, admin `animalid_request_index`; flag `animal_id`). Leads and coordinators only. |
| `/ngo/animals/scan` | `/next/ngo/animals` "Scan a tag" | `lookup_animal_identifier` (flag `animal_identifiers`). |
| `/ngo/care` | `/next/ngo/operations` view "Care log" | Read only. |
| `/ngo/field`, `/ngo/offline` | `/next/ngo/field` | Encrypted offline drafts (`src/lib/field/outbox`), sync (`src/lib/field/sync`: `operations_intake`, `field_confirm_note`, `field_confirm_evidence`, `field_confirm_vaccination`, `operations_record_event`, `operations_submit_survey`), start work, follow-up done/missed, PIN lock, clear sent, service worker warm-up. |
| `/ngo/map` | `/next/ngo/operations` view "Map" | Read only (`/api/livingmap?scope=org`, `org_work_zones`). |
| `/ngo/rescues`, `/ngo/sterilisation`, `/ngo/pipeline` | `/next/ngo/operations` lanes | Read only. |
| `/ngo/verification`, `/ngo/verification/[id]` | `/next/ngo/submissions` view "Evidence readiness" + case record tab "ABC evidence" (vets: `/next/health/procedures/[id]`) | `abc_add_evidence` (bucket `abc-evidence`), delete evidence, `abc_vet_authorise` (+Undo), `abc_revoke_attestation`, `abc_review_evidence`, `abc_return_evidence`. Locked when packaged. |
| `/ngo/packages`, `/ngo/packages/[id]` | `/next/ngo/submissions`, `/next/ngo/submissions/[id]` | Monthly package (`abc_billing_preview`, `abc_create_package`, `operations_configure_package`, `operations_reconciliation` totals check), other-period package, submit / answer (`abc_package_act`), downloads (`/api/files/package`), claims (`operations_configure_package`), item responses (`operations_answer_item`). |
| `/ngo/contracts` | `/next/ngo/submissions` tab "Contracts" | `operations_create_contract`. |
| `/ngo/evidence` | `/next/ngo/submissions` tab "Documents" | `add_document`, `link_document`, `update_document` (bucket `sightings`). |
| `/ngo/proof` | `/next/ngo/submissions` tab "Exports" | `/api/partner/export`, `/api/partner/government-report`, `/api/partner/evidence-workbook`, `/api/partner/story-pack`. |
| `/ngo/stories` | `/next/ngo/submissions` tab "Stories" | POST `/api/partner/stories`. |
| `/ngo/quality` | `/next/ngo/submissions` tab "Record quality" | Read only. |
| `/ngo/programmes`, `/ngo/programmes/[id]` | `/next/ngo/programmes`, `/next/ngo/programmes/[id]` | `create_campaign`, `archive_campaign`, `campaign_stats`, `campaign_animals`, CSV. |
| `/ngo/programmes/zones` | `/next/ngo/programmes` tab "Zones" | `zone_action` (create, assign, unassign, report_complete, review_completion), `operations_zone_progress`, `operations_assess_survey`, `operations_survey_result`, `operations_review_survey`. |
| `/ngo/surveys`, `/ngo/projects`, `/surveys/*` | `/next/ngo/programmes` tab "Surveys" + `/next/ngo/programmes/surveys/[id]` | `create_survey`, `submit_survey_response`, `survey_totals`, collect flow, CSV. |
| `/ngo/feeding` | `/next/ngo/programmes` tab "Feeding spots" | `create_org_feeding_zone`. |
| `/ngo/fundraising`, `/fundraisers/new` | `/next/ngo/programmes` tab "Fundraising" | `create_fundraiser` (verified partners only, DB decides). |
| `/ngo/team`, `/ngo/volunteers` | `/next/ngo/team` | `set_member_role`, `remove_org_member`, `revoke_team_code`, POST `/api/team/invite`; volunteers read only. |
| `/ngo/settings`, `/ngo/settings/policies`, `/ngo/settings/connections` | `/next/ngo/settings` (Profile, Policies, Connections, Kaju rules) | `ngo_update_profile`, `kaju_set_report_deadline`, `operations_save_policy`, `/api/connections*`, `nx_kaju_policies`. |
| `/ngo/import` | `/next/ngo/import` | `/api/partner/import` start/rows/finish, bucket `imports`. |
| `/ngo/training` | `/next/ngo/training` | Learner `training_complete_lesson`; supervisor `training_save_course`, `training_save_lesson`, `training_delete_lesson`, `training_assign`, `training_unassign` (flag `training_lms`). |
| `/ngo/automations` | `/next/kaju/automations` | Done. |
| `/ngo/readiness` | `/next/ngo/settings` "What is connected" | Read only. |
| `/today` | `/next` + `/next/start` | Done (`oh_accept_invite`, `oh_create_programme`). `?invite=` links go to `/next/start?invite=`. |
| `/assistant` | `/next/kaju` | `/api/ai` (stream), `/api/ai/act`, `/api/connections/act`, `/api/files/export`, `/api/files/read`. |

## Government & Programmes workspace

| Classic | New home | Writes |
| --- | --- | --- |
| `/city/review`, `/city/review/[id]` | `/next/gov/verification`, `/next/gov/verification/[id]` | `abc_package_act` (accepted, query, returned), `operations_decide_item` (single, batch), `operations_finalize_package`, `operations_record_payment_reference` (bucket `operations-documents`). Reviewing office members only (DB decides). |
| `/city/contracts` | `/next/gov/reports` tab "Contracts" | `operations_create_contract` (municipal). |
| `/city/connections` | `/next/settings` (personal) | `/api/connections*`. |
| `/programme/[slug]` and `coverage`, `data`, `network`, `report`, `work` | `/next/gov/programmes/[slug]` tabs | Reads `oh_programme_overview`, `oh_programme_network`, `oh_research_extract`, `oh_alerts`; acks `oh_ack_alert`; work handoffs `oh_handoff_act`, `oh_raise_handoff`. |
| `/programme/[slug]/setup` | `/next/gov/programmes/[slug]` tab "Setup" | `oh_set_programme`, `oh_add_area`, `oh_add_partner`, `oh_create_invite`, `oh_record_estimate`, `oh_set_assignment`, `oh_set_logo`, `oh_share_programme`, `oh_record_training`. |

Public city pages (`/city`, `/city/insights`, `/city/programmes`, `/city/programmes/[id]`, `/city/report`) keep their
addresses and are rebuilt as public pages.

## Healthcare workspace

| Classic | New home | Writes |
| --- | --- | --- |
| `/workspace/[id]` (clinic home), `register` | `/next/health/today`, `/next/health/bites` | Read: `oh_clinic_register`, `oh_clinic_due`, `oh_clinic_notices`, `oh_clinic_transfers`. |
| `/workspace/[id]/new` (record a bite) | `/next/health/bites/new` | `oh_record_exposure` (pass the transfer id when it came from a referral), `oh_submit_bite_notice`. |
| `/workspace/[id]/record/[rid]` | `/next/health/bites/[id]` | Clinician only: `oh_set_category` (assess), `oh_prescribe`; nurses and clinicians: `oh_record_dose`, `oh_add_dose`; `oh_set_wound_washed` (record_exposure); `oh_log_reminder`; `oh_refer_exposure`; `oh_transfer_act`. |
| `/workspace/[id]/sample` | `/next/health/samples/new` | `oh_submit_sample`. |
| lab queue | `/next/health/samples`, `/next/health/testing`, `/next/health/results` | `oh_sample_step` (receive, start, result, validate, release, reject; reject not offered on "collected"). |
| `/workspace/[id]/services` | `/next/health/facilities` "Our services" | `oh_verify_service`, `oh_set_organisation`. |
| referrals | `/next/health/referrals` | `oh_set_referral`, `oh_transfer_act`, `oh_handoff_act`. |

## Research workspace

Studies, snapshots and reports are built. New: dataset access requests, approval, revocation and versioned extracts
(`nx_data_requests`, staged migration), so a research group outside a programme can ask for data without joining it.

## Public pages (rebuilt on the public kit, same addresses)

`/community` (and `activity`, `feeding`, `feeding/[id]`, `help`, `organisations`, `organisations/[slug]`, `report`, `stories`),
`/animal/[id]`, `/fundraisers`, `/fundraisers/[id]`, `/learn` (and `courses`, `courses/[course]`, `courses/[course]/[lesson]`,
`playground`, `resources`, `workshops`), `/search`, `/offline`, `/city` public record pages. `/trust` and `/trust/console`
(StrayPaw operators) are rebuilt as an operator console in the new design.

## Outside the classic folder

- `src/sp3/ai/*` (Kaju engine) stays and moves to `src/lib/kaju/`; its hrefs and the `/ngo/` filter in `snapshots.ts` move to the new routes. `src/sp/shell/workspaces.ts` is replaced by the new nav registry.
- SQL that writes classic hrefs: `kaju_recurring_insights` findings and `automations` notices. A staged migration rewrites the functions to new routes (no stored rows are edited; the app maps any old href it reads).
- `next.config.mjs` redirects into classic are removed; public aliases point at the rebuilt public pages.
- `sp/onboard/flow.ts`, `Onboarding.tsx`, `Gateway.tsx`, `JoinClient.tsx`, `demo/tour.ts`, `docs/page.tsx`, the service worker and the manifest move to new routes.
- Tests and scripts that open classic routes are rewritten against the new routes.
