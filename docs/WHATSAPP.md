# WhatsApp CareOS 1.0

This branch implements the Meta Cloud API transport and Care Inbox backend in
the existing StrayPaw application. Native groups are deferred. Staff use individual
DMs and share the same cases as the NGO dashboard. The historical local branch
`codex/whatsapp-integration` and its recorded commits were not recoverable from
GitHub or this workspace, so only the missing backend was rebuilt.

## Current verification boundary

The automated suite executes the migration and workflow functions in an isolated
PostgreSQL WASM engine (PGlite), using synthetic NGOs, authenticated user IDs,
staff and reports. It drives signed webhook requests through the actual receiver,
durable queue, worker, conversation state machine and existing case/medical/
follow-up/history tables. Meta HTTP is a test double in that suite. No test uses
production credentials, copies production rows, or claims a real Meta conversation.

The fixture's columns, defaults, enums and relevant constraints were inspected
read-only from the production catalog on 2026-10-27. It does not reproduce
PostGIS triggers, every historical RLS policy, Supabase Auth HTTP, Storage HTTP,
or PostgREST. Hosted staging, actual storage and actual Meta/AI requests must still
pass before production approval. The existing hosted staging project was inactive;
no safely configured staging secrets were available. No hosted staging deployment
or production change was made.

Run `npm run test:careos`, `npm run lint`, `npm run typecheck`, `npm run build`.
The test suite is also part of the existing PR quality gate.

## Deployment and environment

The intended production callback is exactly:
`https://www.straypaw.org/api/whatsapp/webhook`.
It remains 404 on production until a separately approved merge/deployment.

First use a separate staging Vercel project and non-production Supabase database.
Use `https://<actual-staging-host>/api/whatsapp/webhook` in Meta during testing.
Do not substitute an invented staging hostname. This branch disables its automatic
Vercel Git deployment because the existing preview configuration inherits production
database credentials. The public web UI continues to describe WhatsApp as a pilot.

Apply **only** `supabase/migrations/20261027080753_whatsapp_careos_v1.sql` to a
staging database already carrying StrayPaw's current schema. This is not a full
historical migration replay. It creates private transport tables, scoped RPCs and
the private storage bucket; it does not replace legacy workflow RPCs or mutate
existing animal/case rows. Keep `careos` out of PostgREST's exposed schemas.

Required server configuration (no `NEXT_PUBLIC_` prefix on secrets):

| Variable | Value / purpose |
| --- | --- |
| `CAREOS_ENABLED` | `true` only in the isolated target environment |
| `CAREOS_SUPABASE_PROJECT_REF` | Must match the URL's project ref |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging server credential |
| `WHATSAPP_APP_ID` | `1872092997485005` |
| `WHATSAPP_PHONE_NUMBER_ID` | `1388373327695772` |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `1410300414599459` |
| `WHATSAPP_GRAPH_VERSION` | `v25.0` (documented supported version) |
| `WHATSAPP_VERIFY_TOKEN` | A new random secret you store securely and paste in Meta's Verify token field |
| `WHATSAPP_APP_SECRET` | App 1872092997485005's actual App Secret |
| `WHATSAPP_ACCESS_TOKEN` | Meta token authorized for this WABA/phone; use a durable system-user token for production |
| `CAREOS_WORKER_SECRET` | Random bearer credential for the scheduled drain |
| `AI_GATEWAY_API_KEY` | Required off Vercel for voice/AI; Vercel OIDC can authenticate deployed calls |
| `CAREOS_TRANSCRIPTION_MODEL` | e.g. `openai/gpt-4o-mini-transcribe`, confirmed in the model catalog |
| `CAREOS_EXTRACTION_MODEL` | e.g. `openai/gpt-5-nano`, confirmed in the model catalog |
| `CAREOS_TEMPLATES_JSON` | Approved utility template mapping, see below |

`CAREOS_ALLOW_PRODUCTION=true` is an additional production-only guard. Do not
enable it without explicit production approval. A preview pointed at the known
production project always fails closed, even if that flag is accidentally present.
No production secret has been added, replaced or decrypted for this work.

## Exact Meta actions

1. Open app **1872092997485005**, WhatsApp API Setup. Check that the selected
   test phone is **+1 555 145 8316**, Phone Number ID **1388373327695772** and
   WABA **1410300414599459**. Do not use the apartment project's credentials.
2. Add and verify the citizen and individual NGO staff test-recipient numbers
   in Meta's test-number recipient list. Each number must complete Meta's OTP flow.
3. Securely put that app's App Secret, its WhatsApp access token, and a randomly
   chosen verify token into the isolated staging environment, using the exact
   names above. Do not paste secret values in chat, Git, or the PR.
4. Deploy staging after its database migration and credentials pass. In WhatsApp
   Webhooks, paste the **actual staging callback** and the value of
   `WHATSAPP_VERIFY_TOKEN`. Click Verify and Save only after the deployed GET
   verification test returns the exact challenge with HTTP 200 and text/plain.
5. Subscribe the **messages** webhook field, which includes inbound messages
   and outbound delivery/read/failure statuses. Ensure this app is subscribed
   to the specified WABA. If the app dashboard requires publishing before real
   message delivery, satisfy that requirement there; a dashboard test event alone
   does not establish live delivery.
6. In a synthetic staging NGO, sign in as a verified lead. In NGO Settings,
   configure its actual test coverage radius. Each test staff member generates
   a code bound to their own number, then sends `LINK <code>` from that number.
7. From the citizen number, send REPORT → YES → description/photo/voice → GPS
   → 1/2/3 urgency → CONFIRM. Note the returned `SP-...` tracking ID. Do not
   describe routing as acceptance. Check NGO Inbox → WhatsApp and NGO Work.
8. Complete the staff lifecycle below, including confirmations, and verify the
   citizen receives the notifications and the same case updates in the dashboard.

## Conversation and staff actions

Community prompts are English/Hindi. `HI` selects Hindi, `EN` English, `CANCEL`
discards the current draft, `STOP` opts out of proactive updates, and `START` or
`REPORT` begins a fresh consented report. `STATUS SP-...` is restricted to the
reporter's number. At most five private attachments are accepted. GPS must be a
WhatsApp location pin. Voice transcription and extraction are suggestions displayed
for confirmation; AI cannot set GPS, choose an NGO role, execute actions or merge
animals. If AI is unavailable the bot asks for typed words and keeps original text.

Linked staff send `HELP`, `MY`, `TEAM`, `VIEW SP-...` or `MATCH SP-...`.
Mutating commands always require a second `CONFIRM` (or button); drafts expire
after five minutes. `CANCEL` abandons them.

| Command | Existing records affected |
| --- | --- |
| `ACCEPT SP-id` / `REJECT SP-id reason` | Inbox decision, case stage, case update, citizen notice |
| `ASSIGN SP-id user-uuid` | Same-NGO current member, volunteers, case assignee |
| `RESCUE SP-id note` | Case stage/status and history |
| `TREAT SP-id note` | Medical event, case stage, animal history |
| `VACCINATE SP-id note` | Medical event and linked animal vaccination flags |
| `STERILISE SP-id note` | Medical event and linked animal sterilisation flags |
| `EXPENSE SP-id 250.50 receipt-note` | INR case cost total and private audit |
| `FOLLOWUP SP-id 2026-12-01T10:00:00+05:30 note` | Existing animal_followups and case due date |
| `DONE SP-id followup-uuid` | Completes that case's pending follow-up |
| `CLOSE SP-id recovered outcome-note` | Explicit outcome; blocked until pending follow-ups complete |
| `REOPEN SP-id reason` | Reopens a closed case without inventing a new case |
| `ANIMAL SP-id dog-uuid` | Explicit same-NGO link only; no automatic creation or merging |

Closure reasons: `recovered`, `died`, `could_not_locate`, `caller_unreachable`,
`other_ngo`, `duplicate`, `not_attended`, `other`. Volunteers can only record rescue,
notes and completed follow-ups for their own assignments. Acceptance, assignment,
medical data, expenses and closure require a current non-volunteer NGO role.
Membership, verified NGO status and Auth account bans are checked on every action.

The existing case tables receive non-identifying operational facts. Raw reports,
precise GPS, phone numbers, media paths, consent and full staff notes stay private.
No raw report is copied into public case descriptions or medical notes. Case map
coordinates are intentionally left unset; exact report pins are in the private
inbox. Animal histories only attach to an existing animal after explicit linking.

## Automation, sends and recovery

The webhook durably enqueues signed events and returns quickly. `after()` runs a
bounded drain. Also schedule **GET or POST `/api/whatsapp/worker` every minute**
with `Authorization: Bearer <CAREOS_WORKER_SECRET>` in the isolated deployment.
Use a scheduler that supports that authorization header. Do not assume a preview
Vercel Cron runs or reuse production cron credentials. This recovery drain is
required for retries, reminders, escalations and daily digests.

The worker retries rejected/rate-limited sends with bounded exponential backoff,
tracks delivered/read/failed receipts, preserves per-contact order and never
automatically resends an ambiguous timeout/expired-send lease. Such messages become
`uncertain` for operator review because Meta has no guaranteed send idempotency key.
Do not blindly requeue them. Dead incoming jobs and permanently failed outbox rows
need operator attention in the private staging database. Errors store codes, not
tokens or raw provider errors. Missing access tokens leave work pending.

NGOs opt into routing by enabling geographic coverage; nearest covering verified
NGO receives a report. Uncovered reports wait privately, then route when coverage
becomes available. New reports waiting 30 minutes trigger one escalation to that
NGO's linked leads/members. Due follow-ups trigger one reminder per IST date.
Daily digests are deduplicated per staff member and IST date. No timer claims
acceptance, resolution or a medical outcome.

Inside 24 hours of a user's last message, replies can use text or buttons. Outside
that window, sends are blocked unless `CAREOS_TEMPLATES_JSON` maps the notice and
language to an **approved utility template with one body text parameter**:

```json
{"closed:en":{"name":"YOUR_ACTUAL_APPROVED_TEMPLATE","language":"en"}}
```

Notice keys include `received`, `accepted`, `rejected`, `team_assigned`, `treated`,
`followup_scheduled`, `closed`, `reopened`, `routed`, `status`, `staff_alert`,
`digest`. Create/approve the templates actually needed in WhatsApp Manager and
configure their names, never hypothetical approvals. Opted-out contacts do not
receive proactive notices. A direct reply to a new user message may still respond
to consent, status, language or opt-out requests inside its service window.

Storage media stays in `careos-private`; signed URLs last 60 seconds and are issued
only after the caller's own NGO authorization. The restrictive storage policy
prevents an older permissive client policy from exposing this bucket. Downloads
use an allowlist of Meta hosts, no redirects, allowed MIME types and a 16 MiB cap.

## Production gate

Do not merge, apply production migrations, replace production secrets or deploy
production from this task. Before requesting approval, retain real staging
evidence of a Meta conversation, Storage access, the RPC/HTTP auth matrix, dashboard
updates, signature/duplicate/failure tests and successful build/quality checks.
Only then switch Meta to the production callback after an approved production rollout.

Sources checked: [Meta webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview),
[Meta service messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages),
[Meta version lifecycle](https://developers.facebook.com/docs/graph-api/changelog/),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Vercel transcription](https://vercel.com/ai-gateway/models/gpt-4o-mini-transcribe/faq).
