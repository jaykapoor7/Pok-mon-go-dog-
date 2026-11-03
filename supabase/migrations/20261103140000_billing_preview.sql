-- One rule for which procedures belong to a reporting period, used by both
-- the billing preview and package preparation, so the NGO's preview, the
-- package and the municipal review can never disagree.
--
-- Depends on 20261103010239_municipal_items_and_contracts (PR #48).
--
-- Period basis: the procedure date (the latest recorded sterilisation or
-- vaccination event for the case), falling back to the case date only when
-- no procedure date exists; this is the rule PR #48's abc_create_package
-- already uses. Added here: imported historical and public-dataset records
-- are excluded, as in the verification queue.

create or replace function operations_private.package_candidates(p_ngo uuid, p_start date, p_end date)
returns table(case_id uuid, case_code text, procedure text, procedure_date date, created_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select c.id, c.case_code, c.category::text, d.procedure_date, c.created_at
  from public.cases c
  cross join lateral (
    select coalesce((select max(m.event_date) from public.medical_events m where m.case_id = c.id and m.kind in ('sterilisation','vaccination')), c.created_at::date) as procedure_date
  ) d
  where c.ngo_id = p_ngo
    and coalesce(c.provenance, '') not in ('imported_historical_record', 'public_dataset')
    and d.procedure_date between p_start and p_end
    and exists (select 1 from public.abc_attestations a where a.case_id = c.id and a.kind = 'evidence_reviewed' and a.revoked_at is null)
    and not public.operations_case_accepted(c.id)
    and not exists (select 1 from public.report_packages q where c.id = any (q.case_ids) and q.status <> 'returned' and (q.status = 'draft' or not public.operations_case_amendable(c.id)))
$$;
revoke all on function operations_private.package_candidates(uuid, date, date) from public, anon, authenticated;

-- Package preparation now uses the shared rule (same order as before).
create or replace function public.abc_create_package(p_title text, p_start date, p_end date, p_office uuid)
returns uuid language plpgsql security definer set search_path to pg_catalog, public, pg_temp as $function$
declare v_ngo uuid := public.my_ngo(); v_ids uuid[]; v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can prepare a report package'; end if;
  if not exists (select 1 from review_offices where id = p_office) then raise exception 'Choose a reviewing office'; end if;
  if p_start is null or p_end is null or p_end - p_start > 366 then raise exception 'Choose a reporting period up to 366 days'; end if;
  if p_end < p_start then raise exception 'The period ends before it starts'; end if;
  select array_agg(k.case_id order by k.created_at) into v_ids from operations_private.package_candidates(v_ngo, p_start, p_end) k;
  if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'No reviewed records in that period that are not already in a package'; end if;
  if array_length(v_ids, 1) > 2000 then raise exception 'Use a reporting period with at most 2,000 records'; end if;
  insert into report_packages (ngo_id, office_id, title, period_start, period_end, case_ids, summary, created_by, item_review_enabled)
  values (v_ngo, p_office, coalesce(nullif(btrim(p_title), ''), 'Report package'), p_start, p_end, v_ids,
          jsonb_build_object('records', array_length(v_ids, 1), 'vet_authorised', (select count(*) from abc_attestations a where a.case_id = any (v_ids) and a.kind = 'vet_authorised' and a.revoked_at is null),
                             'evidence_items', (select count(*) from evidence_items e where e.case_id = any (v_ids)), 'generated_at', now()),
          auth.uid(), true)
  returning id into v_id;
  insert into package_events (package_id, actor_id, actor_name, side, kind, body) values (v_id, auth.uid(), v_name, 'operator', 'created', null);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'report_package', v_id, 'abc_create_package', jsonb_build_object('records', array_length(v_ids, 1)));
  return v_id;
end $function$;

-- The billing preview: every candidate (no row cap), its procedure and the
-- rate from the one contract version that covers the whole period for this
-- operator and office. Read-only. Amounts are exact numeric; an unpriced
-- procedure makes the total unknown, never zero.
create or replace function public.abc_billing_preview(p_start date, p_end date, p_office uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_ngo uuid := public.my_ngo(); v_contract public.operations_contracts; v_claims jsonb; v_total numeric; v_unpriced int; v_n int;
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can see the billing preview'; end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 366 then raise exception 'Choose a reporting period up to 366 days'; end if;
  if not exists (select 1 from review_offices where id = p_office) then raise exception 'Choose a reviewing office'; end if;
  select * into v_contract from public.operations_contracts c
   where c.ngo_id = v_ngo and c.office_id = p_office and c.starts_on <= p_start and c.ends_on >= p_end
   order by c.version desc, c.created_at desc limit 1;
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
           'case_id', k.case_id, 'case_code', k.case_code, 'procedure', k.procedure, 'procedure_date', k.procedure_date,
           'rate_id', r.id, 'unit_rate', r.unit_rate::text) order by k.created_at), '[]'::jsonb),
         count(*) filter (where r.id is null), sum(r.unit_rate)
    into v_n, v_claims, v_unpriced, v_total
    from operations_private.package_candidates(v_ngo, p_start, p_end) k
    left join public.operations_contract_rates r on r.contract_id = v_contract.id and r.code = k.procedure;
  return jsonb_build_object(
    'period_start', p_start, 'period_end', p_end, 'office_id', p_office,
    'contract', case when v_contract.id is null then null else jsonb_build_object('id', v_contract.id, 'name', v_contract.name, 'version', v_contract.version, 'reference', v_contract.reference, 'illustrative', v_contract.illustrative) end,
    'claims', v_claims, 'count', v_n, 'unpriced', case when v_contract.id is null then v_n else v_unpriced end,
    'total', case when v_contract.id is null or v_unpriced > 0 then null else round(coalesce(v_total, 0), 2)::text end,
    'too_many', v_n > 2000, 'basis', 'procedure_date');
end $$;
revoke all on function public.abc_billing_preview(date, date, uuid) from public, anon;
grant execute on function public.abc_billing_preview(date, date, uuid) to authenticated;
