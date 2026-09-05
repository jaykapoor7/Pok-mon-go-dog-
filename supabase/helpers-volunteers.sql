-- ════════════════════════════════════════════════════════════════
-- Volunteers for the partner dashboard, verified NGO members can see people
-- who signed up to help (feed, transport, foster, etc.) and reach out to them.
-- Depends on: helpers.sql (helpers table), location-privacy.sql (is_ngo_member).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════
create or replace function org_volunteers()
returns table(id uuid, name text, contact text, message text, zone text, dog_id uuid, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select id, name, contact, message, zone, dog_id, created_at
  from helpers
  where is_ngo_member() and not is_ngo
  order by created_at desc
  limit 300;
$$;

grant execute on function org_volunteers() to authenticated;
