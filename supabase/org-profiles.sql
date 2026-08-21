-- ════════════════════════════════════════════════════════════════
-- Organization profiles — turn the thin `ngos` directory row into a
-- credible public profile an NGO can send to any supporter or funder.
--
-- Depends on:
--   • schema.sql            → ngos table (public _read policy already exists)
--   • partner-onboarding.sql→ ngo_members, my_ngo(), is_ngo_member()
--
-- Everything is idempotent (add column if not exists / create or replace).
-- ════════════════════════════════════════════════════════════════

-- 1. Profile columns (all optional; nothing here fabricates trust).
alter table ngos add column if not exists slug            text;
alter table ngos add column if not exists mission         text;
alter table ngos add column if not exists about           text;
alter table ngos add column if not exists website         text;
alter table ngos add column if not exists contact_email   text;
alter table ngos add column if not exists contact_phone   text;
alter table ngos add column if not exists city            text;
alter table ngos add column if not exists state           text;
alter table ngos add column if not exists areas_of_work   text[] default '{}';
alter table ngos add column if not exists cover_photo     text;
alter table ngos add column if not exists founded_year    int;
alter table ngos add column if not exists registration_no text;
alter table ngos add column if not exists verified_at     timestamptz;

-- 2. Slug: stable, human-readable id for public URLs (/org/<slug>).
--    Backfill from name for existing rows, then guarantee uniqueness.
update ngos
set slug = trim(both '-' from regexp_replace(lower(coalesce(name, 'org')), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

-- De-duplicate any colliding slugs by appending a short id suffix.
do $$
declare r record;
begin
  for r in (
    select id, slug,
           row_number() over (partition by slug order by created_at) as rn
    from ngos
  ) loop
    if r.rn > 1 then
      update ngos set slug = r.slug || '-' || substr(r.id::text, 1, 4) where id = r.id;
    end if;
  end loop;
end $$;

create unique index if not exists ngos_slug_idx on ngos (slug);

-- Keep verified_at in sync for rows already flagged verified.
update ngos set verified_at = coalesce(verified_at, created_at) where verified and verified_at is null;

-- 3. Self-service profile editing — an org member edits ONLY their own org.
create or replace function ngo_update_profile(
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
  select ngo_id into v_ngo from ngo_members where user_id = auth.uid() limit 1;
  if v_ngo is null then
    return json_build_object('ok', false, 'error', 'Not a partner organization.');
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

grant execute on function ngo_update_profile(text,text,text,text,text,text,text,text[],text,text,int,text) to authenticated;
