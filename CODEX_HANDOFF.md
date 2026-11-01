# Handoff for Codex (backend reliability, data, AI execution, security)

Production: https://www.straypaw.org (the apex redirects here).

## Continuation — 1 November 2026

Read [the current release results and exact remaining owner actions](docs/sp4/RELEASE-2026-11-01.md), then [the security continuation](docs/sp4/CONTINUATION-2026-11-01-SECURITY.md). They supersede the earlier gap matrix and historical notes below. Three non-destructive security/action/check migrations were tested in staging and applied to production. The authenticated desktop/phone ABC journey, private evidence and reviewer exports passed. Recurring explained checks, confirmation receipts and independent audit readback are implemented. Live model-backed chat and real external-provider journeys remain unverified. WhatsApp stays disconnected. Historical-data cleanup was not executed.

The old vector rig is retained in `src/kaju/Rig.tsx`; the live `Kaju.tsx` now uses articulated Explorer textures, independent joints and natural face expressions across existing placements. The homepage has a broader platform heading, a “Meet Kaju” introduction and a blue hero background. See `KAJU_CHARACTER.md` and the release's saved visual evidence. Final application release `08f3549b` is READY and verified on production by exact health SHA and actual hero/Explorer asset checks at all three widths. A real final production Kaju request still returned `engine:tools`; configure a funded model credential before claiming natural model-backed chat is live.

## 1. Commits on main (this phase)
| Commit | Change |
|---|---|
| 66009f4 | Kaju rename and mascot |
| 8d51191 | Kaju idle sequences |
| bf589fa, 583f9d8 | Kaju wording on the landing page |
| ece500c | Unique demos across the site |
| d1f1bb1 | Landing order, copy, Kaju run band |
| f80461e, 064122d | Connections: Google, Microsoft, native files |
| 8fa2446 | Slack, Zoho, SMS, map exports |
| 8b09988 | Kaju corners, handoff documents |

## 2. Frontend components
- `src/kaju/*`: the Kaju rig, poses, controller, presence (KajuCorner, KajuEmptyState, KajuInsight, KajuAmbientToggle) and the ambient setting.
- `src/sp3/ai/AiPanel.tsx`: `useKajuMood`, `KajuMark`, file attach, "Manage connections", and the confirmation cards for email, calendar, Slack, SMS and reports.
- `src/sp/connections/Connections.tsx`: the Connections page (`/ngo/settings/connections`, `/city/connections`).
- `src/sp4/home/ui.tsx`: demo fragments with content variants (`v`) and `KajuRunUi`.
- `src/sp4/home/Interactive.tsx`: `AiBand` variants with Kaju on the run panel.

## 3. Kaju states and events
See `KAJU_CHARACTER.md`. The mascot reads only the agent's real state (`busy`, `open`, the last message's error, citations and proposals).

## 4. AI endpoints and types
- `POST /api/ai`
  - Body: `{ messages: {role, text}[], context: {path, workspace} }`, with `Authorization: Bearer <supabase token>` optional.
  - Returns `AiReply`: `text, citations[], tools[], proposals[], navigate?, engine: "model" | "tools", notice?` (`src/sp3/ai/types.ts`).
  - Model: `ANTHROPIC_API_KEY` is not set in production, so Kaju runs on the deterministic tool router. `STRAYPAW_AI_MODEL` is optional.
- **Tools** (`src/sp3/ai/tools.ts` and `connectTools.ts`):
  - search_records, work_summary, find_missing_evidence, find_duplicates, programme_report
  - extract_field_message
  - propose_case, propose_note, propose_followup, propose_care
  - navigate
  - find_files, read_file, analyse_spreadsheet
  - draft_email, schedule_event, post_message, send_sms, prepare_report
- Connection tools are offered only for capabilities the person has connected (`capabilitiesFor`).
- **Audit trail:** confirmed record writes carry the exact mark "Prepared with StrayPaw AI, confirmed by …", which the production trigger `sp_audit_write` matches. Do not rename it to Kaju without updating the trigger at the same time.

## 5. Server-side agent work for Codex
- Set `ANTHROPIC_API_KEY` and test the tool-use loop end to end against staging data.
- ABC queue and package status read tools are implemented; verify them with real coordinator and municipal sessions.
- `withTools` routing for connection intents (email or calendar without a model) is minimal by design. Extend it once the model is live.
- Per-user and IP buckets are implemented; the existing shared limiter still fails open on database/configuration failure.

## 6. Marketing figures that need authoritative verification
- Homepage "Customer results": imported historical register counts from `src/sp3/customers.ts` STORIES (Pawsome, Kind Hour), labelled as historical.
- The public map still includes 27,857 research-dataset animals. See `docs/sp4/CLEANUP-PROPOSAL-2026-11.md`; it is not executed.
- All demo fragments are illustrative and labelled. None reads live data.

## 7. Forms whose delivery needs verification
- `/demo` (DemoForm) and `/contact` (ContactForm): Resend email and contact inbox. `RESEND_API_KEY` is set.
- `/partner-apply` (`/api/partner-apply`), `/community/report` (Turnstile), `/api/feedback`.

## 8. Municipal reviewer
- **Functions in production:** `abc_package_act`, `abc_package_cases`, `abc_case_checklist`, `abc_case_history`, `abc_my_context`.
- **Data:** `review_offices` and `review_office_members`, managed in the moderation console (`/api/admin/offices`, ADMIN_SECRET).
- **Storage:** reviewers can read evidence files only for packages submitted to their office (storage policy `abc_evidence_read`).
- **Gaps:**
  - No reviewing office exists in production yet.
  - PDF/XLSX downloads are implemented with session-scoped package reads; authenticated browser and cross-tenant proof remain required.

## 9. Known data inconsistencies
- 2,280 imported cases are `verified` and should be `source_record`.
- 2 organisation-created cases are labelled `community_report`.
- Research datasets appear in public map totals.

These are covered by the cleanup proposal and are not executed. Staging has some drift (it lacks `can_manage_org` and spatial caches, and grants differ).

## 10. Routes and journeys for end-to-end tests
- **Role journeys:**
  - **Coordinator:** case → evidence upload (camera) → vet authorise → review → package → submit.
  - **Municipal reviewer:** query → answer → accept.
  - **Kaju:** open → ask → confirm a proposal → audit row.
  - **Connections:** connect, use, disconnect.
- **Scripts:**
  - `scripts/staging/abc-workflow-check.mjs` (55)
  - `ai-write-check.mjs` (11)
  - `roles-evidence-check.mjs` (24)
  - `scripts/test-connections.ts` (32)
  - `scripts/qa/crawl.mjs`, `clip.mjs`, `demo-uniqueness.mjs`, `roles-qa.mjs`

## 11. Known limitations and external dependencies
- **Connections need administrator setup** (`docs/CONNECTIONS.md`): `CONNECTIONS_ENC_KEY`, plus the Google, Microsoft, Slack and Zoho OAuth apps and MSG91 DLT. Until then each provider shows "Not available yet".
  - Google: app verification is needed for `gmail.compose` and `drive.readonly`.
  - Microsoft: some tenants need admin consent.
- WhatsApp is not connected; Meta verification is pending.
- Government e-Office is planned; there is no public API.
- Microsoft disconnect cannot revoke at Microsoft; users remove the app at myapps.microsoft.com.
- **App navigation:** the NGO sidebar has six places: Home · Work queue · Animals · Programmes · Reports · Team & settings, plus Kaju.
  - Each place's screens are tabs at the top of its list pages (`TAB_GROUPS` in `src/sp/shell/workspaces.ts`):
    - Work queue · Inbox · Field mode
    - Register · Map
    - Programmes · Verification
    - Report packages · Reports & proof
    - Team · Settings · Connections
  - Role-aware: a vet's Programmes opens Verification. Field staff don't see Reports or Team.
