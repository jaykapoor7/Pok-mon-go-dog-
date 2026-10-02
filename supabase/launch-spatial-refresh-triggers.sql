-- Refresh derived public counts when visibility, care, status or recency changes.
-- No animal, case, care or sighting rows are rewritten by this migration.
create or replace function public.queue_spatial_from_dog()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op<>'DELETE' then perform public.enqueue_spatial_refresh(new.city,'animal_change'); end if;
  if tg_op='DELETE' or (tg_op='UPDATE' and old.city is distinct from new.city) then
    perform public.enqueue_spatial_refresh(old.city,'animal_moved_or_removed');
  end if;
  return null;
end $$;
drop trigger if exists queue_spatial_after_dog_change on public.dogs;
create trigger queue_spatial_after_dog_change after insert or delete or update of
  city,state,zone,lat,lng,district,h3_r8,species,needs_help,status,provenance,is_demo,last_seen,
  sterilisation_status,vaccination_status,sterilised,vaccinated on public.dogs
for each row execute function public.queue_spatial_from_dog();

create or replace function public.queue_spatial_from_case()
returns trigger language plpgsql security definer set search_path=public as $$
declare dog_city text; old_dog_city text;
begin
  if tg_op<>'DELETE' then
    select d.city into dog_city from public.dogs d where d.id=new.dog_id;
    perform public.enqueue_spatial_refresh(coalesce(new.city,dog_city),'case_change');
    if dog_city is distinct from new.city then perform public.enqueue_spatial_refresh(dog_city,'linked_case_change'); end if;
  end if;
  if tg_op<>'INSERT' then
    select d.city into old_dog_city from public.dogs d where d.id=old.dog_id;
    perform public.enqueue_spatial_refresh(coalesce(old.city,old_dog_city),'previous_case_change');
    if old_dog_city is distinct from old.city then perform public.enqueue_spatial_refresh(old_dog_city,'previous_linked_case_change'); end if;
  end if;
  return null;
end $$;
drop trigger if exists queue_spatial_after_case_change on public.cases;
create trigger queue_spatial_after_case_change after insert or delete or update of
  status,status_class,city,h3_r8,dog_id,resolved_at,is_demo,provenance on public.cases
for each row execute function public.queue_spatial_from_case();

create or replace function public.queue_spatial_from_care()
returns trigger language plpgsql security definer set search_path=public as $$
declare dog_city text;
begin
  if tg_op<>'DELETE' then
    select d.city into dog_city from public.dogs d where d.id=new.dog_id;
    perform public.enqueue_spatial_refresh(dog_city,'care_change');
  end if;
  if tg_op<>'INSERT' then
    select d.city into dog_city from public.dogs d where d.id=old.dog_id;
    perform public.enqueue_spatial_refresh(dog_city,'previous_care_change');
  end if;
  return null;
end $$;
revoke all on function public.queue_spatial_from_care() from public,anon,authenticated;
drop trigger if exists queue_spatial_after_care_change on public.medical_events;
create trigger queue_spatial_after_care_change after insert or delete or update of dog_id,is_demo on public.medical_events
for each row execute function public.queue_spatial_from_care();

-- Repair the derived city affected by the earlier QA visibility change.
select public.enqueue_spatial_refresh('Coimbatore','visibility_refresh_corrected');
