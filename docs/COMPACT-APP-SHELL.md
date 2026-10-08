# Community geography and compact app shell

Implemented on the development branch; landing is unchanged.

- Community Home displays the existing real-data geographic map by default,
  above its photographic register. The map is bounded to the selected place,
  with explicit public-cell and loaded-sample location limitations. It is 300px
  desktop and 200px phone; the full interactive Atlas remains one action away.
- Desktop app navigation is a horizontal scrolling route register, not a
  full-height sidebar. NGO quick actions remain reachable. Account access and
  feedback are in the header. No routes were removed.
- The search shortcut badge is removed; search and its keyboard behavior remain.
- Animal profiles use continuous full-width facts/history rather than a
  right-hand card column. Status rails, action buttons and back buttons are
  rectangular. App-only shape tokens do not change the landing's Open App CTA.
- Phones lose the duplicate Key Workflows strip. Working text and sections are
  denser, profile photographs shorter, and Home geography compact. The Atlas
  keeps zoom/filter controls immediately visible; grid, ground and location
  tools remain in the existing expandable tools area. More retains navigation.

## Verification

Optimized production build passed. Production Chromium checks at 1440, 390 and
320px on public profiles, City Atlas, reporting and signed-out NGO Home returned
200, zero document overflow and no browser exceptions.

Desktop/phone interaction tests passed: municipal question switching, first-visit
role selection, Community place search/recent records, visible Home map with a
height budget, Insights periods, four Lenses, zoom, browser back, actual animal
preview/profile and mobile inspector. WebGL fallback and five-step reporting
dry-run passed with zero submissions.

Final contrast and rectangular account/report-button corrections were made
after the first captures. A final native Home rerun timed out waiting for
city data after an earlier complete production pass. The QA harness can replay
read-only actual public spatial responses to isolate layout from cold data
loading; it does not create records or simulate metrics.
The public-response replay passed both desktop and phone interaction checks
without browser errors. Atlas and animal renders also passed at 360/1280px.
Authenticated NGO records and every secondary route were
not exhaustively retested; no complete-product QA claim is made.
