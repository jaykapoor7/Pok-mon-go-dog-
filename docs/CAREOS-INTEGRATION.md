# StrayPaw CareOS — WhatsApp backend ↔ NGO workspace contract

Status: **proposed by the workspace side, awaiting confirmation from the WhatsApp backend (Codex).**
Nothing in the product presents WhatsApp case management as live until `careos_health()` returns `connected: true` in production.

Types live in `src/lib/careos/contract.ts`; the only workspace code that calls the backend is `src/lib/careos/inbox.ts`.

## Who owns what

| WhatsApp backend (Codex) | NGO workspace (this repo) |
|---|---|
| WhatsApp Business number, webhooks, delivery receipts | Care Inbox triage UI |
| Reporter identity, phone numbers, consent, opt-out | Cases, case updates, ownership |
| Media download, storage, signed URLs, sensitivity flag | Follow-ups (`animal_followups`) |
| Language detection, optional translation | Animal record and history (`animal_timeline_events`, `medical_events`) |
| Approved message templates, 24-hour window rules | Outcomes, reports, exports |
| The `care_inbox` table and its migration | Reading the inbox only through the RPCs below |

The workspace never stores or displays a reporter's phone number and never sends free text to a reporter.

## RPCs the backend implements

All are `security definer`, scoped to the caller's NGO via `ngo_members` (same model as `org_incoming`). Names are in `CAREOS_RPC`.

```
careos_health() -> { connected boolean, number_verified boolean }
careos_inbox_list(p_status text[] default null, p_limit int default 200, p_offset int default 0)
  -> setof CareInboxItem               -- newest first; only the caller's NGO
careos_inbox_act(p_action jsonb)       -- one CareInboxAction
  -> CareInboxItem                     -- the item after the action
careos_notify_reporter(p_case_id uuid, p_notice text)  -- ReporterNotice
  -> { queued boolean }                -- false if no consent / outside window
```

If an RPC does not exist, PostgREST returns `PGRST202`; the workspace reads that as "not deployed" and shows an honest not-connected state, never an empty inbox.

## What each action must do in the database

| Action | Effect |
|---|---|
| `claim` | `status = 'triaged'`, `owner_id = auth.uid()` |
| `open_case` | insert `cases` (ngo, title, severity, lat/lng from the item at its own precision, `created_by_name` = staff member), insert `case_updates(type='created')`, `status='linked'`, `linked_case_id` set |
| `link_case` | `status='linked'`, `linked_case_id`; add `case_updates(type='note')` referencing the message |
| `link_animal` | `linked_dog_id`; insert `animal_timeline_events` (below) |
| `dismiss` | `status='dismissed'`, `dismissed_reason` required |

Every message linked to an animal becomes part of its continuing history:

```
animal_timeline_events(
  dog_id, ngo_id, case_id,
  event_type   = 'report',
  title        = 'Reported on WhatsApp',
  details      = text_en ?? text,
  occurred_at  = received_at,
  provenance   = 'whatsapp',
  source_ref   = { "thread_id": ..., "message_id": ..., "channel": "whatsapp" },
  visibility   = 'private'          -- the NGO chooses to publish later
)
```

## Privacy and safety

- `reporter_handle` is opaque; `reporter_name` only with consent.
- `location` is never finer than what the reporter shared; the public record still rounds to an H3 cell.
- `media[].sensitive = true` for possible injuries; the UI blurs these (`SensitiveVeil`).
- Emergencies: the backend's first auto-reply must say StrayPaw is not an emergency service and give local helplines, matching the reporting flow.

## Open questions for the backend

1. Final table name and columns for `care_inbox` (the UI only depends on the `CareInboxItem` shape).
2. How multi-message threads arrive: one row per message, or one row per thread with messages nested?
3. Routing: which NGO receives a message (one number per NGO, or a shared number with area routing)?
4. Which `ReporterNotice` templates are approved first.
