-- Count each public dog once without joining and sorting every story row.
-- Keep city attribution on the dog: historical case cities can be districts.
create or replace function public.count_public_case_stories(p_city text default null)
returns bigint language plpgsql stable security definer
set search_path=public set max_parallel_workers_per_gather=0 set jit=off as $$
declare total bigint;
begin
  if p_city is null then
    select count(*) into total from public.dogs d
    where not coalesce(d.is_demo,false) and d.species='dog'
      and exists (select 1 from public.cases c where c.dog_id=d.id and not coalesce(c.is_demo,false));
  else
    select count(*) into total from public.dogs d
    where not coalesce(d.is_demo,false) and d.species='dog'
      and (btrim(lower(d.city))=btrim(lower(p_city))
        or (p_city='Delhi' and d.city='New Delhi')
        or (p_city='Hyderabad' and d.city='Secunderabad'))
      and exists (select 1 from public.cases c where c.dog_id=d.id and not coalesce(c.is_demo,false));
  end if;
  return total;
end $$;

-- These small aggregate reads otherwise spend more time compiling JIT code
-- than counting records. Preserve their existing grants and count semantics.
alter function public.list_public_org_impacts() set jit=off;
