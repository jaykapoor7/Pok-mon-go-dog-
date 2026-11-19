-- Proposed, not applied. A recorded sterilisation or vaccination sets the animal's status.
--
-- Why: every figure in StrayPaw (NGO home, Animals, Programmes, government coverage, reports, Kaju, the public map)
-- counts an animal as sterilised or vaccinated from dogs.sterilisation_status / dogs.vaccination_status. Nothing ties
-- a care event to that status: a sterilisation recorded as care leaves the animal "not recorded". On production
-- (read-only check, 18 Nov 2026) The Pawsome People Project has 103 animals with a sterilisation event and 102 with the
-- status; the one missing (21f28de5-9351-4e6d-a2d9-972546c58738, sterilised 29 Sep 2026, recorded in StrayPaw, not
-- imported) is counted nowhere. Vaccinations agree today (67 and 67), by luck of the import, not by rule.
--
-- What it does: (1) after a care event of kind 'sterilisation' or 'vaccination' is inserted, the animal's status is
-- set to 'sterilised' / 'vaccinated' (a demo event is left alone); (2) once, the same for every existing event.
-- Additive and safe to re-run: one function, one trigger, one idempotent update. It never sets a status back to
-- unknown and never touches an animal without such an event. The existing dogs_sync_status trigger keeps the
-- sterilised / vaccinated booleans in step.
-- Rollback: supabase/proposed/2026-11-18-care-sets-status.rollback.sql (drops the trigger and function; statuses set
-- by the backfill stay, since each is backed by a recorded event).

create or replace function public.care_sets_dog_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce((to_jsonb(new) ->> 'is_demo')::boolean, false) or new.dog_id is null then return new; end if;
  if new.kind = 'sterilisation' then
    update public.dogs set sterilisation_status = 'sterilised'
     where id = new.dog_id and sterilisation_status is distinct from 'sterilised';
  elsif new.kind = 'vaccination' then
    update public.dogs set vaccination_status = 'vaccinated'
     where id = new.dog_id and vaccination_status is distinct from 'vaccinated';
  end if;
  return new;
end $$;
revoke all on function public.care_sets_dog_status() from public, anon, authenticated;

drop trigger if exists medical_events_set_dog_status on public.medical_events;
create trigger medical_events_set_dog_status after insert on public.medical_events
  for each row execute function public.care_sets_dog_status();

-- The one-time backfill, from the events already recorded.
update public.dogs d set sterilisation_status = 'sterilised'
 where d.sterilisation_status is distinct from 'sterilised'
   and exists (select 1 from public.medical_events m where m.dog_id = d.id and m.kind = 'sterilisation'
                and not coalesce((to_jsonb(m) ->> 'is_demo')::boolean, false));
update public.dogs d set vaccination_status = 'vaccinated'
 where d.vaccination_status is distinct from 'vaccinated'
   and exists (select 1 from public.medical_events m where m.dog_id = d.id and m.kind = 'vaccination'
                and not coalesce((to_jsonb(m) ->> 'is_demo')::boolean, false));
