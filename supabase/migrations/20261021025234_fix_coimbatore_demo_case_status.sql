-- The spatial aggregate intentionally recognises `in_progress` as an active
-- case class. Keep the fictional staging intake consistent with that real
-- workflow state rather than carrying a legacy `open` enum value.
update public.cases
set status = 'in_progress'
where id = '60000000-0000-4000-8000-000000000001'
  and status::text = 'open';

select public.rebuild_spatial_city('Coimbatore');
