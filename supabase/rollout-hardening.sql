-- StrayPaw rollout hardening.
-- Safe to replay. Keeps UUIDs as database keys while making NGO workflows
-- human-readable and follow-ups genuinely actionable.

-- ── Short permanent animal IDs ────────────────────────────────────────────
create or replace function straypaw_species_code(value text)
returns text language sql immutable as $$
  select case lower(coalesce(value, 'animal'))
    when 'dog' then 'D'
    when 'cat' then 'C'
    when 'cattle' then 'CT'
    when 'cow' then 'CT'
    when 'bull' then 'CT'
    when 'horse' then 'H'
    when 'donkey' then 'DN'
    when 'equine' then 'E'
    else 'A'
  end
$$;

create or replace function short_straypaw_suffix()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  output text := '';
  i integer;
begin
  for i in 1..6 loop
    output := output || substr(alphabet, 1 + floor(random() * 36)::integer, 1);
  end loop;
  return output;
end $$;

do $$
declare animal record; candidate text;
begin
  for animal in
    select id, species from dogs
    where straypaw_id is null
       or btrim(straypaw_id) = ''
       or straypaw_id ~ '^SPA-[A-Z]{3}-[0-9A-F]{32}'
       or straypaw_id ~ '^SPA-[A-Z]{3}-[0-9A-F]{8}'
  loop
    loop
      candidate := 'SP-' || straypaw_species_code(animal.species) || '-' || short_straypaw_suffix();
      exit when not exists (select 1 from dogs where straypaw_id = candidate);
    end loop;
    update dogs set straypaw_id = candidate where id = animal.id;
  end loop;
end $$;

create unique index if not exists dogs_straypaw_id_idx
  on dogs (straypaw_id) where straypaw_id is not null;

create or replace function assign_straypaw_id()
returns trigger language plpgsql as $$
declare candidate text;
begin
  if new.straypaw_id is null or btrim(new.straypaw_id) = '' then
    loop
      candidate := 'SP-' || straypaw_species_code(new.species) || '-' || short_straypaw_suffix();
      exit when not exists (select 1 from dogs where straypaw_id = candidate);
    end loop;
    new.straypaw_id := candidate;
  end if;
  return new;
end $$;

drop trigger if exists dogs_assign_straypaw_id on dogs;
create trigger dogs_assign_straypaw_id before insert on dogs
for each row execute function assign_straypaw_id();

-- ── NGO animal register: permanent ID + source ID are separate ───────────
drop function if exists org_animals(text,text,text,text,timestamptz,timestamptz,boolean,int,int);
create function org_animals(
  p_search text default null,
  p_ster text default null,
  p_vacc text default null,
  p_zone text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_needs boolean default null,
  p_limit int default 200,
  p_offset int default 0
) returns table (
  id uuid,
  straypaw_id text,
  name text,
  code text,
  species text,
  zone text,
  cover_photo text,
  status dog_status,
  assignee_name text,
  sterilisation_status text,
  vaccination_status text,
  needs_help boolean,
  sightings_count int,
  lat double precision,
  lng double precision,
  created_at timestamptz,
  last_seen timestamptz,
  recorded_by text,
  total_count bigint
) language sql stable security definer set search_path = public as $$
  with scoped as (
    select d.*
    from dogs d
    where d.ngo_id = my_ngo()
      and (p_ster is null or d.sterilisation_status = p_ster)
      and (p_vacc is null or d.vaccination_status = p_vacc)
      and (p_zone is null or d.zone ilike '%' || p_zone || '%')
      and (p_from is null or d.created_at >= p_from)
      and (p_to is null or d.created_at < p_to)
      and (p_needs is null or d.needs_help = p_needs)
      and (
        p_search is null or btrim(p_search) = '' or
        d.straypaw_id ilike '%' || p_search || '%' or
        d.name ilike '%' || p_search || '%' or
        d.code ilike '%' || p_search || '%' or
        d.zone ilike '%' || p_search || '%' or
        d.id::text ilike p_search || '%'
      )
  )
  select s.id, s.straypaw_id, s.name, s.code, coalesce(s.species, 'dog'), s.zone,
         s.cover_photo, s.status, s.assignee_name,
         s.sterilisation_status, s.vaccination_status, s.needs_help,
         s.sightings_count, s.lat, s.lng, s.created_at, s.last_seen,
         (select coalesce(sg.reporter_name, 'A team member')
            from sightings sg
           where sg.dog_id = s.id
           order by sg.created_at asc limit 1) as recorded_by,
         count(*) over () as total_count
  from scoped s
  order by s.created_at desc
  limit greatest(least(p_limit, 1000), 1)
  offset greatest(p_offset, 0);
$$;
grant execute on function org_animals(text,text,text,text,timestamptz,timestamptz,boolean,int,int)
to authenticated, service_role;

-- ── Follow-ups can be completed, missed, cancelled or postponed ───────────
create or replace function update_case_followup_status(
  p_followup_id uuid,
  p_status text,
  p_note text default null,
  p_due_at date default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_ngo uuid;
  v_case uuid;
  v_status text;
begin
  select my_ngo() into v_ngo;
  v_status := lower(coalesce(p_status, ''));
  if v_ngo is null then raise exception 'Organisation access required'; end if;
  if v_status not in ('upcoming','done','missed','postponed','cancelled') then
    raise exception 'Invalid follow-up status';
  end if;

  select case_id into v_case
  from animal_followups
  where id = p_followup_id and ngo_id = v_ngo;
  if v_case is null then raise exception 'Follow-up not found in your organisation'; end if;

  update animal_followups
     set status = v_status,
         note = case when p_note is null then note else nullif(btrim(p_note), '') end,
         due_at = case when p_due_at is null then due_at else p_due_at::timestamptz end,
         completed_at = case when v_status = 'done' then coalesce(completed_at, now()) else null end,
         updated_at = now()
   where id = p_followup_id and ngo_id = v_ngo;

  update cases
     set follow_up_at = (
       select min(af.due_at)::date
       from animal_followups af
       where af.case_id = v_case and af.ngo_id = v_ngo
         and af.status in ('upcoming','postponed')
     ),
     last_activity_at = now(),
     updated_at = now()
   where id = v_case and ngo_id = v_ngo;

  insert into case_updates(case_id, actor_id, actor_name, type, note)
  values (
    v_case, auth.uid(), nullif(auth.jwt() ->> 'email',''), 'note',
    case v_status
      when 'done' then 'Follow-up completed'
      when 'missed' then 'Follow-up marked missed'
      when 'cancelled' then 'Follow-up cancelled'
      when 'postponed' then 'Follow-up postponed'
      else 'Follow-up reopened'
    end || case when nullif(btrim(p_note), '') is null then '' else E'\n' || btrim(p_note) end
  );
  return true;
end $$;
grant execute on function update_case_followup_status(uuid,text,text,date)
to authenticated, service_role;
