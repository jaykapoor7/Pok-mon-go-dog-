-- Run only on the existing isolated staging project ucxfxiddufwqithtdtix.
-- Actual hosted PostgreSQL functions/triggers/RLS; no Meta, HTTP Auth or Storage claims.
-- All fixture rows and workflow changes roll back, including on an assertion failure.
begin;
create temp table careos_test_ids as select gen_random_uuid() ngo_a,gen_random_uuid() ngo_b,gen_random_uuid() lead_a,gen_random_uuid() lead_b,gen_random_uuid() volunteer,gen_random_uuid() dog;
grant select on careos_test_ids to authenticated,anon;
insert into auth.users(id,email) select lead_a,'careos-'||lead_a||'@example.invalid' from careos_test_ids union all select lead_b,'careos-'||lead_b||'@example.invalid' from careos_test_ids union all select volunteer,'careos-'||volunteer||'@example.invalid' from careos_test_ids;
insert into public.ngos(id,name,verified) select ngo_a,'CareOS synthetic integration A',true from careos_test_ids union all select ngo_b,'CareOS synthetic integration B',true from careos_test_ids;
insert into public.ngo_members(user_id,ngo_id,role) select lead_a,ngo_a,'lead' from careos_test_ids union all select lead_b,ngo_b,'lead' from careos_test_ids union all select volunteer,ngo_a,'volunteer' from careos_test_ids;
insert into public.dogs(id,lat,lng,ngo_id,name) select dog,13.01,80.20,ngo_a,'CareOS synthetic integration animal' from careos_test_ids;
insert into careos.routes(ngo_id,lat,lng,radius_km,enabled) select ngo_a,13.01,80.20,5,true from careos_test_ids;
create function pg_temp.careos_test_message(p_text text,p_extra jsonb default '{}') returns void language plpgsql as $$
declare e jsonb; j record;
begin
 e:=jsonb_build_object('key','in:staging-synthetic-'||gen_random_uuid(),'kind','message','payload',jsonb_build_object('id','staging-synthetic-'||gen_random_uuid(),'from','919000008101','timestamp',extract(epoch from now()),'type','text','text',p_text)||p_extra);
 perform public.careos_enqueue(jsonb_build_array(e,e)); -- exact duplicate must be harmless
 for j in select * from public.careos_claim_jobs(20) loop
  perform public.careos_process_job(j.id,j.lease,'{}');
 end loop;
end $$;
select pg_temp.careos_test_message('REPORT');
select pg_temp.careos_test_message('YES');
select pg_temp.careos_test_message('Synthetic staging dog with a wound');
select pg_temp.careos_test_message('', '{"location":{"lat":13.01,"lng":80.20}}');
select pg_temp.careos_test_message('2');
select pg_temp.careos_test_message('CONFIRM');
create temp table careos_test_case as select id item,linked_case_id case_id,tracking from careos.inbox where phone='919000008101';
grant select on careos_test_case to authenticated,anon;
do $$ begin
 if (select count(*) from careos_test_case)<>1 or (select case_id from careos_test_case) is null then raise exception 'Hosted report did not create one real case'; end if;
 if exists(select 1 from public.cases c join careos_test_case t on t.case_id=c.id where c.description is not null or c.lat is not null or c.lng is not null) then raise exception 'Private report leaked into canonical fields'; end if;
end $$;
-- Give the actual legacy dashboard note API a verified caller and check its
-- outbox synchronization too. No synthetic replacement RPC is installed here.
-- Current verified actor can drive the existing case and scoped dashboard projection.
select set_config('request.jwt.claim.sub',lead_a::text,true) from careos_test_ids;
set local role authenticated;
select public.careos_case_action((select case_id from careos_test_case),'accept','{}',gen_random_uuid());
select public.add_case_note((select case_id from careos_test_case),(select lead_a from careos_test_ids),'Synthetic staff','Private hosted dashboard note');
select public.careos_case_action((select case_id from careos_test_case),'assign',(select jsonb_build_object('user_id',volunteer) from careos_test_ids),gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'link_animal',(select jsonb_build_object('dog_id',dog) from careos_test_ids),gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'rescue','{"note":"Synthetic rescue"}',gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'treatment','{"note":"Synthetic treatment"}',gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'vaccination','{"note":"Synthetic vaccination"}',gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'sterilisation','{"note":"Synthetic sterilisation"}',gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'expense','{"amount":250.5,"note":"Synthetic expense"}',gen_random_uuid());
select public.careos_case_action((select case_id from careos_test_case),'followup',jsonb_build_object('due_at',now()+interval '1 day','note','Synthetic follow-up'),gen_random_uuid());
reset role;
do $$ declare c uuid; begin
 select case_id into c from careos_test_case;
 if not exists(select 1 from careos.audit where case_id=c and action='dashboard_case_updates') then raise exception 'Legacy dashboard note did not synchronize'; end if;
 if exists(select 1 from careos.outbox where body like '%Private hosted dashboard note%') then raise exception 'Private dashboard note was sent to reporter'; end if;
 if (select count(*) from public.medical_events where case_id=c)<>3 then raise exception 'Medical events missing'; end if;
 if (select cost_spent from public.cases where id=c)<>250.5 then raise exception 'Expense missing'; end if;
 if not exists(select 1 from public.animal_timeline_events where case_id=c and visibility='private') then raise exception 'Private animal history missing'; end if;
end $$;
select set_config('request.jwt.claim.sub',lead_a::text,true) from careos_test_ids;
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.careos_inbox_list()) then raise exception 'Own NGO inbox empty'; end if;
 if not exists(select 1 from public.org_case_facts c join careos_test_case t on c.id=t.case_id) then raise exception 'Existing dashboard projection missed case'; end if;
 begin
  perform public.careos_case_action((select case_id from careos_test_case),'close','{"reason":"recovered","note":"Synthetic recovery"}',gen_random_uuid());
  raise exception 'Pending follow-up did not block closure';
 exception when raise_exception then
  if SQLERRM<>'Complete or cancel pending follow-ups first' then raise; end if;
 end;
end $$;
reset role;
create temp table careos_test_followup as select id from public.animal_followups where case_id=(select case_id from careos_test_case);
grant select on careos_test_followup to authenticated;
select set_config('request.jwt.claim.sub',volunteer::text,true) from careos_test_ids;
set local role authenticated;
select public.careos_case_action((select case_id from careos_test_case),'followup_done',jsonb_build_object('followup_id',(select id from careos_test_followup)),gen_random_uuid());
reset role;
select set_config('request.jwt.claim.sub',lead_a::text,true) from careos_test_ids;
set local role authenticated;
select public.careos_case_action((select case_id from careos_test_case),'close','{"reason":"recovered","note":"Synthetic recovery"}',gen_random_uuid());
reset role;
do $$ begin
 if not exists(select 1 from public.cases c join careos_test_case t on c.id=t.case_id where c.status='closed') then raise exception 'Closure missing'; end if;
 if not exists(select 1 from careos.outbox where phone='919000008101' and notice='closed' and state='pending') then raise exception 'Citizen notification not queued'; end if;
end $$;
select set_config('request.jwt.claim.sub',lead_b::text,true) from careos_test_ids;
set local role authenticated;
do $$ begin
 if exists(select 1 from public.careos_inbox_list()) then raise exception 'Cross-NGO inbox leak'; end if;
 if exists(select 1 from public.cases c join careos_test_case t on c.id=t.case_id) then raise exception 'Cross-NGO table leak'; end if;
 if exists(select 1 from public.org_case_facts c join careos_test_case t on c.id=t.case_id) then raise exception 'Cross-NGO dashboard view leak'; end if;
 begin
  perform public.careos_case_action((select case_id from careos_test_case),'reopen','{"note":"Unauthorized"}',gen_random_uuid());
  raise exception 'Cross-NGO mutation was accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.cases c join careos_test_case t on c.id=t.case_id) then raise exception 'Anonymous private case leak'; end if;
 if exists(select 1 from public.public_case_facts c join careos_test_case t on c.id=t.case_id) then raise exception 'Anonymous projection leak'; end if;
 if has_function_privilege('anon','public.careos_enqueue(jsonb)','execute') then raise exception 'Anonymous transport access'; end if;
end $$;
reset role;
rollback;
select 'PASS: hosted guided report, case/animal/medical/follow-up/expense/closure, citizen outbox, NGO dashboard projection and tenant/anonymous isolation; all synthetic changes rolled back' as result;
