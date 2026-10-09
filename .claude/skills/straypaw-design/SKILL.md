---
name: straypaw-design
description: StrayPaw product and visual engineering: original cartography, evidence-aware exploration, documentary animal identities, institutional workspaces, mobile interaction and rendered QA. Use for frontend implementation and visual review in this repository.
---

# StrayPaw: design as a public record

StrayPaw connects living animals, residents, care organisations and geographic
evidence. Its map is a living atlas; community, insights and professional pages
retain their own purposes and workflows. All share one institutional identity.
Never substitute a map for an existing home, insights brief or working page.
Community Home (Nearby) opens on a place with its night geography as the
hero; do not hide that map behind a disclosure or a "choose a place" gate.
The app shell is one ink bar (space switcher, destinations, ⌘K search, the
space's single primary action, account) with the long tail in the space menu
and the phone More sheet — not a sidebar and not a second register strip.
Keep account, feedback and professional actions reachable after shell changes.
Read `docs/REINVENTION.md` before changing post-app surfaces; build on
`src/components/shell/shell.css` (`.sx` scope, `x-*` primitives) rather than
adding another override layer.
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

The app is light: cream paper under white cards, with a live folk-art ground
(`FolkBackdrop`) behind every page. `paper.css` re-points the `--d-*` tokens
to that palette; use the tokens, not literal colours. Ink is text, blue is
selection or neutral evidence, flame is urgency and the single primary action,
teal is care. Hatching means unknown. Dark blue is an accent, never a whole
page.

Every page is a dashboard of bordered cards: a container with a `.dh` header
gets white sections with `--card-b`, `--card-r` and `--card-sh`. Site pages
reached from inside the app use the same frame (`MarketingPage inApp`,
`MarketingShell inApp`, `AppShell`). Keep the public landing hero and
marketing navigation unchanged.

One face: DM Sans. No italics, no serif headlines, no spaced mono capitals;
weight and size carry hierarchy. Use tabular numerals for comparisons. Calm,
Apple- or Zara-like restraint: few words, generous space, one action per
region. Copy that sounds like generated filler ("seamless", "empower", stacked
taglines) is rejected.

Areas are round. Draw H3 cells with `roundRing` / `roundCell` from
`lib/spatial/round.ts` (and `HexPlate round` for fallbacks). Never show a
hexagon in the app.

## The map is the dashboard

| Scale | Representation | Next step |
|---|---|---|
| India | City registers and source reach | Enter a city |
| City | Round areas shaded by count | Select a Lens or area |
| Neighbourhood | One dot per recorded animal (z ≥ 12.6, fetched per visible area) | Inspect a record |
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

Use only the animal's real photograph and preserve attribution. When absent,
show its `FolkPortrait`: a crop of a real dog painting from the Cleveland
Museum of Art's CC0 collection, fixed per record and a pup for puppies,
captioned with the work and "not a likeness". Never generated images.

Any art added to the product must be a real, openly licensed work recorded in
`lib/art/sources.ts` (title, maker, source URL, licence, adapted or not) and
shown on `/art-credits`. Prefer CC0 museum collections; for CC BY-SA keep the
licence on adaptations. Skip photographs of paintings whose own copyright is
unclear.

Photos that may show injury start blurred behind `SensitiveVeil` ("Tap to
view", remembered for the session). Use `isSensitivePhoto` for cover photos
and always blur case, fundraiser, medical and incoming-report photos. Never put
such a photo on the landing.

Name it with `lib/animal-name.ts`: the given name if a person gave one, else
the short StrayPaw tag. The subtitle describes the record from its recorded
sex and size ("Female · medium", "Male puppy") and the short place. Never
invent a name and never title a record "Dog near…".

Lead with identity, locality, recorded status and provenance. Connect
observations, cases, care and follow-ups chronologically; preserve unknown
dates. A map preview must disclose whether it identifies an individual or
browses candidate records within a selected area.

Sightings are moderated one at a time at `/moderate`. Auto-approval needs every
rule in `lib/auto-approve.ts` and, when configured, the photo check in
`lib/photo-check.ts`; both fail closed, so anything uncertain waits for a person.

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

Keep every phone page within about two screens: split long content with
`PhoneTabs` or `PhoneFold`, turn dashboards into swipe decks, cap or slide long
lists. The More sheet is a short settings-style list. Use one compact Lens
control and one contextual sheet. Keep the map, selection
and primary action distinguishable. Sheets need peek, expanded and closed
states, visible reopening, and a grip that does not pan the map.

Preserve keyboard navigation, visible focus, Escape dismissal, descriptive names
and status announcements. Use pressed buttons for map modes unless implementing
the full tab keyboard model. Touch targets are at least 44px. Muted text must
also meet WCAG AA. At 320px and 200% text zoom, wrap or reorganize controls; never
clip critical actions. Wide tables scroll inside their own labelled region.

Animate meaningful changes only: camera travel, selection, inspector, Lens and
completion. Use existing easing/duration tokens. The folk backdrop is the only ambient motion and stops under reduced motion. Avoid other continuous decoration,
expensive filters, animated shadows, counting numbers and delayed primary data.
Honor reduced motion in CSS and JavaScript camera durations. Camera animation
cannot be disabled by a CSS media query alone.

## Failures to reject

The post-app composition contract is purpose-specific: the Atlas is night
cartography with one scale-aware rail (source-aware India index → city Lens
readout → cell inspector); Nearby is a place hero followed by animal tiles that
use record plates where no photograph exists; animal identities are dossiers
with a year spine and actionable gaps; NGO Today is queue beside open-work
geography; Insights is an analytical register; Municipality is a City Brief
(evidence profile, qualified totals, locality concentration, change, gaps,
city comparison, limits) that links into the Atlas rather than embedding it.
Reporting is a live draft receipt beside one question at a time.

Reject slogan-led two-column heroes, decorative geometric route objects and
icon feature rows. Capsules are for actions and filters, not for decoration. Source labels, real photography,
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
