# Living Atlas — implemented development build

Branch: `codex/living-atlas`. No production deployment, database migration or
operational record mutation. The homepage, landing sections and primary
navigation are unchanged.

## Actual structural changes

| Experience | Implemented change |
|---|---|
| `/map` | A continuous India register beside an ink cartographic field. National view loads the city index, not a rich animal register. City selection keeps the map alive and replaces the national rail with geographic intelligence. |
| City intelligence | H3 aggregates at city scale; schematic individual records at detail scale; contextual counts, source precision and bounded-sample disclosures. Animals, Care, Cases and Evidence change both representation and readout. Existing specialist modes and filters remain accessible. |
| Animal preview and `/dog/[id]` | Authentic cell candidates, real photographs where available, explicit schematic-position note, linked histories and a documentary identity spread. Missing photographs receive a record treatment, never substitute imagery. |
| `/partner` | A working ledger, operational navigation, priority and waiting columns, linked geographic context, preserved tasks/camps and existing case actions. Mobile status columns wrap rather than clip. |
| `/partner/records` | Existing search, filters, export, pagination and permission-gated deletion retained. Added keyboard-dismissable record inspectors with recorded fields, complete notes and working-record/history/map links. |
| `/partner/map` | Uses the same geographic system with existing organization scope and authentication. Opens its recorded city rather than the public India overview. |
| `/municipality` | Geographic exploration uses the continuous Atlas and source-aware city intelligence. H3 analysis areas are explicitly not wards or coverage denominators. |
| `/report` | A resident field-note procedure with visible numbered steps, accessible review and a direct mobile sequence; existing submission logic remains intact. |
| Shared post-app content | Editorial headers, warm-paper ground, ruled tables and documentary typography. Scoped styles do not touch the primary navigation or landing. |

Correction after user review: `/app` again opens Community Home and `/insights`
again opens its analytical place brief directly. The initial map replacement of
those defaults was a product regression, not an approved simplification. Existing
`view=patch` and `view=brief` links remain compatible but are no longer required.
Map improvement belongs on map routes; other screens retain their own purpose.

## Evidence and geographic safeguards

- All displayed counts come from live responses. Recorded profiles are not a
  street-dog population estimate or a verified unique-animal count.
- Current city-rollup totals and loaded detail are separate scopes. Detail is
  bounded; sample-derived precision and critical-case findings are labelled.
- Jamshedpur's shared city location never becomes a fabricated street
  distribution: individual dots, portrait placement and density are suppressed.
- Ranchi represents a vaccination campaign; Coimbatore locations are mostly
  approximate localities. Public animal dots are schematic within cells.
- Unknown vaccination/sterilisation is not a negative status. Imported
  `no_action` is not a verified intervention gap. Reporting density is not
  population coverage.
- Sparse public cell/locality counts remain generalized. RLS, private source
  fields and organization queries are preserved.
- No unsupported ward comparison, cost forecast or resource-allocation score
  was added.

## Verification performed

Production build, TypeScript/build lint and these existing regression checks:

```sh
npm run build
npm run typecheck
npm run test:spatial
npm run test:public-map-footprint
npm run test:no-full-register
npm run test:bounded-supabase-fetch
npm run test:record-dates
npm run test:location-cell
npm run test:case-input-validation
```

Actual Chromium production renders inspected at 320, 360, 390, 1280 and 1440px.
The 20-view core render pass returned HTTP 200 with no document overflow, page
errors or Atlas buttons below 44px. Additional desktop/mobile route checks
covered municipality, stories, resources, following and signed-out case entry.

`scripts/atlas-interaction-qa.mjs` exercises India → Coimbatore → all four
Lenses → specialist ARV → back → single-location Jamshedpur → a real Delhi
cell → reachable photographed animal → full history, on desktop and mobile.
It verifies no national rich-detail prefetch, no page errors and mobile sheets.

`scripts/atlas-safety-qa.mjs` checks the no-WebGL geographic fallback and all
five reporting steps through review, without submitting a report.

`scripts/atlas-ngo-qa.mjs` checks an explicitly authorized organization session
at 1440 and 390px: actual register rows, inspector fields and links, Escape
dismissal, mobile queue bounds and the scoped map. Credentials are supplied
only through environment variables. Development has no administrative secret;
the test forwards only sign-in to the existing account service. Private test
screenshots stay outside the repository and must not be published.

The browser checks did **not** exercise production create/edit/delete/import
operations. The preserved operational workflows still require a controlled
write-enabled test environment before release. No claim of full product QA or
production readiness is made.

## Design skill upgraded

`.claude/skills/straypaw-design/SKILL.md` now establishes original composition,
scale-specific representations, an evidence contract, documentary identities,
operational ledgers, mobile interaction and actual rendered verification. It
explicitly rejects treating shared typography overrides as a fresh direction
or declaring the entire product complete because the map improved.

## Remaining product work

The Atlas, profiles, NGO overview/register and reporting received structural
changes. Many secondary professional routes received the shared content system
only; case editing, imports, projects, reports, team/settings and other tools
still need their own workflow-specific composition and authenticated QA. The
community patch is preserved, not rebuilt. Municipal ward planning remains
limited by incompatible geographic evidence, not by presentation.

Before any release: finish those route-level designs, test non-lead and municipal
permissions, perform controlled write-path checks, check text zoom/screen-reader
flows, and measure performance on representative mobile hardware. Production
deployment requires explicit approval.
