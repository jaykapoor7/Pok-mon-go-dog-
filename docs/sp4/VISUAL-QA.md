# StrayPaw 4: visual QA (2026-10-31)

1 November follow-up: final hero and Explorer captures, authenticated ABC workflow results and accessibility checks are recorded in [the release handoff](RELEASE-2026-11-01.md). The original results below remain dated evidence.

Screens captured from a production build of this branch, pointed at the
**staging** database (a separate Supabase project) and signed in as the
staging test accounts. Desktop 1440×900, phone 390×844. Records are labelled
staging test or demo data; nothing here comes from production.

Screenshots: [`docs/sp4/qa/`](qa/).

| # | Screen | Who | Files |
|---|---|---|---|
| 01 | Homepage hero: StrayPaw as the platform for animal welfare programmes; ABC/ARV named as the first product | public | `01-homepage-hero-*` |
| 02 | Homepage product demo (scripted, labelled "Product demo · illustrative records") | public | `02-homepage-product-demo-*` |
| 03 | Sign-in (after the authorised-use notice), "What's new" panel | public | `03-sign-in-*` |
| 04 | Pricing (no invented prices) | public | `04-pricing-*` |
| 05 | NGO home, coordinator: records ready for review first | coordinator | `05-ngo-home-coordinator-*` |
| 06 | NGO home, veterinarian: procedures to authorise first; short sidebar | veterinarian | `06-ngo-home-veterinarian-*` |
| 07 | Verification queue by stage, evidence progress | coordinator | `07-ngo-verification-queue-*` |
| 08 | ABC case: complete evidence, vet authorised, approve or return | coordinator | `08-ngo-case-coordinator-review-*` |
| 09 | ABC case: veterinarian authorises (only action shown to a vet) | veterinarian | `09-ngo-case-vet-authorise-*` |
| 10 | Report packages: prepare, list, status | coordinator | `10-ngo-report-packages-*` |
| 11 | Animals register in the shared page system | coordinator | `11-ngo-animals-*` |
| 12 | StrayPaw AI (record tools; no model configured on staging) | coordinator | `12-straypaw-ai-*` |
| 13 | Municipal package inbox: Package review first in the sidebar | municipal reviewer | `13-municipal-package-inbox-*` |
| 14 | Municipal package review: records, evidence, signers, query/accept/return | municipal reviewer | `14-municipal-package-review-*` |
| 15 | Municipal overview (findings) | municipal reviewer | `15-municipal-overview-*` |

## Sidebar by role (2026-11: six places, screens as tabs)

| Role | Sidebar | Tabs inside |
|---|---|---|
| Lead / admin | Home, Work queue, Animals, Programmes, Reports, Team & settings · Kaju | Work queue · Inbox · Field mode / Register · Map / Programmes · Verification / Report packages · Reports & proof / Team · Settings · Connections |
| Coordinator | Home, Work queue, Animals, Programmes, Reports · Kaju | as above, without Team |
| Veterinarian | Home, Animals, Programmes (opens Verification) · Kaju | Programmes · Verification |
| Field staff | Home, Work queue, Animals, Programmes · Kaju | Work queue · Inbox · Field mode |
| Municipal reviewer | Package review, Overview · Programmes, Reports, Map · Kaju | — |

## Checked on every screen

* One shell: organisation, Quick actions, everyday places, coloured modules,
  Platform, More, quick-navigation hint, settings, help, account.
* Same page head (28px title, grey summary, actions right), 34px controls,
  8px corners, blue as the one primary colour, flame only for urgency, no
  cream bands, hairline rules, plain ground.
* Phone: thumb bar, no horizontal overflow, long titles truncate or wrap,
  16px inputs (no zoom on focus).
* Honesty labels: product demo, "WhatsApp not connected", "not switched on"
  where a workflow is not installed, research archives and historical
  imports kept out of verification and verified figures.
* Reduced motion: the hero demo shows a static frame; brief and lists do not
  animate.

## Gaps found and fixed in this pass

* Verification headers stacked oddly (page-head styles not loaded): fixed.
* Long case codes squeezed beside detail titles: moved under the title as a
  short tag.
* "1 records": plural fixed.
* StrayPaw AI suggestion chips and proposal cards were cream: neutral now
  (shared `--s3-sunk` token).
* Home brief showed a raw email for an assignee with no display name: shows
  the name part only.

## Known limits

* The staging preview has no language model configured, so StrayPaw AI runs
  its record tools only (it says so under the composer).
* WhatsApp intake is built but not connected; every mention says so.

## 1 November continuation

New baseline guest route checks and Explorer desktop/phone captures are in [the continuation report](CONTINUATION-2026-11-01.md). They do not repeat the authenticated role proofs above. The supplied Explorer reference now controls the shared artwork; full articulated motion remains unfinished.
