-- Non-destructive security hardening. No customer rows are changed.
-- Public read projections remain readable; operational writes require identity.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON public.connection_secrets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_comment(p_dog_id uuid, p_body text, p_reporter_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in to record this action' using errcode = '42501'; end if;
  if not exists (select 1 from public.dogs d where d.id=p_dog_id and d.species='dog' and (not coalesce(d.is_demo,false) or d.ngo_id=public.my_ngo())) then
    raise exception 'This dog record is unavailable.';
  end if;
  if p_body is null or btrim(p_body)='' then raise exception 'A comment needs some text.'; end if;
  if not public.check_rate_limit(p_dog_id::text,'add_comment',10,600) then
    raise exception 'Too many comments on this dog just now. Please try again shortly.';
  end if;
  insert into public.comments(dog_id,reporter_name,body) values(p_dog_id,p_reporter_name,p_body);
end $function$;

CREATE OR REPLACE FUNCTION public.create_feeding_zone(p_name text, p_description text DEFAULT NULL::text, p_zone text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_photo_url text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_id uuid; v_actor uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to record this action' using errcode = '42501'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'A name is required.'; end if;
  if p_lat is null or p_lng is null then raise exception 'A location is required.'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Coordinates are outside the valid range';
  end if;
  v_actor := auth.uid();
  if p_actor_id is not null and v_actor is not null and p_actor_id <> v_actor then
    raise exception 'Actor does not match signed-in user';
  end if;
  insert into feeding_zones (
    name, description, zone, lat, lng, photo_url, created_by_id, created_by_name
  ) values (
    btrim(p_name), nullif(btrim(coalesce(p_description,'')), ''),
    nullif(btrim(coalesce(p_zone,'')), ''), p_lat, p_lng, p_photo_url,
    v_actor, nullif(btrim(coalesce(p_actor_name,'')), '')
  ) returning id into v_id;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.like_sighting(p_sighting_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in to record this action' using errcode = '42501'; end if;
  if not check_rate_limit(p_sighting_id::text, 'like_sighting', 30, 60) then
    return;
  end if;
  update sightings set likes = likes + 1 where id = p_sighting_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_feed(p_dog_id uuid, p_reporter_name text DEFAULT NULL::text, p_food_type text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then raise exception 'Sign in to record this action' using errcode = '42501'; end if;
  if not exists (select 1 from public.dogs d where d.id=p_dog_id and d.species='dog' and (not coalesce(d.is_demo,false) or d.ngo_id=public.my_ngo())) then
    raise exception 'This dog record is unavailable.';
  end if;
  if not public.check_rate_limit(p_dog_id::text,'log_feed',10,600) then
    raise exception 'Too many meals on this dog just now. Please try again shortly.';
  end if;
  insert into public.feed_events(dog_id,reporter_name,food_type) values(p_dog_id,p_reporter_name,p_food_type);
  update public.dogs set feed_count=coalesce(feed_count,0)+1,last_fed_at=now(),last_seen=now() where id=p_dog_id;
end $function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_bucket text,p_action text,p_max integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE cnt bigint;
BEGIN
  IF p_bucket IS NULL OR btrim(p_bucket)='' OR length(p_bucket)>200 OR p_action IS NULL OR btrim(p_action)='' OR length(p_action)>80 OR p_max IS NULL OR p_max NOT BETWEEN 1 AND 10000 OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_bucket, 0));
  SELECT count(*) INTO cnt FROM public.rate_limits WHERE bucket=p_bucket AND action=p_action AND created_at > now()-make_interval(secs=>p_window_seconds);
  IF cnt>=p_max THEN RETURN false; END IF;
  INSERT INTO public.rate_limits(bucket,action) VALUES(p_bucket,p_action);
  RETURN true;
END $fn$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer) TO service_role;

DO $hardening$
DECLARE f record; v record;
BEGIN
  FOR f IN SELECT p.oid,p.proname,p.prorettype FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef LOOP
    IF f.prorettype='trigger'::regtype OR left(f.proname,6)='admin_' OR f.proname IN ('approve_partner_request','reject_partner_request','approve_sighting','reject_sighting','delete_sighting','mint_access_code','recount_animal_sightings') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.oid::regprocedure);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.oid::regprocedure);
    ELSIF f.proname IN ('add_comment','create_feeding_zone','like_sighting','log_feed','log_seen','add_case_note','add_medical_event','archive_campaign','assign_case','claim_case','claim_org_membership','clear_demo_data','create_animal','create_campaign','create_case','create_invite_code','create_team_code','delete_my_sighting','file_sightings_to_campaign','ngo_update_profile','redeem_access_code','register_org_animal','relink_sighting','remove_org_member','request_partner_access','revoke_invite_code','revoke_team_code','set_animal_owner','set_animal_programme_status','set_case_followup','set_case_intake','set_demo_mode','update_animal','update_campaign','update_dog_status','update_my_sighting','upsert_volunteer','verify_case','volunteer_for_feeding_zone','withdraw_feeding_volunteer') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',f.oid::regprocedure);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',f.oid::regprocedure);
    ELSIF f.proname IN ('report_sighting','report_sighting_for_org') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.oid::regprocedure);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.oid::regprocedure);
    END IF;
  END LOOP;
  FOR v IN SELECT c.oid,c.relname FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='v' AND (left(c.relname,7)='public_' OR c.relname IN ('feeding_zone_public','feeding_zone_volunteer_public','feeding_zone_checkin_public','published_surveys','adoptable_animals')) LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon, authenticated',v.relname);
    EXECUTE format('ALTER VIEW public.%I SET (security_barrier=true)',v.relname);
  END LOOP;
END $hardening$;

CREATE TABLE IF NOT EXISTS public.rate_limits (id bigserial PRIMARY KEY,bucket text NOT NULL,action text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS rate_limits_lookup_idx ON public.rate_limits(bucket,action,created_at DESC);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM anon, authenticated;
