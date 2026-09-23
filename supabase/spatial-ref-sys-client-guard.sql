-- PostGIS spatial_ref_sys client-write guard.
--
-- Supabase owns public.spatial_ref_sys as supabase_admin, so normal project
-- migrations running as postgres cannot enable RLS or revoke its platform ACLs.
-- The table is extension metadata, not StrayPaw application data.
--
-- This fail-closed trigger blocks all row-level writes from API client roles
-- while preserving PostGIS/admin maintenance. It is intentionally limited to
-- INSERT/UPDATE/DELETE because those are the DML operations reachable through
-- PostgREST. No data is changed by this migration.
--
-- Supabase Security Advisor may still report rls_disabled_in_public for this
-- extension-owned table because the advisor only checks the RLS flag; the guard
-- below closes the actual client-write path without taking ownership away from
-- PostGIS.

create or replace function public.guard_spatial_ref_sys_client_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if current_user in ('anon', 'authenticated', 'service_role') then
    raise exception 'spatial_ref_sys is read-only to API clients'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_spatial_ref_sys_client_write
  on public.spatial_ref_sys;

create trigger guard_spatial_ref_sys_client_write
before insert or update or delete
on public.spatial_ref_sys
for each row
execute function public.guard_spatial_ref_sys_client_write();

revoke execute on function public.guard_spatial_ref_sys_client_write()
  from public, anon, authenticated, service_role;
