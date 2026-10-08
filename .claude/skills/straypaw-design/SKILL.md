---
name: straypaw-design
description: StrayPaw product and visual engineering: original cartography, evidence-aware exploration, documentary animal identities, institutional workspaces, mobile interaction and rendered QA. Use for frontend implementation and visual review in this repository.
---

# StrayPaw: design as a public record

StrayPaw connects living animals, residents, care organisations and geographic
evidence. Its map is a living atlas; community, insights and professional pages
retain their own purposes and workflows. All share one institutional identity.
Never substitute a map for an existing home, insights brief or working page.
Improve map exploration on map routes, and improve other pages on their own terms.

Read `docs/PHASE-1-ATLAS-AUDIT.md` before changing visualizations and inspect the
actual components before prescribing layouts. User instructions take precedence,
including instructions to implement directly. This skill creates no approval gate.

## Design judgment

Choose the organizing relationship before the component: geography needs a map,
repeated operational fields need a table, change needs a chronology, and an animal
needs an identity. A grid of cards is rarely the right answer.

Originality must improve understanding. An unusual composition earns its place
when it clarifies geographic scale, provenance, identity or the next action.
Never use tiny text, eccentric controls or concealed actions to look distinctive.

When the user asks for a fresh direction, reuse the evidence and working logic,
not the old screen composition. Change the dominant surface, reading order and
interaction structure. Shared typography overrides alone are not a reinvention.
Record structural changes and distinguish rebuilt experiences from screens that
have only received the shared system. Never declare the whole product finished
because its primary map has improved.

Before implementing, establish what a visitor should understand in five seconds,
the dominant surface, the next useful action, evidence limitations and the
one-handed mobile flow. Then build. Preserve routes, permissions and real actions.

## Brand foundations

Use the existing ink, warm paper, blue, flame and teal tokens. Ink anchors the
institution and cartographic field; paper carries readable records; blue means
selection or neutral evidence; flame means urgency; teal means care. Hatching
means unknown and dashed edges indicate uncertain extent.

Keep the landing page and shared palettes unchanged when the task concerns the
app. Put app-specific extensions in scoped styles or a separate map palette.
Use existing spacing and motion tokens; new layout dimensions should represent
actual content or interaction requirements rather than arbitrary decoration.

DM Sans is the working face. The existing serif stack gives animal names,
geographic titles and consequential figures an editorial voice. DM Mono serves
IDs, dates and aligned measurements. Do not introduce another font family.
Use tabular numerals for comparisons. Compact text must remain readable.

Shape follows role: continuous map/register surfaces can have square edges,
selectable rows can have a small radius, and compact filters can be capsules.
Never apply a large radius and shadow to every surface. Prefer rules, alignment
and deliberate changes of ground. Lift only the active inspector or overlay.

## The map is the dashboard

| Scale | Representation | Next step |
|---|---|---|
| India | City registers and source reach | Enter a city |
| City | H3 aggregates and supported activity | Select a Lens or area |
| Neighbourhood | Cell/locality with bounded records | Inspect a record |
| Animal | Authentic photo or explicit missing-photo treatment | Read history or act |

Keep transitions continuous. Preserve place, Lens and selection in the URL.
Camera motion explains distance; it must not reset for every control. Use camera
padding to keep the selected geography visible beside the register or inspector.

Suppress irrelevant road detail at national scale. Place labels are subordinate
to evidence. Distinguish selection, quantity and uncertainty. Legends name the
measured unit. Never scatter invented locations to make sparse data attractive.

Animals, Care, Cases and Evidence are the four primary Lenses. Specialist modes
remain available beneath them. A Lens changes a meaningful representation and
its contextual explanation; changing a tab colour is insufficient.

Evidence belongs in the main hierarchy: source, geographic precision, reference
period and the distinction between missing reports and missing intervention.

## Evidence contract

- Counts come from live responses, never copied from the audit into the UI.
- Animal profiles, encounters, observations, cases and interventions are different
  units. Never call their sum a unique-animal population.
- Authoritative current totals and capped detailed samples have different scopes.
  Every sample-derived chart or finding must disclose the loaded scope.
- Jamshedpur clinical records use a city centroid and cannot describe streets.
- Ranchi campaign GPS supports campaign geography, not a general census.
- Coimbatore rescue locations are mostly approximate localities.
- Official census/research estimates remain separate and carry their source/year.
- Missing ABC/ARV information is unknown, not automatically no.
- Imported `no_action` does not establish a verified intervention gap.
- H3 cells are analysis areas, not wards. Ward UI requires matching boundaries.
- Preserve `fewOr` for public counts of one or two in a cell/locality and preserve
  existing organisation RLS and permissions.
- Schematic dots inside a cell must never be described as exact animal positions.

Use the existing bounded spatial endpoints and pure spatial utilities. Never
fetch the entire register for a visualization. The old assumption of a single
90KB national dataset is obsolete: the current implementation loads bounded city
detail. Inspect limits and measure payloads.

## Animal records

Use only the animal's real photograph and preserve attribution. Let available
photography carry visual weight. When absent, use an explicit record treatment;
no stock animals or generated photographs. A graphic seal is an identifier.

Lead with name/source identity, locality, recorded status and provenance. Keep
provisional identity visible. Connect observations, cases, care and follow-ups
chronologically; preserve unknown dates. A map preview must disclose whether it
identifies an individual or browses candidate records within a selected cell.

## Professional workspaces

NGO work follows queue → record → action, with linked geographic context. Use
stable table columns, sticky headings, visible selection and a contextual
inspector. Preserve spreadsheet depth, search, filters, exports and source IDs.
Do not hide useful fields simply to make a minimal screenshot.

Municipal work follows place → evidence → supported interpretation → records.
Qualify uncertainty beside the claim. Do not design cost forecasts, coverage
percentages or allocation scores without compatible evidence.

Empty states are normal and deserve complete design. Explain membership, loading
or the first useful action. Never seed private workspaces with fake NGO activity.

## Mobile, accessibility and motion

Use one compact Lens control and one contextual sheet. Keep the map, selection
and primary action distinguishable. Sheets need peek, expanded and closed
states, visible reopening, and a grip that does not pan the map.

Preserve keyboard navigation, visible focus, Escape dismissal, descriptive names
and status announcements. Use pressed buttons for map modes unless implementing
the full tab keyboard model. Touch targets are at least 44px. Muted text must
also meet WCAG AA. At 320px and 200% text zoom, wrap or reorganize controls; never
clip critical actions. Wide tables scroll inside their own labelled region.

Animate meaningful changes only: camera travel, selection, inspector, Lens and
completion. Use existing easing/duration tokens. Avoid continuous decoration,
expensive filters, animated shadows, counting numbers and delayed primary data.
Honor reduced motion in CSS and JavaScript camera durations. Camera animation
cannot be disabled by a CSS media query alone.

## Failures to reject

The post-app composition contract is purpose-specific: Atlas is a geographic
surface with a city/source index; Community is a photographic contact sheet;
animal identities are accessioned dossiers with dated event trails; NGO work is
a queue-led workbench; Insights is an analytical register; Municipality is a
planning-question rail beside geography. Reporting is an evidence receipt and
an input protocol. Do not repeat one composition across these surfaces.

Reject slogan-led two-column heroes, decorative geometric route objects,
icon feature rows and pill-based navigation. Source labels, real photography,
state rails, continuous tables and provenance are StrayPaw's design material.
Maps belong to geographic tasks, not every route. Keep Community and Insights
independent; retain contextual geography without replacing their workflows.

- KPI-card grids with a subordinate map.
- Decorative gradients, glows, frosted panels and repetitive rounded cards.
- Arbitrary background grids; a geographic graticule is different.
- Tiny labels used to suggest sophistication.
- Invented photography, locations, metrics or coverage claims.
- Compressed desktop panels stacked over a mobile map.
- Renaming controls without changing interaction or information hierarchy.
- A beautiful static view whose actions, empty states or permissions break.

## Verify the rendered product

1. Run type checks and existing tests relevant to changed contracts.
2. Build and run production separately from dev; never share `.next` concurrently.
3. Inspect actual renders at 320, 360, 390, 1280 and 1440px. Discover the installed
   Chromium executable instead of assuming an old absolute path exists.
4. Test India → city → cell → animal, every Lens, filters, back navigation,
   inspector, mobile sheet, keyboard and reduced motion.
5. Measure document overflow, touch bounds and computed styles. Inspect winning
   selectors before adding specificity; this repository has strong global rules.
6. Inspect loading, sparse data, missing photos and signed-out workspaces. Use
   authorized accounts for protected workflows and report paths not verified.
7. Save representative screenshots and a concise handoff listing changed routes,
   verified behavior and unresolved limitations. Never deploy without approval.

Completion requires a visible, usable result and candid evidence of verification.
