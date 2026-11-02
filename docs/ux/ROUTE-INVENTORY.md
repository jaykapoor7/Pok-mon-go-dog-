# Canonical route and feature inventory

Every existing deep link is retained. Visibility is not authorisation: server checks and RLS remain authoritative. “Existing” below means inspected implementation, not an authenticated pass. See OPERATIONS-UPGRADE.md and PR evidence for actual results.

| Workspace | Feature / purpose | Route | Discovery role | Parent workflow | Status |
|---|---|---|---|---|---|
| ngo | Working zones & assignments | /ngo/programmes/zones | workspace entry | Programmes | New; staging QA |
| community | Map | /community | workspace entry | Explore | Existing; retained |
| community | Report an animal | /community/report | workspace entry | Explore | Existing; retained |
| community | My activity | /community/activity | workspace entry | Explore | Existing; retained |
| community | Stories | /community/stories | workspace entry | Explore | Existing; retained |
| community | Organisations | /community/organisations | workspace entry | Explore | Existing; retained |
| community | Fundraisers | /fundraisers | workspace entry | Explore | Existing; retained |
| community | Kaju | /assistant | workspace entry | Platform | Existing; retained |
| community | If an animal needs help | /community/help | workspace entry | Help | Existing; retained |
| community | Feeding spots | /community/feeding | workspace entry | Help | Existing; retained |
| ngo | Today | /ngo | workspace entry | Today | Existing; retained |
| ngo | Work queue | /ngo/work | workspace entry | Work | Existing; retained |
| ngo | Animals | /ngo/animals | workspace entry | Animals | Existing; retained |
| ngo | Programmes | /ngo/programmes | workspace entry | Programmes | Existing; retained |
| ngo | Reports | /ngo/packages | admin, coordinator | Reports | Existing; retained |
| ngo | Team & settings | /ngo/team | admin | Organisation | Existing; retained |
| ngo | Kaju | /assistant | workspace entry | Platform | Existing; retained |
| ngo | Import your register | /ngo/import | admin | Animals | Existing; retained |
| ngo | Inbox & triage | /ngo/inbox | admin, coordinator | Work | Existing; retained |
| ngo | Field mode | /ngo/field | workspace entry | Work | Existing; retained |
| ngo | Historical review | /ngo/review | admin, coordinator | Animals | Existing; retained |
| ngo | Data quality | /ngo/quality | admin, coordinator | Animals | Existing; retained |
| ngo | Reports & proof | /ngo/proof | admin, coordinator | Reports | Existing; retained |
| ngo | Care ledger | /ngo/care | workspace entry | Animals | Existing; retained |
| ngo | Evidence files | /ngo/evidence | workspace entry | Reports | Existing; retained |
| ngo | Publish case stories | /ngo/stories | admin | Outreach | Existing; retained |
| ngo | Fundraising | /ngo/fundraising | admin | Outreach | Existing; retained |
| ngo | Volunteer sign-ups | /ngo/volunteers | admin | Organisation | Existing; retained |
| ngo | Feeding spots | /ngo/feeding | workspace entry | Programmes | Existing; retained |
| ngo | Projects | /ngo/projects | workspace entry | Programmes | Existing; retained |
| ngo | Surveys & census | /ngo/surveys | workspace entry | Programmes | Existing; retained |
| ngo | Settings | /ngo/settings | admin | Organisation | Existing; retained |
| ngo | New case | /ngo/cases/new | workspace entry | Work | Existing; retained |
| ngo | Connections | /ngo/settings/connections | admin | Organisation | Existing; retained |
| city | Package review | /city/review | reviewing office | Verification | Existing; retained |
| city | Overview | /city/insights | workspace entry | Overview | Existing; retained |
| city | Programmes | /city/programmes | workspace entry | Overview | Existing; retained |
| city | Reports | /city/report | workspace entry | Reports | Existing; retained |
| city | Wards & map | /city | workspace entry | Wards | Existing; retained |
| city | Kaju | /assistant | workspace entry | Overview | Existing; retained |
| city | Data governance | /data-governance | workspace entry | Overview | Existing; retained |
| city | Research standards | /research-standards | workspace entry | Overview | Existing; retained |
| learn | Learn | /learn | workspace entry | Explore | Existing; retained |
| learn | Workshops | /learn/workshops | workspace entry | Modules | Existing; retained |
| learn | Resources | /learn/resources | workspace entry | Explore | Existing; retained |
| learn | Playground | /learn/playground | workspace entry | Explore | Existing; retained |
| learn | Kaju | /assistant | workspace entry | Platform | Existing; retained |
| learn | Education at StrayPaw | /education | workspace entry | Explore | Existing; retained |

## Retained dynamic and supporting route files

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
