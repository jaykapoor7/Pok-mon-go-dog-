-- ════════════════════════════════════════════════════════════════
-- Demo mode for organisations.
--
-- An organisation trying StrayPaw wants to put a few made-up animals and
-- cases through it to see how the thing works. That must not land in the
-- public record: the map, the feed, the counts on the landing page and
-- every state figure on /evidence are supposed to be real.
--
-- HOW IT WORKS
--
-- One switch on the organisation, `ngos.demo_mode`. While it is on, every
-- record that organisation creates is stamped `is_demo`, and a demo record
-- is invisible to the public — not filtered out by the application, which
-- is a thing somebody forgets one query at a time, but invisible in the
-- row-level-security policy, so a query cannot see it whether it
-- remembered to ask or not. The organisation's own people still see their
-- demo records, because otherwise the demo would be pointless.
--
-- The stamp is applied by a trigger rather than by the code that inserts.
-- There are a dozen places an organisation can create something, and a
-- flag that has to be passed at each of them is a flag that will be missed
-- at one of them. The trigger reads the organisation's switch itself.
--
-- Turning the switch off does not delete anything. `clear_demo_data`
-- does, and only ever touches rows that carry the stamp.
-- ════════════════════════════════════════════════════════════════

-- ── 1. the switch ─────────────────────────────────────────────────

alter table ngos add column if not exists demo_mode boolean not null default false;

comment on column ngos.demo_mode is
  'While true, records this organisation creates are stamped is_demo and stay out of the public record.';

-- ── 2. the stamp ──────────────────────────────────────────────────
--
-- Every table that holds an organisation's records and carries ngo_id.
-- Done as a loop so a table added later is picked up by re-running this
-- file rather than by remembering to edit a list.

do $$
declare t text;
begin
  foreach t in array array[
    'dogs','cases','sightings','documents','feeding_zones','fundraisers',
    'tasks','vet_camps','adoption_listings','campaigns','surveys','volunteers'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I add column if not exists is_demo boolean not null default false', t);
      -- Partial: the real rows are the overwhelming majority and the index
      -- only ever has to find the few that are not.
      execute format('create index if not exists %I on %I (ngo_id) where is_demo', t || '_demo_idx', t);
    end if;
  end loop;
end $$;

-- Children of a case or an animal inherit the parent's status rather than
-- consulting the switch, so a record stays consistent with its parent even
-- if the switch is flipped between the two inserts.
alter table medical_events add column if not exists is_demo boolean not null default false;
alter table case_updates   add column if not exists is_demo boolean not null default false;

-- ── 3. who is asking ──────────────────────────────────────────────

-- is_ngo_member() already answers "is the caller staff anywhere". Demo
-- visibility needs "is the caller staff HERE", or one organisation's demo
-- animals would show up in another's dashboard.
create or replace function is_member_of_ngo(p_ngo uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select p_ngo is not null and exists (
    select 1 from ngo_members m
     where m.ngo_id = p_ngo and m.user_id = auth.uid()
  );
$$;

create or replace function org_is_in_demo_mode(p_ngo uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select coalesce((select demo_mode from ngos where id = p_ngo), false);
$$;

grant execute on function is_member_of_ngo(uuid)     to anon, authenticated, service_role;
grant execute on function org_is_in_demo_mode(uuid)  to anon, authenticated, service_role;

-- ── 4. the trigger that stamps ────────────────────────────────────

create or replace function stamp_demo_row()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  -- An explicit true is honoured (an import of demo data says so for
  -- itself); otherwise the organisation's switch decides.
  if coalesce(new.is_demo, false) then return new; end if;
  new.is_demo := org_is_in_demo_mode(new.ngo_id);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'dogs','cases','sightings','documents','feeding_zones','fundraisers',
    'tasks','vet_camps','adoption_listings','campaigns','surveys','volunteers'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on %I', t || '_stamp_demo', t);
      execute format(
        'create trigger %I before insert on %I for each row execute function stamp_demo_row()',
        t || '_stamp_demo', t);
    end if;
  end loop;
end $$;

-- Children, from the parent.
create or replace function stamp_demo_from_parent()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if coalesce(new.is_demo, false) then return new; end if;
  new.is_demo := coalesce(
    (select c.is_demo from cases c where c.id = new.case_id),
    case when to_jsonb(new) ? 'dog_id'
         then (select d.is_demo from dogs d where d.id = (to_jsonb(new)->>'dog_id')::uuid)
    end,
    false);
  return new;
end $$;

drop trigger if exists medical_events_stamp_demo on medical_events;
create trigger medical_events_stamp_demo before insert on medical_events
  for each row execute function stamp_demo_from_parent();

drop trigger if exists case_updates_stamp_demo on case_updates;
create trigger case_updates_stamp_demo before insert on case_updates
  for each row execute function stamp_demo_from_parent();

-- ── 5. demo rows are not public ───────────────────────────────────
--
-- The read policies on these two were plain `true`. They become "real, or
-- yours" — which is the same `true` for every row that exists today, and
-- the reason no application query needs to change.

drop policy if exists dogs_read on dogs;
create policy dogs_read on dogs for select
  using (not is_demo or is_member_of_ngo(ngo_id));

drop policy if exists cases_read on cases;
create policy cases_read on cases for select
  using (not is_demo or is_member_of_ngo(ngo_id));

drop policy if exists sightings_read on sightings;
create policy sightings_read on sightings for select
  using (
    (status = 'live' or user_id = auth.uid())
    and (not is_demo or is_member_of_ngo(ngo_id))
  );

-- ── 6. the switch, and the broom ──────────────────────────────────

-- Flipping the switch is staff-only, and only for their own organisation.
create or replace function set_demo_mode(p_ngo uuid, p_on boolean)
returns json language plpgsql security definer
set search_path = public as $$
begin
  if not is_member_of_ngo(p_ngo) then
    return json_build_object('ok', false, 'error', 'Not your organisation.');
  end if;
  update ngos set demo_mode = coalesce(p_on, false) where id = p_ngo;
  return json_build_object('ok', true, 'demo_mode', coalesce(p_on, false));
end $$;

-- Deletes only what carries the stamp, and only for the caller's own
-- organisation. Children go first so nothing is orphaned.
create or replace function clear_demo_data(p_ngo uuid)
returns json language plpgsql security definer
set search_path = public as $$
declare t text; n bigint; total bigint := 0; per json := '{}'::json;
begin
  if not is_member_of_ngo(p_ngo) then
    return json_build_object('ok', false, 'error', 'Not your organisation.');
  end if;

  delete from medical_events where is_demo
    and case_id in (select id from cases where ngo_id = p_ngo and is_demo);
  get diagnostics n = row_count; total := total + n;
  delete from case_updates where is_demo
    and case_id in (select id from cases where ngo_id = p_ngo and is_demo);
  get diagnostics n = row_count; total := total + n;

  foreach t in array array[
    'sightings','cases','dogs','documents','feeding_zones','fundraisers',
    'tasks','vet_camps','adoption_listings','campaigns','surveys','volunteers'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from %I where is_demo and ngo_id = $1', t) using p_ngo;
      get diagnostics n = row_count;
      total := total + n;
      per := (per::jsonb || jsonb_build_object(t, n))::json;
    end if;
  end loop;

  return json_build_object('ok', true, 'deleted', total, 'by_table', per);
end $$;

grant execute on function set_demo_mode(uuid, boolean) to authenticated, service_role;
grant execute on function clear_demo_data(uuid)        to authenticated, service_role;

-- ── 7. what is in there now ───────────────────────────────────────

select (select count(*) from ngos where demo_mode)  as orgs_in_demo_mode,
       (select count(*) from dogs where is_demo)    as demo_animals,
       (select count(*) from cases where is_demo)   as demo_cases,
       (select count(*) from sightings where is_demo) as demo_sightings;
