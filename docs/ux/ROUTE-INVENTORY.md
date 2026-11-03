# Canonical feature inventory

Every existing deep link is retained. Visibility does not grant access; server checks and RLS remain authoritative. Functional results are in OPERATIONS-UPGRADE.md and the PR. Existing retained means implementation inspected, not every button certified.

| Workspace | Feature / purpose | Route | Discovery role | Parent workflow | Implementation |
|---|---|---|---|---|---|
| city | Connections | /city/connections | reviewing office | Organisation | Retained; see journey evidence |
| ngo | Animal & field map | /ngo/map | workspace entry | Animals | Retained; staging browser-tested |
| ngo | ABC evidence & authorisation | /ngo/verification | workspace entry | Reports | Retained; see journey evidence |
| ngo | Working zones & assignments | /ngo/programmes/zones | workspace entry | Programmes | New; staging-tested |
| community | Map | /community | workspace entry | Explore | Retained; see journey evidence |
| community | Report an animal | /community/report | workspace entry | Explore | Retained; see journey evidence |
| community | My activity | /community/activity | workspace entry | Explore | Retained; see journey evidence |
| community | Stories | /community/stories | workspace entry | Explore | Retained; see journey evidence |
| community | Organisations | /community/organisations | workspace entry | Explore | Retained; see journey evidence |
| community | Fundraisers | /fundraisers | workspace entry | Explore | Retained; see journey evidence |
| community | Kaju | /assistant | workspace entry | Platform | Retained; see journey evidence |
| community | If an animal needs help | /community/help | workspace entry | Help | Retained; see journey evidence |
| community | Feeding spots | /community/feeding | workspace entry | Help | Retained; see journey evidence |
| ngo | Today | /ngo | workspace entry | Today | Retained; see journey evidence |
| ngo | Work queue | /ngo/work | workspace entry | Work | Retained; see journey evidence |
| ngo | Animals | /ngo/animals | workspace entry | Animals | Retained; see journey evidence |
| ngo | Programmes | /ngo/programmes | workspace entry | Programmes | Retained; see journey evidence |
| ngo | Reports | /ngo/packages | admin, coordinator | Reports | Retained; see journey evidence |
| ngo | Team & access | /ngo/team | admin | Organisation | Retained; see journey evidence |
| ngo | Kaju | /assistant | workspace entry | Platform | Retained; see journey evidence |
| ngo | Import your register | /ngo/import | admin | Animals | Retained; see journey evidence |
| ngo | Inbox & triage | /ngo/inbox | admin, coordinator | Work | Retained; see journey evidence |
| ngo | Field mode | /ngo/field | workspace entry | Work | Retained; see journey evidence |
| ngo | Historical review | /ngo/review | admin, coordinator | Animals | Retained; see journey evidence |
| ngo | Data quality | /ngo/quality | admin, coordinator | Animals | Retained; see journey evidence |
| ngo | Reports & proof | /ngo/proof | admin, coordinator | Reports | Retained; see journey evidence |
| ngo | Care ledger | /ngo/care | workspace entry | Animals | Retained; see journey evidence |
| ngo | Evidence files | /ngo/evidence | workspace entry | Reports | Retained; see journey evidence |
| ngo | Publish case stories | /ngo/stories | admin | Outreach | Retained; see journey evidence |
| ngo | Fundraising | /ngo/fundraising | admin | Outreach | Retained; see journey evidence |
| ngo | Volunteer sign-ups | /ngo/volunteers | admin | Organisation | Retained; see journey evidence |
| ngo | Feeding spots | /ngo/feeding | workspace entry | Programmes | Retained; see journey evidence |
| ngo | Projects | /ngo/projects | workspace entry | Programmes | Retained; see journey evidence |
| ngo | Surveys & census | /ngo/surveys | workspace entry | Programmes | Retained; see journey evidence |
| ngo | Settings | /ngo/settings | admin | Organisation | Retained; see journey evidence |
| ngo | New case | /ngo/cases/new | workspace entry | Work | Retained; see journey evidence |
| ngo | Connections | /ngo/settings/connections | admin | Organisation | Retained; see journey evidence |
| city | Package review | /city/review | reviewing office | Verification | Retained; see journey evidence |
| city | Overview | /city/insights | workspace entry | Overview | Retained; see journey evidence |
| city | Programmes | /city/programmes | workspace entry | Overview | Retained; see journey evidence |
| city | Reports | /city/report | workspace entry | Reports | Retained; see journey evidence |
| city | Wards & map | /city | workspace entry | Wards | Retained; see journey evidence |
| city | Kaju | /assistant | workspace entry | Overview | Retained; see journey evidence |
| city | Data governance | /data-governance | workspace entry | Overview | Retained; see journey evidence |
| city | Research standards | /research-standards | workspace entry | Overview | Retained; see journey evidence |
| learn | Learn | /learn | workspace entry | Explore | Retained; see journey evidence |
| learn | Workshops | /learn/workshops | workspace entry | Modules | Retained; see journey evidence |
| learn | Resources | /learn/resources | workspace entry | Explore | Retained; see journey evidence |
| learn | Playground | /learn/playground | workspace entry | Explore | Retained; see journey evidence |
| learn | Kaju | /assistant | workspace entry | Platform | Retained; see journey evidence |
| learn | Education at StrayPaw | /education | workspace entry | Explore | Retained; see journey evidence |

## Retained dynamic and supporting pages

- src/app/city/connections/page.tsx
- src/app/city/insights/page.tsx
- src/app/city/page.tsx
- src/app/city/programmes/[id]/page.tsx
- src/app/city/programmes/page.tsx
- src/app/city/report/page.tsx
- src/app/city/review/[id]/page.tsx
- src/app/city/review/page.tsx
- src/app/community/activity/page.tsx
- src/app/community/feeding/[id]/page.tsx
- src/app/community/feeding/page.tsx
- src/app/community/help/page.tsx
- src/app/community/organisations/[slug]/page.tsx
- src/app/community/organisations/page.tsx
- src/app/community/page.tsx
- src/app/community/report/page.tsx
- src/app/community/stories/page.tsx
- src/app/learn/courses/[course]/[lesson]/page.tsx
- src/app/learn/courses/[course]/page.tsx
- src/app/learn/courses/page.tsx
- src/app/learn/page.tsx
- src/app/learn/playground/page.tsx
- src/app/learn/resources/page.tsx
- src/app/learn/workshops/page.tsx
- src/app/ngo/animals/[id]/page.tsx
- src/app/ngo/animals/page.tsx
- src/app/ngo/care/page.tsx
- src/app/ngo/cases/[id]/page.tsx
- src/app/ngo/cases/new/page.tsx
- src/app/ngo/evidence/page.tsx
- src/app/ngo/feeding/page.tsx
- src/app/ngo/field/page.tsx
- src/app/ngo/fundraising/new/page.tsx
- src/app/ngo/fundraising/page.tsx
- src/app/ngo/import/page.tsx
- src/app/ngo/inbox/page.tsx
- src/app/ngo/map/page.tsx
- src/app/ngo/packages/[id]/page.tsx
- src/app/ngo/packages/page.tsx
- src/app/ngo/page.tsx
- src/app/ngo/programmes/[id]/page.tsx
- src/app/ngo/programmes/page.tsx
- src/app/ngo/programmes/zones/page.tsx
- src/app/ngo/projects/page.tsx
- src/app/ngo/proof/page.tsx
- src/app/ngo/quality/page.tsx
- src/app/ngo/review/page.tsx
- src/app/ngo/settings/connections/page.tsx
- src/app/ngo/settings/page.tsx
- src/app/ngo/stories/page.tsx
- src/app/ngo/surveys/page.tsx
- src/app/ngo/team/page.tsx
- src/app/ngo/verification/[id]/page.tsx
- src/app/ngo/verification/page.tsx
- src/app/ngo/volunteers/page.tsx
- src/app/ngo/work/page.tsx


November 3 retained operational destinations (existing deep links remain):

| Destination | Role / placement | Functional evidence |
|---|---|---|
| `/ngo/animals/identity` | Admin/coordinator; Animals section | Real coordinator provisional identity decision and source/audit readback |
| `/ngo/settings/policies` | Admin/coordinator; organisation utilities | Real browser save of immutable source-backed policy version |
| `/ngo/contracts` | Admin/coordinator; Reports section | Real browser configuration, explicit claims, partial municipal review and native exports |
| `/city/contracts` | Authorised office reviewer; Contracts primary destination | Same audited configuration backend with receiving-office scope; illustrative API configuration tested |
| `/ngo/programmes/zones` | Organisation member; Programmes section | Boundary/assignment/supervisor workflow plus geographic and separately reviewed survey reporting |
| `/surveys/[id]/collect` | Owning organisation member | Encrypted phone photo/GPS/note draft, Field-mode recovery and duplicate-safe private-photo submission |
