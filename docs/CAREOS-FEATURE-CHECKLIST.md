# WhatsApp CareOS 1.0 feature verification checklist

Audit date: 2026-10-27. Source of scope: all user requirements carried into this
work, PR #40's body/diff (no PR discussion comments were returned),
`CAREOS-INTEGRATION.md`, `straypaw-2-careos.md`, and existing NGO case workflows.
Native WhatsApp groups are the only explicitly deferred feature.

**Product release gate: NOT PASSED. No feature is claimed operational on WhatsApp.**
The code and database checks below do not establish real inbound/outbound delivery.
All required rows must gain real hosted evidence before production cutover.

Evidence levels:
- **L**: automated local checks; PostgreSQL is PGlite, Meta/media network boundaries
  use test doubles. Local HTTP/browser checks use a built Next server.
- **D**: actual isolated hosted Supabase PostgreSQL, including its existing
  triggers/RLS and dashboard projection. Synthetic workflow changes roll back.
- **C**: implementation/catalog review only; external behavior remains unverified.
- **Pending**: not configured or not exercised live. This is a release blocker,
  not an exclusion from scope.

## Community

| Required capability | Code / database evidence | Real integration verification still required |
| --- | --- | --- |
| English guided text reporting | L + D: consent → description → GPS → urgency → confirmation | Actual citizen conversation |
| Hindi prompts and language switching | L; deterministic Hindi/English prompts | Actual Hindi conversation, including Unicode replies |
| Consent for sharing, media, AI and updates | L + D; no case before explicit confirmation | Real phone consent and refusal |
| Captioned and captionless photos | L: private enrichment; captionless attachment retained while asking for text | Real Meta download → private Storage → NGO view |
| Voice notes | C: actual AI SDK transcription adapter, typed fallback on failure | Real audio, provider authorization, transcription accuracy |
| WhatsApp GPS pins | L + D: validated coordinates, private routing | Real handset location message |
| Guided urgency, chosen by reporter | L + D: routine/urgent/emergency → existing case severity | Real selections and receipt |
| Final report review / correction / cancel | L + D: no mutation until CONFIRM; CANCEL drops draft | Real text and interactive confirmations |
| Tracking IDs and status checks | L + D; tracking lookup bound to reporter phone | Real returned ID and follow-up STATUS |
| Status notifications | L + D: consent-bound durable outbox | Actual delivered/read evidence at citizen handset |
| Opt-out and opt-in | L: STOP blocks pending proactive sends, START requests fresh consent | Real STOP during pending sends and subsequent opt-in |
| Emergency expectations and helplines | C: no dispatch promise; links existing city helpline page in first reply | Validate target-city contacts before public launch; no invented phone numbers |

## NGO staff and shared case management

| Required capability | Code / database evidence | Real integration verification still required |
| --- | --- | --- |
| Staff onboarding bound to verified NGO account and own number | L: expiring hashed code, phone binding, consumed code cannot replay | Hosted Auth login + actual LINK message |
| Unlink, revocation and banned-account enforcement | L; membership/verified NGO/Auth ban checked per action | Revoke a linked staging user and verify handset denial |
| Secure individual staff DMs / shared NGO state | L + D: one existing case and scoped private inbox | Two actual linked staff devices reading same state |
| Acceptance | L + D: explicit action, shared case/inbox update | Real staff ACCEPT + CONFIRM and citizen notice |
| Rejection with reason | L: unaccepted reports only, no false rescue claim | Real staff rejection and citizen receipt |
| Volunteer assignment / reassignment | L + D: existing membership and volunteer records; foreign assignment rejected | Real assign command and assignee notification |
| Rescue updates and private notes | L + D: existing case updates/history, volunteer scope enforced | Real volunteer action and visible shared dashboard state |
| Treatment | L + D: existing medical events and private staff notes | Actual command, medical history and citizen message |
| INR expenses | L + D: bounded numeric amount, request deduplication | Actual command and dashboard total |
| Vaccination | L + D: medical event and explicit linked animal flags | Real staff command + existing animal view |
| Sterilisation | L + D: medical event and explicit linked animal flags | Real staff command + existing animal view |
| Follow-up scheduling and completion | L + D: existing tasks, due date, assigned volunteer completion | Real reminder → DONE → dashboard task state |
| Existing website follow-up missed/postponed/cancelled operations | Existing RPCs retained; new guards/sync cover these rows | Authenticated hosted UI actions, reminder behavior after moving date |
| Closure with explicit outcome | L + D: no invented outcome, bot blocks pending care tasks | Real CLOSE + CONFIRM + delivered citizen notice |
| Reopening | L: same case ID and private audit; foreign reopen denied in D | Real authorized REOPEN and dashboard refresh |
| Animal history and manual linking | L + D: same-NGO existing animal; no automatic merge | Actual matched animal review and explicit link |
| Staff HELP / MY / TEAM / VIEW | L; scope checked before private replies | Actual linked phones and role-specific results |

## AI and automation

| Required capability | Code / database evidence | Real integration verification still required |
| --- | --- | --- |
| Voice transcription | C: configured Gateway transcription model, timeout/fallback | Live provider call with real Hindi and English audio |
| Structured report extraction | C: schema-validated facts/urgency suggestion, no tools | Live extraction, refusal/hallucination checks, reporter confirmation |
| AI cannot authorize writes or choose GPS/roles | L + C: deterministic command parser and database authorization | Hosted adversarial conversation; live AI cannot bypass boundary |
| Existing-animal suggestions | L: scoped geographic candidates, confirmation-only link | Real staff review; match quality remains a human judgment |
| Location-based NGO routing | L + D: nearest verified, enabled covering NGO | Real report at configured staging pin |
| Uncovered reports wait and retry after coverage appears | L: private pending report, no acceptance claim | Hosted scheduler and later real routing notification |
| New-report and assignment notifications | L + D: actual durable outbox rows | Actual staff delivery/read receipts |
| Follow-up reminders | L: due tasks, deduplicated per IST date | Scheduled hosted invocation and real message |
| Escalation | L: 30-minute unaccepted report, no dispatch claim | Hosted elapsed-time run and real linked-team receipt |
| Daily NGO digest | L: shared scoped counts, deduplicated per staff/IST date | Scheduled hosted run + approved out-of-window template |
| Durable recovery scheduler | C: protected worker endpoint implemented | **Pending:** configure a scheduler and observe recovery without inbound traffic |

## Meta transport, security and privacy

| Required capability | Code / database evidence | Real integration verification still required |
| --- | --- | --- |
| GET verify token and exact plain-text challenge / HTTP 200 | L: direct receiver + built Next HTTP | Public staging URL with securely configured token |
| POST raw-body SHA-256 HMAC / App Secret | L: missing/invalid/tampered signatures rejected before persistence | Actual Meta-signed inbound request |
| Correct App, WABA and Phone Number IDs | L + browser: identifiers match the selected Meta account | Approved account and subscribed live delivery |
| Durable enqueue before acknowledging | L + D: queued event, store failure returns retryable error | Hosted webhook interruption/recovery |
| Deduplication and ordering | L + D: duplicate event creates one report/case | Real duplicate Meta delivery/replay in staging |
| Outbound text and interactive replies | L; long confirmations use full text above Meta's 1024-character interactive limit | Actual handset render and reply |
| Approved utility templates / 24-hour compliance | L: blocks free text outside window; validates mapping; normalizes parameters | **Pending:** actual template approvals/mapping and out-of-window delivery |
| Opt-out on sends | L: consent checked when outbox is claimed | Hosted real proactive send cancellation |
| Retries and failure states | L: explicit 429 retries bounded; permanent failure/ambiguous timeout distinguished | Real Graph rejection, failure receipt and recovery observation |
| Delivery tracking | L: sent/delivered/read/failed, early and out-of-order receipt handling | Actual Meta message IDs + delivered/read webhook evidence |
| Tenant isolation | L + D: own NGO only; foreign case/table/inbox/projection writes/reads rejected | Hosted Auth JWT + PostgREST matrix, including role changes |
| Role permissions and assignment scope | L + D: volunteers cannot perform medical/expense/closure operations | Actual linked volunteer + authenticated UI matrix |
| Legacy SECURITY DEFINER bypass protection | L + D: row guards on CareOS-linked records, unrelated rows preserved | Complete hosted RPC matrix and production catalog review before cutover |
| Revalidate queued staff access | L: revoked role/link or lost volunteer assignment blocks queued private replies | Hosted revoked-user delivery check |
| Private media | L + hosted catalog: private bucket + restrictive policy against broad legacy policies | Real upload/download; signed URL expiry; other NGO/anonymous denial |
| Private reports/GPS/phone/notes | L + D: private schema and scoped RPC; generic canonical facts; public projections exclude private cases | Hosted Storage/PostgREST/browser privacy matrix |
| Rate limiting | L: sender limits with STOP still honored | Hosted bursts and failure recovery |
| Audit trail and safe errors | L + D: actor-bound private audit; errors contain codes, not credentials | Hosted logs inspection after real provider failures |
| Environment and production safety | L: explicit project binding, previews cannot write production | Hosted environment guard checks; production cutover gate |
| No secrets in Git or responses | Code/diff review; secrets configured only through environment interfaces | Required credentials still unavailable; no production credentials changed |

## Dashboard, operations and release

| Required capability | Evidence | Remaining gate |
| --- | --- | --- |
| NGO Inbox → WhatsApp | L + D: scoped list/decision RPC and private evidence UI | Actual authenticated browser showing the live Meta report |
| Existing NGO Work / case view | D: existing `org_case_facts` reflects the same case | Authenticated hosted browser update after each actual staff action |
| Existing animal / medical / history / follow-up data | L + D: canonical tables updated; explicit animal link | Authenticated hosted animal/history/task screens |
| Website actions synchronize back to WhatsApp | L + D: existing `add_case_note` API produces private audit and neutral status queue; no duplicate bot notifications | Actual UI assignment/care/closure + citizen delivery |
| No production records overwritten | Hosted baseline counts preserved after migrations and rollback-only tests | Snapshot/catalog comparison at eventual production cutover |
| Dependency and build security | Patched Next/Sharp/PostCSS/source-map-js/SheetJS; production dependency audit clean; build passed | New commit's full CI must pass |
| Migration safety and rollback | Four additive migrations applied to staging; synthetic data rolled back; guards isolate only linked records | Production backup/restore readiness and retained-data rollback rehearsal |
| Exact public callback and Meta subscription | Intended production path implemented | **Pending:** accessible staging hosting, secrets, verified account, subscription and real delivery |
| Full real conversation → NGO workflow → citizen notification | Not verified | **RELEASE BLOCKED** |
| Merge, production deployment and live smoke check | Not performed | All required live rows above must pass first |
| Native WhatsApp groups | Explicitly deferred by user | Individual staff messaging is required and remains in scope |

## External blockers observed, not inferred

1. Meta's selected WABA `1410300414599459` displays **Account Restricted** and
   **This account cannot message on WhatsApp yet**; it requires business
   verification. Security Center shows StrayPaw eligible to start verification.
   Test number and Phone Number ID match the supplied identifiers. No message was
   sent by this work. The test number shows one existing recipient; that alone
   does not establish citizen + staff recipient readiness.
2. Fresh Vercel API requests for staging project
   `prj_BMfOSo35VhZA1vko5FSpLisiMw1e` return 404. The connected team's current
   project list includes only production `pok-mon-go-dog`. Earlier cached staging
   metadata is not treated as current access. No environment update succeeded.
3. Staging has no configured `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_APP_SECRET`
   or `WHATSAPP_ACCESS_TOKEN`. Supabase's connector supplies publishable keys,
   not a server credential. Do not reuse production's service role.
4. Verify/worker tokens, live AI authentication, actual approved templates,
   geographic coverage, linked test staff and a scheduler must be configured in
   the accessible isolated host. Generated but unsaved secrets are not configured
   credentials and are never printed.

See `CAREOS-VERIFICATION.md` for run evidence and `WHATSAPP.md` for setup and
retained-data rollback. No incomplete row above is counted as a shipped feature.
