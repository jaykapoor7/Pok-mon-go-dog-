# Sign-in contrast and authorised account check — 2 November 2026

The saved dark theme's global `.dark input` rule overrode the sign-in fields' lower-specificity text colour while their backgrounds stayed white. A production phone-browser regression reproduced the issue: entered text had contrast **1.04:1**, below 4.5:1.

The full sign-in page, entry forms and sign-in pop-up now explicitly keep dark text, WebKit text fill and a visible caret on their light surfaces. Placeholder colours remain readable. Autofill retains dark text, and native controls use the light colour scheme. The blue-and-white layout, access-code format and authentication logic are unchanged.

Verification before deployment:

- Production build, TypeScript and lint passed.
- Focused production-build browser suite: **10 passed, 2 skipped**. It covers saved light/dark themes on phone and desktop, typed email/code visibility, real Chromium autofill pseudo-state rendering, caret contrast, old-domain redirects and stale-page recovery. Desktop pop-up checks are skipped because that navigation uses the full sign-in page. Every tested foreground has at least 4.5:1 contrast against the rendered input background.
- The initial autofill test incorrectly required the CSS `color` and WebKit paint colour to be identical. Chromium's autofill can force black CSS text while painting the specified dark ink. The corrected check verifies actual contrast for both paths and the caret. No product change was made to accommodate that test assumption.
- This is Chromium desktop/phone coverage; native iOS Safari and SMS suggestion interactions were not directly tested.

The owner explicitly requested testing the affected person's existing standing code. A read-only database check found one active, unexpired invitation, a confirmed enabled account and its existing organisation membership. The actual production `/api/join` accepted the existing email/code pair; the real Supabase magic-link exchange created the expected existing account session. An independent authenticated `/auth/v1/user` read verified its identity. Only the newly created support-test session was signed out with `scope=local`; other customer sessions were left intact.

No code was reset or posted to chat, Git or logs. The temporary credential input was deleted after the check. No organisation claim, clinical-record read/write or model request was made. Normal authentication updates its sign-in audit; this support test is not evidence of activity performed by the account holder or of a fix to their unidentified Google missing-file URL.

Live deployment verification follows the application commit.
