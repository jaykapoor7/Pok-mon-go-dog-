-- PROPOSED ONLY. Separate production approval required. Never overwrite newer work.
begin;
lock table public.cases, public.data_sources, public.provenance_corrections in share row exclusive mode;
do $$ begin
  if exists (
    select 1 from public.provenance_corrections pc
    left join public.cases c on pc.table_name='cases' and pc.row_id=c.id
    left join public.data_sources s on pc.table_name='data_sources' and pc.row_id=s.id
    where pc.batch='2026-11-cleanup' and pc.reverted_at is null and (
      (pc.table_name='cases' and (c.id is null or
        case pc.column_name when 'verification_state' then c.verification_state
          when 'provenance' then c.provenance end is distinct from pc.new_value)) or
      (pc.table_name='data_sources' and (s.id is null or s.record_scope is distinct from pc.new_value)) or
      pc.table_name not in ('cases','data_sources') or
      (pc.table_name='cases' and pc.column_name not in ('verification_state','provenance')) or
      (pc.table_name='data_sources' and pc.column_name<>'record_scope')
    )
  ) then raise exception 'Rollback stopped: a corrected row changed or is missing. Review it; do not overwrite newer work.'; end if;
end $$;
update public.cases c set verification_state = pc.old_value
from public.provenance_corrections pc
where pc.batch = '2026-11-cleanup' and pc.table_name = 'cases' and pc.column_name = 'verification_state' and pc.row_id = c.id and pc.reverted_at is null;
update public.cases c set provenance = pc.old_value
from public.provenance_corrections pc
where pc.batch = '2026-11-cleanup' and pc.table_name = 'cases' and pc.column_name = 'provenance' and pc.row_id = c.id and pc.reverted_at is null;
update public.data_sources s set record_scope = pc.old_value
from public.provenance_corrections pc
where pc.batch = '2026-11-cleanup' and pc.table_name = 'data_sources' and pc.row_id = s.id and pc.reverted_at is null;
update public.provenance_corrections set reverted_at = now() where batch = '2026-11-cleanup' and reverted_at is null;
-- Restore any rewritten public views from the definitions saved at execution time, then:
-- refresh materialized view public.public_spatial_animals_cache;
-- The record_scope column, provenance_corrections table and operational_animals view
-- may stay (all neutral once reverted) or be dropped:
-- drop view public.operational_animals; alter table public.data_sources drop column record_scope;
commit;
