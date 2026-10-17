# StrayPaw 2.0 — permissions

2.0 changes no database permission. Hiding a button is never the guard: every
read of private data runs under the signed-in member's own session (row-level
security), and every write goes through an existing SECURITY DEFINER RPC or
server route that checks membership and role itself.

## Actors and what 2.0 lets them attempt

| Actor | Public pages | NGO workspace | Trust |
|---|---|---|---|
| Visitor (signed out) | Atlas, animal records, stories, organisations, programmes, insights, Academy, help; report a sighting or needs-help (anonymous, device-keyed) | Explanation page only (`NgoGate`), no private rows requested | Password gate |
| Signed-in resident | Same, plus reports on their account; follows stay on the device | Explanation: not a member | Password gate |
| Organisation member | Same | Queue, cases, animals, casefile, map (`scope=org`), inbox, review, field, programmes, proof, import, settings | — |
| Organisation lead (`admin`/`lead`) | Same | Plus team: add people, change roles, revoke codes, remove members | — |
| Moderator | Same | — | Review queue and console, password checked server-side on every request |

The membership the Shell shows (`useMembership`) is display only; the database
refuses rows to non-members either way.

## Server-side checks relied on (unchanged)

- `cases`, `org_case_facts`, `animal_followups`, `medical_events`, `dogs` (org columns): RLS scoped to `my_ngo()`.
- RPCs: `take_case`, `assign_case`, `update_case_status`, `add_case_note`, `add_case_followup`, `update_case_followup_status`, `review_case`, `create_case_with_location`, `add_medical_event`, `ngo_set_dog_care`, `org_animals`, `org_incoming`, `file_sightings_to_campaign`, `create_campaign`, `archive_campaign`, `set_member_role`, `remove_org_member`, `revoke_team_code`, `ngo_update_profile`, feeding-zone functions.
- Routes: `/api/livingmap?scope=org` (bearer token), `/api/partner/import`, `/api/partner/export` and siblings, `/api/team/invite`, `/api/admin/*` (admin secret).

## Not built (needs backend)

Temporary grants with expiry, cross-organisation access requests, explicit
offer/acceptance ledger, auditable handoffs between staff/clinic/volunteer,
progressive NGO verification tiers. 2.0 shows none of these as working.

## Test matrix

| Check | How | Result |
|---|---|---|
| Signed-out NGO page requests no private rows | e2e `the NGO workspace explains itself when signed out` | pass (see acceptance) |
| Member writes reach only the RPCs | local harness records every write; any unmocked non-GET is blocked | pass |
| Moderation needs the password | harness: wrong password → 401 shown | pass |
| Casefile for an animal another organisation holds | page reads `dogs` with `ngo_id = my_ngo()`; no row → "Not in your register" | built; not tested against real RLS |

Real RLS was **not** exercised against production in this work, by design (no
production access was used). It should be run against a staging project before
release.
