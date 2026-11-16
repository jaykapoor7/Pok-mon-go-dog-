-- STAGING ONLY. Scenario 6: a programme coordinator creates a programme, adds a partner and invites its people.
-- Every step runs as the named person, through row-level security, with the functions the app calls
-- (src/nx/pages/Entry.tsx, src/nx/pages/gov/Programme.tsx). The block ends by raising its trace as an error, so every
-- row it writes, including the two throwaway sign-ins, is rolled back. Never run on production.
do $$
declare
  lead uuid := 'e0000000-0000-4000-8000-000000000001';      -- sample programme lead (demo-oh-programme)
  outsider uuid := 'e0000000-0000-4000-8000-000000000009';  -- sample analyst, not in this programme
  doc uuid := gen_random_uuid(); stranger uuid := gen_random_uuid();
  t text := ''; r jsonb; prog uuid; coord uuid; city uuid; ward uuid; hosp uuid; v_code text; n int;
begin
  insert into auth.users (id, email, aud, role) values
    (doc, 'trace-s6-doctor@straypaw.invalid', 'authenticated', 'authenticated'),
    (stranger, 'trace-s6-stranger@straypaw.invalid', 'authenticated', 'authenticated');

  -- 1 The coordinator creates a programme.
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  r := oh_create_programme('Trace programme S6', 'trace-s6-' || substr(md5(random()::text), 1, 6), 'Asia/Kolkata', array['Ward A', 'Ward B'], null, 'Bengaluru', 'Trace coordination cell');
  prog := (r->>'id')::uuid; coord := (r->>'organisation_id')::uuid;
  select area_id into city from oh_programme_areas where programme_id = prog;
  select count(*) into n from oh_areas where parent_id = city;
  t := t || '1 coordinator: programme created (' || (select status from oh_programmes where id = prog) || '), ' || n || ' wards; their own organisation, as '
         || (select role from oh_members where organisation_id = coord and user_id = lead) || E'\n';
  select id into ward from oh_areas where parent_id = city and name = 'Ward A';

  -- 2 They add a hospital partner and invite its doctor by email.
  hosp := oh_add_partner(prog, 'hospital', 'Trace General Hospital', 'TGH', 'Bite care and PEP for Ward A', ward, null, null);
  v_code := oh_create_invite(hosp, 'clinician', 'trace-s6-doctor@straypaw.invalid', 'Dr Trace');
  t := t || '2 coordinator: partner added (' || (select kind from oh_organisations where id = hosp) || ', in the programme: '
         || exists (select 1 from oh_participations where programme_id = prog and organisation_id = hosp) || '); invitation code issued' || E'\n';
  begin perform oh_create_invite(hosp, 'lab_scientist', null, null); t := t || '  a laboratory role at a hospital: allowed (WRONG)' || E'\n';
  exception when others then t := t || '  a laboratory role at a hospital: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 3 Someone outside the programme cannot add partners.
  perform set_config('request.jwt.claims', json_build_object('sub', outsider, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  begin perform oh_add_partner(prog, 'clinic', 'Uninvited clinic', 'UC', null, null, null, null); t := t || '3 outsider: added a partner (WRONG)' || E'\n';
  exception when others then t := t || '3 outsider adds a partner: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 4 A person signed in with another email cannot use the doctor's code.
  perform set_config('request.jwt.claims', json_build_object('sub', stranger, 'role', 'authenticated', 'email', 'trace-s6-stranger@straypaw.invalid')::text, true); execute 'set local role authenticated';
  begin perform oh_accept_invite(v_code); t := t || '4 another email: joined (WRONG)' || E'\n';
  exception when others then t := t || '4 another email uses the code: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 5 The doctor accepts, once.
  perform set_config('request.jwt.claims', json_build_object('sub', doc, 'role', 'authenticated', 'email', 'trace-s6-doctor@straypaw.invalid')::text, true); execute 'set local role authenticated';
  r := oh_accept_invite(v_code);
  t := t || '5 doctor: joined as ' || (r->>'role') || '; sees their hospital: ' || exists (select 1 from oh_organisations where id = hosp) || E'\n';
  begin perform oh_accept_invite(v_code); t := t || '  the same code again: accepted (WRONG)' || E'\n';
  exception when others then t := t || '  the same code again: refused (' || sqlerrm || ')' || E'\n'; end;
  execute 'reset role';

  -- 6 The coordinator sees the invitation used.
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from oh_org_invites(hosp);
  t := t || '6 coordinator: ' || n || ' invitation listed for the partner';
  execute 'reset role';
  t := t || '; recorded as accepted by the doctor: ' || (select accepted_by = doc from oh_invites where code = v_code);
  raise exception E'TRACE S6 (rolled back)\n%', t;
end $$;
