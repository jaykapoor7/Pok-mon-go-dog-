-- PRODUCTION DATA CLEANUP — PROPOSED, NOT APPLIED. Needs the owner's separate approval.
-- Plan, counts and reasons: docs/sp4/CLEANUP-PROPOSAL-2026-11.md.
-- Same steps as tested on staging on 2026-10-31 (DATA-PROVENANCE.md §8):
-- applied, reversed exactly, re-applied. Nothing is deleted. Every changed
-- value is saved in provenance_corrections first, so rollback is exact.
begin;

-- 0. Guard: refuse to run twice.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='data_sources' and column_name='record_scope') then
    raise exception 'record_scope already exists: cleanup already applied?';
  end if;
end $$;

-- 1. Scope, not delete.
alter table public.data_sources add column record_scope text not null default 'operational'
  check (record_scope in ('operational', 'research_archive'));

create table public.provenance_corrections (
  id bigserial primary key,
  batch text not null,
  table_name text not null,
  row_id uuid not null,
  column_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  corrected_at timestamptz not null default now(),
  reverted_at timestamptz
);
alter table public.provenance_corrections enable row level security;
revoke all on public.provenance_corrections from anon, authenticated;

-- The 14 research and public datasets (27,857 animals) become a research archive.
insert into public.provenance_corrections (batch, table_name, row_id, column_name, old_value, new_value, reason)
select '2026-11-cleanup', 'data_sources', s.id, 'record_scope', 'operational', 'research_archive', 'Research or public dataset, not operational work on StrayPaw'
from public.data_sources s
where s.slug <> 'kind-hour-rescue-register-2024-2026' and exists (select 1 from public.dogs d where d.data_source_id = s.id);
update public.data_sources s set record_scope = 'research_archive'
where s.id in (select row_id from public.provenance_corrections where batch = '2026-11-cleanup' and table_name = 'data_sources');

create view public.operational_animals with (security_invoker = true) as
  select d.* from public.dogs d
  where not exists (select 1 from public.data_sources s where s.id = d.data_source_id and s.record_scope = 'research_archive');
grant select on public.operational_animals to authenticated;

-- 2. Organisation-created cases mislabelled community_report (2 cases).
insert into public.provenance_corrections (batch, table_name, row_id, column_name, old_value, new_value, reason)
select '2026-11-cleanup', 'cases', c.id, 'provenance', c.provenance, 'operator_created', 'Opened by a member of the owning organisation'
from public.cases c
where c.provenance = 'community_report' and c.ngo_id is not null
  and exists (select 1 from public.ngo_members m where m.user_id = c.created_by_id and m.ngo_id = c.ngo_id);
update public.cases c set provenance = 'operator_created'
where c.id in (select row_id from public.provenance_corrections where batch = '2026-11-cleanup' and table_name = 'cases' and column_name = 'provenance');

-- 3. Imported cases shown as verified (2,280): an import is not a verification.
insert into public.provenance_corrections (batch, table_name, row_id, column_name, old_value, new_value, reason)
select '2026-11-cleanup', 'cases', c.id, 'verification_state', c.verification_state, 'source_record', 'Imported record; verification happens only through the review workflow'
from public.cases c where c.verification_state = 'verified' and c.import_batch_id is not null;
update public.cases c set verification_state = 'source_record'
where c.id in (select row_id from public.provenance_corrections where batch = '2026-11-cleanup' and table_name = 'cases' and column_name = 'verification_state');

-- 4. Public projections (public_spatial_animals_cache and the 12 public views
--    listed in DATA-PROVENANCE.md §7.3) gain the research_archive predicate.
--    Each view is regenerated from pg_get_viewdef at execution time, diffed and
--    reviewed one at a time, its previous definition saved beside this file,
--    then the cache is refreshed. Not scripted blind here on purpose.

-- 5. Expected after (checked before commit; any mismatch aborts):
do $$ begin
  if (select count(*) from public.operational_animals) <> 2431 then raise exception 'operational animals mismatch'; end if;
  if (select count(*) from public.dogs) <> 30288 then raise exception 'an animal row changed'; end if;
  if (select count(*) from public.cases) <> 23200 then raise exception 'a case row changed'; end if;
  if (select count(*) from public.cases where verification_state = 'verified' and import_batch_id is not null) <> 0 then raise exception 'imported verified remain'; end if;
end $$;
commit;
