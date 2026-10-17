# StrayPaw 2.0: creative implementation matrix

Every approved reference (Creative Direction Appendix v1.1 §3–4) and the Folk Art
Direction Appendix, mapped to the screens, components, interactions and motion
that carry it. Each row records what was adopted, what was adapted, what was
rejected, and what is still open. "Open" means not built yet; it does not mean
approved to skip.

## Visual language (the 2.0 visual reset)

| Element | Implementation | Where |
|---|---|---|
| Indigo printed sheet | `--sheet #1f2a5c` second print ground. Paper ink on indigo, marigold for Hindi and accents. Every workspace head prints on it automatically (`:is(.ngo-head, .ci-head, .mo-head, .tr-head, …)`). | `src/sp/sp.css` |
| Selvedge | Original StrayPaw ornament: running stitch with small lozenges along the foot of each sheet. It is not a traditional motif. | `--selvedge`, `.selvedge` |
| Licensed Indian art | Real, openly licensed paintings: Cleveland Museum of Art Mithila and Rajasthani works (CC0), and contemporary Gond works on Wikimedia Commons (CC BY-SA / CC BY). Each is credited in place and on /art-credits. Nothing is generated. | `lib/art/sources.ts`, `INTERIM` in `src/sp/ui/slots.ts` |
| Commission slots | Still open and documented (`ART_SLOTS.md`). An open slot shows an interim licensed work with its credit, never labelled as a commission. | `ArtSlot` |
| Type | Instrument Serif (display), DM Sans (function), DM Mono (evidence), plus Tiro Devanagari Hindi for Hindi place names (`.hi`, `:lang(hi)`), as a multiscript pairing. | `src/sp/fonts.ts` |
| Colour semantics | Recency inks: teal → leaf → turmeric → terracotta → lac. Undated is hatched. Flame stays reserved for urgency; artwork colours never encode data. | `src/sp/atlas/recency.ts` |

## The 14 references

| # | Reference | Adopted | Adapted | Rejected | Screens / components | Motion | Open |
|---|---|---|---|---|---|---|---|
| 01 | NYC Tree Map | Multi-hued marks at every zoom; area roll-ups; hand-drawn-looking map | India as a paper cut-out on an indigo sea with engraved water lines. Physical regions painted with pen marks and lettered in English and Hindi (Natural Earth, orientation only). Areas coloured by when last recorded. Engraved roads at street scale. | Dot-per-record for imprecise data; literal tree icons | `Atlas.tsx`, `cartography.ts` (`regionInks`, ripples, roads), `recency.ts` | Labels and sea paintings fade by zoom threshold | Commissioned atlas plates (`atlas-city`) |
| 02 | Opportunity Atlas | Unit changes by zoom (India areas → city areas → schematic dots); place inspector | National layer of 475 areas, slimmed and bounded (`/api/livingmap?kind=national`) | Rainbow choropleth; ward claims | `Inspector.tsx`, `server.ts getNationalCells` | Camera travel between scales | — |
| 03 | Radio Garden | Fly-to without reload; minimal chrome | Interruptible camera; reduced motion becomes a cut | Globe (forbidden) | `Atlas.tsx` camera | `travel` easing, `dur()` | — |
| 04 | Flightradar24 | Persistent selection, compare up to 3, playback by recorded month | Municipal findings light their own areas (marigold rings) and move the camera | Interpolated tracks | `Atlas.tsx` (`spot`, `cmp`, playback) | fitBounds to the finding | — |
| 05 | Happywhale | Stable ID, encounters by source, follow on device | Record head: ID strip, "on the record since / last / entries" | AI ID, auto-merge | `AnimalRecord.tsx` | — | Photo galleries (needs real photos) |
| 06 | Photo Ark | Large dignified portrait, credit | No-photo plate states "No photograph recorded" first, beside a crop of a licensed Indian dog painting captioned "Illustration, not this animal" | Generated portraits | `Portrait.tsx` | The plate prints in from the foot | — |
| 07 | Linear | Queue, inspector, keyboard, cohorts | Triage ribbon (priority bands that filter); the case chain priority → place → animal → owner → next | Dark dev look | `Work.tsx` (`Ribbon`, `Chain`) | Inspector slides in 220 ms | — |
| 08 | EarthRanger | Queue ↔ map coordination | The map is the default side pane; choosing a row opens the inspector | GPS surveillance | `Work.tsx`, `AreaMap` | — | — |
| 09 | Global Fishing Watch | Layers, legends, temporal playback | Findings computed from the complete area record, each with method and areas | Population inference | `cityFindings.ts`, `Inspector Findings` | Camera moves to the finding | Publication cover art (commission) |
| 10 | City Layers | Provenance, place → decision | Method line before every figure; "Show these areas" | Unverified Layers.City features | `Evidence.tsx`, findings | — | — |
| 11 | Ciechanowski | Direct-manipulation lessons | Existing interactives kept | WebGL for its own sake | `Interactives.tsx` | — | Illustrated panels (commission) |
| 12 | Ableton Learning | Full Academy: courses, progress | Each course has a painted cover (licensed) | Points/badges | `Academy.tsx` | Cover hover lift | Assessments, facilitator kit depth |
| 13 | Stripe Press | Living publication | Record "chapters" numbered by year; indigo record head | Luxury dark mood | `AnimalRecord.tsx`, `CityReport.tsx` | — | Report cover commission |
| 14 | animations.dev | Purposeful motion vocabulary | Print reveal (record), set-in stagger, inspector slide, label/art fades, camera travel | Animating every row | CSS keyframes `ar-print`, `ar-set`, `wk-in` | All honour reduced motion | Shared-element map → record transition |

## Folk Art Appendix §5 slots

| Slot | Now shows | Status |
|---|---|---|
| atlas-city | Licensed Gond sea paintings at national scale (credited in the map attribution) | Commission open |
| animal-no-photo | Licensed Rajasthani / British India dog painting crop, labelled as not this animal | Commission open |
| academy-cover | Licensed Gond paintings, one per course | Commission open |
| ngo-empty, activity-empty, report-receipt, workshop-scenes | Licensed paintings (interim) | Commission open |
| city-report-cover | Licensed Mithila panel (CC0) | Commission open |
| atlas-legend, animal-chapter, academy-panels | Nothing (typographic) | Needs an artist |

## Still needs an artist, not a design pass

The following need a commission: city introduction plates, legend chapter heads, Academy narrative panels, the municipal report cover, and region-specific lettering. These need a named artist, written scope, fee and credit, which is a founder decision (Folk Appendix §8, Phase 1). The Gond works now in use are CC-licensed adaptations by a Wikimedia contributor. The licence permits this use with attribution and share-alike, but contacting the artist is still recommended before public release.
