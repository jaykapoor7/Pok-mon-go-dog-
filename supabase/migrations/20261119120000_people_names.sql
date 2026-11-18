-- People are shown by a name, not "A colleague" (owner's report, 2026-11-18: direct messages showed "Member (name not
-- added)" for real colleagues).
--
-- Nobody could set a display name in the app, so the people lists, direct messages and programme people fell back to
-- "A colleague" whenever the sign-in record had no name, and they never read display_name, which is where StrayPaw's own
-- sign-up keeps the name people give. One helper now picks, in order: the name on the sign-in record (display_name, name,
-- full_name), the display name the person's health organisation holds, the readable part of their email address
-- before the @ ("priya.nair7@…" → "Priya Nair"), and only then "A colleague". The three functions use it and are
-- otherwise unchanged. The helper is not callable by signed-in people or visitors (only these functions use it), so it
-- cannot be used to look up names by id.
--
-- Additive: one new function; three functions replaced with the same signature, filters and grants.
-- Rollback: supabase/rollback/20261119120000_people_names-rollback.sql

create or replace function public.nx_person_name(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(btrim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(btrim(u.raw_user_meta_data->>'name'), ''),
    nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
    (select nullif(btrim(m.display_name), '') from oh_members m where m.user_id = u.id and nullif(btrim(m.display_name), '') is not null limit 1),
    nullif(initcap(btrim(regexp_replace(regexp_replace(split_part(coalesce(u.email, ''), '@', 1), '[0-9]+', '', 'g'), '[._+-]+', ' ', 'g'))), ''),
    'A colleague')
  from auth.users u where u.id = p_user;
$$;
revoke all on function public.nx_person_name(uuid) from public, anon, authenticated;

create or replace function public.nx_my_dms(p_org uuid)
 returns table(channel_id uuid, other_id uuid, other_name text, last_at timestamp with time zone)
 language sql stable security definer set search_path to 'public'
as $function$
  select c.id, o.user_id,
         coalesce(public.nx_person_name(o.user_id), 'A colleague'),
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
         coalesce(public.nx_person_name(x.user_id), 'A colleague'),
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
  select distinct on (u.user_id) u.user_id, coalesce(nullif(trim(u.display), ''), public.nx_person_name(u.user_id), 'A colleague'), o.name
    from oh_participations pp join oh_organisations o on o.id = pp.organisation_id
    cross join lateral (
      select m.user_id, m.display_name as display from oh_members m where m.organisation_id = o.id
      union all
      select nm.user_id, null from ngo_members nm where o.ngo_id is not null and nm.ngo_id = o.ngo_id) u
   where oh_can_manage(p_programme) and pp.programme_id in (select id from oh_programme_line(p_programme));
$function$;
