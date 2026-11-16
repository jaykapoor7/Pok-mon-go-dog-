-- STAGING ONLY. Scenario 1: a new NGO signs up, invites a colleague, opens a case and posts in a channel.
-- The two server steps (registering the organisation, and redeeming a code at sign-in) run as the service role, as
-- /api/register/org and /api/join do. Every other step runs as the named person, through row-level security, with the
-- calls the app makes (Team.tsx -> /api/team/invite -> create_team_code; NewCase.tsx -> upsert_volunteer and
-- create_case_with_location; live.tsx and collab.ts -> nx_channels and nx_messages). The block ends by raising its
-- trace as an error, so every row it writes, including the two throwaway sign-ins, is rolled back.
do $$
declare
  other_ngo_member uuid := 'e0000000-0000-4000-8000-000000000008';  -- sample coordinator of a different NGO
  lead uuid := gen_random_uuid(); mate uuid := gen_random_uuid();
  t text := ''; ngo uuid; j json; code1 text; code2 text; case_id uuid; ch uuid; n int;
begin
  -- 1 Registration (server, as /api/register/org): the organisation and the lead's code.
  insert into ngos (name, slug, city, verified, partner_status) values ('Trace Paws Collective', 'trace-paws-' || substr(md5(random()::text), 1, 6), 'Bengaluru', false, 'self_registered') returning id into ngo;
  j := admin_mint_access_code(ngo, 'trace-s1-lead@straypaw.invalid', 'Trace Lead', 'lead'); code1 := j->>'code';
  t := t || '1 registration: organisation created, unverified; lead code issued: ' || (code1 is not null) || E'\n';

  -- 2 The lead signs in with the code (server, as /api/join).
  insert into auth.users (id, email, aud, role) values (lead, 'trace-s1-lead@straypaw.invalid', 'authenticated', 'authenticated');
  perform redeem_access_code(code1, lead);
  t := t || '2 lead signs in: member as ' || (select role from ngo_members where user_id = lead and ngo_id = ngo) || E'\n';

  -- 3 The lead invites a colleague (Team page -> /api/team/invite, with the lead's own session).
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated', 'email', 'trace-s1-lead@straypaw.invalid')::text, true); execute 'set local role authenticated';
  j := create_team_code('trace-s1-mate@straypaw.invalid', 'Trace Mate', 'member'); code2 := j->>'code';
  t := t || '3 lead invites a colleague: code issued: ' || (code2 is not null) || E'\n';
  execute 'reset role';

  -- 4 The colleague signs in with it (server, as /api/join).
  insert into auth.users (id, email, aud, role) values (mate, 'trace-s1-mate@straypaw.invalid', 'authenticated', 'authenticated');
  perform redeem_access_code(code2, mate);
  t := t || '4 colleague signs in: member as ' || (select role from ngo_members where user_id = mate and ngo_id = ngo) || E'\n';

  -- 5 The colleague cannot invite people as a member, and opens a case.
  perform set_config('request.jwt.claims', json_build_object('sub', mate, 'role', 'authenticated', 'email', 'trace-s1-mate@straypaw.invalid')::text, true); execute 'set local role authenticated';
  begin perform create_team_code('trace-s1-third@straypaw.invalid', 'Third', 'member'); t := t || '5 colleague invites a member: allowed (WRONG)' || E'\n';
  exception when others then t := t || '5 colleague invites a member: refused (' || sqlerrm || ')' || E'\n'; end;
  perform upsert_volunteer(mate, 'Trace Mate');
  case_id := create_case_with_location('Bengaluru', 'Trace: injured dog near the bus stand', 'Limping on the front left leg.', null, 'Ward 12', null, null,
    'normal', 'injury', '{}', mate, 'Trace Mate', 'dog', null, null, null, null, null);
  t := t || '  opens a case: in the new organisation: ' || ((select ngo_id from cases where id = case_id) = ngo) || E'\n';
  execute 'reset role';

  -- 6 The lead creates #general and the colleague posts in it.
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  insert into nx_channels (org_id, name, topic) values (ngo, 'general', 'Everything for the whole team') returning id into ch;
  t := t || '6 lead creates #general; sees the colleague''s case: ' || exists (select 1 from cases where id = case_id) || E'\n';
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', mate, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  insert into nx_messages (channel_id, body, author_name) values (ch, 'Opened a case for the limping dog at the bus stand.', 'Trace Mate');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', lead, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from nx_messages where channel_id = ch;
  t := t || '  colleague posts; the lead reads ' || n || ' message' || E'\n';
  execute 'reset role';

  -- 7 Someone from another NGO sees none of it and cannot post.
  perform set_config('request.jwt.claims', json_build_object('sub', other_ngo_member, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
  t := t || '7 another NGO: sees the case ' || exists (select 1 from cases where id = case_id) || ', the channel ' || exists (select 1 from nx_channels where id = ch)
         || ', the message ' || exists (select 1 from nx_messages where channel_id = ch);
  begin insert into nx_messages (channel_id, body, author_name) values (ch, 'Hello from outside', 'Outsider'); t := t || '; posts: allowed (WRONG)';
  exception when others then t := t || '; posts: refused (' || sqlerrm || ')'; end;
  execute 'reset role';
  raise exception E'TRACE S1 (rolled back)\n%', t;
end $$;
