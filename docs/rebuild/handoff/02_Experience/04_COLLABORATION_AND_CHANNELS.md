# NATIVE COLLABORATION / CHANNELS — SLACK QUALITY INSIDE STRAYPAW

## Why it exists
Team members should be able to spend their workday in StrayPaw instead of bouncing between WhatsApp, spreadsheets, email and cases. Chat is a pleasant social space *and* linked to actual operations. Users can talk, react, coordinate, ask questions and invite Kaju to do work.

## Objects and surfaces
- **Organization channels:** team-general, field-ops, clinical-admin; private/public-within-org based on membership.
- **Programme channels:** cross-organization collaboration with an explicit programme scope and invitation policy. Participants can only access messages/records expressly shared with them.
- **DMs/group DMs:** member-to-member personal communication. Consent and moderation controls suitable for professional setting.
- **Record threads:** case/animal/procedure/referral discussion that remains attached to the *record*, without generating a new channel for every animal. A link from a channel to the record thread opens it in context.
- **Announcement channels:** staff rules, programme updates; optional restricted posting.
- **Channel tabs:** Messages / Work (canonical tasks) / Records (linked or shared, permission filtered) / Files. Create tabs only when actually useful.

## Messaging requirements
Real time: optimistic send, delivery state, reconnect/resume, ordering, read/unread, mention alerts, thread replies, edited/deleted markers and search. Plain/Markdown formatting, inline images, voice notes where allowed, file preview, message actions, emoji and reactions, link to current record, file access inherited from explicit policy. Presence is optional and never substitute for confirmation of availability. Mobile push opt-in respecting permissions and time zones.

## Kaju in messages
- `@Kaju summarize this thread` -> cited summary; user only sees authorized content.
- `@Kaju turn these field updates into tasks` -> propose deduped tasks/assignees, request confirmation where needed, execute eligible actions and link source messages.
- `@Kaju get the September campaign submission ready` -> create a mission with work breakdown and approval checkpoint.
- `@Kaju which cases here are overdue?` -> filtered, permission-aware answer with links and suggested next steps.
- `@Kaju ask the responsible team for missing evidence` -> compose and optionally send under org policy; track reply and follow up.
- Channel onboarding: natural room descriptions and suggested pinned record views; do not auto-read external communication without connected account consent.
- Kaju posts a human-readable mission update only when relevant to the channel; no noisy AI spam. Every action has actor/approval provenance.

## Conversation-to-work conversion
**Example:** staff says “Dog A was not available for vaccination; try again tomorrow.” Kaju identifies likely animal/assignment, asks the user to confirm ambiguity BEFORE creation, prepares visit task, records linked message and action history, then updates the programme when an actual authorized field event is captured. A chat message alone is not proof of vaccination.

## External communication
WhatsApp Business, Gmail/Outlook, Calendar and docs are *integrations*. External messages can be summarized/associated with an animal, task or programme, subject to explicit connector permissions and privacy, but should not be silently broadcast into internal channels. External patient data should not flow to generic NGO/general channels. External citizens use WhatsApp or web portal without requiring internal team membership.

## Safety/privacy
Channel policy evaluation occurs on read, search, mention, file access, Kaju tool invocation, exports and notification previews. Programme-level membership != unrestricted record access. Role change/revocation must immediately remove access. Encryption in transit/at rest, retention/consent by deployment, attachment scanning, moderation/reporting and audit. Don't expose identifiable human cases through channel discovery or previews.

## Initial build vs later
**First reliable release:** organizations, channel membership, messages, threads, DMs, file links, @mentions, unread notifications, record links and Kaju thread summary/task preparation. **Next:** shared programme channels with sophisticated cross-tenant ACL, voice notes, knowledge canvases, richer automations, full-text federated search. Calls/huddles and full Slack parity are *not* prerequisites.
