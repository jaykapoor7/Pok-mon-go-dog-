-- ════════════════════════════════════════════════════════════════
-- StrayPaw, drives: the unit an ABC programme is actually judged on.
--
-- THE PROBLEM PAWS CHENNAI RAISED
--
-- "Sterilisation rate" across everything an organisation has ever
-- recorded is not a number anybody funds or reports against. What gets
-- reported is a drive: the three days in Kotturpuram, the ward census, the
-- rabies round. Those have a start, an end, a place, and a coverage figure
-- of their own.
--
-- So a drive is a first-class record here, and every observation can be
-- filed against one.
--
-- HOW WORK REACHES A DASHBOARD
--
-- Two routes in, and both need a person to decide:
--
--   1. A volunteer holding the organisation's code files a sighting. It
--      arrives attributed to the organisation but uncategorised, and sits
--      in the incoming list until somebody files it against a drive. That
--      is the moment it joins the register and starts counting.
--   2. A member or lead sees a community sighting nobody owns and claims
--      it. Claiming attaches it to the organisation and, if they say so,
--      to a drive.
--
-- Nothing lands on a dashboard on its own. An organisation's numbers are
-- the ones it chose to accept, which is the only way the numbers stay
-- theirs to defend.
--
-- COUNTING
--
-- An animal is in a drive if it was registered during it, or if any
-- observation filed against that drive is of it. Stats are reported over
-- animals rather than observations, because two sightings of one dog on
-- one day is one sterilisation, not two. The observation count is shown
-- alongside so the two are never confused.
--
-- Unknowns stay unknowns. Coverage of the animals whose status was
-- actually established is the honest figure; coverage of everything is the
-- one that gets quoted. Both are returned, labelled.
--
-- Idempotent. Safe to run more than once.
-- Depends on: abc-programme.sql, org-invite-codes.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. The drive ────────────────────────────────────────────────────

create table if not exists campaigns (
  id          uuid primary key default uuid_generate_v4(),
  ngo_id      uuid not null,
  name        text not null,
  -- What kind of work it was. The three PAWS named, plus room for the rest.
  kind        text not null default 'sterilisation'
              check (kind in ('census', 'sterilisation', 'vaccination',
                              'treatment', 'other')),
  starts_on   date,
  ends_on     date,
  zone        text,
  notes       text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists campaigns_ngo_idx
  on campaigns (ngo_id, starts_on desc nulls last, created_at desc);

alter table campaigns enable row level security;

-- Readable and writable only by the organisation that owns it, decided in
-- the database rather than by a filter a page might forget to pass.
drop policy if exists campaigns_own on campaigns;
create policy campaigns_own on campaigns
  for all to authenticated
  using (ngo_id = my_ngo()) with check (ngo_id = my_ngo());

drop policy if exists campaigns_service on campaigns;
create policy campaigns_service on campaigns
  for all to service_role using (true) with check (true);

-- ── 2. Filing an observation against one ────────────────────────────

alter table sightings add column if not exists campaign_id uuid;
-- The drive an animal was first put on the register during.
alter table dogs     add column if not exists campaign_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sightings_campaign_fk') then
    alter table sightings add constraint sightings_campaign_fk
      foreign key (campaign_id) references campaigns(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dogs_campaign_fk') then
    alter table dogs add constraint dogs_campaign_fk
      foreign key (campaign_id) references campaigns(id) on delete set null;
  end if;
end $$;

create index if not exists sightings_campaign_idx
  on sightings (campaign_id) where campaign_id is not null;
create index if not exists dogs_campaign_idx
  on dogs (campaign_id) where campaign_id is not null;

-- ── 3. Managing drives ──────────────────────────────────────────────

create or replace function create_campaign(
  p_name      text,
  p_kind      text default 'sterilisation',
  p_starts_on date default null,
  p_ends_on   date default null,
  p_zone      text default null,
  p_notes     text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can create a drive';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A drive needs a name';
  end if;

  insert into campaigns (ngo_id, name, kind, starts_on, ends_on, zone, notes, created_by)
  values (v_ngo, btrim(p_name),
          case when p_kind in ('census','sterilisation','vaccination','treatment','other')
               then p_kind else 'other' end,
          p_starts_on, p_ends_on, nullif(btrim(p_zone), ''), nullif(btrim(p_notes), ''),
          auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function update_campaign(
  p_id        uuid,
  p_name      text default null,
  p_kind      text default null,
  p_starts_on date default null,
  p_ends_on   date default null,
  p_zone      text default null,
  p_notes     text default null
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update campaigns set
    name      = coalesce(nullif(btrim(p_name), ''), name),
    kind      = case when p_kind in ('census','sterilisation','vaccination','treatment','other')
                     then p_kind else kind end,
    starts_on = coalesce(p_starts_on, starts_on),
    ends_on   = coalesce(p_ends_on, ends_on),
    zone      = coalesce(nullif(btrim(p_zone), ''), zone),
    notes     = coalesce(nullif(btrim(p_notes), ''), notes)
  where id = p_id and ngo_id = my_ngo();
  return found;
end $$;

-- Archiving, not deleting. A finished drive is the record of what was
-- done; the observations filed against it stay filed against it.
create or replace function archive_campaign(p_id uuid, p_archived boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update campaigns
     set archived_at = case when p_archived then now() else null end
   where id = p_id and ngo_id = my_ngo();
  return found;
end $$;

grant execute on function create_campaign(text, text, date, date, text, text)
  to authenticated, service_role;
grant execute on function update_campaign(uuid, text, text, date, date, text, text)
  to authenticated, service_role;
grant execute on function archive_campaign(uuid, boolean) to authenticated, service_role;

-- ── 4. The animals in a drive ───────────────────────────────────────

-- One place that decides what "in this drive" means, so a total and the
-- list behind it cannot drift apart.
create or replace function campaign_animal_ids(p_campaign_id uuid)
returns table (dog_id uuid) language sql stable security definer
set search_path = public as $$
  select d.id from dogs d
   where d.ngo_id = my_ngo() and d.campaign_id = p_campaign_id
  union
  select distinct s.dog_id from sightings s
    join campaigns c on c.id = s.campaign_id
   where s.campaign_id = p_campaign_id
     and s.dog_id is not null
     and c.ngo_id = my_ngo();
$$;

create or replace function campaign_stats(p_campaign_id uuid)
returns json language plpgsql stable security definer
set search_path = public as $$
declare v_ngo uuid; v json; v_obs bigint; v_people bigint; c campaigns;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return null; end if;

  select * into c from campaigns where id = p_campaign_id and ngo_id = v_ngo;
  if not found then return null; end if;

  select count(*),
         count(distinct nullif(btrim(coalesce(volunteer_name, reporter_name, '')), ''))
    into v_obs, v_people
    from sightings where campaign_id = p_campaign_id;

  select json_build_object(
    'id',   c.id,
    'name', c.name,
    'kind', c.kind,
    'starts_on', c.starts_on,
    'ends_on',   c.ends_on,
    'zone',      c.zone,
    'archived',  c.archived_at is not null,
    'observations', v_obs,
    'people',       v_people,
    'total',          count(*),
    'sterilised',     count(*) filter (where d.sterilisation_status = 'sterilised'),
    'not_sterilised', count(*) filter (where d.sterilisation_status = 'not_sterilised'),
    'ster_unknown',   count(*) filter (where d.sterilisation_status = 'unknown'),
    'vaccinated',     count(*) filter (where d.vaccination_status = 'vaccinated'),
    'not_vaccinated', count(*) filter (where d.vaccination_status = 'not_vaccinated'),
    'vacc_unknown',   count(*) filter (where d.vaccination_status = 'unknown'),
    'needs_help',     count(*) filter (where d.needs_help),
    -- Of the animals whose status was actually established. An unknown is
    -- not a negative and is never counted as one.
    'ster_pct_of_known', case
      when count(*) filter (where d.sterilisation_status in ('sterilised','not_sterilised')) = 0
        then null
      else round(100.0 * count(*) filter (where d.sterilisation_status = 'sterilised')
                 / count(*) filter (where d.sterilisation_status in ('sterilised','not_sterilised')), 1)
      end,
    'ster_pct_of_all', case when count(*) = 0 then null
      else round(100.0 * count(*) filter (where d.sterilisation_status = 'sterilised')
                 / count(*), 1) end,
    'vacc_pct_of_known', case
      when count(*) filter (where d.vaccination_status in ('vaccinated','not_vaccinated')) = 0
        then null
      else round(100.0 * count(*) filter (where d.vaccination_status = 'vaccinated')
                 / count(*) filter (where d.vaccination_status in ('vaccinated','not_vaccinated')), 1)
      end,
    'vacc_pct_of_all', case when count(*) = 0 then null
      else round(100.0 * count(*) filter (where d.vaccination_status = 'vaccinated')
                 / count(*), 1) end
  ) into v
  from dogs d
  where d.id in (select dog_id from campaign_animal_ids(p_campaign_id));

  return v;
end $$;

-- Every drive with its headline figures, for the drives page.
create or replace function org_campaigns(p_include_archived boolean default false)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(campaign_stats(c.id)
           order by c.starts_on desc nulls last, c.created_at desc), '[]'::json)
    from campaigns c
   where c.ngo_id = my_ngo()
     and (p_include_archived or c.archived_at is null);
$$;

create or replace function campaign_animals(
  p_campaign_id uuid,
  p_ster        text default null,
  p_vacc        text default null,
  p_limit       int default 200,
  p_offset      int default 0
) returns table (
  id                   uuid,
  name                 text,
  code                 text,
  zone                 text,
  cover_photo          text,
  sterilisation_status text,
  vaccination_status   text,
  needs_help           boolean,
  created_at           timestamptz,
  total_count          bigint
) language sql stable security definer set search_path = public as $$
  with scoped as (
    select d.* from dogs d
     where d.id in (select dog_id from campaign_animal_ids(p_campaign_id))
       and (p_ster is null or d.sterilisation_status = p_ster)
       and (p_vacc is null or d.vaccination_status = p_vacc)
  )
  select s.id, s.name, s.code, s.zone, s.cover_photo,
         s.sterilisation_status, s.vaccination_status, s.needs_help,
         s.created_at, count(*) over () as total_count
    from scoped s
   order by s.created_at desc
   limit greatest(least(p_limit, 1000), 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function campaign_animal_ids(uuid) to authenticated, service_role;
grant execute on function campaign_stats(uuid)      to authenticated, service_role;
grant execute on function org_campaigns(boolean)    to authenticated, service_role;
grant execute on function campaign_animals(uuid, text, text, int, int)
  to authenticated, service_role;

-- ── 4b. What counts as "near us" ────────────────────────────────────

-- The dashboard said 65 unclaimed sightings nearby while the Incoming list
-- showed none, because they asked different questions: the count was every
-- unclaimed sighting in the country, and the list was scoped to members.
-- Neither was right. An organisation in Chennai has no use for a dog
-- somebody photographed in Delhi.
--
-- Near means one of two things, and both are honest: the sighting names the
-- city this organisation works in, or it is within 40km of where this
-- organisation actually has animals on the register. The second matters
-- because zone text is written by whoever typed it and a city name is not
-- a boundary.
create or replace function org_nearby_community_sightings()
returns setof sightings language sql stable security definer
set search_path = public as $$
  with me as (
    select n.id, n.city, n.state
      from ngos n where n.id = my_ngo()
  ),
  centre as (
    select avg(d.lat) as lat, avg(d.lng) as lng
      from dogs d
     where d.ngo_id = (select id from me)
       and d.lat is not null and d.lng is not null
       and d.lat <> 0 and d.lng <> 0
  )
  select s.*
    from sightings s, me
   where s.ngo_id is null
     and s.campaign_id is null
     and s.status <> 'rejected'
     and (
       -- The organisation's own city, named in the sighting's zone.
       (coalesce(btrim(me.city), '') <> ''
         and s.zone ilike '%' || btrim(me.city) || '%')
       or
       -- Or close to where they already work. 0.36 degrees is roughly 40km
       -- at Indian latitudes, and a square is the right amount of precision
       -- for "is this ours to look at".
       (exists (select 1 from centre where centre.lat is not null)
         and s.lat is not null and s.lng is not null
         and abs(s.lat - (select lat from centre)) < 0.36
         and abs(s.lng - (select lng from centre)) < 0.36)
     );
$$;

grant execute on function org_nearby_community_sightings()
  to authenticated, service_role;

-- ── 5. Incoming: what is waiting to be filed ────────────────────────

-- Two lists, deliberately separate, because they need different decisions.
--
--   'ours'      a volunteer with this organisation's code filed it. It
--               belongs here already; somebody has to say which drive.
--   'community' nobody owns it. Taking it on is a choice, so it is a
--               different action and a different list.
create or replace function org_incoming(
  p_source text default 'ours',
  p_zone   text default null,
  p_limit  int default 100,
  p_offset int default 0
) returns table (
  id                   uuid,
  photo_url            text,
  zone                 text,
  lat                  double precision,
  lng                  double precision,
  nickname             text,
  notes                text,
  sterilisation_status text,
  vaccination_status   text,
  reported_by          text,
  status               text,
  created_at           timestamptz,
  total_count          bigint
) language sql stable security definer set search_path = public as $$
  with scoped as (
    select s.* from sightings s
     where s.campaign_id is null
       and s.status <> 'rejected'
       and (
         (p_source = 'ours' and s.ngo_id = my_ngo())
         or
         (p_source = 'community'
           and my_ngo() is not null
           and s.id in (select id from org_nearby_community_sightings()))
       )
       and (p_zone is null or s.zone ilike '%' || p_zone || '%')
  )
  select s.id, s.photo_url, s.zone, s.lat, s.lng, s.nickname, s.notes,
         s.sterilisation_status, s.vaccination_status,
         coalesce(nullif(btrim(s.volunteer_name), ''),
                  nullif(btrim(s.reporter_name), ''), 'Anonymous') as reported_by,
         s.status, s.created_at,
         count(*) over () as total_count
    from scoped s
   order by s.created_at desc
   limit greatest(least(p_limit, 500), 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function org_incoming(text, text, int, int)
  to authenticated, service_role;

-- ── 6. Filing them ──────────────────────────────────────────────────

-- The one action that matters: take these observations, put them in this
-- drive, and put the animals on the register.
--
-- Done in one call over a set of ids rather than one at a time, because
-- the real shape of this is "everything Ravi filed on Tuesday belongs to
-- the Kotturpuram round", and clicking that forty times is how a field
-- team stops using a tool.
create or replace function file_sightings_to_campaign(
  p_sighting_ids uuid[],
  p_campaign_id  uuid,
  p_claim        boolean default false
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_ngo    uuid;
  v_id     uuid;
  v_filed  int := 0;
  v_added  int := 0;
  s        sightings;
  r        json;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can file observations';
  end if;
  if not exists (select 1 from campaigns where id = p_campaign_id and ngo_id = v_ngo) then
    raise exception 'That drive does not belong to your organisation';
  end if;

  foreach v_id in array coalesce(p_sighting_ids, '{}') loop
    select * into s from sightings where id = v_id;
    continue when not found;

    -- Either it is already ours, or we are claiming it from the community
    -- pool. Never somebody else's.
    if s.ngo_id is distinct from v_ngo then
      if not (p_claim and s.ngo_id is null) then
        continue;
      end if;
      update sightings set ngo_id = v_ngo where id = v_id;
    end if;

    update sightings set campaign_id = p_campaign_id where id = v_id;
    v_filed := v_filed + 1;

    -- Filing is what puts the animal on the register. Approval already
    -- knows how to create or link one and carries the programme status
    -- across, so it does that job here rather than a second copy of it.
    if s.status <> 'live' or s.dog_id is null then
      r := approve_sighting(v_id, null);
      if coalesce((r ->> 'ok')::boolean, false) then
        v_added := v_added + 1;
        update dogs
           set campaign_id = coalesce(campaign_id, p_campaign_id),
               ngo_id      = coalesce(ngo_id, v_ngo)
         where id = (r ->> 'dog_id')::uuid;
      end if;
    else
      update dogs set campaign_id = coalesce(campaign_id, p_campaign_id)
       where id = s.dog_id;
    end if;
  end loop;

  return json_build_object('ok', true, 'filed', v_filed, 'registered', v_added);
end $$;

grant execute on function file_sightings_to_campaign(uuid[], uuid, boolean)
  to authenticated, service_role;

-- ── 7. The whole programme, split by drive ──────────────────────────

-- What the analytics page needs in one call: the organisation's totals,
-- and the same breakdown per drive, from the same definitions.
create or replace function org_programme_breakdown()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'overall', org_programme_stats(),
    'drives',  org_campaigns(true),
    -- Everything the organisation holds that is not filed against any
    -- drive. Named plainly rather than hidden, because a large number here
    -- means the drive figures are understating the work.
    'unfiled', (
      select json_build_object(
        'animals', count(*),
        'sterilised', count(*) filter (where sterilisation_status = 'sterilised'),
        'not_sterilised', count(*) filter (where sterilisation_status = 'not_sterilised'),
        'ster_unknown', count(*) filter (where sterilisation_status = 'unknown'))
        from dogs d
       where d.ngo_id = my_ngo()
         and d.campaign_id is null
         and not exists (
           select 1 from sightings s
            where s.dog_id = d.id and s.campaign_id is not null)
    ),
    'waiting', (
      select json_build_object(
        'ours', (select count(*) from sightings
                  where ngo_id = my_ngo() and campaign_id is null
                    and status <> 'rejected'),
        -- Same function the Incoming list uses. A count and the list behind
        -- it must not be able to answer differently.
        'community', (select count(*) from org_nearby_community_sightings()))
    )
  );
$$;

grant execute on function org_programme_breakdown() to authenticated, service_role;
