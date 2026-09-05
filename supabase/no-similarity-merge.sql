-- ════════════════════════════════════════════════════════════════
-- StrayPaw, remove merging by similarity.
--
-- WHY
--
-- merge_dogs(keep, remove) moved every sighting, feeding, vaccination,
-- sterilisation, comment and case from one animal onto another and then
-- ran `delete from dogs where id = p_remove`. The interface that drove it
-- proposed candidates from a similarity score: distance, a shared name,
-- the same colour and size, the same zone. On an Indian street those
-- describe most of the dogs on the block.
--
-- The score is the problem. It reads as evidence and it is not: two brown
-- medium dogs 200 m apart in the same ward score highly and are usually
-- two dogs. Acting on that guess deletes a row, so the mistake cannot be
-- found later or undone. A wrongly merged pair is also invisible
-- afterwards, because the record that would have contradicted it is gone.
--
-- WHAT REPLACES IT
--
-- Nothing automatic. Where two records genuinely are one animal, a person
-- moves the observations across with relink_sighting() from
-- observation-identity.sql: one observation at a time, recording who made
-- the link and how sure they were, keeping both animal rows, and
-- recomputing both counts. That is reversible. This was not.
--
-- Idempotent. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

-- Guarded, because a bare revoke on a function that is already gone is an
-- error, and this file has to survive being run a second time. The drop
-- alone would remove the grants; the revoke is here so that a drop blocked
-- by a dependency still leaves nobody able to call it.
do $$
begin
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'merge_dogs'
       and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  ) then
    execute 'revoke execute on function merge_dogs(uuid, uuid) from authenticated, anon';
  end if;
end $$;

drop function if exists merge_dogs(uuid, uuid);

-- An animal record emptied by moving its observations elsewhere is left
-- standing rather than deleted, so the merge stays visible and reversible.
-- This reports them instead of removing them.
create or replace function animals_without_observations()
returns table (
  id         uuid,
  name       text,
  zone       text,
  first_seen timestamptz,
  last_seen  timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.zone, d.first_seen, d.last_seen
    from dogs d
   where d.ngo_id = my_ngo()
     and not exists (
       select 1 from sightings s
        where s.dog_id = d.id and s.status = 'live'
     )
   order by d.last_seen desc;
$$;

grant execute on function animals_without_observations()
  to authenticated, service_role;
