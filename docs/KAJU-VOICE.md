# Kaju Voice v3 — protected staging preview

Status: the owner's Samvaad voice/tone test passed. The real StrayPaw voice
conversation is pending the Voice Agents API key and a microphone test through
the protected HTTPS preview. A build, socket connection or simulated test is not
a successful conversation.

## Deployment and access

- Feature branch: `feat/kaju-voice-v3-preview`; PR targets main but is not merged.
- Existing Vercel project: `pok-mon-go-dog`, existing team; Preview only.
- Keep the existing Vercel Authentication protection enabled. No share/bypass
  token, production promotion, custom domain or public exposure is required.
- Preview inherits only the existing staging Supabase URL and publishable key:
  project `ucxfxiddufwqithtdtix`. Production credentials are not copied.
- Voice requires Preview, the exact configured branch, staging database URL and
  explicit opt-in. Production fails closed even if a flag is accidentally set.
- Existing Kaju dock, full workspace and `/next/kaju` include **Kaju Voice**.
  Full navigation to `/kaju/voice` loads its microphone Permissions-Policy.
  Production navigation is unchanged because its public feature flag is unset.
- The preview uses the same Supabase AuthProvider/session as StrayPaw. Email
  sign-in is available on the voice page because the staging preview has no
  standing-code service-role credentials. An email code or the Supabase email's
  verification link can be verified without requiring a new redirect allowlist.
- Backend checks Supabase `getUser`, confirmed email and the server tester
  allowlist. Organisation impersonation and local access codes are denied on
  hosted previews. The staging database has a matching server-managed tester
  allowlist. No user_metadata role or email is trusted.

## Branch-scoped Vercel variables

All below target **Preview / feat/kaju-voice-v3-preview** only:

| Variable | Value/purpose |
| --- | --- |
| `SARVAM_VOICE_API_KEY` | **Secret; owner enters directly in Vercel** |
| `SARVAM_VOICE_ENABLED` | `true` |
| `SARVAM_VOICE_PREVIEW_BRANCH` | `feat/kaju-voice-v3-preview` |
| `NEXT_PUBLIC_KAJU_VOICE_TEST` | `true`; non-secret navigation flag |
| `SARVAM_VOICE_ORG_ID` | `019f745c-34b5-7ca4-84c2-562f7ae6e330` |
| `SARVAM_VOICE_WORKSPACE_ID` | `019f745c-34ba-7ac9-845e-7b4f95ec904f` |
| `SARVAM_VOICE_APP_ID` | `Kaju-Voice--2d965bed-bdfc` |
| `SARVAM_VOICE_VERSION` | `3` |
| `SARVAM_VOICE_ALLOWED_EMAILS` | Owner's confirmed tester email; server only |

The API key is not prefixed NEXT_PUBLIC_, committed, printed, pulled locally or
entered in the StrayPaw browser. After the owner saves it in Vercel, rebuild the
same feature preview to apply it. Never select Production or Development.

## Transport and controls

Official `sarvam-conv-ai-sdk/browser` pinned to 0.0.42. Browser `apiKey` is empty;
only the fixed-purpose backend signing endpoint sends the real key to Sarvam.
The browser gets an ephemeral signed WSS URL and connects audio directly to
Sarvam. Requests are authenticated, same-origin HTTPS and no-store; arbitrary
hosts, agents, versions, queries and redirects are refused. SDK console logging
of signed URLs/transcripts is removed at install/build, without global logging
changes. No credentials, signed URLs, audio or transcripts are application logs.

Start, Stop, Mute/Unmute, live transcripts, English/Hindi/Kannada selection and a
two-minute cutoff reuse the existing implementation. The committed Samvaad v3
settings remain Shubh at 1.15, all three languages, automatic switching and
interruptions, with the professional prompt in `kaju-voice-instructions.md`.
No remote prompt change, telephony, hospital search, report submission or billing.

## Shared staging usage

Staging-only migration `20261115145414_kaju_voice_preview_sessions.sql` adds an
RLS-enabled session ledger and narrow authenticated RPCs. Authenticated callers
cannot insert/update directly; RPCs check auth.uid and the tester allowlist.
Atomic reservations enforce 5 starts/minute and 20/day per tester across Vercel
instances. Failures also consume a reservation. A failed usage write stops the
connection flow. No service-role key is needed.

Metadata: caller/scope, agent version, timestamps, provider reference, outcome
and client audio/interruption observations. Client reports are not provider
verified duration or billable usage. No audio, transcript or signed URL storage.
Organisation configuration/access adapters remain separate for later rollout;
this preview permits only standalone tester scope. Programme subscriptions and
billing need a later authorization/usage review.

## Verification and remaining acceptance

Earlier SDK/security/lifecycle checks and production build passed. Those were
simulated and are not counted as live voice success. They are not rerun for this
preview step. TypeScript checks the hosted adaptation and Vercel builds the
actual deployment. Staging RLS/RPC privileges were verified directly.

Live acceptance, using sample content:
1. Sign into the protected preview and staging with the approved tester email.
2. Open Kaju → Kaju Voice → Start and allow microphone access.
3. English: “Hi Kaju, what is StrayPaw?” Hear a reply and see both transcript turns.
4. Hindi: “अब हिंदी में बात कीजिए।” Confirm Hindi reply/transcript and professional tone.
5. Kannada: “ಈಗ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ.” Confirm Kannada reply/transcript.
6. Speak during an answer: playback should stop and Kaju should follow the new turn.
7. Mute and speak: no new user turn; Unmute resumes capture.
8. Stop during playback/connection; browser recording indicator must clear.
9. Restart, navigate away and allow a two-minute call to end; no lingering capture.
10. Denied microphone/network loss must show an error and allow recovery.

Only a real two-way StrayPaw conversation completes this integration. Record
pass/fail and a provider interaction reference, without sharing keys, signed
URLs or network traces. No production merge/deployment until separately approved.
