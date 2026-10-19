# StrayPaw final product quality pass

Baseline: main `5322255e`, inspected 19 October 2026 on https://www.straypaw.org.

## Direction within the approved brief

Keep ink #0B1E3D, shell #F3EDE4, coral #F05B40, blue #2457CE and the existing DM Sans, Instrument Serif and DM Mono. Retain the credited Coromandel palampore as the distinctive hero. Text sits on opaque paper, alongside rather than over the painting. Normal document flow replaces pinned stages. A report illustration and the existing live public record previews provide the substance. No new art, palette, map architecture or operational workflow is proposed.

Four homepage sections: a still folk-art hero; one example report with three acts; direct audience tabs with live record previews; a concise company conclusion. Locked copy takes precedence over upstream style and motion prescriptions.

## Confirmed findings

| Severity | Evidence and reproduction | Fix |
| --- | --- | --- |
| High | Homepage at 1280×633 is 10,360px tall. `#world` 1,899px, `#why` 2,405px, `#how` 2,152px; first three sections reserve 10.2 screens. On 390×844 the page is 15,119px. Scroll forward/backward through the three pinned stages. | Remove the three scroll timelines; normal content-sized sections. |
| High | `Commons.tsx`: clicking a tab calls `window.scrollTo`, camera takes 600ms, panel waits 380ms then scales for 700ms; content waits until 760ms. Tablist lacks keyboard movement, tab/panel IDs and roving focus. | Local state switching, associated tab/panel semantics, arrow/Home/End keys, no camera or delayed content. |
| High | `Chain.tsx`: seven staged flights, synthetic case identifiers/care chronology and “A team is on the way” presented after Send; four overlapping headings appear as one long heading in the accessibility tree. | Keep the storytelling headline, explicit example, three acts, no promised acceptance/treatment/rescue and no fabricated animal history. |
| Medium | Hero has four metrics; Product has four metrics and eight primary capabilities. Current descriptions differ from locked copy. | Three existing public rollup metrics with visible definitions; four primary capabilities; secondary links. |
| Medium | `SiteHeader.tsx`: menu locks body scrolling but focus can leave the sheet and reach obscured page content. Header continuously changes dimensions on scroll. | Focus containment and restoration; stable header and instant sheet content. |
| Medium | `co3.css`: hero and lists use entrance blur/translate and view-timeline opacity/translate while readers scroll. | Remove reading-surface animation, shorten oversized section padding. |
| Medium | Contact form uses a summary-only error and no first-invalid-field focus; success promises a reply. | Field-specific errors and focus; factual delivery receipt, preserve API contract and failure recovery. |
| Medium | Homepage company section is 3,452px tall at 1280×633, repeating metrics, mission/vision, roadmap and CTAs; footer has 19 navigation links. | Three concise company topics and locked closing; compact footer with data/legal access preserved. |

## Product audit boundaries

Public map opened on India with 28 city controls. Selecting Coimbatore updated the heading, scale controls and URL without leaving the shell. Clinical/campaign/rescue source distinctions are present. Public product routes and signed-out organisation gates are audited separately from authenticated writes. No production reports, cases, assignments or care events are created for QA. No privileged test session is configured; authenticated acceptance/review/assignment outcomes must not be claimed as browser-verified.

## Product fixes confirmed in source

| Severity | Evidence / reproduction | Implemented refinement |
| --- | --- | --- |
| High | `ReportStage` relied on `mapRef.flyTo` to select GPS/search coordinates. With WebGL disabled there was no map and Continue remained disabled. | Set validated coordinates independently of map rendering; resolve the label separately. Browser regression disables WebGL and selects GPS. |
| High | Reverse geocode promises wrote their old coordinates after a newer pin movement. | Invalidate pending lookups as movement starts; only apply the current request's result. Draft label lookups also verify current coordinates. |
| High | `Work` inspector requests were unguarded while selection changed; older responses could supply actions for another case. | Key inspector by selection and discard stale/unmounted reads. Authenticated reproduction remains code-reviewed only. |
| High | `FieldMap` used a module cache keyed `org:city`, surviving sign-out and another organisation's sign-in. | Cache only public city reads; private reads always use the member's current request. Backend authorisation and RLS unchanged. |
| Medium | Locality chart used `p.v || p.animals`: a zero selected care/request measure became the animal count. | Render the selected measure directly, retaining zero. |
| Medium | Full-record links omitted the existing `from` return parameter. | Carry current map route and query to the animal; constrain return links to map routes. |
| Medium | Retaking a photograph retained the previous photo's consent. | Clear consent on replacement and release replaced blob URLs. |
| Medium | Clearing a follow-up date threw at `toISOString()`. | Required date field and finite-date validation before scheduling. |
| Medium | Browser regression at real Coimbatore coordinates displayed “Pinned: Kochi” when geocoding was unavailable. The fallback picked any metro without a distance limit. | Add the verified Coimbatore centre; beyond 50km from a known city, explicitly show “Location name unavailable”. This is a temporary label, not a boundary lookup. |

Live read-only baseline covered 18 routes, all HTTP 200, with no captured page errors or horizontal overflow at 1440×900. NGO case/animal/review/care screens presented their member gates; no authenticated action or delivery outcome is claimed. Public map, reporting entry, municipality, evidence, directory and access pages were inspected with real production content.

Baseline axe WCAG checks found contrast failures on Product (7 elements), Solutions (10), Our Story (8), Contact (6), including white text on coral (3.34:1), and invalid metric definition-list structure on Product and Our Story. The pass changes coral button labels to ink, repairs metric semantics and improves footer targets.

## Remaining proposals and verification limits

- Continuous city switching while panning and default city/area camera tilt differ from parts of DESIGN.md. The current map has its own camera/selection model; a replacement needs a focused geographic-interaction review. This pass preserves that model.
- Assignment, care, review, cross-organisation sign-out/sign-in and follow-up writes need a consented member session and a safe record. Guards and date validation were code-reviewed; no invented operational history or production test case was created.
- Local builds have no Supabase environment configured. Production counts and public records were inspected live; local screenshots intentionally show unavailable figures, not fabricated numbers or “0”. Source queries and verified partnership provenance are retained. The preview should receive normal deployment configuration for a final live-data visual check.
- The current source contains no verified founder biography. The Story page keeps the independent-India company line rather than inventing a founder identity.
- Automated browser/device emulation is not a physical mobile-device performance or assistive-technology certification.
