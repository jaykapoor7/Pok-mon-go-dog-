-- Security hardening from the database linter (2026-11-07).
-- 1. Pin search_path on functions that had none (lint 0011), so a caller
--    cannot change which objects they resolve.
-- 2. Signed-out visitors no longer execute organisation-only functions
--    (lint 0028). Each already returns nothing without a session; this
--    removes the door entirely. Functions used by policies that apply to
--    the anonymous role (careos_record_access, is_member_of_ngo) and the
--    public map, code-resolution and analytics functions keep anon access.
-- Additive and reversible: GRANT EXECUTE ... TO anon restores any of them.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY['haversine_m','get_city_stats','dogs_near','sync_dog_status_booleans','generate_invite_code','assign_straypaw_id','assign_case_code','generate_code6','ward_area_km2','ward_density','ward_at','ward_density_geojson','ward_coverage','ward_cities','sp_sightings_place','sp_condition_class','sp_status_class','sp_closure_reason','sp_intake_channel','sp_first_action_at'])
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', r.sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY['get_precise_locations','is_ngo_member','list_org_cases','my_invite_codes','my_ngo','my_org_members','my_profile','org_animals','org_campaigns','org_incoming','org_nearby_community_sightings','org_programme_breakdown','org_programme_stats','org_reporting_volunteers','org_reports','org_team_codes','org_zones'])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;
