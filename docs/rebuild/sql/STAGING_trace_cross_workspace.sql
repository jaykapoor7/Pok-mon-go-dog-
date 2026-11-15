-- STAGING ONLY (project ucxfxiddufwqithtdtix). Writes nothing that stays: the block ends by raising its trace as an
-- error, which rolls every step back. Each step acts as a sample person through row-level security.
-- Output from 2026-11-15 is in docs/rebuild/TRACE-STAGING.md.
do $$
declare
  t text := E'TRACE (everything below is rolled back)\n';
  prog uuid := 'f0000000-0000-4000-8000-000000000002';      -- bengaluru-demo
  ngo_org uuid := 'f1000000-0000-4000-8000-000000000010';   -- Sample · Bengaluru Animal Care Trust
  lab uuid := 'f1000000-0000-4000-8000-000000000009';       -- Reference Rabies Diagnostic Laboratory
  coord_org uuid := 'f1000000-0000-4000-8000-000000000002'; -- Programme Coordination Cell
  hosp uuid := 'f1000000-0000-4000-8000-000000000004';      -- Teaching Hospital Anti-Rabies Clinic
  area uuid := 'f2000000-0000-4000-8000-000000000101';      -- HSR Layout
  u_clin uuid := 'e0000000-0000-4000-8000-000000000003';
  u_ngo uuid := 'e0000000-0000-4000-8000-000000000008';
  u_lab uuid := 'e0000000-0000-4000-8000-000000000006';
  u_prog uuid := 'e0000000-0000-4000-8000-000000000001';
  t0 timestamptz := clock_timestamp();
  fac uuid; nid uuid; r jsonb; ex uuid; hid uuid; sid uuid; n int; msg text; det text; st text;
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  r := public.oh_submit_bite_notice('bengaluru-demo', current_date, area, 'HSR Layout, 14th Main', 'dog', 'Brown dog with a red collar (automated check)', null, false, null, null);
  execute 'reset role';
  select id, facility_id into nid, fac from health.citizen_notices where created_at >= t0 order by created_at desc limit 1;
  t := t || '1 citizen (anon): notice accepted, routed to ' || coalesce(r->'facility'->>'name', '?') || E'\n';

  perform set_config('request.jwt.claims', json_build_object('sub', u_clin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin select count(*) into n from health.citizen_notices where id = nid; msg := n || ' row(s)'; exception when insufficient_privilege then msg := 'permission denied'; end;
  t := t || '2 clinician (hospital): can read the notice routed elsewhere: ' || msg || E'\n';
  r := public.oh_record_exposure(hosp, current_date, 'bite', area, '30-49', 'female', 'AUTO-CHECK-1', 'dog', 'community', 'Brown dog with a red collar', 'HSR Layout, 14th Main', 'III', 'walk_in', null, null, false, true, 'at_facility', null);
  ex := (r->>'id')::uuid; hid := (r->>'handoff_id')::uuid;
  t := t || '  patient presents at the hospital: bite ' || (r->>'code') || ' recorded (category III, washed at facility); animal follow-up request ' || case when hid is null then 'NOT raised' else 'raised' end || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', u_ngo, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin select count(*) into n from health.exposures where id = ex; msg := n || ' row(s)'; exception when insufficient_privilege then msg := 'permission denied'; end;
  select count(*), max(detail) into n, det from public.oh_handoffs where id = hid;
  t := t || '3 NGO coordinator: sees the request: ' || n || '; patient record: ' || msg || '; request names the patient: ' || coalesce((det ilike '%AUTO-CHECK-1%')::text, '?') || E'\n';
  perform public.oh_handoff_act(hid, 'accept', null, null);
  r := public.oh_submit_sample(ngo_org, lab, 'dog', 'brain_tissue', current_date, area, 'HSR Layout, 14th Main', 'The animal from the follow-up died under observation (automated check)', null, hid);
  sid := (r->>'id')::uuid;
  select status into st from public.oh_handoffs where id = hid;
  t := t || '  accepted (request now ' || st || '); sent sample ' || (r->>'code') || ' to the laboratory, linked to the request' || E'\n';
  begin perform public.oh_sample_step(sid, 'received'); msg := 'ALLOWED (wrong)'; exception when others then msg := 'refused: ' || sqlerrm; end;
  t := t || '  NGO tries to record the laboratory step: ' || msg || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', u_lab, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin select count(*) into n from health.exposures where id = ex; msg := n || ' row(s)'; exception when insufficient_privilege then msg := 'permission denied'; end;
  perform public.oh_sample_step(sid, 'received');
  perform public.oh_sample_step(sid, 'testing');
  perform public.oh_sample_step(sid, 'resulted', 'Automated check', 'positive', 'dFAT');
  select status || ' / ' || result || ' by ' || coalesce(resulted_by_name, '?') into st from public.oh_samples where id = sid;
  t := t || '4 laboratory scientist: received, testing, resulted (' || st || '); patient record: ' || msg || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', u_ngo, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.oh_handoffs where sample_id = sid and to_org = ngo_org and kind = 'result_notice';
  t := t || '5 NGO coordinator: result notice received: ' || n || E'\n';
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub', u_prog, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*), max(title) into n, det from public.oh_handoffs where sample_id = sid and to_org = coord_org;
  t := t || '6 programme lead: coordinator notices: ' || n || ' ("' || coalesce(det, 'none') || '")';
  begin select count(*) into n from health.exposures where id = ex; msg := n || ' row(s)'; exception when insufficient_privilege then msg := 'permission denied'; end;
  t := t || '; patient record: ' || msg || E'\n';
  begin r := public.oh_programme_overview(prog, 30); msg := 'programme overview read'; exception when others then msg := 'overview failed: ' || sqlerrm; end;
  t := t || '  ' || msg || E'\n';
  execute 'reset role';

  raise exception '%', t;
end $$;
