-- Exact rollback of 2026-11-01-data-cleanup.sql, from provenance_corrections.
begin;
update public.cases c set verification_state = pc.old_value
from public.provenance_corrections pc
where pc.batch = '2026-11-cleanup' and pc.table_name = 'cases' and pc.column_name = 'verification_state' and pc.row_id = c.id and pc.reverted_at is null;
update public.cases c set provenance = pc.old_value
from public.provenance_corrections pc
where pc.batch = '2026-11-cleanup' and pc.table_name = 'cases' and pc.column_name = 'provenance' and pc.row_id = c.id and pc.reverted_at is null;
update public.data_sources s set record_scope = 'operational'
from public.provenance_corrections pc
where pc.batch = '2026-11-cleanup' and pc.table_name = 'data_sources' and pc.row_id = s.id and pc.reverted_at is null;
update public.provenance_corrections set reverted_at = now() where batch = '2026-11-cleanup' and reverted_at is null;
-- Restore any rewritten public views from the definitions saved at execution time, then:
-- refresh materialized view public.public_spatial_animals_cache;
-- The record_scope column, provenance_corrections table and operational_animals view
-- may stay (all neutral once reverted) or be dropped:
-- drop view public.operational_animals; alter table public.data_sources drop column record_scope;
commit;
