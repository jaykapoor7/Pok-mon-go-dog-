-- STAGING ONLY: puts the public demo's sample workspace back to a known starting state.
-- Applied separately to staging (ucxfxiddufwqithtdtix). NEVER run on production:
-- every function refuses to run unless the sample organisation exists.
--
-- Scope: rows of the sample organisation (d0…a0) and the sample municipal office (d0…b0),
-- and the rows hanging off them (case notes, care, package claims and decisions).
-- The operational audit log is never touched. Accounts and memberships are never touched
-- (demo_account_guard protects them separately).
--
--   select public.demo_snapshot_sample_workspace();  -- record the current state as the baseline
--   select public.demo_reset_sample_workspace();     -- remove what visitors added, restore what they changed
--
-- A nightly pg_cron job runs the reset. To remove: unschedule 'demo-sample-reset',
-- drop both functions, demo_private.scope_sql and the demo_private schema.

create schema if not exists demo_private;
revoke all on schema demo_private from public, anon, authenticated;

create table if not exists demo_private.baseline (
  tbl text not null, pk jsonb not null, row jsonb not null, taken_at timestamptz not null default now(),
  primary key (tbl, pk));
revoke all on demo_private.baseline from public, anon, authenticated;

/* Which rows of each table belong to the sample workspace. Parents first. */
create or replace function demo_private.scope_sql(t text) returns text language sql immutable as $f$
  select case t
    when 'ngos' then 'id = ''d0000000-0000-4000-8000-0000000000a0'''
    when 'review_offices' then 'id = ''d0000000-0000-4000-8000-0000000000b0'''
    when 'operations_contracts' then 'ngo_id = ''d0000000-0000-4000-8000-0000000000a0'' or office_id = ''d0000000-0000-4000-8000-0000000000b0'''
    when 'operations_contract_rates' then 'contract_id in (select id from public.operations_contracts where ngo_id = ''d0000000-0000-4000-8000-0000000000a0'' or office_id = ''d0000000-0000-4000-8000-0000000000b0'')'
    when 'report_packages' then 'ngo_id = ''d0000000-0000-4000-8000-0000000000a0'' or office_id = ''d0000000-0000-4000-8000-0000000000b0'''
    when 'case_updates' then 'case_id in (select id from public.cases where ngo_id = ''d0000000-0000-4000-8000-0000000000a0'')'
    when 'programme_zone_staff' then 'zone_id in (select id from public.programme_work_zones where ngo_id = ''d0000000-0000-4000-8000-0000000000a0'')'
    when 'medical_events' then 'dog_id in (select id from public.dogs where ngo_id = ''d0000000-0000-4000-8000-0000000000a0'') or case_id in (select id from public.cases where ngo_id = ''d0000000-0000-4000-8000-0000000000a0'')'
    else case when t in ('package_events','operations_package_configurations','operations_package_claims','operations_item_decisions','operations_payment_evidence','operations_package_snapshots')
      then 'package_id in (select id from public.report_packages where ngo_id = ''d0000000-0000-4000-8000-0000000000a0'' or office_id = ''d0000000-0000-4000-8000-0000000000b0'')'
      else 'ngo_id = ''d0000000-0000-4000-8000-0000000000a0''' end
  end
$f$;

create or replace function demo_private.tables() returns text[] language sql immutable as $f$
  select array['ngos','review_offices','dogs','cases','case_updates','medical_events','animal_followups','animal_timeline_events',
    'animal_operation_events','animal_operation_reviews','abc_attestations','evidence_items','documents','animal_identifiers','sightings',
    'operations_contracts','operations_contract_rates','operations_policies','report_packages','package_events',
    'operations_package_configurations','operations_package_claims','operations_item_decisions','operations_payment_evidence',
    'operations_package_snapshots','operations_receipts','case_stories','campaigns','surveys','feeding_zones','training_courses',
    'training_assignments','programme_work_zones','org_invite_codes','org_email_invites','volunteers',
    'field_vaccination_receipts','programme_zone_receipts','programme_zone_staff','operations_survey_assessments']
$f$;

create or replace function demo_private.pk_expr(t text, alias text) returns text language sql stable as $f$
  select 'jsonb_build_object(' || string_agg(format('%L, %s.%I', a.attname, alias, a.attname), ', ' order by a.attnum) || ')'
  from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  where i.indrelid = format('public.%I', t)::regclass and i.indisprimary
$f$;

create or replace function demo_private.assert_staging() returns void language plpgsql as $f$
begin
  if not exists (select 1 from public.ngos where id = 'd0000000-0000-4000-8000-0000000000a0' and name like 'Sample%') then
    raise exception 'Not the staging demo database: the sample organisation is missing.';
  end if;
end $f$;

create or replace function public.demo_snapshot_sample_workspace() returns text
language plpgsql security definer set search_path = '' as $f$
declare t text; n int; total int := 0;
begin
  perform demo_private.assert_staging();
  delete from demo_private.baseline;
  foreach t in array demo_private.tables() loop
    execute format('insert into demo_private.baseline (tbl, pk, row) select %L, %s, to_jsonb(x) from public.%I x where %s',
      t, demo_private.pk_expr(t, 'x'), t, demo_private.scope_sql(t));
    get diagnostics n = row_count; total := total + n;
  end loop;
  return format('baseline: %s rows', total);
end $f$;

create or replace function public.demo_reset_sample_workspace() returns text
language plpgsql security definer set search_path = '' as $f$
declare t text; i int; tabs text[] := demo_private.tables(); cols text; n int; removed int := 0; restored int := 0; added int := 0;
begin
  perform demo_private.assert_staging();
  if not exists (select 1 from demo_private.baseline) then raise exception 'No baseline. Run demo_snapshot_sample_workspace() first.'; end if;
  -- 1. Remove what is not in the baseline, children first.
  for i in reverse array_length(tabs, 1) .. 1 loop
    t := tabs[i];
    execute format('delete from public.%I x where (%s) and not exists (select 1 from demo_private.baseline b where b.tbl = %L and b.pk = %s)',
      t, demo_private.scope_sql(t), t, demo_private.pk_expr(t, 'x'));
    get diagnostics n = row_count; removed := removed + n;
  end loop;
  -- 2. Put back what was deleted and undo what was changed, parents first. Triggers are paused for this
  --    step only (this transaction), so restored rows come back exactly as recorded: no re-stamped codes,
  --    no duplicate timeline or audit entries. Parents are restored before children, so references hold.
  perform set_config('session_replication_role', 'replica', true);
  foreach t in array tabs loop
    select string_agg(format('%I', attname), ', ' order by attnum) into cols
      from pg_attribute where attrelid = format('public.%I', t)::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity <> 'a';
    execute format('insert into public.%I (%s) select %s from demo_private.baseline b, jsonb_populate_record(null::public.%I, b.row) r where b.tbl = %L and not exists (select 1 from public.%I x where %s = b.pk)',
      t, cols, (select string_agg('r.' || c, ', ') from unnest(string_to_array(cols, ', ')) c), t, t, t, demo_private.pk_expr(t, 'x'));
    get diagnostics n = row_count; added := added + n;
    execute format('update public.%I x set (%s) = (select %s from jsonb_populate_record(null::public.%I, b.row) r) from demo_private.baseline b where b.tbl = %L and b.pk = %s and to_jsonb(x) is distinct from b.row',
      t, cols, (select string_agg('r.' || c, ', ') from unnest(string_to_array(cols, ', ')) c), t, t, demo_private.pk_expr(t, 'x'));
    get diagnostics n = row_count; restored := restored + n;
  end loop;
  perform set_config('session_replication_role', 'origin', true);
  return format('removed %s, restored %s, put back %s', removed, restored, added);
end $f$;

revoke all on function public.demo_snapshot_sample_workspace() from public, anon, authenticated;
revoke all on function public.demo_reset_sample_workspace() from public, anon, authenticated;
revoke all on all functions in schema demo_private from public, anon, authenticated;
