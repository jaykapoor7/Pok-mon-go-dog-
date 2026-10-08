# Post-app restoration check

User clarified the product boundary: improve the map and its zoom journey;
redesign other screens without substituting maps for their actual purpose.

Compared route bodies and high-change components against baseline `1549412`.

| Area | Finding | Resolution |
| --- | --- | --- |
| Community Home `/app` | Replaced by Atlas unless `view=patch` | Restored CommunityPatch as the default; live commit `ee9c6c2` |
| Insights `/insights` | Replaced by Atlas unless `view=brief` | Restored PlaceBrief as the default; live commit `ee9c6c2` |
| First-visit role chooser | Automatic prompt disabled by Atlas entry change | Restore original new-visitor condition; preserve saved role and explicit switching |
| NGO Reports | Embedded bounded map was already the baseline, not a redesign regression | Improve to organisation-scoped PlaceBrief with period filters, honest loaded scope, map links and retained ExportStudio |
| NGO Home | Working queue, tasks, camps, follow-ups and operational links remain | Keep the operational ledger; geographic context is secondary |
| Animal/case records | Original actions and histories remain; new inspectors link into them | Preserve full record workflows rather than replacing them with map previews |
| Feeder/Educator/secondary routes | Route components were not replaced by Atlas | Keep their task-oriented layouts and continue scoped visual refinement |
| Municipality | Map surface was already the baseline | Retain supported geographic questions, evidence limits and links to analysis |
| Map `/map`, `/partner/map` | Improved Atlas remains dedicated geographic workspace | Add explicit 44px zoom controls; retain wheel/pinch zoom, city search and detail sheets |

Production verification of `ee9c6c2`: Vercel READY with `www.straypaw.org` alias.
Live `/app` and `/insights?city=Coimbatore` at 390px and 1440px returned HTTP 200,
had no page errors or horizontal overflow and mounted no Atlas canvas. Insights
displayed seven actual findings. Original baseline did not contain a different
hidden NGO report implementation to recover; the Reports change is an improvement.

No database, permission, import schema or mutation contracts changed. Private
NGO screenshots and sign-in state are not publishable artifacts. This check is
not exhaustive proof of every dynamic screen or role permission.
