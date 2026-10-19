# Living product delivery

[PR #38](https://github.com/jaykapoor7/Pok-mon-go-dog-/pull/38) · [Observed audit](AUDIT.md) · [Skills](SKILLS.md) · [Design, motion and boundary review](REVIEW.md)

## Implemented

- Preserved the blue hero, Pinky illustration-labelled profile, four homepage sections, folk art, approved palette and tactile navigation/buttons. Updated the headline to **The digital infrastructure for India’s street animals.**
- Added Municipalities to navigation and footer, a municipal pilot hero action, and `/municipalities`: paid scope, funded NGO fieldwork, StrayPaw evidence review, disbursement under pilot terms, and verified municipal records/reporting.
- Added user-supplied **₹999/month per NGO** WhatsApp pricing to Product. Its contact action prefills the fee/setup subject. No “concept” or “planned integration” label appears in these new marketing surfaces.
- Restored two continuously moving documentary profile rows, restricted to the existing manually photo-reviewed public ID list. Each links its real profile. Pause, hover/profile focus, offscreen pause, reduced motion and static no-JS browsing are supported. No broad unreviewed-photo fallback.
- Condensed One Request: no repeated act paragraphs; Send turns the form into a receipt; the same observation enters the queue and follows through review/history/area views. Native controls and accurate example ownership/assignment remain. Replay, edit, Back and skip still work.
- Added sourced art and shared context to the instant audience workbench. Added a large, opt-in real Living Map. Its camera and URL are isolated from the landing; closing releases the map. Preview-specific layout fixes prevent clipped phone layers and desktop title/tool overlap.
- Added named field-partner proof from the existing partner source. Removed the repeated “not a rescue outcome”/similar caution prose from the landing; retained compact example/public labels and source links.
- Fixed the new municipal route inheriting the app shell, an initial-hydration mobile-menu closing race, small phone demo controls, long text wrapping, control contrast and voice-control label/state semantics. Art credits stay small and linked.

## Validation

| Check | Result |
| --- | --- |
| TypeScript, lint, production build | Passed; 85 generated pages |
| Full Playwright suite | **126 passed, 8 skipped**. Skips: production-only launch captures and actual report sends without a configured local record store. |
| Homepage axe / reflow | **0 violations**, 21 state/width combinations; 320, 390, 768, 1440, 1920px. No page errors or horizontal page overflow. |
| Contrast | **0 failures** across Home, Product, Solutions, Our Story, Contact and Municipalities; phone/laptop, light/dark. |
| Public profile gallery | Separate component harness with **10 genuine, reviewed public records**: photos loaded, motion/pause/reduced motion, no axe violations, real profile navigation at 390/1440px. |
| Actual map data | Actual local FieldMap with public production API responses at 390/1440px. Coimbatore: **2,242 records / 254 areas** at inspection, 8 locality controls; API reads 200, no page errors, parent URL unchanged, no report action, no writes. |
| Sandbox boundary | All example actions and map activation/close tested with non-read requests intercepted; **zero write requests**. No real acceptance, assignment, care, message or payment created. |
| Bounded-read guard | Passed; 487 source files scanned. Gallery query capped to the existing reviewed ID set. |
| No JavaScript / reduced motion | Core information and native destinations remain; submit disabled before hydration; static gallery and no intake movement under reduced motion. |

Homepage build output: **16.7kB route / 213kB first load**, versus the preceding 13kB / 202kB. The 275kB map preview route and its map engine load only after explicit activation. No runtime dependency added. Thumbnails use the existing image sizing helper and lazy loading. These are bundle sizes and local browser results, not field LCP/INP measurements or physical-handset benchmarks.

## Screenshots

| View | Desktop | Phone |
| --- | --- | --- |
| Before, public production | [1440px](before-desktop.png) | [390px](before-mobile.png) |
| After, local production build | [1440px](after-1440.png) | [390px](after-390.png) |
| Working example after Send | [1440px](demo-1440.png) | [390px](demo-390.png) |
| Real-record gallery component harness | [1440px](gallery-1440.png) | [390px](gallery-390.png) |
| Actual map with public production data | [1440px](map-live-1440.png) | [390px](map-live-390.png) |
| Municipal paid pilot page | [1440px](municipal-1440.png) | [390px](municipal-390.png) |
| WhatsApp pricing | [1440px](pricing-1440.png) | [390px](pricing-390.png) |

Before captures: 1440×3418 / 390×4527. Local after captures: 1440×4091 / 390×4956, zero horizontal overflow. The current scope restores genuine profiles and adds a substantial useful map surface; it does not claim an overall shorter page. The request explanation is shorter. These are different data conditions: the local build has no Supabase credentials and honestly shows unavailable gallery/figures in the full-page captures. The separately labelled gallery and map captures exercise genuine public data through existing public APIs; they are not fabricated stand-ins or protected-preview screenshots.

## Limits and remaining work

- Automated approval review rejected generating a temporary access link for the protected Vercel preview, because it could grant third parties access to private preview content. No access grant was created or protection setting changed. QA used the local production build and independently available public production data instead.
- No physical-phone, human screen-reader or field-performance study was performed. The raw taste inspector reports house-style failures for the user-mandated palette, long headline, capsule/shadow controls and metadata size; it is not claimed as a pass or an external award.
- This marketing change adds no WhatsApp transport, automated payment/disbursement system or automated verification engine. Municipal review/disbursement describes the user-authorised pilot service under agreed terms. Operational implementation/configuration is separate work.
- Photo review/public availability is the evidence in this repository; no new legal-permission certificate was invented. Source/removal access remains on real profiles. No generated imagery or new partnership/outcome claim was introduced.
- No schema, RLS, authentication or private workspace behavior changed. No manual production deployment command is part of this change.
