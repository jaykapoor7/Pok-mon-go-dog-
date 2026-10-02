-- Drain only cities already queued by record changes. No visitor-triggered
-- register rebuilds and no production records are altered by this worker.
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.drain_spatial_refresh_queue(p_limit integer default 4)
returns jsonb language plpgsql security definer set search_path=public
set statement_timeout='50s' as $$
declare item record; refreshed jsonb := '[]'::jsonb; cells integer;
begin
  if not pg_try_advisory_xact_lock(734921618) then return refreshed; end if;
  for item in
    select city from public.spatial_refresh_queue order by requested_at
      limit least(10,greatest(1,p_limit)) for update skip locked
  loop
    cells := public.rebuild_spatial_city(item.city);
    refreshed := refreshed || jsonb_build_array(jsonb_build_object('city',item.city,'cells',cells));
  end loop;
  return refreshed;
end $$;
revoke all on function public.drain_spatial_refresh_queue(integer) from public,anon,authenticated;
grant execute on function public.drain_spatial_refresh_queue(integer) to service_role;
select cron.schedule('straypaw-spatial-refresh','* * * * *','select public.drain_spatial_refresh_queue(4)');
