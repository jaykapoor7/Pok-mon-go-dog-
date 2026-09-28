-- Community reports need an explicit care signal in the partner queue. The
-- function remains limited to verified organisation members and never returns
-- a resident's contact information.

drop function if exists public.org_incoming(text, text, integer, integer);

create function public.org_incoming(
  p_source text default 'ours',
  p_zone text default null,
  p_limit int default 100,
  p_offset int default 0
) returns table(
  id uuid,
  photo_url text,
  zone text,
  lat float,
  lng float,
  nickname text,
  notes text,
  mood_tags text[],
  sterilisation_status text,
  vaccination_status text,
  reported_by text,
  status text,
  created_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
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
         s.mood_tags, s.sterilisation_status, s.vaccination_status,
         coalesce(nullif(btrim(s.volunteer_name), ''),
                  nullif(btrim(s.reporter_name), ''), 'Anonymous') as reported_by,
         s.status, s.created_at,
         count(*) over () as total_count
    from scoped s
   order by case
              when p_source = 'community' and s.mood_tags && array['injured', 'hungry', 'puppies'] then 0
              else 1
            end,
            s.created_at desc
   limit greatest(least(p_limit, 500), 1)
  offset greatest(p_offset, 0);
$$;

revoke execute on function public.org_incoming(text, text, integer, integer) from public, anon;
grant execute on function public.org_incoming(text, text, integer, integer) to authenticated, service_role;
