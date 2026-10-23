# `public_*` views are SECURITY DEFINER, on purpose for now

Supabase lint 0010 flags these 18 views as `security_definer`:

```
adoptable_animals            feeding_zone_public             public_case_stories
feeding_zone_checkin_public  feeding_zone_volunteer_public   public_comments
public_animal_profiles       public_care_facts               public_feed_events
public_case_facts            public_field_activity           public_live_sightings
public_programme_cards       public_sighting_facts           public_spatial_animals
public_sterilisations        public_vaccinations             published_surveys
```

They are owned by `postgres` and have no `security_invoker` option, so they
read base tables with the owner's privileges. That is intentional: each view
projects a hand-filtered, safe public subset (no reporter identity, no exact
coordinates when a case is open, no sensitive photo URLs), and the base
tables (`dogs`, `cases`, `medical_events`, `sightings`, ...) grant `SELECT`
to `anon` only through these views, never directly.

## Why we have NOT flipped these to `SECURITY INVOKER`

Attempted on 2026-10-23 in migration
`public_views_use_security_invoker` and reverted in the same session via
`revert_public_views_to_security_definer`.

With `security_invoker = true`, each view runs as the calling role (anon on
the public site). Anon has no `GRANT SELECT` on the base tables, so
`SELECT * FROM public_animal_profiles` immediately returned
`permission denied for table dogs`.

The whole public map, the register card on the landing and `/animal/[id]`
read through these views as `anon`, so this would be an outage.

## What the proper fix looks like

For every base table a `public_*` view reads, do **both**:

1. `GRANT SELECT (col1, col2, …) ON TABLE … TO anon;` on just the columns the
   view projects. Never a table-wide grant.
2. Add a Row-Level Security policy that returns exactly the rows the view's
   `WHERE` filters currently return.

Then re-apply `SET (security_invoker = true)` on the view and verify anon
counts match the pre-change baseline (recorded 2026-10-23):

```
public_animal_profiles  30288
public_care_facts       22528
public_case_stories     23200
public_field_activity   45722
public_spatial_animals  30288
public_live_sightings       65
public_sighting_facts       65
public_case_facts         2285
public_programme_cards       7
```

Zero-row views today (`adoptable_animals`, `public_comments`,
`public_feed_events`, `public_sterilisations`, `public_vaccinations`,
`published_surveys`, `feeding_zone_*`) still need the same work so the view
layer isn't silently masking a missing policy later.

This is deliberate work, not a one-shot migration. Owning it needs:
- `psql` access to a project with a copy of production data
- A read-only harness that queries each public endpoint
- Policies drafted per table, reviewed, and shipped one table at a time
