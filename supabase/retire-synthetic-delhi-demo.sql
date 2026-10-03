-- Retire legacy synthetic Delhi profiles. Public views already exclude rows
-- marked is_demo, so this leaves source data intact while removing the
-- sample records from public discovery and direct public profiles.
update public.dogs
set is_demo = true
where id::text like 'd0910000-0000-4000-8000-%'
  and not coalesce(is_demo, false);

-- A raw "I saw it today" RPC altered a shared record without review or a
-- confirmation. Public UI now routes sightings through /report instead.
revoke execute on function public.log_seen(uuid) from public, anon, authenticated;
