-- ════════════════════════════════════════════════════════════════
-- StrayPaw — honest animal identity on observations.
--
-- THE PROBLEM THIS FIXES
--
-- approve_sighting() linked an observation to the nearest existing animal
-- within 200 m, and created a new animal only when nothing was in range:
--
--     select * into v_dog from dogs
--     where haversine_m(s.lat, s.lng, lat, lng) <= 200
--     order by haversine_m(s.lat, s.lng, lat, lng) limit 1;
--
-- On an Indian street 200 m contains many distinct animals. That rule
-- silently merged different dogs into one record, inflated
-- dogs.sightings_count, and manufactured the single claim the product rests
-- on — that this is the same animal, seen again. Proximity is evidence that
-- two observations *could* be the same animal. It is not identification.
--
-- WHAT REPLACES IT
--
-- Proximity now produces candidates (nearby_animals) that a person chooses
-- from. Every link records how it was made and how sure we are. An
-- observation nobody has matched becomes its own animal rather than being
-- absorbed into a neighbour, so an unmatched record is visibly unmatched
-- instead of quietly wrong.
--
-- identity_method is the extension point: 'cv_matched' can be written by a
-- future model without changing this schema or the read paths.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, add-moderation.sql, sighting-email.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. How each observation came to be attached to an animal ────────

alter table sightings add column if not exists identity_method text;
alter table sightings add column if not exists identity_confidence text;
alter table sightings add column if not exists identity_note text;
-- What the reporter proposed at submission time, before any review.
alter table sightings add column if not exists claimed_dog_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sightings_identity_method_ck'
  ) then
    alter table sightings add constraint sightings_identity_method_ck
      check (identity_method is null or identity_method in (
        'unlinked',           -- no claim made; this observation is its own animal
        'reporter_selected',  -- the person reporting picked an existing animal
        'reviewer_confirmed', -- a reviewer confirmed the match
        'cv_matched',         -- matched by a model (not implemented yet)
        'proximity_auto'      -- legacy: merged by the old 200 m rule
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sightings_identity_conf_ck'
  ) then
    alter table sightings add constraint sightings_identity_conf_ck
      check (identity_confidence is null or identity_confidence in (
        'certain', 'probable', 'uncertain'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sightings_claimed_dog_fk'
  ) then
    alter table sightings add constraint sightings_claimed_dog_fk
      foreign key (claimed_dog_id) references dogs(id) on delete set null;
  end if;
end $$;

-- Label what already exists for what it is, rather than leaving rows that
-- were merged by proximity looking like confirmed matches.
update sightings
   set identity_method = 'proximity_auto',
       identity_confidence = 'uncertain'
 where dog_id is not null
   and identity_method is null;

update sightings
   set identity_method = 'unlinked'
 where dog_id is null
   and identity_method is null;

create index if not exists sightings_dog_idx on sightings (dog_id)
  where dog_id is not null;
create index if not exists sightings_claimed_idx on sightings (claimed_dog_id)
  where claimed_dog_id is not null;
create index if not exists sightings_status_created_idx
  on sightings (status, created_at desc);

-- ── 2. Candidates for a human to choose from ────────────────────────

-- Deliberately returns distance and last-seen so the chooser can judge, and
-- deliberately does not rank by anything that looks like a confidence score:
-- there is no model behind it, only geometry.
create or replace function nearby_animals(
  p_lat      float,
  p_lng      float,
  p_radius_m int default 300,
  p_limit    int default 8
) returns table (
  id              uuid,
  name            text,
  zone            text,
  cover_photo     text,
  status          dog_status,
  sightings_count int,
  last_seen       timestamptz,
  distance_m      int
) language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.zone, d.cover_photo, d.status,
         d.sightings_count, d.last_seen,
         haversine_m(p_lat, p_lng, d.lat, d.lng)::int as distance_m
    from dogs d
   where haversine_m(p_lat, p_lng, d.lat, d.lng) <= greatest(p_radius_m, 0)
   order by haversine_m(p_lat, p_lng, d.lat, d.lng)
   limit greatest(least(p_limit, 25), 1);
$$;

grant execute on function nearby_animals(float, float, int, int)
  to anon, authenticated, service_role;

-- ── 3. Keep the observation count honest ────────────────────────────

-- Derived from the observations that actually point at the animal. The old
-- code incremented a counter on every approval, so a wrong merge inflated it
-- permanently and unmerging could not put it back.
create or replace function recount_animal_sightings(p_dog_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  select count(*) into v_n
    from sightings where dog_id = p_dog_id and status = 'live';

  update dogs
     set sightings_count = greatest(v_n, 1),
         last_seen = coalesce(
           (select max(created_at) from sightings
             where dog_id = p_dog_id and status = 'live'),
           last_seen)
   where id = p_dog_id;

  return v_n;
end $$;

-- ── 4. Approval, without the automatic merge ────────────────────────

-- p_dog_id: a reviewer's explicit choice. When absent, the reporter's own
-- claim is used. When there is neither, the observation becomes a new animal
-- — an unmatched record, visibly unmatched.
create or replace function approve_sighting(
  p_sighting_id uuid,
  p_dog_id      uuid default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  s            sightings;
  v_dog        dogs;
  v_status     dog_status := 'seen';
  v_needs_help boolean := false;
  v_friendly   boolean := true;
  v_method     text;
  v_conf       text;
begin
  select * into s from sightings where id = p_sighting_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not found');
  end if;
  if s.status = 'live' then
    return json_build_object('ok', true, 'already', true, 'dog_id', s.dog_id);
  end if;

  if 'injured' = any(s.mood_tags) then
    v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(s.mood_tags) then
    v_status := 'hungry'; v_needs_help := true;
  end if;
  v_friendly := 'friendly' = any(s.mood_tags) or not ('shy' = any(s.mood_tags));

  -- Reviewer's choice wins over the reporter's claim.
  if p_dog_id is not null then
    select * into v_dog from dogs where id = p_dog_id;
    v_method := 'reviewer_confirmed';
    v_conf   := 'probable';
  elsif s.claimed_dog_id is not null then
    select * into v_dog from dogs where id = s.claimed_dog_id;
    v_method := 'reporter_selected';
    v_conf   := 'uncertain';
  end if;

  if v_dog.id is not null then
    update dogs set
      last_seen   = greatest(last_seen, s.created_at),
      status      = case when v_needs_help then v_status else status end,
      needs_help  = needs_help or v_needs_help,
      name        = coalesce(name, s.nickname),
      cover_photo = coalesce(cover_photo, s.photo_url)
    where id = v_dog.id
    returning * into v_dog;
  else
    -- Nobody matched it, so it stands on its own.
    insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly,
                      needs_help, trust_score, sightings_count,
                      first_seen, last_seen)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
            v_needs_help, s.trust_score, 1, s.created_at, s.created_at)
    returning * into v_dog;
    v_method := 'unlinked';
    v_conf   := null;
  end if;

  update sightings
     set status = 'live',
         dog_id = v_dog.id,
         identity_method = v_method,
         identity_confidence = v_conf
   where id = p_sighting_id;

  perform recount_animal_sightings(v_dog.id);

  return json_build_object(
    'ok', true, 'dog_id', v_dog.id, 'sighting_id', p_sighting_id,
    'identity_method', v_method);
end $$;

grant execute on function approve_sighting(uuid, uuid) to service_role;

-- ── 5. Correcting a link after the fact ─────────────────────────────

-- Moving an observation to the right animal has to fix both counts, which is
-- why the counter is derived rather than incremented.
create or replace function relink_sighting(
  p_sighting_id uuid,
  p_dog_id      uuid,
  p_method      text default 'reviewer_confirmed',
  p_confidence  text default 'probable'
) returns json language plpgsql security definer set search_path = public as $$
declare v_old uuid;
begin
  select dog_id into v_old from sightings where id = p_sighting_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not found');
  end if;

  update sightings
     set dog_id = p_dog_id,
         identity_method = p_method,
         identity_confidence = p_confidence
   where id = p_sighting_id;

  if v_old is not null and v_old <> p_dog_id then
    perform recount_animal_sightings(v_old);
  end if;
  perform recount_animal_sightings(p_dog_id);

  return json_build_object('ok', true, 'dog_id', p_dog_id, 'previous', v_old);
end $$;

grant execute on function relink_sighting(uuid, uuid, text, text) to service_role;

-- ── 6. Rebuild every count once, after the rules changed ────────────

do $$
declare r record;
begin
  for r in select distinct dog_id from sightings where dog_id is not null loop
    perform recount_animal_sightings(r.dog_id);
  end loop;
end $$;

-- ── 7. Let the reporter propose a match at submission time ──────────

-- Same shape as before with one trailing argument, so the old call site keeps
-- working while the client is updated.
create or replace function report_sighting(
  p_photo_url      text,
  p_lat            float,
  p_lng            float,
  p_zone           text,
  p_nickname       text default null,
  p_mood_tags      text[] default '{}',
  p_notes          text default null,
  p_reporter_name  text default null,
  p_owner_hash     text default null,
  p_user_id        uuid default null,
  p_reporter_email text default null,
  p_claimed_dog_id uuid default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_trust    int;
  v_sighting uuid;
  v_claim    uuid := null;
begin
  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  -- Only accept a claim that names a real animal; a stale or invented id is
  -- dropped rather than stored as a dangling match.
  if p_claimed_dog_id is not null then
    select id into v_claim from dogs where id = p_claimed_dog_id;
  end if;

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status, user_id, reporter_email,
                         claimed_dog_id, identity_method)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash,
          'pending', p_user_id,
          nullif(lower(btrim(coalesce(p_reporter_email,''))), ''),
          v_claim,
          case when v_claim is null then 'unlinked' else 'reporter_selected' end)
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust,
    'claimed_dog_id', v_claim);
end;
$$;

grant execute on function report_sighting(
  text,float,float,text,text,text[],text,text,text,uuid,text,uuid
) to anon, authenticated, service_role;
