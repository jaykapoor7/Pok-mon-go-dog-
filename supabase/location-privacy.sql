-- ════════════════════════════════════════════════════════════════
-- StrayPaw — location privacy: exact coordinates for partner NGOs only.
--
-- Run ONCE in the Supabase SQL editor (idempotent).
--
-- Model: the public app already shows only a GENERAL area (coordinates are
-- rounded to ~1km in the read layer — see src/lib/data.ts), so regular users
-- never receive exact pins through the app. This migration adds the privileged
-- path for VERIFIED PARTNER NGOs to read exact coordinates.
--
-- To grant a partner NGO exact access, add their auth user id:
--     insert into ngo_members (user_id) values ('<auth-user-uuid>');
-- (find the id in Supabase → Authentication → Users, or auth.users).
-- ════════════════════════════════════════════════════════════════

-- 1. Who is a partnered-NGO member.
create table if not exists ngo_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  ngo_id     uuid,
  created_at timestamptz not null default now()
);

alter table ngo_members enable row level security;
-- A member may read only their own membership row.
drop policy if exists ngo_members_self on ngo_members;
create policy ngo_members_self on ngo_members
  for select using (user_id = auth.uid());

-- 2. Is the caller a verified partner NGO?
create or replace function is_ngo_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from ngo_members where user_id = auth.uid());
$$;

-- 3. Exact coordinates for a set of dogs — ONLY for NGO members.
--    Returns nothing for everyone else, so it's safe to grant broadly.
create or replace function get_precise_locations(p_ids uuid[])
returns table (id uuid, lat double precision, lng double precision)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_ngo_member() then
    return; -- non-members get an empty set
  end if;
  return query
    select d.id, d.lat, d.lng from dogs d where d.id = any(p_ids);
end;
$$;

-- 4. Grants.
grant execute on function is_ngo_member() to anon, authenticated;
grant execute on function get_precise_locations(uuid[]) to anon, authenticated;
