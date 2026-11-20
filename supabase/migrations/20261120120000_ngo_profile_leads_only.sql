-- An organisation's public profile is changed by its leads and coordinators only.
--
-- ngo_update_profile checked only that the caller was a member of some organisation, so any field worker, vet or
-- volunteer could rewrite the public page: mission, contact email and phone, logo and cover (found on staging, and the
-- production definition is the same). The NGO Settings page now shows the profile read-only to everyone else; this
-- makes the database refuse them too. Same signature, same return shape, same update.
--
-- Not applied automatically: apply with the usual migration step. Safe to re-run. To undo, re-run the definition in
-- supabase/org-profiles.sql.

create or replace function public.ngo_update_profile(
  p_mission         text default null,
  p_about           text default null,
  p_website         text default null,
  p_contact_email   text default null,
  p_contact_phone   text default null,
  p_city            text default null,
  p_state           text default null,
  p_areas_of_work   text[] default null,
  p_logo_url        text default null,
  p_cover_photo     text default null,
  p_founded_year    int default null,
  p_registration_no text default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_ngo uuid;
begin
  if not exists (select 1 from ngo_members where user_id = auth.uid()) then
    return json_build_object('ok', false, 'error', 'Not a partner organization.');
  end if;
  select ngo_id into v_ngo from ngo_members
   where user_id = auth.uid() and role in ('admin', 'lead', 'coordinator')
   order by created_at limit 1;
  if v_ngo is null then
    return json_build_object('ok', false, 'error', 'Only the organisation''s leads and coordinators change its public profile.');
  end if;

  update ngos set
    mission         = coalesce(p_mission, mission),
    about           = coalesce(p_about, about),
    website         = coalesce(p_website, website),
    contact_email   = coalesce(p_contact_email, contact_email),
    contact_phone   = coalesce(p_contact_phone, contact_phone),
    city            = coalesce(p_city, city),
    state           = coalesce(p_state, state),
    areas_of_work   = coalesce(p_areas_of_work, areas_of_work),
    logo_url        = coalesce(p_logo_url, logo_url),
    cover_photo     = coalesce(p_cover_photo, cover_photo),
    founded_year    = coalesce(p_founded_year, founded_year),
    registration_no = coalesce(p_registration_no, registration_no)
  where id = v_ngo;

  return json_build_object('ok', true, 'ngo_id', v_ngo);
end $$;

revoke all on function public.ngo_update_profile(text,text,text,text,text,text,text,text[],text,text,int,text) from public, anon;
grant execute on function public.ngo_update_profile(text,text,text,text,text,text,text,text[],text,text,int,text) to authenticated;
