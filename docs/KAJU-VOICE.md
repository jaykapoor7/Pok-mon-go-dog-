# Kaju Voice v3

Kaju Voice is a separate, additional voice agent. The existing Kaju text agent
(`/api/ai`, `src/sp3/ai/engine.ts`, the Kaju dock and `/kaju`) is unchanged; voice
adds a microphone entry beside it and its own page, routes and records. The
agent is meant for the public in time; this release limits live voice to the
owner's verified tester account.

Status: the owner's Samvaad voice/tone test passed. A build, socket connection
or simulated test is not a successful conversation; only a real two-way
conversation on www.straypaw.org completes the integration (see Acceptance).

## Where it runs

One guard, `src/lib/kaju-voice/mode.mjs`, is shared by `next.config.mjs` (the
microphone Permissions-Policy, decided at build) and every voice route:

| Mode | Requires | Database |
| --- | --- | --- |
| production | `VERCEL_ENV=production`, `SARVAM_VOICE_ENABLED=true`, production Supabase URL | `toujthlzjmhmoyykmayx` |
| preview | `VERCEL_ENV=preview`, the exact `SARVAM_VOICE_PREVIEW_BRANCH`, staging Supabase URL | `ucxfxiddufwqithtdtix` |
| local | `next dev`, `SARVAM_VOICE_ENABLED=true`, not on Vercel | local ledger in `.local/` |

Anything else fails closed: no microphone permission, `/kaju/voice` is a 404, and
every voice route refuses. Production never runs against staging data, and a
preview never against production data.

## Production access

- Entry: the Kaju dock (microphone icon) and the `/kaju` header (**Kaju Voice**;
  hidden on phones by the existing header rule, where the dock icon is the entry).
  The entry appears only for a signed-in account that `GET /api/kaju/voice/access`
  allows. It is a full navigation, so only `/kaju/voice` holds microphone access.
- The page uses normal StrayPaw sign-in (`/sign-in?next=/kaju/voice`). There is no
  access-code field, no staging label and no configuration detail in production.
- Requests: same-origin HTTPS on `www.straypaw.org` or `straypaw.org`, the
  `X-StrayPaw-Voice-Test` header, and the caller's Supabase access token as a
  bearer token (never a cookie). The server verifies it with `getUser`.
- Two allowlists, both by account ID: `SARVAM_VOICE_ALLOWED_USER_IDS` (server)
  and `public.kaju_voice_access` (database, checked again by the RPCs).
  Organisation and programme scope are refused for now; they are later work.
- To add an account: append its ID to `SARVAM_VOICE_ALLOWED_USER_IDS` and redeploy,
  and insert it into `public.kaju_voice_access` with the SQL editor.

## Vercel variables

Production only (Preview and Development are not selected):

| Variable | Value/purpose |
| --- | --- |
| `SARVAM_VOICE_API_KEY` | **Sensitive; the owner enters it directly in Vercel** |
| `SARVAM_VOICE_ENABLED` | `true` |
| `SARVAM_VOICE_ORG_ID` | `019f745c-34b5-7ca4-84c2-562f7ae6e330` |
| `SARVAM_VOICE_WORKSPACE_ID` | `019f745c-34ba-7ac9-845e-7b4f95ec904f` |
| `SARVAM_VOICE_APP_ID` | `Kaju-Voice--2d965bed-bdfc` |
| `SARVAM_VOICE_VERSION` | `3` |
| `SARVAM_VOICE_ALLOWED_USER_IDS` | Owner's verified production account ID; server only |
| `NEXT_PUBLIC_KAJU_VOICE` | `true`; shows the entry to allowed accounts only |

The preview branch `feat/kaju-voice-v3-preview` keeps its own branch-scoped set
(`SARVAM_VOICE_PREVIEW_BRANCH`, `SARVAM_VOICE_ALLOWED_EMAILS`,
`NEXT_PUBLIC_KAJU_VOICE_TEST`, the same IDs). The API key is never prefixed
`NEXT_PUBLIC_`, committed, printed, pulled locally or entered in the browser.
Environment changes apply on the next build.

## Transport and controls

Official `sarvam-conv-ai-sdk/browser` pinned to 0.0.42. The browser `apiKey` is
empty; only the fixed-purpose signing route sends the real key to Sarvam, for the
server-selected agent and version. The browser gets an ephemeral signed WSS URL
and streams audio directly to Sarvam. Arbitrary hosts, agents, versions, queries
and redirects are refused. SDK console logging of signed URLs and transcripts is
removed at install/build (`scripts/sarvam-sdk-privacy.mjs`). `.npmrc` sets
`omit=peer` so the SDK's required peer `node` does not install a second Node
binary that would shadow the platform Node in npm scripts.

Start, Stop, Mute/Unmute, live transcripts (You / Kaju), English/Hindi/Kannada
starting language and a two-minute cutoff. The committed Samvaad v3 settings
remain Shubh at 1.15, all three languages, automatic switching and interruptions,
with the professional prompt in `kaju-voice-instructions.md`. No telephony,
hospital search, report submission or billing.

Server logs: `kaju_voice_session` with mode, version, outcome and, on failure, a
fixed reason (`provider_<status>`, `invalid_response`, `invalid_host`, `timeout`,
`network`). Never keys, signed URLs, provider bodies, audio or transcripts.

## Session records

Migrations, applied in order: `20261115145414_kaju_voice_preview_sessions.sql`
(staging and production), then `20261117100000_kaju_voice_access.sql`
(production; safe to re-run, and staging can take it later). Result:

- `kaju_voice_sessions`: RLS; signed-in callers read only their own rows and
  cannot insert or update. Account deletion removes the rows.
- `kaju_voice_access`: account IDs allowed to start voice; RLS with no policies
  and no client grants.
- `kaju_voice_reserve` / `kaju_voice_update`: security definer, `search_path=''`,
  check `auth.uid()` against the access list; not executable by `anon`. Atomic
  limits: 5 starts per minute and 20 per day per account; failures count too.

Recorded: account/scope, agent version, times, provider reference, outcome and
client audio/interruption observations. Not provider-verified duration or
billable usage. No audio, transcript or signed URL is stored. `npm run test:db`
covers the grants, limits and permissions.

## Acceptance (live, sample content only)

On www.straypaw.org, signed in as the approved account:
1. Kaju → Kaju Voice → Start conversation; allow the microphone.
2. English: “Hi Kaju, what is StrayPaw?” Hear a reply; see You and Kaju turns.
3. Hindi: “अब हिंदी में बात कीजिए।” Hindi reply and transcript, respectful tone.
4. Kannada: “ಈಗ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ.” Kannada reply and transcript.
5. Speak during a reply: playback stops and Kaju follows the new turn.
6. Mute and speak: no new turn. Unmute: capture resumes.
7. Stop: the browser's recording indicator clears.
8. Leaving the page or the two-minute limit also ends capture.

Server-side evidence for each run: a `kaju_voice_sessions` row with `issued`,
`connected_at`, `ended_at` and the audio/interruption flags, plus the
`kaju_voice_session` log line.
