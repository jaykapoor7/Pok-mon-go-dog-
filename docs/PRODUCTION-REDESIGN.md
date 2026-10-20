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
- The hero is a normal, static section with the existing blue composition and credited palampore artwork. Its map reveal, camera transition and scroll pin are removed at the owner’s request. Explore the Map remains an explicit action.
- `AnimalRegister.tsx` restores the existing three-depth-band infinite photographic register and dealt profile. The visible pause action is removed at the owner’s request; existing hover/focus, offscreen and reduced-motion behaviour remains.

The owner’s final homepage order is hero → original animal carousel → existing WhatsApp/connected-record animation (`OriginalRequest.tsx`) → historical street sequence (`CaseDive.tsx`) → ecosystem roles → FAQ and ending. The WhatsApp cards, layout, Send/replay drivers and timeline remain the existing implementation from `6545ead6`; the owner subsequently requested replacement of the vine/light connectors with a drawn ink trail and a coloured paper background. The older `CareStory.tsx` is not mounted. `CaseDive` uses the existing record-backed implementation and original map/route/day choreography, with the historic “One request, followed to the end” heading. No replacement artwork, schematic scene or invented seven-day case is supplied. When the live source cannot be read, the original sequence uses `src/data/landing-case-archive.json`, the verified public Coimbatore case captured from the earlier deployment on 20 October 2026. Its actual dates are 16–23 June 2026; no timeline, care fact or outcome is invented. The file retains the public city geometry/events, source commit, capture time and HTML SHA-256. The owner requested removal of the public archive and route-disclaimer labels; the actual historic dates remain visible. Source provenance stays in the archive file, isolated from live totals, reporting and operational records.

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

### Carousel availability

At the owner’s request the homepage carousel no longer reads Supabase. Its three original moving bands and dealt-profile interaction use 16 of the same genuine, previously published profile photographs, copied into `public/photos/register` and compressed to WebP (1.68 MB total). All 16 licences and photographers were verified against their original iNaturalist photo pages. `register-photo-credits.json` preserves source URLs and content hashes; visible attribution is linked from the carousel. Each photograph retains its original animal ID and recorded fields. Storage-blocked photos are omitted rather than substituted. `landing-register-archive.json` retains the public capture time and source commit; its historical total is not used as current traction. Animal profiles still open the current record service and can be unavailable during the externally imposed Supabase egress restriction.

The hero’s fallback record/evidence line is removed, its pilot action is orange, and Our Story describes the company’s origin without naming the founder or staff.

### Owner-directed final visual pass

The hero retains blue and palampore artwork across its full width with the owner-selected, locally hosted Pinky photograph; its map transition remains removed. The section sequence remains hero → photographic register → existing WhatsApp card story → original seven-day street map → five-role shared-record workspace → compact FAQ → Work With Us. Cream, blue, navy and coral backgrounds share locally hosted paper and palampore artwork; the FAQ uses unboxed native HTML disclosure controls on navy. The closing Open App action is removed. Five keyboard-operable role tabs open concrete task links into existing app routes, with NGO access still authenticated.

All ten NGO names were read from the production organisation table on 20 October 2026. The owner explicitly approved all NGOs as field partners; the public list includes directory NGOs, Mission Rabies and JH CreIndia Foundation. The verified fallback is `field-partners.json`. Public attribution does not change database partner status, memberships, RLS or workspace permissions. HSI and Humane World aliases remain excluded from field-partner attribution; municipalities, research institutions and open data platforms remain data sources.

### Navigation and enquiry delivery

The flattened-header override is removed. The original ink-framed floating pill, sliding brushstroke, logo pop-out, mobile circular reveal, menu rotation and stepped menu entrance are restored, with a white bar, blue lettering, coral app action and five cream/blue audience entries. The original public-domain palampore border decorates the surrounding header. Existing route behaviour, role-aware app entry, focus containment, Escape handling and reduced-motion support remain. The Atlas viewport accounts for the restored header dimensions.

Contact, pilot, Work With Us and WhatsApp enquiries share `/api/contact`; organisation applications use `/api/partner-apply`. Both now use the owner-requested `jaykapoor700@gmail.com` inbox and set the sender’s validated email as Reply-To. The application email is attempted independently of its database archive, and neither form reports success if the email provider rejects delivery. The existing Resend key and sender are configured in Vercel; no secrets are copied into source. A mocked integration regression checks both endpoints, all four contact subjects, recipient, Reply-To, escaped HTML, database restriction and provider rejection without sending mail or inserting records. It runs in the quality gate.

The rotating-profile photo reveal no longer exits early when an animal has no curated crop. Both cached and newly loaded images reveal after successful decoding; cropping remains optional. The carousel repeats only enough tiles to cover each viewport continuously. Local verification passed the full browser suite (122 enabled tests, 8 expected skips), then 44 focused tests after the final navigation, photo and enquiry changes. Every one of the 16 flipping-card photographs was cycled and verified on desktop and mobile. Header/menu accessibility scans passed with zero violations, and every displayed carousel image loaded from local files (57 desktop instances, 33 mobile instances).

### Product views and the field-partner geography

The notebook-style roles treatment is replaced with a keyboard-operable role index and real public product samples: NGO Work / Animals / Map views, a searchable photographed register with record selection, actual Coimbatore analysis-area geometry with a request filter, and lessons drawn directly from the Academy content. App actions retain their existing routes and authentication. All five roles remain visible on narrow screens. Pinky appears only in the hero; role photography retains its own real animal ID and profile link.

The WhatsApp card animation, Send/replay and original seven-day street-map sequence retain their choreography. When the live area service cannot be read, the WhatsApp geography uses the 254 publicly published Coimbatore areas captured from the earlier homepage, dated 20 October 2026. `landing-area-archive.json` and `landing-workspace-archive.json` preserve the source commit, capture time and public HTML hash. The role preview explicitly labels this public snapshot and the captured queue age; it does not impersonate an organisation’s private queue or present historical counts as current coverage. Academy content has its own source label. No fallback contributes to current homepage traction totals.

All ten owner-approved NGO field partners appear in a city-filtered geographic directory with actual organisation-profile links. Hover/focus highlights the matching city on the existing India outline. City centres come from the existing geographic registry; Panchgani and Mohali were independently checked against OpenStreetMap/Nominatim. The source identifiers remain in `partner-cities.json`. This map explicitly represents organisation cities, not service coverage, precise office addresses, deployment claims or animal GPS. Gauhati and Guwahati are normalised to the same city. No new database permissions, role memberships or billing changes are introduced.

Known NGO profile URLs also retain their previously published directory details during the record-service outage, rather than returning a false 404. This fallback includes only the approved name, city, mission and website; it never infers verification, case counts, programme history or access permissions. Unrecognised slugs still return 404. Normal live profiles resume automatically when the source is available.

Validation for this refinement: production build, lint and TypeScript passed; the full local browser regression passed 132 tests with 8 expected skips, followed by 44 focused desktop/mobile checks after the FAQ, narrow-screen role index and partner-profile fallback fixes. Every published NGO profile returned 200 with its actual name; an unknown slug retained 404. All five role views, partner filtering and the opened FAQ passed accessibility scans at 1440, 390 and 320 pixels with zero violations, zero page errors and no horizontal overflow. Contact-delivery mocks, spatial, public-map footprint and no-full-register guards passed. No real reports, enquiries or database records were created by validation.

### Owner-requested original landing restoration

Restored the original register-at-three-scales landing composition from `3d0cf6b7`: the Coimbatore `HeroPlate` map replay and “Every stray animal in India” hero, photographic carousel, seven-day `CaseDive`, original street/field/city audience layout and report closing/footer. The current `OriginalRequest` WhatsApp animation sits between the carousel and CaseDive. Both older WhatsApp implementations remain unmounted. The audience layout now includes feeders, freelancers/volunteers and education using existing reporting, organisation and learning routes; the compact native FAQ remains. Current floating navigation, cartoonish button geometry, local carousel photographs, contact routing, authentication and data protections are preserved. The hero uses the previously verified public Coimbatore geography when the live service is unavailable; dated sample data never supplies current national traction.
