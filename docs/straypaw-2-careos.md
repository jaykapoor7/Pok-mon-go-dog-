# StrayPaw 2.0 — CareOS (WhatsApp)

**State: not connected.** Nothing in 2.0 sends or receives WhatsApp messages.

## Capability gate

| Capability | Backend | 2.0 shows |
|---|---|---|
| 1:1 bot intake (text, photo, location) | Contract only (`src/lib/careos/contract.ts`, `docs/CAREOS-INTEGRATION.md`); RPCs absent in the live database (see `CURRENT_STATE_AUDIT.md`) | Inbox channel "WhatsApp · Not connected… messages sent there do not reach StrayPaw" |
| Group workflows | Platform eligibility unverified | Nothing |
| Delivery vs acceptance | No ledger | Report receipts say "Received", never "accepted", until an organisation takes the case in the database |
| Consent / opt-out | Not built | Nothing |

## Webhook (StrayPaw 3.0)

`/api/careos/webhook` (`src/lib/careos/webhook.ts`) handles Meta's subscription
handshake (`WHATSAPP_VERIFY_TOKEN`), rejects any body whose
`X-Hub-Signature-256` does not match `WHATSAPP_APP_SECRET`, and turns each
inbound message and delivery status into one idempotent job
(`wa:msg:<id>` / `wa:status:<id>:<status>`) for the existing
`careos_enqueue(p_events)` contract (`kind` `message` | `status`, flat
payload). Verified 2026-10-31: unit tests (`npm run test:careos-webhook`) and a
real enqueue into the staging `careos.jobs` table (test row removed). Without
both env values the route answers 503 and stores nothing.

Still blocked: Meta Business verification, a verified number, app review and
templates; `careos_*` functions are in staging only, not production; no
CareOS worker (`careos_claim_jobs` → `careos_process_job`) is deployed.

## Fallback today

Residents report on the web (`/community/report`); organisations triage in the
Inbox and act in Work. WhatsApp threads can be brought in as a workbook through
Import.

## Before any public claim

Verify RPC existence, webhook signatures, Meta delivery, consent and opt-out,
and group eligibility in a staging project, per the master brief §7. Until then
the Inbox and Settings keep saying "not connected".
