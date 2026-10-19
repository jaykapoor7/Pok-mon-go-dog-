# StrayPaw product, design and quality pass

Tracking issue: [#31](https://github.com/jaykapoor7/Pok-mon-go-dog-/issues/31). Baseline: `5322255e` on main, 19 October 2026. Changes are on `codex/final-product-quality-pass`; no production deployment or database change.

## What changed

- Homepage retains exactly four sections. The existing credited Coromandel palampore becomes a still, legible hero. The locked headline and description replace the long explanation. Three public-record metrics retain visible definitions and source access.
- One Request retains “Today, one rescue lives in twelve places.” The WhatsApp Send interaction produces an explicitly illustrative receipt. Report → Coordinate → Understand is readable immediately. Fabricated case IDs, invented care chronology and automatic “team on the way” reassurance are removed.
- One Ecosystem retains “One ecosystem. Four ways in.” Audience selection is immediate with associated tabs/panels, arrow/Home/End keys, touch targets and visible focus. The existing public queue, city and evidence previews remain sourced from real production loaders; form illustrations are labelled.
- Company becomes why we exist, what we built and what is next, ending with “Better care starts with better information.” Repeated metrics, mission/vision blocks, long roadmap and decorative ending are removed.
- Product uses the locked headline, description, three-part workflow, four capabilities (Reporting, Case management, Animal histories, Living Map), secondary-tool links, three metrics and one concise accuracy/privacy explanation. It explicitly disclaims guaranteed acceptance, rescue and veterinary services.
- Solutions uses the locked description and closing, concise audience explanations and the verified field partner. Onboarding is Apply → Set up your workspace. The directory and credited sources remain reachable; listings are not presented as partnerships.
- Our Story has the five requested topics, sourced progress and an unobtrusive independent-India line. No unsupported founder identity is added. Detailed data, privacy and art disclosures stay linked on their existing pages.
- Contact uses the locked headline/description and retains its endpoint, privacy behavior and delivery check. Validation identifies and focuses invalid fields; a failed connection retains the message and gives a retry action. Success acknowledges delivery without promising a reply.
- Navigation retains StrayPaw, Product, Solutions, Our Story and Open App. Mobile menu traps/restores focus and opens immediately. The compact footer keeps the seven primary links; data, legal and resource access stays under a native disclosure.

## Functional repairs

Reporting selection works without WebGL. Stale geocode, photo-metadata and case-file requests cannot overwrite a newer selection. Replacement photos require fresh consent and release old blob URLs. Organisation map reads bypass the cross-session module cache. Locality charts keep a zero selected metric instead of substituting animal counts. Full animal records carry the existing map-return parameter. Follow-up dates validate before ISO conversion. The geographic fallback no longer labels a distant city as the selected place.

[Audit with severity, source evidence and reproduction steps](AUDIT.md). The product diff received a separate read-only review with no blocking regression found. Authenticated mutations remain code-reviewed, not represented as browser-verified.

## Measurements and evidence

| Surface | Live baseline | Local final build |
| --- | ---: | ---: |
| Homepage, 1440×900 | 13,592px | 2,739px |
| Homepage, 390×844 | 15,123px | 3,893px |
| Product, 1440×900 | 5,386px | 1,986px |
| Our Story, 1440×900 | 5,504px | 1,789px |
| Homepage map resources | Basemap + MapLibre worker/shared modules | None |

The local build has no Supabase credentials. Its screenshots correctly show unavailable metrics/queues rather than invented data. Live data adds content, so these are environment-qualified layout measurements, not a claim about deployed final page height. Baseline public metrics were 30,288 records, 2,285 requests and 28 cities when inspected; code continues to query those sources rather than hardcoding the snapshot.

Live baseline covered 18 routes, plus a real animal profile (Preeth, with its sensitive photo veiled), at HTTP 200 without captured runtime errors. The public map distinguished clinical, vaccination and rescue records and opened Coimbatore with its scale context.

| Screenshot | Before | After |
| --- | --- | --- |
| Hero desktop | [Before](evidence/before-hero-1440.png) | [After](evidence/after-hero-1440.png) |
| Hero mobile | [Before](evidence/before-hero-390.png) | [After](evidence/after-hero-390.png) |
| Homepage desktop | [Before](evidence/before-home-desktop.png) | [After](evidence/after-home-1440.png) |
| Homepage mobile | [Before](evidence/straypaw-before-mobile.png) | [After](evidence/after-home-390.png) |
| Product | [Before](evidence/before-product-desktop.png) | [After mobile](evidence/after-product-390.png) |
| Solutions | [Before](evidence/before-solutions-desktop.png) | [After](evidence/after-solutions-1440.png) |
| Our Story | [Before](evidence/before-ourstory-desktop.png) | [After](evidence/after-ourstory-1440.png) |
| Contact | [Before](evidence/before-contact-desktop.png) | [After](evidence/after-contact-1440.png) |

## Validation

- TypeScript, ESLint and production build passed. Homepage route: 2.79kB; first-load JS 188kB in the production build report.
- Browser suite: 94 passed, 8 expected skips (production-only launch tests and sends without a configured record store). New regression coverage includes both scroll directions, reduced motion, keyboard audience switching, mobile focus containment, contact validation/recovery, no-WebGL reporting and photo-consent reset.
- All five marketing pages were reviewed at 320, 390, 768 and 1440 CSS pixels: no horizontal overflow, captured page errors or automated axe WCAG violations. The contrast audit found zero failures across these routes in both themes and its two widths. Image-background/ARIA checks flagged as incomplete still require human review; automated checks are not a certification.
- Passed: case-input validation, public map footprint, spatial, location-cell, operational cohorts, no-full-register guard, no-fixtures, master-import parser/pagination/locality/staging/resume, SQL RPC mapping, record dates, bounded-fetch, auto-approval and the new geographic-fallback regression (added to CI).
- Browser evidence: [baseline](production-baseline.json), [baseline resource measurement](before-performance.json), [final responsive/axe results](after-browser-qa.json), [zoom-equivalent check](zoom-qa.json).
- [Skills loaded, dependency recovery and actual use](SKILLS.md). The taste inspector was run and its [raw findings](taste-inspector.json) retained. It flags locked copy, cream/mono identity, few pictures and intentionally restrained motion; those generic prescriptions were not substituted for this brief.

## Remaining work

Authenticated assignment, care, review, follow-up and cross-organisation account switching require a member session and safe records for end-to-end validation. Local figures cannot establish a live-data preview result without deployment configuration. Continuous city-to-city panning and default map tilt require a focused interaction decision; neither was silently redesigned. Physical mobile hardware, assistive-technology user testing and field performance remain unverified.

## Screenshot review

Round 1: the first screen clearly named the product and offered the next action. The retained palampore supplied the subject-specific identity. Review found legacy button shadows winning the new styles, Product capability outlines with insufficient inset space, and duplicated framing around Contact. These were corrected. Lazy artwork is scrolled into view and decoded before final captures, so full-page evidence does not mistake an unloaded thumbnail for missing content.

Round 2: checked both page hierarchy and the smaller screen compositions. The four homepage sections now read in normal document order, the three acts remain stable in both scroll directions, controls have room to wrap, and art stays outside the reading area. Generic taste-score penalties for locked copy and low motion are documented rather than treated as a reason to undo the brief. No claim is made that a third-party aesthetic score certifies product quality.
