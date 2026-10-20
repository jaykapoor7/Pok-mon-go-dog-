# October 2026 public website and shared map

## Evidence and publication rules

- Production `/api/stats` and `/api/spatial?kind=cities` read on 20 October 2026: 30,288 animal records, 2,285 requests for help, 28 cities with animal records. Homepage values remain dynamic through `getRegisterTotals`; none are baked into marketing code. Imports are included. Records are not unique-animal counts or a census; requests are not completed rescues.
- WhatsApp / CareOS: launch explicitly confirmed by the product owner in this implementation session, overriding the older proposed-status document. No new prices, quotas, promises of delivery or public number are invented. Contact is the access/setup path. Per-organisation RPC health and authentication remain authoritative for that workspace.
- Municipal commercial offering: a paid, proposed four-to-six-week scoped pilot, authorised in the implementation brief. Geography, records, capacity, fees and deliverables must be agreed before starting. No contract, deployed municipal customer or guaranteed programme outcome is claimed.
- Animal photography comes from `getAnimalRegister`, which filters sensitive/injured records. Cards link to the actual animal IDs and use the record's name/tag, photograph and history. No illustrative clinical fields are attached to a real animal.
- Our Story's founder origin is recovered from the repository's owner-authored history (`66131a27`). No current university affiliation or unverified biography has been added.
- Teaching materials retain their source credit. A credited source does not imply a partnership. No HSI partnership is asserted.

## Original interactions

- `OriginalRequest.tsx` recovers `Chain.tsx` from `cc58083a`: gathering fragments, typed report, Send/replay, seven travelling-object/vine stages, painted panels, reverse scroll and reduced-motion finale. Conditional care/review wording and explicit seven-day example labels replace automatic-rescue claims. The day labels describe an illustrative sequence, not a real animal's medical history or response-time promise.
- `World.tsx` retains its organic palampore opening, camera choreography and painted-record transition. The homepage begins with an opening into real geography so the product appears sooner. Licensed art stays credited.
- `AnimalRegister.tsx` restores the existing three-depth-band infinite photographic register and dealt profile. It adds a persistent pause action, pauses on focus/hover and offscreen, and retains manual browsing and static strips under reduced motion.

## One map foundation

`FieldMap` is used by the landing embed, `/explore`, `/community`, `/ngo/map` and municipal maps. `ground.ts` supplies the illustrated OpenStreetMap/OpenFreeMap 2D geography. The globe, night ground, extrusions and tilted cameras are removed from the shared renderer. Native pan/zoom easing, map search, lenses, area inspectors, animal profiles, mobile sheets and role-scoped reads remain.

- National city clusters and area aggregates retain their source precision.
- Individual markers are created only for loaded real animal records. The public contract supplies area-level coordinates, so markers are labelled approximate/schematic within that area. No GPS precision is manufactured.
- City-only clinical registers do not acquire a neighbourhood distribution.
- Full-map URLs carry city, lens, area, animal and camera; an animal's full-record link carries the return context. Embedded maps never rewrite the host page URL.
- No database migration, RLS change or private-data API expansion is included.

## Verification scope

Production build, lint, TypeScript, the repository's spatial/privacy/bounded-read/date/input regressions, public desktop/mobile browser journeys and automated accessibility scans are run for this change. Form tests intercept writes; no real contact messages or animal reports are created by QA. Existing authentication and organisation permissions are retained. Signed-in operational writes require an authorised test account and are not claimed as exercised by the public-route tests.

### Local release validation

- Production build, TypeScript and lint passed.
- Full Playwright suite: 114 passed; 8 skipped (deployment-only reviews and reporting sends that correctly require a configured store/human check). An additional 20 focused desktop/mobile tests passed after the final interaction and contrast adjustments.
- Spatial engine, public organisation-map footprint, bounded reads, calendar dates, location cells, case input validation, no-full-register guard, all five master-import regressions, SQL/RPC mapping and place fallback passed.
- Dependency gate (`npm audit --omit=dev --audit-level=critical`) passed with zero critical findings. The unchanged dependency tree still reports four high and one moderate advisory; the dependency upgrade is separate from this visual/product change.
