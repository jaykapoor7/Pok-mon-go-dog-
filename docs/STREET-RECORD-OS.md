# Street-record OS implementation

Development branch: `codex/living-atlas`. No production deployment.

This is a composition change, not a shared card-template reskin:

- Atlas: paper survey cartography, docked city/source comparison index, four
  functional Lenses, independent camera/zoom controls and record inspectors.
- Community: photographic contact sheet, accession labels and observation
  entry. Contextual geography is expandable; Home is not replaced by a map.
- Animal: original photograph, accession bar, dated event trail and expanded
  source chronology instead of decorative route geometry.
- NGO Home: queue-led workbench with a vertical operational state rail.
  Existing case, record, task, import and programme actions remain.
- Insights: continuous numbered findings register and real evidence charts;
  geography is optional. Loaded findings and citywide totals retain scope labels.
- Municipality: planning questions alongside geography and explicit limits.
- Reporting: live draft evidence receipt alongside the existing input protocol.

Landing, primary navigation, routes, API contracts, permissions and database
architecture are unchanged. The design skill now rejects repeated slogan-led
heroes, pills and geometric decoration and defines purpose-specific compositions.

## Verification

- TypeScript check passed.
- Optimized production build passed, including route generation and type checks.
- Spatial, no-full-register-read, case INR validation and public NGO map
  footprint regressions passed.
- Actual Chromium desktop/mobile checks at 1440 and 390px passed: Community
  first-visit role selection, Delhi place search, recent records, municipal
  planning questions/map-instance retention, Insights period filters.
- Atlas interaction checks passed at 1440/390: four Lenses, zoom, city changes,
  browser back, actual animal marker/preview/profile and mobile detail sheet.
- WebGL-unavailable fallback retained live SVG/city inspector/Lenses.
- Reporting dry-run traversed all five steps at 1440/390, no submissions.
- Map, Insights and reporting renders at 320px had no document overflow.
- Production-server Atlas/Insights renders at 360/1280px returned HTTP 200,
  zero document overflow and no browser exceptions. Basemap tile loading was
  intermittent in the QA environment; records/layers rendered independently.
- Read-only public render harness also replayed actual production spatial
  responses where local reads were slow; no invented data was supplied.

## Remaining verification and scope

Authenticated NGO visual QA has not been repeated in this round; credentials
are not configured in the QA shell. No protected workflow was claimed verified.
Secondary routes inherit rectangular controls and ledger typography, but have
not all received a bespoke composition or exhaustive visual inspection yet.
Complete keyboard/screen-reader QA remains outstanding.
The frontend is not declared fully complete or production-ready.

Photographs and counts are live records, not population estimates. Imported
centroids, approximate localities, public H3 generalisation, bounded loaded
detail and source evidence limits remain explicit. H3 cells are not wards.
