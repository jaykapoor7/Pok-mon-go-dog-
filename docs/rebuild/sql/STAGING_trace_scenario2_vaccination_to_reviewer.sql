-- STAGING ONLY. Scenario 2: a field worker records a vaccination and the municipal reviewer receives and decides it.
-- The field worker works for the operator NGO under the municipal ABC/ARV contract; the reviewer belongs to the
-- municipal review office. Every step runs as the named sample person, through row-level security, with the calls the
-- app makes:
--   field mode (src/lib/field/sync.ts): operations_intake, field_confirm_vaccination, field_confirm_evidence
--   case record (AbcEvidence.tsx): abc_vet_authorise, abc_review_evidence
--   packages (Packages.tsx, PackageRecord.tsx): abc_create_package, abc_package_cases, operations_configure_package,
--     abc_package_act('submitted')
--   reviewer (Verification.tsx, gov/Review.tsx): report_packages, operations_reconciliation, operations_decide_item,
--     operations_finalize_package
-- Two stand-ins, both inside the transaction: the photo's storage object is inserted directly (the app uploads it to the
-- abc-evidence bucket first), and the reviewer creates an illustrative vaccination rate, because the sample contract
-- prices sterilisation only. The block ends by raising its trace as an error, so every row it writes is rolled back.
do $$
declare
  ngo uuid := 'd0000000-0000-4000-8000-0000000000a0';     -- Sample · Bengaluru Animal Care Trust
  office uuid := 'd0000000-0000-4000-8000-0000000000b0';  -- Sample · Bengaluru municipal ABC cell
  field uuid := 'd0000000-0000-4000-8000-000000000004'; vet uuid := 'd0000000-0000-4000-8000-000000000003';
  coord uuid := 'd0000000-0000-4000-8000-000000000002'; reviewer uuid := 'd0000000-0000-4000-8000-000000000005';
  td date := (now() at time zone 'Asia/Kolkata')::date;
  t text := ''; r jsonb; v_case uuid; dog uuid; path text; contract uuid; rate uuid; pkg uuid; claims jsonb; n int; item jsonb; req uuid := gen_random_uuid();
begin
  -- 1 The field worker records a new dog and its anti-rabies vaccination, from the street.
  perform set_config('request.jwt.claims', json_build_object('sub', field, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  r := operations_intake(gen_random_uuid(), jsonb_build_object('template', 'field-intake-v1', 'name', 'Trace brown female', 'city', 'Bengaluru', 'zone', 'Ward 12',
         'sex', 'female', 'description', 'Brown, white chest, calm. Vaccinated on the spot.', 'category', 'vaccination', 'lat', 12.9116, 'lng', 77.6389, 'accuracy', 12, 'observedAt', now()));
  v_case := coalesce(r->'result'->>'case_id', r->>'case_id')::uuid; dog := coalesce(r->'result'->>'dog_id', r->>'dog_id')::uuid;
  -- The lifecycle form records the vaccination as an operation (which a contract can require) and its medical record.
  r := operations_record_event(gen_random_uuid(), v_case, 'vaccination', jsonb_build_object('template', 'lifecycle-v1', 'occurredAt', now(), 'performedBy', 'Field team (sample)',
         'facility', 'On the street, Ward 12', 'vaccine', 'Anti-rabies (sample)', 'batch', 'TRACE-01', 'dose', '1 ml', 'route', 'IM', 'location', 'Ward 12, near the market', 'notes', 'No reaction.'), null);
  t := t || '1 field worker: dog and case recorded (identity ' || (select identity_state from dogs where id = dog) || '); vaccination recorded: '
         || exists (select 1 from animal_operation_events where case_id = v_case and kind = 'vaccination') || ', with its medical record: ' || exists (select 1 from medical_events where case_id = v_case and kind = 'vaccination') || E'\n';
  begin perform operations_record_event(gen_random_uuid(), v_case, 'identification', jsonb_build_object('template', 'lifecycle-v1', 'occurredAt', now(), 'identityDecision', 'confirmed_distinct', 'notes', 'Looks new to me.'), null);
    t := t || '  the field worker confirming the identity: allowed (WRONG)' || E'\n';
  exception when others then t := t || '  the field worker confirming the identity: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 2 Evidence from field mode: the photo (uploaded to private storage first) and where the dog was released.
  path := ngo || '/' || v_case || '/' || req || '.jpg';  -- field mode names the photo after the send's request id
  insert into storage.objects (bucket_id, name, owner) values ('abc-evidence', path, field);
  perform set_config('request.jwt.claims', json_build_object('sub', field, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform field_confirm_evidence(req, v_case, 'capture_photo', 'storage://abc-evidence/' || path, null, now());
  perform field_confirm_evidence(gen_random_uuid(), v_case, 'release_location', null, 'Ward 12, near the market', now());
  begin perform abc_vet_authorise(v_case, 'Signing off as a field worker'); t := t || '2 field worker signs off as a vet: allowed (WRONG)' || E'\n';
  exception when others then t := t || '2 evidence added; the field worker signing off as a vet: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 3 The coordinator confirms the identity (before any sign-off, which locks the record), the veterinarian signs off
  --   and the coordinator reviews the evidence.
  perform set_config('request.jwt.claims', json_build_object('sub', coord, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  -- A person decides that the new record is a different dog from the ones already registered; nothing is merged on a guess.
  perform operations_record_event(gen_random_uuid(), v_case, 'identification', jsonb_build_object('template', 'lifecycle-v1', 'occurredAt', now(), 'identityDecision', 'confirmed_distinct',
         'notes', 'Checked against the ward register; no match.'), null);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', vet, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform abc_vet_authorise(v_case, 'Vaccination recorded and dog seen.');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', coord, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform abc_review_evidence(v_case, 'Photo and release point present.');
  t := t || '3 vet signed off; coordinator confirmed the identity (' || (select identity_state from dogs where id = dog) || ') and reviewed: ' || (select string_agg(kind, ', ' order by kind desc) from abc_attestations where case_id = v_case and revoked_at is null) || E'\n';
  execute 'reset role';

  -- 4 The municipal office prices vaccination (illustrative rate, for this trace only).
  perform set_config('request.jwt.claims', json_build_object('sub', reviewer, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  perform operations_create_contract(gen_random_uuid(), jsonb_build_object('name', 'Trace ARV contract · Bengaluru', 'version', 1, 'reference', 'Illustrative rate for a staging trace; not a real agreement',
    'office_id', office, 'ngo_id', ngo, 'starts_on', td - 30, 'ends_on', td + 30, 'illustrative', true,
    'rates', jsonb_build_array(jsonb_build_object('code', 'vaccination', 'label', 'Anti-rabies vaccination per animal (illustrative)', 'unit_rate', '250',
      'required_evidence', jsonb_build_array('capture_photo', 'release_location'), 'required_events', jsonb_build_array('vaccination'), 'vet_required', true))));
  execute 'reset role';
  select c.id, x.id into contract, rate from operations_contracts c join operations_contract_rates x on x.contract_id = c.id and x.code = 'vaccination'
   where c.ngo_id = ngo and c.office_id = office and c.name = 'Trace ARV contract · Bengaluru';

  -- 5 The coordinator prepares today's package, claims the vaccination at the contract rate and submits it.
  perform set_config('request.jwt.claims', json_build_object('sub', coord, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  pkg := abc_create_package('Trace ARV claims · ' || td, td, td, office);
  select jsonb_agg(jsonb_build_object('case_id', k.case_id, 'rate_id', rate, 'units', 1)), count(*) into claims, n from abc_package_cases(pkg) k;
  perform operations_configure_package(gen_random_uuid(), pkg, contract, claims);
  perform abc_package_act(pkg, 'submitted', null);
  t := t || '4 coordinator: package of ' || n || ' record' || case when n = 1 then '' else 's' end || ' submitted (' || (select status from report_packages where id = pkg) || ')' || E'\n';
  begin perform operations_decide_item(gen_random_uuid(), pkg, v_case, (select id from operations_package_claims where package_id = pkg and case_id = v_case limit 1), 'accepted', 'Self-approval', 1);
    t := t || '  the operator accepting its own claim: allowed (WRONG)' || E'\n';
  exception when others then t := t || '  the operator accepting its own claim: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 6 The reviewer finds it in their queue, decides the claim and closes the review.
  perform set_config('request.jwt.claims', json_build_object('sub', reviewer, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  t := t || '5 reviewer: in the queue: ' || exists (select 1 from report_packages where id = pkg and office_id = office and status <> 'draft');
  r := operations_reconciliation(pkg);
  for item in select * from jsonb_array_elements(coalesce(r->'items', '[]'::jsonb)) loop
    if item->>'decision' = 'pending' then
      perform operations_decide_item(gen_random_uuid(), pkg, (item->>'case_id')::uuid, (item->>'claim_id')::uuid, 'accepted', 'Photo, release point and vet sign-off checked.', (item->>'claimed_units')::numeric);
    end if;
  end loop;
  perform operations_finalize_package(gen_random_uuid(), pkg, 'Accepted at the contract rate. Accepted is not paid.');
  t := t || '; claim decided and review closed (' || (select status from report_packages where id = pkg) || ')' || E'\n';
  execute 'reset role';

  -- 7 The NGO sees the outcome on its package.
  perform set_config('request.jwt.claims', json_build_object('sub', coord, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  t := t || '6 coordinator sees: ' || (select status from report_packages where id = pkg) || '; events: ' || (select string_agg(kind, ' → ' order by created_at) from package_events where package_id = pkg);
  execute 'reset role';
  raise exception E'TRACE S2 (rolled back)\n%', t;
end $$;
