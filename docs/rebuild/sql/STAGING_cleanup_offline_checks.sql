-- STAGING ONLY (project ucxfxiddufwqithtdtix). Never run on production.
-- Removes the rows left by e2e/field-offline-staging.spec.ts: each run records one provisional animal and its case on
-- the sample NGO, and the app never deletes a field intake (its operational event is an audit record). Only rows whose
-- intake description starts with "Automated offline check " are touched. The audit log keeps its entries. The 1×1 test
-- photos stay in the abc-evidence bucket (storage objects are removed through the Storage API, not SQL).
do $$
declare cs uuid[]; ds uuid[];
begin
  select array_agg(distinct case_id), array_agg(distinct dog_id) into cs, ds
    from public.animal_operation_events where payload->>'description' like 'Automated offline check %';
  if cs is null then raise notice 'Nothing to clear.'; return; end if;
  delete from public.evidence_items where case_id = any (cs);
  delete from public.case_updates where case_id = any (cs);
  delete from public.animal_followups where case_id = any (cs);
  delete from public.animal_timeline_events where case_id = any (cs) or dog_id = any (ds);
  delete from public.animal_operation_events where case_id = any (cs);
  delete from public.medical_events where case_id = any (cs);
  delete from public.operations_receipts where result->>'case_id' = any (select unnest(cs)::text);
  delete from public.cases where id = any (cs);
  delete from public.animal_identifiers where dog_id = any (ds);
  delete from public.dogs where id = any (ds) and not exists (select 1 from public.cases c where c.dog_id = dogs.id);
  raise notice 'Cleared % test case(s) and their animals.', cardinality(cs);
end $$;
