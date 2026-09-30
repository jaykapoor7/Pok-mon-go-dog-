-- Post-recovery hardening (applied to production 2026-09-30).
--
-- Additive and idempotent. Companion to supabase/final-site-recovery.sql.
-- Recorded here so the production database state is reproducible from the repo.
-- These were applied as tracked Supabase migrations:
--   20260930233709 fix_rebuild_spatial_city_case_care_aggregation
--   20260930234005 add_covering_indexes_for_foreign_keys
--   20260930234040 rls_initplan_wrap_auth_uid_in_select
--   20260930234215 recovery_public_read_indexes_and_org_impacts
--
-- Root cause fixed: the deployed rebuild_spatial_city() (see final-site-recovery.sql)
-- had never been applied to the live database, so spatial_city_cells carried
-- animals/sterilised/vaccinated but cases=0 and care_events=0 for every city.
-- The canonical, animal-anchored case/care aggregation now matches raw data
-- (30,308 animals / 23,195 cases / 22,527 care events across 492 cells).

-- 1) Covering indexes for foreign keys flagged by the performance advisor.
--    These back the care/sterilisation/vaccination/case joins and the import
--    and case-story lookups that otherwise sequentially scan.
create index if not exists animal_timeline_events_followup_id_idx on public.animal_timeline_events (followup_id);
create index if not exists animal_timeline_events_ngo_id_idx on public.animal_timeline_events (ngo_id);
create index if not exists case_stories_case_id_idx on public.case_stories (case_id);
create index if not exists case_stories_dog_id_idx on public.case_stories (dog_id);
create index if not exists case_stories_ngo_id_idx on public.case_stories (ngo_id);
create index if not exists comments_dog_id_idx on public.comments (dog_id);
create index if not exists evidence_items_case_id_idx on public.evidence_items (case_id);
create index if not exists evidence_items_dog_id_idx on public.evidence_items (dog_id);
create index if not exists evidence_reviews_evidence_id_idx on public.evidence_reviews (evidence_id);
create index if not exists feed_events_dog_id_idx on public.feed_events (dog_id);
create index if not exists import_rows_imported_case_id_idx on public.import_rows (imported_case_id);
create index if not exists import_rows_imported_dog_id_idx on public.import_rows (imported_dog_id);
create index if not exists import_rows_imported_sighting_id_idx on public.import_rows (imported_sighting_id);
create index if not exists import_rows_matched_dog_id_idx on public.import_rows (matched_dog_id);
create index if not exists sightings_invite_code_id_idx on public.sightings (invite_code_id);
create index if not exists sterilisations_dog_id_idx on public.sterilisations (dog_id);
create index if not exists vaccinations_dog_id_idx on public.vaccinations (dog_id);

-- 2) RLS init-plan: evaluate auth.uid() once per query, not once per row.
--    Semantics are identical; this only removes the per-row re-evaluation.
alter policy sightings_own_read on public.sightings using (user_id = (select auth.uid()));
alter policy volunteers_self_read on public.volunteers using (id = (select auth.uid()));
alter policy ngo_members_self on public.ngo_members using (user_id = (select auth.uid()));
alter policy partner_requests_own_read on public.partner_requests using (user_id = (select auth.uid()));

-- 3) The remaining bounded public-read indexes and the org-impact rollup from
--    final-site-recovery.sql that had not been applied to the live database.
--    (rebuild_spatial_city() itself is defined in final-site-recovery.sql.)
create index if not exists cases_public_story_order_idx
  on public.cases ((coalesce(source_event_at, created_at)) desc, id desc)
  where dog_id is not null and not coalesce(is_demo, false);
create index if not exists cases_dog_event_idx
  on public.cases (dog_id, (coalesce(source_event_at, created_at)) desc)
  where dog_id is not null;
create index if not exists animal_followups_case_status_idx
  on public.animal_followups (case_id, status);
create index if not exists sightings_dog_created_idx
  on public.sightings (dog_id, created_at desc)
  where dog_id is not null;
create index if not exists cases_ngo_status_class_idx
  on public.cases (ngo_id, status_class)
  where ngo_id is not null and not coalesce(is_demo, false);
create index if not exists dogs_public_help_recent_idx
  on public.dogs (last_seen desc)
  where needs_help;
create index if not exists dogs_public_sightings_rank_idx
  on public.dogs (sightings_count desc nulls last, id);
create index if not exists dogs_public_photo_recent_idx
  on public.dogs (last_seen desc)
  where cover_photo is not null;

-- 4) After deploying, drain the refresh queue so every imported city rollup
--    carries cases/care (safe controlled admin op; never a visitor path):
--    select public.rebuild_spatial_city(city) for each distinct public dog city.
