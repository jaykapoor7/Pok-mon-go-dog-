-- ════════════════════════════════════════════════════════════════
-- StrayPaw — merge duplicate dog profiles into one.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Requires the
-- ngo_members table + is_ngo_member() from location-privacy.sql.
--
-- When the SAME dog has been logged as two separate profiles (e.g. sighted far
-- apart on different days), a verified partner NGO can merge them: every
-- sighting / case / record moves onto the kept profile's timeline and the
-- duplicate is removed. Aggregates are recomputed so counts stay correct.
-- ════════════════════════════════════════════════════════════════

create or replace function merge_dogs(p_keep uuid, p_remove uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_ngo_member() then return false; end if;
  if p_keep = p_remove or p_keep is null or p_remove is null then return false; end if;
  if not exists (select 1 from dogs where id = p_keep) then return false; end if;
  if not exists (select 1 from dogs where id = p_remove) then return false; end if;

  -- Re-point every child record from the duplicate onto the kept profile.
  update sightings     set dog_id = p_keep where dog_id = p_remove;
  update feed_events   set dog_id = p_keep where dog_id = p_remove;
  update vaccinations  set dog_id = p_keep where dog_id = p_remove;
  update sterilisations set dog_id = p_keep where dog_id = p_remove;
  update comments      set dog_id = p_keep where dog_id = p_remove;
  -- Cases reference a dog too (NGO continuity).
  begin
    update cases set dog_id = p_keep where dog_id = p_remove;
  exception when undefined_table then null; end;

  -- Recompute the kept dog's aggregates from its (now combined) sightings.
  select count(*) into v_count from sightings where dog_id = p_keep and status = 'live';
  update dogs set
    sightings_count = greatest(v_count, 1),
    last_seen = (select max(created_at) from sightings where dog_id = p_keep and status = 'live'),
    feed_count = (select count(*) from feed_events where dog_id = p_keep),
    -- Keep the strongest care status across both.
    needs_help  = needs_help  or (select coalesce(bool_or(needs_help),  false) from dogs where id = p_remove),
    vaccinated  = vaccinated  or (select coalesce(bool_or(vaccinated),  false) from dogs where id = p_remove),
    sterilised  = sterilised  or (select coalesce(bool_or(sterilised),  false) from dogs where id = p_remove),
    name = coalesce(name, (select name from dogs where id = p_remove))
  where id = p_keep;

  delete from dogs where id = p_remove;
  return true;
end;
$$;

grant execute on function merge_dogs(uuid, uuid) to authenticated;
