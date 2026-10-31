# StrayPaw 4: visual QA (2026-10-31)

Screens captured from a production build of this branch, pointed at the
**staging** database (a separate Supabase project) and signed in as the
staging test accounts. Desktop 1440×900, phone 390×844. Records are labelled
staging test or demo data; nothing here comes from production.

Screenshots: [`docs/sp4/qa/`](qa/).

| # | Screen | Who | Files |
|---|---|---|---|
| 01 | Homepage hero: StrayPaw as the platform for animal welfare programmes; ABC/ARV named as the first product | public | `01-homepage-hero-{desktop,mobile}.png` |
| 02 | Homepage product demo (scripted, labelled "Product demo · illustrative records") | public | `02-homepage-product-demo-*` |
| 03 | Sign-in (after the authorised-use notice), "What's new" panel | public | `03-sign-in-*` |
| 04 | Pricing (no invented prices) | public | `04-pricing-*` |
| 05 | NGO home: daily brief from real counts | coordinator | `05-ngo-home-daily-brief-*` |
| 06 | Verification queue by stage, evidence progress | coordinator | `06-ngo-verification-queue-*` |
| 07 | ABC case: complete evidence, vet authorised, approve or return | coordinator | `07-ngo-case-coordinator-review-*` |
| 08 | ABC case: veterinarian authorises (only action shown to a vet) | veterinarian | `08-ngo-case-vet-authorise-*` |
| 09 | Report packages: prepare, list, status | coordinator | `09-ngo-report-packages-*` |
| 10 | Animals register in the shared page system | coordinator | `10-ngo-animals-*` |
| 11 | StrayPaw AI (record tools; no model configured on staging) | coordinator | `11-straypaw-ai-*` |
| 12 | Municipal package inbox: waiting for review | municipal reviewer | `12-municipal-package-inbox-*` |
| 13 | Municipal package review: records, evidence, signers, query/accept/return | municipal reviewer | `13-municipal-package-review-*` |
| 14 | Municipal overview (findings) | municipal reviewer | `14-municipal-overview-*` |

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
