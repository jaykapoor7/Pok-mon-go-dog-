-- Rollback for 20261119120000_people_names.sql: the three functions as they were, then drop the helper.
create or replace function public.nx_my_dms(p_org uuid)
 returns table(channel_id uuid, other_id uuid, other_name text, last_at timestamp with time zone)
 language sql stable security definer set search_path to 'public'
as $function$
  select c.id, o.user_id,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), 'A colleague'),
         (select max(m.created_at) from nx_messages m where m.channel_id = c.id)
    from nx_channels c
    join nx_channel_members me on me.channel_id = c.id and me.user_id = auth.uid()
    join nx_channel_members o on o.channel_id = c.id and o.user_id <> auth.uid()
    join auth.users u on u.id = o.user_id
   where c.org_id = p_org and c.kind = 'dm' and public.nx_is_member(p_org);
$function$;
create or replace function public.nx_org_people(p_org uuid)
 returns table(user_id uuid, name text, role text)
 language sql stable security definer set search_path to 'public'
as $function$
  select distinct on (x.user_id) x.user_id,
         coalesce(nullif(btrim(u.raw_user_meta_data->>'name'), ''), nullif(btrim(u.raw_user_meta_data->>'full_name'), ''), 'A colleague'),
         x.role
    from (select user_id, role::text from ngo_members where ngo_id = p_org
          union all select user_id, role::text from oh_members where organisation_id = p_org
          union all select user_id, role::text from review_office_members where office_id = p_org) x
    join auth.users u on u.id = x.user_id
   where public.nx_is_member(p_org)
   order by x.user_id;
$function$;
create or replace function public.nx_programme_people(p_programme uuid)
 returns table(user_id uuid, name text, org_name text)
 language sql stable security definer set search_path to 'public'
as $function$
  select distinct on (u.user_id) u.user_id, coalesce(nullif(trim(u.display), ''), 'A colleague'), o.name
    from oh_participations pp join oh_organisations o on o.id = pp.organisation_id
    cross join lateral (
      select m.user_id, m.display_name as display from oh_members m where m.organisation_id = o.id
      union all
      select nm.user_id, null from ngo_members nm where o.ngo_id is not null and nm.ngo_id = o.ngo_id) u
   where oh_can_manage(p_programme) and pp.programme_id in (select id from oh_programme_line(p_programme));
$function$;
drop function if exists public.nx_person_name(uuid);
