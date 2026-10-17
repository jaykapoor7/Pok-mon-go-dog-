-- ════════════════════════════════════════════════════════════════
-- StrayPaw 2.0 release: volunteer sign-ups are organisation-private.
--
-- The defect (helpers-volunteers.sql): org_volunteers() is SECURITY
-- DEFINER and only checked is_ngo_member(), so a member of ANY
-- organisation read every volunteer sign-up in StrayPaw, with names,
-- phone numbers and email addresses (up to 300 rows).
--
-- The rule now, enforced here in the database:
--   An organisation sees a volunteer sign-up only when
--     (a) the person offered to help an animal that organisation keeps
--         (helpers.dog_id → dogs.ngo_id), or
--     (b) a StrayPaw operator routed the sign-up to that organisation
--         (helpers.routed_ngo_id), through route_helper(), which only
--         the service role (the operator console) may call.
--   General sign-ups nobody has routed stay with operators only.
--   Within an organisation, members with the 'volunteer' role do not see
--   other volunteers' contact details (the Team page promises volunteers
--   "see nothing private").
--   NGO registrations (is_ngo = true) are never returned to NGOs.
--
-- The helpers table still has no SELECT policy for anon or
-- authenticated: org_volunteers() is the only read path for members.
-- Idempotent; additive (one nullable column, one index); safe to re-run.
-- Depends on: helpers.sql, helpers-acknowledge.sql, ngo_members, dogs.ngo_id.
-- ════════════════════════════════════════════════════════════════

alter table public.helpers add column if not exists routed_ngo_id uuid references public.ngos(id) on delete set null;
alter table public.helpers add column if not exists routed_at timestamptz;
create index if not exists helpers_routed_ngo_idx on public.helpers (routed_ngo_id) where routed_ngo_id is not null;
create index if not exists helpers_dog_idx on public.helpers (dog_id) where dog_id is not null;

create or replace function public.org_volunteers()
returns table(id uuid, name text, contact text, message text, zone text, dog_id uuid, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select h.id, h.name, h.contact, h.message, h.zone, h.dog_id, h.created_at
  from public.helpers h
  left join public.dogs d on d.id = h.dog_id
  join public.ngo_members m
    on m.user_id = (select auth.uid())
   and coalesce(m.role, 'member') <> 'volunteer'
  where not h.is_ngo
    and (d.ngo_id = m.ngo_id or h.routed_ngo_id = m.ngo_id)
  order by h.created_at desc
  limit 300;
$$;

revoke all on function public.org_volunteers() from public, anon;
grant execute on function public.org_volunteers() to authenticated;

/* The designed sharing workflow: an operator routes a general sign-up to one
   organisation (or clears it with null). Service role only. */
create or replace function public.route_helper(p_helper uuid, p_ngo uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_ngo is not null and not exists (select 1 from public.ngos where id = p_ngo) then
    raise exception 'unknown organisation';
  end if;
  update public.helpers set routed_ngo_id = p_ngo, routed_at = case when p_ngo is null then null else now() end
  where id = p_helper and not is_ngo;
  return found;
end;
$$;

revoke all on function public.route_helper(uuid, uuid) from public, anon, authenticated;
grant execute on function public.route_helper(uuid, uuid) to service_role;
