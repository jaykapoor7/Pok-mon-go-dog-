# Kaju Voice: product, architecture and plan

Kaju Voice is StrayPaw's voice: the way citizens and organisations talk to
StrayPaw's real services and workflows, starting with dog bites. It is one Kaju
with separate doors and separate permissions, not a separate chatbot, and it
sits beside the existing text Kaju (`/api/ai`, `src/sp3/ai/engine.ts`, the dock
and `/kaju`), which it never replaces. Operational detail of what is live is in
`KAJU-VOICE.md`.

## 1. The product

| Door | Who | How | What it may do |
| --- | --- | --- | --- |
| **Call Kaju** (phone helpline) | Anyone, no smartphone or internet | A dedicated number answered by a Sarvam telephony agent | Public tools only. Location from a spoken area or landmark. |
| **Talk to Kaju now** (browser) | Anyone on straypaw.org, no account | `/talk`: real-time voice in the browser | The same public tools, plus what a screen adds: location with permission, verified facilities on a list or map, the case summary and a reference after confirmed submission. |
| **Kaju, by voice** (staff) | Signed-in staff | The Kaju dock and `/kaju`, as an alternative to typing | Exactly what typed Kaju may do for that person: the same engine, organisation and role scope, and confirmation cards. |
| **Configured services** | NGOs, hospitals, municipal programmes, research and public-health initiatives, standalone organisations | Configuration, not code | Per scope: languages, greeting, knowledge, service area, enabled tools, routing, limits, phone numbers, usage. |

The bite journey Kaju is built for: understand the description; give clinically
approved first aid and urge same-day medical assessment; ask only for what is
missing; ask before using location; find verified nearby facilities and explain
them without inventing stock, services or hours; prepare a structured report,
read it back and get an explicit yes; submit it through StrayPaw's backend;
route it for human follow-up; give a reference. Where a tool or verified data is
missing, Kaju says so. It never simulates a successful report or referral,
never diagnoses and never makes a clinical decision.

## 2. Architecture

```
caller ──audio──► Sarvam (speech, conversation, voice: Shubh 1.15, EN/HI/KN)
                        │ tool calls (HTTPS, server to server)
                        ▼
            StrayPaw tool endpoints  ── validate session token, scope, tool allowlist,
                        │                limits, consent; then call ──►
                        ▼
            Supabase RPCs (RLS, security definer, audited) ──► One Health workflow
```

- **Sarvam does speech and conversation; StrayPaw holds tools, data and
  permissions.** No database operation lives in a Sarvam prompt. The SDK in use
  (0.0.42) does not run tools in the browser, so tools are StrayPaw HTTPS
  endpoints that Sarvam's servers call. Each call carries a short-lived
  StrayPaw session token passed to the agent at start (`agent_variables`). The
  endpoint checks the token, the scope's tool allowlist and limits before any
  RPC.
- **Access contexts never mix.**
  - *Public* (browser `pub.` token or phone call): scoped to public tools; no
    StrayPaw identity, no records, no internal tools.
  - *Staff*: the person's own Supabase session and RLS, exactly as typed Kaju.
  - *Administrators*: configuration and usage only.
- **Staff voice reuses the existing engine.** Staff tools already exist in
  `src/sp3/ai/tools.ts`, scoped by RLS and confirmed through `/api/ai/act`.
  Recommended: voice as input and output around that engine, with Sarvam
  speech-to-text, the person's own `/api/ai` call and Sarvam speech in the same
  voice. Staff data and the staff credential then never pass through Sarvam's
  servers, and every permission and confirmation card stays as it is. The
  conversational Samvaad agent stays for the public doors.
- **Sessions and usage** (`kaju_voice_sessions`): one ledger for every door.
  It holds the scope (standalone account, public, later organisation and
  programme), agent version, times, provider reference, outcome and client audio
  observations. It never holds audio, transcripts, signed URLs or raw phone
  numbers. It is the base for per-scope limits and later billing; no billing
  is built.

## 3. What is built (16 Nov 2026)

| Piece | State |
| --- | --- |
| Sarvam v3 agent (Shubh 1.15, EN/HI/KN, switching, interruptions, professional prompt) | Committed in Samvaad; unchanged |
| Browser SDK 0.0.42, console logging stripped; unused Node audio packages not installed | Live |
| Signing proxy: server key only, fixed agent and version, signed WSS URL to the browser | Live |
| Production access: www.straypaw.org, StrayPaw sign-in, account-ID allowlist in server and database | Live (owner account only); needs `SARVAM_VOICE_API_KEY` |
| Session ledger with RLS, narrow RPCs and atomic limits (5 a minute, 20 a day) | Live in production |
| Voice entry in the Kaju dock and `/kaju`, shown only to allowed accounts | Live |
| Shared conversation experience: Kaju's poses for real states, levels from real audio, caption plus secondary transcript, recovery, reduced motion, 390px-first, Hindi/Kannada UI | Built on this branch |
| Public `/talk`: consent, Turnstile, per-device and site-wide limits, single-use public session token, public-only agent, service-role-only ledger; `SARVAM_VOICE_PUBLIC` off/owner/on | Built on this branch; off until approved |
| Phone helpline | Not started; needs the approvals in section 6 |
| Tools (facilities, first aid, bite report, routing) | None; blocked as below |
| Staff voice commands through Kaju's engine | Planned (section 2) |
| Organisation/programme configuration | `SARVAM_VOICE_ORG_AGENTS` env only; table planned (section 5) |

## 4. Tools, against the records that exist

Production has the One Health schema, but every organisation in it is a QA
record ("StrayPaw QA hospital", etc.). Its one programme is marked illustrative
("Not a real programme"). It has no service-availability confirmations and no
bite records. A tool is built only when its data source and permissions can be
verified, so:

| Tool | Data source that exists | Blocked on | Build when unblocked |
| --- | --- | --- | --- |
| `first_aid(language)` | `src/oh/BiteChat.tsx` fixed steps (wash 15 minutes, 108/112 red flags, see a doctor today, do-nots) | **Clinical review** of the wording; the module is `BLOCKED` in `src/lib/readiness.ts` | Return fixed, reviewed text per language, never model-written. |
| `find_facilities(programme, place or lat/lng)` | `oh_public_services(p_programme_slug)` (anon): listed hospitals and clinics with lat/lng and per-service status (`available`/`limited`/`unavailable`/`not_verified` after `valid_until`, at most 14 days) | **A verified list of anti-rabies vaccine centres** from the health department, entered as listed facilities in a real pilot/active programme, with current confirmations | Endpoint ranks by distance (haversine; there is no server-side "nearby" RPC). It says "not confirmed recently" rather than "available" when stale, and never fills in hours or stock. |
| `submit_bite_notice(...)` | `oh_submit_bite_notice` → `health.citizen_notices`; facility picked by area, then distance; callback phone only with consent | Clinical review; a real programme; a receiving facility that works `oh_clinic_notices`; the fixes below | Read back, explicit yes, then submit through a server endpoint. Return a reference (the RPC returns none today; add a short code). |
| `route_followup` | `oh_record_exposure` routes animal follow-up through `oh_assignments` (duty `animal_followup`); service gaps go to coordinators | Staff-side only today; notices raise no notification | Notify facility members on a new notice (`nx_notifications`); keep animal follow-up with the clinician's exposure record. |
| Staff: records, vaccinations, assignments, submissions, programme questions | `TOOL_DEFS` / `runTool` in `src/sp3/ai/tools.ts`; missions registry levels 0-4; `/api/ai/act` | Nothing new: same engine | Staff voice (section 2). |

**Fix before any public bite tool:** `oh_submit_bite_notice` and
`oh_public_services` are executable by `anon` directly with the public key, with
no bot check or rate limit. Production's only programme has status `pilot`,
which is all the write function requires. Move public writes behind a server
endpoint (Turnstile, the limits used by `/talk`, consent, session binding) and
revoke `anon` execute on the write. This applies to the existing `/bite-help`
prototype too. Separately, the ungated post-bite steps on `/community/help`
(`POST_BITE_STEPS`, including an ARV schedule) are not marked as clinically
reviewed.

## 5. Organisation and programme configuration (planned)

A `kaju_voice_services` table replaces the env JSON:

- **Who and where:** scope (organisation or programme), channel (web or phone),
  Samvaad app and version.
- **What the service offers:** languages, greeting, enabled tool names (from a
  registry like `nx_kaju_tools`, where organisations can only tighten
  defaults), service area or programme slug for facility search, and routing
  targets.
- **Running it:** daily and per-caller limits, phone numbers, and on/off.

Administrators manage it through RLS-checked RPCs (the `oh_can_oversee` pattern)
and see usage from the ledger, grouped by scope. Nothing assumes one
organisation or Bengaluru: facility search and routing come from the
programme's own areas and listed facilities. No billing now.

## 6. Phone helpline: a separate integration

Sarvam Voice Agents deploys an agent on a number in one of two ways (Deploy →
Phone Numbers):

- **Rent from Sarvam.** Needs no provider account. KYC is required first
  (Individual or Corporate). Numbers are rented for 30 days, auto-renew from the
  Sarvam wallet, and are released with no grace period if the wallet cannot
  cover the renewal. The catalogue includes landlines such as 080 (Bengaluru).
- **Bring your own provider:** Exotel, Twilio, Smartflo, Pulse, Intalk or
  Vobiz. For Exotel, Sarvam needs the Account SID, API key, API token and base
  URL. An Exotel Voicebot applet on an Exophone streams calls to
  `https://apps.sarvam.ai/api/app-runtime/channels/exotel`. Call transfer to a
  person is not self-serve on Exotel; Sarvam support enables it.

Incoming calls are answered by an **Inbound** deployment. StrayPaw's side:

- a phone-specific agent version (8 kHz audio, no screen, location by
  landmark, the same public tools through the same endpoints);
- a signed call-event webhook into the ledger (scope `public`, channel `phone`,
  a keyed hash of the caller number, never the number itself);
- `NEXT_PUBLIC_KAJU_VOICE_PHONE`, which makes **Call Kaju** appear on `/talk`.

**Owner decisions and approvals needed (nothing is purchased without them):**

1. Rent from Sarvam, or use an existing provider such as Exotel.
2. Complete KYC (Corporate, for StrayPaw's entity) in Sarvam Voice Agents.
3. Authorise the number and its recurring rental, and fund the wallet.
4. Commit a phone agent version in Samvaad.
5. Name a staffed number for human handoff, and ask Sarvam to enable transfer.
6. Approve the privacy and data-processing changes below.

## 7. Before anything opens to the public

- **Policy.** `/data-processing` says no AI model provider is a sub-processor.
  Sarvam (and any telephony provider) must be added there and in `/privacy`,
  with organisations told beforehand as that page promises. The text needs the
  owner's approval.
- **A public agent version.** v3's prompt calls itself a connection test.
  Commit a public prompt as its own Samvaad app and version and set
  `SARVAM_VOICE_PUBLIC_APP_ID` / `_VERSION`. The staff agent is never used as
  a fallback.
- **Rollout.**
  1. `SARVAM_VOICE_PUBLIC=owner`: the real public path on the live site, only
     for the owner's account.
  2. Live acceptance.
  3. `on`, with `NEXT_PUBLIC_KAJU_VOICE_PUBLIC=on` to show the `/ai` entry.
     The homepage hero is locked by DESIGN.md, so a homepage entry is the
     owner's call.
- **Emergency workflows** (first aid, facilities, reports) open only after the
  clinical review and the verified facility list, each behind its own flag.
