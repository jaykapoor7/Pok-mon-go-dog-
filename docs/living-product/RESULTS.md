# Living Product implementation and verification

PR: https://github.com/jaykapoor7/Pok-mon-go-dog-/pull/36 · Issue #35 · branch `codex/living-product-experience`.

## Final implementation

- Four homepage sections and locked primary headlines remain. Product, Solutions, Our Story and Contact copy remains as on latest main.
- **Hero:** StrayPaw blue reading field, large credited Coromandel textile, correct existing Pinky photograph, and a complete illustrative profile. Sterilised status and a three-event timeline are explicitly sample UI, not Pinky's actual medical history. Instant switch to real coarse public geography and real city map links. Three actual sourced metrics remain separate from the example.
- **One Request:** editable WhatsApp-style example → review queue → case inspection → deliberate example acceptance/assignment → unlinked history → real geographic context. Back, edit, undo assignment, replay and skip. No care outcomes are created. Native form is disabled without JavaScript; core product explanations and real links remain available.
- **One Ecosystem:** one full-width task at a time. Resident receipt and NGO workflow share the example; municipal layer controls and partner source inspection use separately labelled public data. Removed duplicate prose, headings and geographic panel. Native keyboard/touch audience controls remain immediate.
- **Company:** the exact closing headline, a short Why/Built/Next ledger, a large credited historical dog painting, one public record link where available, and Work with us. Removed repeated headings, paragraphs and secondary marketing links.
- **Visual craft:** blue/textile hero, navy print-edged demo, coral ecosystem and cream editorial close. Floating navigation and tactile rounded buttons retained. Dedicated mobile photo framing, workbench and company layout. Art credits and map attribution are 10px metadata with links/controls preserved.
- **Verified fixes:** mobile edit/focus, duplicate control names, no-JS form submission prevention, semantic figure lists, language button name, compact privacy notice, and profile heading order. No database, RLS, authentication or operational workflow changes.

## Checks

- TypeScript, ESLint and production build pass. All 83 pages build.
- Relevant interaction/quality suite: **36 passed**. After final semantic refinement, the **24-test** hero/sandbox/responsive/no-JS/reduced-motion subset also passed. Broader route/map/report suite earlier in this branch: **116 passed, 4 skipped** (live-report transport unavailable locally). GitHub's final quality gate covers the submitted head.
- Final axe sweep covers initial pages at 320/390/768/1440/1920 and pending/assigned/history/geography/all audience states at 390/1440. The stable-state sweep found **0 axe violations across 21 width/state combinations**; no claim of full manual WCAG certification.
- Five marketing routes, 390/1280, both themes: **0 contrast failures**. No browser exceptions or horizontal overflow in the inspected widths.
- The sandbox write-boundary test intercepts every non-GET/HEAD/OPTIONS request while playing the flow and verifies **zero attempted writes**. Shared identity, draft submission, acceptance/assignment/reset, reload clearing, mobile back/edit and no-JS disabled form are covered.
- Existing no-full-register-read guard passes (481 source files). Final homepage uses the original parallel bounded story/city reads, with no extra register fetch.

## Evidence

- [Before desktop](screenshots/before-desktop.png) → [after desktop](screenshots/after-desktop.png)
- [Before mobile](screenshots/before-mobile.png) → [after mobile](screenshots/after-mobile.png)
- [Working case demo desktop](screenshots/demo-desktop.png) / [mobile](screenshots/demo-mobile.png)

Before: real current production, captured through agent-browser at 1440/390. After: local production build with actual Pinky asset; local public-data credentials are absent, so live figures/geography correctly show unavailable. These are not equal-data screenshots. The full-page captures wait for lazy artwork to decode and reset scroll instantly.

The reviewed production baseline measured 3320px desktop / 4510px mobile. Final local captures measure **3174px desktop / 4240px mobile**; data availability and example state affect total height. The initial audience view contains 54 words and the company close 45 before optional public-record metadata. The previous live versions had 82 and 85 respectively. These counts include visible UI/captions; live-data differences are disclosed.

## Performance and limits

Final build reports homepage 13kB / **202kB first-load JS**, compared with 190kB before this work. The interactive feature and image component add payload; no new runtime dependency or homepage map engine was added. Pinky's existing 403kB source is served through Next image optimization with responsive sizes and priority loading. No scroll listener, pinning, camera choreography or animation loop was added.

Indicative local production-build measurement at 390px: Send → visible queue DOM update 1.8–6.7ms across five warm runs. This is headless Chromium without device/network throttling, not a field benchmark or physical handset test.

The PR preview is protected by Vercel login. Authenticated connector reads returned HTTP 200 with actual source figures (30,288 animals, 2,285 requests, 28 cities) and genuine public records before the Pinky sample refinement. Final preview HTML is checked again at the submitted head. Browser interaction QA uses the production build locally; deployment protection is not disabled.

Remaining opportunities: a named artist's licensed neighborhood commission, physical-device/network profiling, and human assistive-technology testing. Existing art is credited and not claimed as newly commissioned. The taste inspector's raw house-style gate is not a pass: locked copy, capsule navigation, tactile shadows, approved palette and restrained motion intentionally override its conflicting rules.

No merge or production deployment was performed. Only the repository's automatic PR previews ran.
