# NGO sign-in report — 1 November 2026

## What is known

An existing NGO user reported a “URL doesn't exist” error while loading StrayPaw or signing in with her standing access code. The screenshot contains no failing browser URL or application error. The exact failure was not reproduced, so a removed domain is not asserted as its cause.

Read-only production checks confirmed the affected staff account is confirmed, not banned, still belongs to its organisation, and has an active, unexpired six-character invitation code. No code, password, token or private contact detail is recorded here. No account, membership or code was changed; the customer was not impersonated.

The existing stable code resolver was also checked entirely inside the database: it accepts this invitation and resolves the same email and organisation. Only three booleans were returned; the standing credential was not retrieved into the assistant or browser.

Both `straypaw.kapoorjay.com/sign-in` and `www.straypaw.org/sign-in` returned 200. Phone browser checks also loaded `/login`, `/partner`, `/dashboard` and `/app` through the expected route redirects on both domains. The default `pok-mon-go-dog.vercel.app` hostname still redirects at the Vercel level to the old custom domain. The code API on both custom domains returned the expected JSON refusal for a deliberately nonexistent email/code, rather than a missing endpoint. Supabase logs show successful code-token generation and OTP exchanges for other requests in the last 24 hours; that does not establish success for the affected person.

## Compatibility repair

- Retain the legacy custom domain, its DNS and certificate. Exact known legacy hosts now redirect to `https://www.straypaw.org` in Next.js with HTTP 307, preserving path/query and request method. The supported domain connector cannot PATCH the existing Vercel project-domain redirect, so the application redirect is used rather than removing and re-adding working domains.
- Missing pages now offer a direct sign-in recovery link targeting `/sign-in?next=/app`, rather than only public map/report links.
- The domain-retirement instructions now explicitly preserve active NGO bookmarks and supersede the earlier deletion checklist. Origin-scoped sessions are not copied; an affected person may need to enter the same valid email/code once on the canonical domain.
- The newly added standalone `launch-video` package was being included in the website's TypeScript and root ESLint checks. Missing Remotion dependencies and video-only hook errors blocked the website build. Excluded that independent package from website checks; its source and own package configuration are preserved. This does not claim the video package's own checks pass.

## Verification

`npm run build` and `npm run lint` passed after isolating the video package. Focused production-build browser suite: **9 passed, 1 desktop-only skip**. This verifies exact-host redirects, root/sign-in/legacy deep-link query preservation, POST 307 behaviour, canonical-host non-redirection, stale-page sign-in recovery and normal phone/desktop sign-in navigation. Live redirect verification must follow the deployment.

Do not claim the customer's exact error is resolved solely from a healthy guest page. If it persists at `https://www.straypaw.org/sign-in?next=/app`, capture the failing URL and exact screen error without sharing an access code or one-time token.

No email/WhatsApp message was sent, no customer credential was read or reset, and no production data cleanup was performed.
