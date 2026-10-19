# Validation and review

## Implemented

- Exactly four homepage sections and every locked headline/description remain. The three sourced hero figures and definitions use the same authoritative server reads, with honest unavailable states.
- Product-first hero: the real application outline and public city records, a direct route to the Living Map, and subtle credited human-made folk art.
- Brand navy, cream, coral and blue fields; DM Sans/Instrument Serif hierarchy; restored floating ink-framed navigation and rounded tactile controls. Shared company-route CTAs follow that button treatment.
- One illustrative Send interaction: a report travels into a review folder; pending assignment, care, follow-up and animal-link states remain explicit. Mobile turns the message into the folder in place; Review queue and Animal history switch immediately; Replay returns to the message.
- Existing ecosystem previews and keyboard tab behavior remain; a server-rendered coarse geographic sample connects them to the public record.
- Company copy remains concise and unchanged, with one small credited human-made painting and the approved close.
- No AI-generated image, stock photo, new dependency, schema/RLS change, operational redesign or production deployment.

## Checks

| Check | Result |
| --- | --- |
| TypeScript | `npm run typecheck` passed; final production build also checks types. |
| Production build | Passed. Homepage route 4.04 KB; first-load JavaScript 190 KB. No extra animation library. |
| ESLint | Passed. |
| Full Playwright suite | 108 passed, 8 skipped. Skips: production-only launch checks and unconfigured live report-write tests. |
| Final targeted regression run | 26 passed after the mobile height fix, including 320/390/768/1440 hero containment, Send/Replay, mobile result views, keyboard navigation, reduced motion, no-JavaScript reading, contact recovery and report fallbacks. |
| Contrast | Zero failures on Home, Product, Solutions, Our Story and Contact at 390/1280, light/dark preferences. |
| axe WCAG 2 A/AA, 2.1 AA, 2.2 AA | Zero violations on the five marketing pages at 1440/390; all four ecosystem audiences and the mobile history view checked. This is automated coverage, not a conformance certification. |
| Runtime / reflow | No browser exceptions or horizontal page overflow in the reviewed marketing pages; explicit containment checks at 320/390/768/1440. |
| Manual browser interaction | Send/Replay; touch/pointer audience switching; Arrow/Home/End tab navigation; mobile focus containment/restoration; forward/backward section scrolling; reduced motion; no-JavaScript core information and links. |

## Observed fixes during QA

The first mobile render inherited a 280px image-height cap, allowing the taller map preview to overlap the next section. Removed the cap and added a rendered-bounds regression check. The example now replaces the message in place on mobile, avoiding stacked large previews. Darkened helper text after the changed preview surface exposed a contrast regression.

## Evidence and measurements

Before screenshots are the actual deployed site; after screenshots use the final local production build. Local Supabase credentials are unavailable, so after captures deliberately show unavailable figures rather than invented values. These are not equal-data comparisons. Initial and sent states differ in height on mobile because the review result contains more detail.

- [Before desktop](screenshots/before-desktop.png) / [after desktop](screenshots/after-desktop.png)
- [Before mobile](screenshots/before-mobile.png) / [after mobile](screenshots/after-mobile.png)
- [Send result desktop](screenshots/after-send-desktop.png) / [Send result mobile](screenshots/after-send-mobile.png). Component captures omit global navigation chrome.

Local headless Chromium observations during parallel QA: homepage LCP 1.12s desktop / 1.76s mobile viewport; measured CLS 0.039 / 0. These are indicative lab observations, not production Web Vitals or a physical-device benchmark. The 565 KB textile hero is replaced by server-rendered geography; the small existing botanical border remains a decorative image. No continuous animation or hero WebGL.

The homepage stays four sections, with no pinned scroll. Its richer product demonstration adds desktop space compared with the compact baseline; it is not claimed as a net page-height reduction. Mobile uses one changing example frame to limit that growth.

## Limits and remaining findings

- Verify live-data composition on the configured deployment: local source reads are intentionally unavailable. No production records or credentials were changed. Authenticated workflow writes were not performed.
- Extra inspection of the unchanged `/art-credits` app-shell page found two mobile axe issue categories: bottom navigation contrast and link distinction within artwork licence text. They are documented for a separate app-shell accessibility fix; none appears on the five marketing pages tested here.
- The taste inspector/source lint ran. Its generic house-style gate remains red for requested rounded/shadowed controls, brand palette/mono, locked headline wrapping and restrained automatic motion. These choices follow the user's explicit direction. It also flags normal sticky-header overlap at arbitrary partial scroll positions; targeted anchor/focus and forward/backward reading checks pass. Do not present this stylistic gate as an accessibility failure or a pass.
- No new human artwork was commissioned. Existing works keep their specific origins, dates, sources and licences. See [ART.md](ART.md) and [SKILLS.md](SKILLS.md).
