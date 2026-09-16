-- ════════════════════════════════════════════════════════════════════
-- StrayPaw security hardening: fail closed, publish deliberate projections.
--
-- This migration is intentionally idempotent. It first enables RLS on every
-- *actual* base table in public (not only the tables a migration remembers),
-- then restores the product's public surfaces as narrow, safe views. Internal
-- NGO records continue to use organisation-scoped policies and protected APIs.
-- ════════════════════════════════════════════════════════════════════

-- Security Advisor reports against the live catalog, so do the same here.
-- A table added outside this repository becomes RLS-protected instead of
-- silently remaining world-readable. Views and extension schemas are ignored.
do $$
declare r record;
begin
  for r in
    select c.relname
     from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       -- PostGIS's spatial_ref_sys is extension-owned metadata. It is not a
       -- StrayPaw/client table and the application role must not alter it.
       and not exists (
         select 1 from pg_depend d
         join pg_extension e on e.oid = d.refobjid
         where d.classid = 'pg_class'::regclass and d.objid = c.oid
           and d.deptype = 'e'
       )
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

-- Stable membership helpers. Both read the authenticated identity from the
-- JWT; clients never supply an organisation or owner field for authorisation.
create or replace function my_ngo()
returns uuid language sql stable security definer set search_path = public as $$
  select ngo_id from ngo_members where user_id = auth.uid() limit 1;
$$;

create or replace function is_member_of_ngo(p_ngo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_ngo is not null and exists (
    select 1 from ngo_members where user_id = auth.uid() and ngo_id = p_ngo
  );
$$;

-- Public animal data has its own projection. This makes every NGO-created
-- animal profile visible on the public map immediately, without exposing
-- internal intake notes, owner contacts, exact coordinates or staff fields.
create or replace view public_animal_profiles as
select
  d.id, d.name, d.species, d.zone,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lat::numeric, 2)::double precision end as lat,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lng::numeric, 2)::double precision end as lng,
  d.status, d.cover_photo, d.size, d.color, d.is_friendly, d.needs_help,
  d.sterilised, d.vaccinated, d.sterilisation_status, d.vaccination_status,
  d.ear_notch, d.trust_score, d.sightings_count, d.feed_count,
  d.first_seen, d.last_seen, d.last_fed_at, d.created_at, d.ngo_id, d.code,
  d.provenance, n.name as ngo_name
from dogs d left join ngos n on n.id = d.ngo_id;

create or replace view public_live_sightings as
select id, dog_id, reporter_name, photo_url,
       round(lat::numeric, 2)::double precision as lat,
       round(lng::numeric, 2)::double precision as lng,
       zone, nickname, mood_tags, notes, trust_score, likes, status, created_at
from sightings
where status = 'live';

-- Historic NGO activity is public only as a coarse, plain-language marker.
-- It has no informer data or treatment notes. Each marker can safely link to
-- the already-public native animal profile without exposing exact intake data.
create or replace view public_field_activity as
select 'case:' || c.id::text as id, c.dog_id, c.ngo_id, n.name as ngo_name,
       c.title, coalesce(c.source_event_at, c.created_at) as occurred_at,
       null::text as reporter_name,
       null::text as photo_url,
       round(c.lat::numeric, 2)::double precision as lat,
       round(c.lng::numeric, 2)::double precision as lng,
       c.zone, c.title as nickname, array['historical_ngo_record']::text[] as mood_tags,
       'Historical NGO field record'::text as notes, 70::int as trust_score,
       0::int as likes, 'live'::text as status,
       coalesce(c.source_event_at, c.created_at) as created_at
  from cases c
  left join ngos n on n.id = c.ngo_id
 where c.provenance = 'imported_historical_record'
   and c.source_event_at is not null
   and c.lat between -90 and 90 and c.lng between -180 and 180
   and not (c.lat = 0 and c.lng = 0)
union all
select 'medical:' || m.id::text as id, d.id as dog_id, d.ngo_id, n.name as ngo_name,
       'NGO ' || initcap(replace(m.kind, '_', ' ')) as title,
       m.event_date::timestamptz as occurred_at,
       null::text as reporter_name,
       null::text as photo_url,
       round(d.lat::numeric, 2)::double precision as lat,
       round(d.lng::numeric, 2)::double precision as lng,
       d.zone, 'NGO ' || initcap(replace(m.kind, '_', ' ')) as nickname,
       array['historical_ngo_record', m.kind]::text[] as mood_tags,
       'Historical NGO care record'::text as notes, 70::int as trust_score,
       0::int as likes, 'live'::text as status, m.event_date::timestamptz as created_at
  from medical_events m
  join dogs d on d.id = m.dog_id
  left join ngos n on n.id = d.ngo_id
 where m.import_batch_id is not null
   and d.provenance = 'imported_historical_record'
   and d.lat between -90 and 90 and d.lng between -180 and 180
   and not (d.lat = 0 and d.lng = 0);

create or replace view public_feed_events as
select id, dog_id, reporter_name, food_type, created_at from feed_events;
create or replace view public_vaccinations as
select id, dog_id, vaccine, administered_by, date from vaccinations;
create or replace view public_sterilisations as
select id, dog_id, status, performed_by, date from sterilisations;
create or replace view public_comments as
select id, dog_id, reporter_name, body, created_at from comments;

-- Public programme totals always reflect the work described by the programme.
alter table campaigns add column if not exists source_rows_count integer not null default 0;
create or replace view public_programme_cards as
select c.id, c.name, c.kind, c.starts_on, c.ends_on, c.zone, c.public_summary,
       n.name as ngo_name, n.slug as ngo_slug, n.city, n.state,
       coalesce(nullif(count(d.id), 0), c.source_rows_count) as animals_recorded,
       coalesce(nullif(count(d.id) filter (where d.sterilisation_status = 'sterilised'), 0),
                case when c.kind = 'sterilisation' then c.source_rows_count else 0 end) as sterilised_recorded,
       coalesce(nullif(count(d.id) filter (where d.vaccination_status = 'vaccinated'), 0),
                case when c.kind = 'vaccination' then c.source_rows_count else 0 end) as vaccinated_recorded
  from campaigns c join ngos n on n.id = c.ngo_id left join dogs d on d.campaign_id = c.id
 where c.public_visibility in ('summary', 'public') and c.archived_at is not null
 group by c.id, n.id;

grant select on public_animal_profiles, public_live_sightings,
  public_field_activity, public_feed_events, public_vaccinations, public_sterilisations, public_comments
  to anon, authenticated;

-- Base tables are never the public API. Direct reads are only for an
-- authenticated member's own organisation (or a reporter's own submission).
revoke select on dogs, sightings, cases, case_updates, medical_events,
  surveys, survey_areas, survey_responses, volunteers, import_batches,
  import_rows, animal_followups, animal_timeline_events, evidence_items,
  evidence_reviews, operational_audit_log from anon, authenticated;

-- Signed-in NGO members can still query their own rows through the policies
-- below. Anonymous/public readers must use the safe projections above.
grant select on dogs, sightings, cases, case_updates, medical_events,
  surveys, survey_areas, survey_responses, volunteers, import_batches,
  import_rows, animal_followups, animal_timeline_events, evidence_items,
  evidence_reviews, operational_audit_log to authenticated;

drop policy if exists dogs_read on dogs;
drop policy if exists dogs_public_read on dogs;
drop policy if exists dogs_org_read on dogs;
create policy dogs_org_read on dogs for select to authenticated
  using (ngo_id = my_ngo());

drop policy if exists sightings_read on sightings;
drop policy if exists sightings_own_read on sightings;
create policy sightings_own_read on sightings for select to authenticated
  using (user_id = auth.uid());

drop policy if exists cases_read on cases;
drop policy if exists cases_org_read on cases;
create policy cases_org_read on cases for select to authenticated
  using (ngo_id = my_ngo());

drop policy if exists case_updates_read on case_updates;
drop policy if exists case_updates_org_read on case_updates;
create policy case_updates_org_read on case_updates for select to authenticated
  using (exists (select 1 from cases c where c.id = case_updates.case_id and c.ngo_id = my_ngo()));

drop policy if exists volunteers_read on volunteers;
drop policy if exists volunteers_org_read on volunteers;
drop policy if exists volunteers_self_read on volunteers;
create policy volunteers_self_read on volunteers for select to authenticated
  using (id = auth.uid());

drop policy if exists medical_events_read on medical_events;
drop policy if exists medical_events_org_read on medical_events;
create policy medical_events_org_read on medical_events for select to authenticated
  using (
    exists (select 1 from dogs d where d.id = medical_events.dog_id and d.ngo_id = my_ngo())
    or exists (select 1 from cases c where c.id = medical_events.case_id and c.ngo_id = my_ngo())
  );

drop policy if exists surveys_read on surveys;
drop policy if exists surveys_org_read on surveys;
create policy surveys_org_read on surveys for select to authenticated using (ngo_id = my_ngo());
drop policy if exists survey_areas_read on survey_areas;
drop policy if exists survey_areas_org_read on survey_areas;
create policy survey_areas_org_read on survey_areas for select to authenticated
  using (exists (select 1 from surveys s where s.id = survey_areas.survey_id and s.ngo_id = my_ngo()));
drop policy if exists survey_responses_read on survey_responses;
drop policy if exists survey_responses_org_read on survey_responses;
create policy survey_responses_org_read on survey_responses for select to authenticated
  using (exists (select 1 from surveys s where s.id = survey_responses.survey_id and s.ngo_id = my_ngo()));

-- Existing pilot tables already have equivalent scoped policies; repeat the
-- rules here so a partially-run historical deployment is repaired too.
drop policy if exists import_batches_org_read on import_batches;
create policy import_batches_org_read on import_batches for select to authenticated using (ngo_id = my_ngo());
drop policy if exists import_rows_org_read on import_rows;
create policy import_rows_org_read on import_rows for select to authenticated
  using (exists (select 1 from import_batches b where b.id = import_rows.batch_id and b.ngo_id = my_ngo()));
drop policy if exists animal_followups_org_read on animal_followups;
create policy animal_followups_org_read on animal_followups for select to authenticated using (ngo_id = my_ngo());
drop policy if exists animal_timeline_events_org_read on animal_timeline_events;
create policy animal_timeline_events_org_read on animal_timeline_events for select to authenticated using (ngo_id = my_ngo());
drop policy if exists evidence_items_org_read on evidence_items;
create policy evidence_items_org_read on evidence_items for select to authenticated using (ngo_id = my_ngo());
drop policy if exists evidence_reviews_org_read on evidence_reviews;
create policy evidence_reviews_org_read on evidence_reviews for select to authenticated
  using (exists (select 1 from evidence_items e where e.id = evidence_reviews.evidence_id and e.ngo_id = my_ngo()));
drop policy if exists operational_audit_org_read on operational_audit_log;
create policy operational_audit_org_read on operational_audit_log for select to authenticated using (ngo_id = my_ngo());

-- Exact locations are available only for animals held by the caller's own
-- organisation. An NGO membership alone is not permission to inspect another
-- NGO's pins.
create or replace function get_precise_locations(p_ids uuid[])
returns table (id uuid, lat double precision, lng double precision)
language sql stable security definer set search_path = public as $$
  select d.id, d.lat, d.lng from dogs d
   where d.id = any(p_ids) and d.ngo_id = my_ngo();
$$;

-- NGO-created profiles are public immediately, but their provenance stays in
-- the private record. The uploader is stamped from auth context, never a form
-- field. Existing historical rows retain null until their source is known.
alter table dogs add column if not exists created_by_id uuid;
alter table dogs add column if not exists created_by_name text;

create or replace function create_animal(
  p_name text default null, p_species text default 'dog', p_code text default null,
  p_zone text default null, p_lat double precision default null,
  p_lng double precision default null, p_cover_photo text default null,
  p_intake_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null or auth.uid() is null then raise exception 'Not a partner organisation'; end if;
  if (p_lat is null) <> (p_lng is null) then raise exception 'Provide both latitude and longitude, or neither'; end if;
  if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then
    raise exception 'Coordinates are outside the valid range';
  end if;
  insert into dogs (name, species, zone, lat, lng, status, cover_photo, ngo_id, code,
                    intake_notes, created_by_id, created_by_name)
  values (p_name, coalesce(p_species, 'dog'), coalesce(p_zone, ''), coalesce(p_lat, 0), coalesce(p_lng, 0),
          'seen', coalesce(p_cover_photo, ''), v_ngo, p_code, p_intake_notes,
          auth.uid(), nullif(auth.jwt() ->> 'email', ''))
  returning id into v_id;
  return v_id;
end $$;

-- A case opened from an NGO workspace is already a record owned by that
-- team. It starts in progress and assigned to the signed-in uploader; there
-- is no separate StrayPaw approval state. The caller cannot provide a
-- different actor or organisation.
create or replace function create_case(
  p_title text, p_description text default null, p_dog_id uuid default null,
  p_zone text default null, p_lat float default null, p_lng float default null,
  p_severity case_severity default 'normal', p_category case_category default 'other',
  p_tags text[] default '{}', p_actor_id uuid default null, p_actor_name text default null,
  p_species text default 'dog'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid; v_name text;
begin
  if auth.uid() is null or (p_actor_id is not null and p_actor_id <> auth.uid()) then
    raise exception 'Sign in as the case uploader';
  end if;
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Organisation access required'; end if;
  if p_dog_id is not null and not exists (select 1 from dogs where id = p_dog_id and ngo_id = v_ngo) then
    raise exception 'That animal is not in your organisation';
  end if;
  v_name := coalesce(nullif(auth.jwt() ->> 'email', ''), nullif(btrim(p_actor_name), ''));
  insert into cases (dog_id, title, description, zone, lat, lng, severity, category,
                     tags, species, status, ngo_id, assignee_id, assignee_name,
                     created_by_id, created_by_name)
  values (p_dog_id, p_title, p_description, p_zone, p_lat, p_lng, p_severity,
          p_category, p_tags, coalesce(p_species, 'dog'), 'in_progress', v_ngo,
          auth.uid(), v_name, auth.uid(), v_name)
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (v_id, auth.uid(), v_name, 'created', 'in_progress', 'Case opened by organisation');
  return v_id;
end $$;

-- A report made under a valid organisation code is an organisation upload,
-- not a public sighting awaiting moderation. It immediately creates (or
-- updates) that organisation's animal record and a live map observation.
-- The service-only route resolves the code; this function still refuses to
-- attach an NGO's report to another NGO's animal.
create or replace function report_sighting_for_org(
  p_photo_url text, p_lat float, p_lng float, p_zone text, p_ngo_id uuid,
  p_code_id uuid, p_volunteer_name text, p_nickname text default null,
  p_mood_tags text[] default '{}', p_notes text default null,
  p_owner_hash text default null, p_user_id uuid default null,
  p_reporter_email text default null, p_claimed_dog_id uuid default null,
  p_sterilisation_status text default null, p_vaccination_status text default null
) returns json language plpgsql security definer set search_path = public as $$
declare v_dog uuid; v_sighting uuid; v_status dog_status := 'seen';
  v_needs_help boolean := false; v_friendly boolean := true; v_who text;
  v_ster text; v_vacc text;
begin
  v_who := nullif(btrim(coalesce(p_volunteer_name, '')), '');
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Coordinates are outside the valid range';
  end if;
  if 'injured' = any(coalesce(p_mood_tags, '{}')) then v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(coalesce(p_mood_tags, '{}')) then v_status := 'hungry'; v_needs_help := true; end if;
  v_friendly := 'friendly' = any(coalesce(p_mood_tags, '{}')) or not ('shy' = any(coalesce(p_mood_tags, '{}')));
  v_ster := case when p_sterilisation_status in ('sterilised','not_sterilised','unknown') then p_sterilisation_status else 'unknown' end;
  v_vacc := case when p_vaccination_status in ('vaccinated','not_vaccinated','unknown') then p_vaccination_status else 'unknown' end;
  if p_claimed_dog_id is not null then
    select id into v_dog from dogs where id = p_claimed_dog_id and ngo_id = p_ngo_id;
  end if;
  if v_dog is null then
    insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly, needs_help,
                      trust_score, sightings_count, first_seen, last_seen, ngo_id,
                      sterilisation_status, vaccination_status, created_by_id, created_by_name)
    values (p_nickname, p_zone, p_lat, p_lng, v_status, p_photo_url, v_friendly, v_needs_help,
            80, 1, now(), now(), p_ngo_id, v_ster, v_vacc, p_user_id, v_who)
    returning id into v_dog;
  else
    update dogs set last_seen = now(), name = coalesce(name, p_nickname),
      cover_photo = coalesce(nullif(cover_photo, ''), p_photo_url),
      status = case when v_needs_help then v_status else status end,
      needs_help = needs_help or v_needs_help,
      sterilisation_status = case when v_ster <> 'unknown' then v_ster else sterilisation_status end,
      vaccination_status = case when v_vacc <> 'unknown' then v_vacc else vaccination_status end
    where id = v_dog;
  end if;
  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone, nickname,
                         mood_tags, notes, trust_score, owner_hash, status, user_id,
                         reporter_email, claimed_dog_id, identity_method,
                         sterilisation_status, vaccination_status, ngo_id, volunteer_name, invite_code_id)
  values (v_dog, v_who, p_photo_url, p_lat, p_lng, p_zone, p_nickname,
          coalesce(p_mood_tags, '{}'), p_notes, 80, p_owner_hash, 'live', p_user_id,
          nullif(lower(btrim(coalesce(p_reporter_email, ''))), ''), p_claimed_dog_id,
          case when p_claimed_dog_id is null then 'organisation_created' else 'organisation_confirmed' end,
          v_ster, v_vacc, p_ngo_id, v_who, p_code_id)
  returning id into v_sighting;
  update org_invite_codes set uses = uses + 1 where id = p_code_id;
  return json_build_object('dog_id', v_dog, 'sighting_id', v_sighting,
    'status', 'live', 'trust_score', 80, 'ngo_id', p_ngo_id, 'volunteer_name', v_who);
end $$;

-- Bring through existing code-attributed reports as well. These already carry
-- an organisation, image and captured coordinates; unlike anonymous public
-- reports, they are operational uploads and should not wait in moderation.
do $$
declare r record;
begin
  for r in select id from sightings where ngo_id is not null and status = 'pending'
  loop
    perform approve_sighting(r.id, null);
  end loop;
end $$;

-- No user-controlled actor or organisation values in write functions.
create or replace function claim_case(p_case_id uuid, p_actor_id uuid, p_actor_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or my_ngo() is null then return false; end if;
  update cases set assignee_id = auth.uid(), assignee_name = nullif(btrim(p_actor_name), ''),
      ngo_id = my_ngo(), status = case when status = 'unverified' then 'assigned' else status end,
      updated_at = now(), last_activity_at = now()
   where id = p_case_id and assignee_id is null and ngo_id is null
   returning * into c;
  if not found then return false; end if;
  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (p_case_id, auth.uid(), nullif(btrim(p_actor_name), ''), 'claimed', c.status, 'Case claimed');
  return true;
end $$;

create or replace function update_case_status(
  p_case_id uuid, p_to_status case_status, p_actor_id uuid, p_actor_name text,
  p_resolution case_resolution default null, p_note text default null,
  p_before_url text default null, p_after_url text default null,
  p_outcome_note text default null
) returns json language plpgsql security definer set search_path = public as $$
declare c cases; v_type case_update_type := 'status_changed';
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or my_ngo() is null then
    return json_build_object('ok', false, 'error', 'Organisation access required.');
  end if;
  select * into c from cases where id = p_case_id and ngo_id = my_ngo();
  if not found then return json_build_object('ok', false, 'error', 'Case not found in your organisation.'); end if;
  if c.assignee_id is distinct from auth.uid() then
    return json_build_object('ok', false, 'error', 'Only the assignee can update this case.');
  end if;
  if p_to_status = c.status or p_to_status = 'unverified' then
    return json_build_object('ok', false, 'error', 'That status change is not available.');
  end if;
  if p_to_status = 'resolved' and (p_resolution is null
      or coalesce(btrim(coalesce(p_after_url, c.after_url, '')), '') = ''
      or coalesce(btrim(coalesce(p_outcome_note, c.outcome_note, '')), '') = '') then
    return json_build_object('ok', false, 'error', 'Resolution, after photo and outcome note are required.');
  end if;
  if c.status in ('resolved', 'closed') and p_to_status = 'in_progress' then v_type := 'reopened'; end if;
  update cases set status = p_to_status,
      resolution = case when p_to_status = 'resolved' then p_resolution when p_to_status = 'in_progress' then null else resolution end,
      resolved_at = case when p_to_status = 'resolved' then now() when v_type = 'reopened' then null else resolved_at end,
      before_url = coalesce(p_before_url, before_url), after_url = coalesce(p_after_url, after_url),
      outcome_note = coalesce(p_outcome_note, outcome_note),
      proof_verified = case when p_to_status = 'resolved' or v_type = 'reopened' then false else proof_verified end,
      verified_at = case when p_to_status = 'resolved' or v_type = 'reopened' then null else verified_at end,
      updated_at = now(), last_activity_at = now()
    where id = p_case_id and ngo_id = my_ngo();
  insert into case_updates (case_id, actor_id, actor_name, type, from_status, to_status, note)
    values (p_case_id, auth.uid(), nullif(btrim(p_actor_name), ''), v_type, c.status, p_to_status, p_note);
  return json_build_object('ok', true, 'status', p_to_status);
end $$;

create or replace function add_case_note(p_case_id uuid, p_actor_id uuid, p_actor_name text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() <> p_actor_id or my_ngo() is null
     or not exists (select 1 from cases where id = p_case_id and ngo_id = my_ngo()) then
    raise exception 'Case is not in your organisation';
  end if;
  insert into case_updates (case_id, actor_id, actor_name, type, note)
    values (p_case_id, auth.uid(), nullif(btrim(p_actor_name), ''), 'note', p_note);
  update cases set last_activity_at = now(), updated_at = now()
    where id = p_case_id and ngo_id = my_ngo();
end $$;

create or replace function set_case_followup(p_case_id uuid, p_follow_up_at date)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update cases set follow_up_at = p_follow_up_at, last_activity_at = now(), updated_at = now()
   where id = p_case_id and ngo_id = my_ngo();
  return found;
end $$;

create or replace function add_medical_event(
  p_dog_id uuid, p_case_id uuid default null, p_kind text default 'treatment',
  p_event_date date default current_date, p_notes text default null, p_performed_by text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Only partner NGOs can log medical events'; end if;
  if not exists (select 1 from dogs where id = p_dog_id and ngo_id = v_ngo) then
    raise exception 'That animal is not in your organisation';
  end if;
  if p_case_id is not null and not exists (select 1 from cases where id = p_case_id and ngo_id = v_ngo) then
    raise exception 'That case is not in your organisation';
  end if;
  insert into medical_events (dog_id, case_id, kind, event_date, notes, performed_by, created_by_id)
  values (p_dog_id, p_case_id, coalesce(p_kind, 'treatment'), coalesce(p_event_date, current_date),
          p_notes, p_performed_by, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function ngo_set_dog_care(
  p_dog_id uuid, p_vaccinated boolean default null, p_sterilised boolean default null,
  p_needs_help boolean default null
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update dogs set vaccinated = coalesce(p_vaccinated, vaccinated),
      sterilised = coalesce(p_sterilised, sterilised), needs_help = coalesce(p_needs_help, needs_help),
      status = case when p_needs_help = false and status in ('injured', 'hungry') then 'seen' else status end
   where id = p_dog_id and ngo_id = my_ngo();
  return found;
end $$;

create or replace function submit_survey_response(
  p_survey_id uuid, p_area_id uuid default null, p_lat double precision default null,
  p_lng double precision default null, p_photo_url text default null, p_species text default null,
  p_count int default 1, p_attributes jsonb default '{}'::jsonb, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if my_ngo() is null or not exists (select 1 from surveys where id = p_survey_id and ngo_id = my_ngo()) then
    raise exception 'Not your survey';
  end if;
  if p_area_id is not null and not exists (select 1 from survey_areas where id = p_area_id and survey_id = p_survey_id) then
    raise exception 'Area does not belong to this survey';
  end if;
  insert into survey_responses (survey_id, area_id, lat, lng, photo_url, species, count, attributes, notes, recorded_by)
  values (p_survey_id, p_area_id, p_lat, p_lng, p_photo_url, p_species,
          greatest(1, coalesce(p_count, 1)), coalesce(p_attributes, '{}'::jsonb), p_notes, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Private onboarding evidence should never be a public bucket. Public
-- sighting uploads remain intentionally public, constrained by bucket limits.
update storage.buckets set public = false where id = 'partner-docs';
update storage.buckets set file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
where id = 'sightings';
drop policy if exists partner_docs_read on storage.objects;

-- Explicit function grants after replacing definer functions.
grant execute on function my_ngo() to authenticated;
grant execute on function is_member_of_ngo(uuid) to authenticated;
grant execute on function get_precise_locations(uuid[]) to authenticated;
grant execute on function create_animal(text,text,text,text,double precision,double precision,text,text) to authenticated;
grant execute on function create_case(text,text,uuid,text,float,float,case_severity,case_category,text[],uuid,text,text) to authenticated;
grant execute on function report_sighting_for_org(text,float,float,text,uuid,uuid,text,text,text[],text,text,uuid,text,uuid,text,text) to service_role;
grant execute on function claim_case(uuid,uuid,text) to authenticated;
grant execute on function update_case_status(uuid,case_status,uuid,text,case_resolution,text,text,text,text) to authenticated;
grant execute on function add_case_note(uuid,uuid,text,text) to authenticated;
grant execute on function set_case_followup(uuid,date) to authenticated;
grant execute on function add_medical_event(uuid,uuid,text,date,text,text) to authenticated;
grant execute on function ngo_set_dog_care(uuid,boolean,boolean,boolean) to authenticated;
grant execute on function submit_survey_response(uuid,uuid,double precision,double precision,text,text,int,jsonb,text) to authenticated;
revoke execute on function create_animal(text,text,text,text,double precision,double precision,text,text) from public;
revoke execute on function create_case(text,text,uuid,text,float,float,case_severity,case_category,text[],uuid,text,text) from public;
revoke execute on function claim_case(uuid,uuid,text) from public;
revoke execute on function update_case_status(uuid,case_status,uuid,text,case_resolution,text,text,text,text) from public;
revoke execute on function add_case_note(uuid,uuid,text,text) from public;
revoke execute on function set_case_followup(uuid,date) from public;
revoke execute on function add_medical_event(uuid,uuid,text,date,text,text) from public;
revoke execute on function ngo_set_dog_care(uuid,boolean,boolean,boolean) from public;
revoke execute on function submit_survey_response(uuid,uuid,double precision,double precision,text,text,int,jsonb,text) from public;
