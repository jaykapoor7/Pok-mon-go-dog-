# Proposed: package period by procedure date (not applied)

`abc_create_package` selects cases by `cases.created_at`. A procedure recorded
early in a month for a case opened late in the previous month is therefore
claimed in the earlier month. Kaju's monthly forecast deliberately uses the
same rule so it predicts exactly what the package will contain.

Proposal: select by the date of the authorised procedure (the vet-authorised
medical event for the case), falling back to `created_at` only when no event
date exists, and change `src/sp3/ai/monthly.ts` in the same release. This is a
reviewed migration for after PR #48's migrations are installed; it must not be
applied to production without approval and a confirmed recovery point.
