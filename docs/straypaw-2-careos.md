# StrayPaw 2.0 — CareOS (WhatsApp)

**State: not connected.** Nothing in 2.0 sends or receives WhatsApp messages.

## Capability gate

| Capability | Backend | 2.0 shows |
|---|---|---|
| 1:1 bot intake (text, photo, location) | Contract only (`src/lib/careos/contract.ts`, `docs/CAREOS-INTEGRATION.md`); RPCs absent in the live database (see `CURRENT_STATE_AUDIT.md`) | Inbox channel "WhatsApp · Not connected… messages sent there do not reach StrayPaw" |
| Group workflows | Platform eligibility unverified | Nothing |
| Delivery vs acceptance | No ledger | Report receipts say "Received", never "accepted", until an organisation takes the case in the database |
| Consent / opt-out | Not built | Nothing |

## Fallback today

Residents report on the web (`/community/report`); organisations triage in the
Inbox and act in Work. WhatsApp threads can be brought in as a workbook through
Import.

## Before any public claim

Verify RPC existence, webhook signatures, Meta delivery, consent and opt-out,
and group eligibility in a staging project, per the master brief §7. Until then
the Inbox and Settings keep saying "not connected".
