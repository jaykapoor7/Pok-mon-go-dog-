# Living product: depth, not a replacement

Issue #37. Baseline: main a5022306, inspected live at straypaw.org on desktop and 390px mobile on 19 October 2026. See before screenshots. The existing blue hero, capsule navigation, Pinky example, brand typography, navy request section, coral ecosystem and cream conclusion remain.

| Severity | Observed problem / reproduction | Supported improvement |
| --- | --- | --- |
| Medium | Scroll the live landing: no real profile gallery appears. Only Pinky's explicitly illustrative profile and a public tag at the bottom make an individual animal visible. | Two documentary rows within the hero using only the existing photo-reviewed ID allowlist and currently public, non-sensitive, non-injured records. Native profile links; no fabricated fallback profiles. |
| Medium | Send the example, then switch review/history/area: the report changes panels but has little persistent identity or visual relationship between states. | Persistent example receipt, a navigable stage trail with accurate state labels, observation and review history. Preserve acceptance/assignment as explicit demo actions; no invented care or public linkage. |
| Medium | Choose Living Map: the preview is an SVG of coarse area centres, not the interactive product. | Large opt-in public map showcase in section 3. Reuse FieldMap in an isolated preview document, public scope and city variant (no report actions). Keep the coarse fallback, real city links and coverage limits. |
| Low | Switch audience tabs: functional tasks exist, but the composition is a large flat box with little visual connection to the shared report or folk identity. | Shared contextual identity alongside the task, with sourced art; instant accessible role switching. Clearly separate the example from public municipal/partner figures. |
| Medium | Read the conclusion: the artwork/public tag do not establish a specific field relationship. | Reuse the existing operational-partner source, label pilots distinctly, link the directory and methodology. No claimed adoption, measured impact, deployments or institutional endorsements without evidence. |

## Direction before implementation

The subject-specific idea is **one animal, one report, many useful views**. Keep ink #0B1E3D, shell #F3EDE4, coral #F05B40 and blue #2457CE; existing DM Sans, Instrument Serif and DM Mono roles. The hero's genuine public photo strips lead into the navy example workspace; the coral role workbench leads into a wide real map; the cream close pairs human artwork with qualified field-partner proof. No new palette or card grid.

The gallery is the one explicitly requested ambient movement: slow linear transforms, only while visible, pause on hover/focus and a persistent Pause control. Reduced motion and no JavaScript give static, horizontally scrollable rows; duplicate loops are hidden to assistive technology and outside the tab order, but still open the real profile on pointer activation. UI responses remain immediate, with brief transform/opacity feedback only. The live map starts only on request, has a visible exit, and is unmounted when closed. No additional map engine in the initial landing bundle.

## Data and image boundaries

The repository's REGISTER_FRAMES list documents prior manual photo review. The new gallery must not use the old register's broad fallback (which can admit photos outside that list). Public availability and that existing review are the available evidence; this task does not manufacture an additional legal permission certificate. Original profile/source/removal links remain available through each record. If none of the reviewed records is public, the gallery explains unavailability and links the actual map. No substitutes or new names.

No database, RLS, auth, case mutations, care outcomes or operational workflow changes. Demo data stays in React memory, never enters the public map. The map preview reuses the public operational component in its own document, not a fictional geographic interface. Existing partner source includes a documented founding-partner fallback; that supports a relationship label, not a claim of measured deployment or rescue impact.

## Final commercial scope

The user subsequently supplied the buyer and commercial terms: municipal paid pilots; NGOs as the field network; StrayPaw review and disbursement under pilot terms; WhatsApp at ₹999/month per NGO. The hero now says **digital infrastructure** and leads to a municipal pilot. The site navigation and compact footer include Municipalities. `/municipalities` presents the paid service, scope, review and disbursement model with instant step controls. `/product#whatsapp-pricing` shows the user-supplied fee and a working contact/setup action. No invented municipal customer, signed pilot, payment transaction or deployment count is shown.

This change implements the commercial pages and local demonstration. It adds no payment processor, financial ledger, WhatsApp transport or automated verification engine. Review/disbursement describe the agreed pilot service; the interactive model itself changes only its selected explanatory view. The existing operational software and access controls remain unchanged.

Repeated caution paragraphs were removed from the landing at the user's request. Compact Example/Public labels, accurate pending states and links to actual source/methodology pages remain. Pinky's status/timeline still say illustrative; the example is still never linked to a public animal or map.

## Observed regressions fixed during QA

- The new municipal page initially inherited the application sidebar: add its route to `Chrome`'s existing marketing allowlist and verify one main landmark.
- A first-load pathname effect could close the mobile menu immediately after the opening click. Close only on an actual pathname change; retain the existing focus trap and Escape restoration.
- Four demo steps were too narrow on a phone. Use two columns with 12px control names, 11px state metadata, 16px form inputs, wrapping content and explicit selected blue/white contrast.
- Duplicate carousel copies must still open profiles for pointer users while remaining outside the tab order. Only one copy of each actual record is keyboard/assistive-technology reachable. Repeat short rows only for the seamless visual loop.
- Voice control/accessible-name audit flagged state text inside navigation buttons with shortened aria labels. State metadata now sits alongside each natively named button and is referenced as its accessible description.
