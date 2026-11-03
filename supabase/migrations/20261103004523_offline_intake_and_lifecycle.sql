-- Append-only operations records. No existing animal/history is removed or reclassified.
create schema if not exists operations_private;
revoke all on schema operations_private from public,anon,authenticated;
create table public.operations_receipts (
 actor_id uuid not null references auth.users(id), request_id uuid not null,
 ngo_id uuid not null references public.ngos(id), action text not null,
 payload_hash bytea not null, result jsonb not null, audit_id bigint not null references public.operational_audit_log(id),
 created_at timestamptz not null default now(), primary key(actor_id,request_id)
);
alter table public.operations_receipts enable row level security;
revoke all on public.operations_receipts from public,anon,authenticated;
grant select on public.operations_receipts to authenticated;
create policy operations_receipt_read on public.operations_receipts for select to authenticated using(actor_id=auth.uid() and (ngo_id=public.my_ngo() or exists(select 1 from public.review_office_members m where m.user_id=auth.uid() and m.office_id=nullif(result->>'office_id','')::uuid) or exists(select 1 from public.report_packages p join public.review_office_members m on m.office_id=p.office_id where m.user_id=auth.uid() and p.id=nullif(result->>'package_id','')::uuid and p.status<>'draft')));
create function operations_private.replay(p_request uuid,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare old public.operations_receipts;
begin
 if auth.uid() is null or p_request is null or p_action is null or p_payload is null or octet_length(p_payload::text)>128000 then raise exception 'Invalid operation request';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,42));
 select * into old from public.operations_receipts where actor_id=auth.uid() and request_id=p_request;
 if found then
  if old.ngo_id is distinct from public.my_ngo() and not exists(select 1 from public.review_office_members m where m.user_id=auth.uid() and m.office_id=nullif(old.result->>'office_id','')::uuid) and not exists(select 1 from public.report_packages p join public.review_office_members m on m.office_id=p.office_id where m.user_id=auth.uid() and p.id=nullif(old.result->>'package_id','')::uuid and p.status<>'draft') then raise exception 'This receipt belongs to another workspace';end if;
  if old.action<>p_action or old.payload_hash<>sha256(convert_to(p_payload::text,'UTF8')) then raise exception 'This request was already used for different work';end if;
  return old.result||jsonb_build_object('replayed',true);
 end if;
 return null;
end $$;
create function operations_private.receipt(p_request uuid,p_ngo uuid,p_action text,p_payload jsonb,p_result jsonb,p_audit bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 insert into public.operations_receipts(actor_id,request_id,ngo_id,action,payload_hash,result,audit_id)
 values(auth.uid(),p_request,p_ngo,p_action,sha256(convert_to(p_payload::text,'UTF8')),p_result||jsonb_build_object('audit_id',p_audit),p_audit);
 return p_result||jsonb_build_object('audit_id',p_audit,'replayed',false);
end $$;
revoke all on function operations_private.replay(uuid,text,jsonb),operations_private.receipt(uuid,uuid,text,jsonb,jsonb,bigint) from public,anon,authenticated;

create or replace function public.operations_can_read_record(p_case uuid,p_dog uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select auth.uid() is not null and (
  exists(select 1 from public.cases c where c.id=p_case and c.ngo_id=public.my_ngo())
  or exists(select 1 from public.dogs d where d.id=p_dog and d.ngo_id=public.my_ngo())
  or exists(select 1 from public.report_packages p join public.review_office_members m on m.office_id=p.office_id
   where m.user_id=auth.uid() and p.status<>'draft' and p_case=any(p.case_ids))
 )
$$;
revoke all on function public.operations_can_read_record(uuid,uuid) from public,anon;
grant execute on function public.operations_can_read_record(uuid,uuid) to authenticated;

create table public.operations_policies (
 id uuid primary key default gen_random_uuid(), ngo_id uuid not null references public.ngos(id),
 name text not null check(length(name) between 3 and 120), version integer not null check(version>0),
 rules jsonb not null, source_reference text not null, created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 unique(ngo_id,name,version)
);
create table public.animal_operation_events (
 id uuid primary key default gen_random_uuid(), ngo_id uuid not null references public.ngos(id),
 case_id uuid not null references public.cases(id),dog_id uuid not null references public.dogs(id),
 kind text not null check(kind in ('capture','intake','identification','sterilisation','vaccination','recovery','release','transfer','followup','complication','exception','correction')),
 occurred_at timestamptz not null,actor_id uuid not null references auth.users(id),actor_name text not null,
 payload jsonb not null,policy_id uuid references public.operations_policies(id),
 medical_event_id uuid references public.medical_events(id),corrects_id uuid references public.animal_operation_events(id),created_at timestamptz not null default now()
);
create index animal_operation_case_time on public.animal_operation_events(case_id,occurred_at desc,id);
create index animal_operation_dog_time on public.animal_operation_events(dog_id,occurred_at desc,id);
create table public.animal_operation_reviews (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.animal_operation_events(id),
 ngo_id uuid not null references public.ngos(id),decision text not null check(decision in ('confirmed','returned')),
 reason text not null,actor_id uuid not null references auth.users(id),actor_name text not null,created_at timestamptz not null default now()
);
create index animal_operation_reviews_event on public.animal_operation_reviews(event_id,created_at desc);
alter table public.operations_policies enable row level security;
alter table public.animal_operation_events enable row level security;
alter table public.animal_operation_reviews enable row level security;
revoke all on public.operations_policies,public.animal_operation_events,public.animal_operation_reviews from public,anon,authenticated;
grant select on public.operations_policies,public.animal_operation_events,public.animal_operation_reviews to authenticated;
create policy operations_policy_read on public.operations_policies for select to authenticated using(ngo_id=public.my_ngo());
create policy operation_event_read on public.animal_operation_events for select to authenticated using(public.operations_can_read_record(case_id,dog_id));
create policy operation_review_read on public.animal_operation_reviews for select to authenticated using(exists(select 1 from public.animal_operation_events e where e.id=event_id and public.operations_can_read_record(e.case_id,e.dog_id)));

create function public.operations_intake(p_request uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare org uuid:=public.my_ngo();result jsonb;dog uuid;cid uuid;aid bigint;eid uuid;latitude double precision;longitude double precision;observed timestamptz;existing uuid;identifier text;
begin
 if auth.uid() is null or org is null then raise exception 'Organisation access required';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'template' is distinct from 'field-intake-v1' then raise exception 'Invalid intake template';end if;
 result:=operations_private.replay(p_request,'intake',p_payload);if result is not null then return result;end if;
 if nullif(btrim(p_payload->>'city'),'') is null or nullif(btrim(p_payload->>'description'),'') is null or length(coalesce(p_payload->>'description',''))>3000 or length(coalesce(p_payload->>'name',''))>120 or length(coalesce(p_payload->>'code',''))>80 or length(coalesce(p_payload->>'zone',''))>200 then raise exception 'Record the city, identification and intake note';end if;
 latitude:=(p_payload->>'lat')::double precision;longitude:=(p_payload->>'lng')::double precision;observed:=(p_payload->>'observedAt')::timestamptz;
 if latitude is null or longitude is null or latitude not between -90 and 90 or longitude not between -180 and 180 or observed is null or observed>now()+interval '5 minutes' then raise exception 'Record valid observed coordinates and capture time';end if;
 identifier:=nullif(btrim(p_payload->>'code'),'');existing:=nullif(p_payload->>'existingDogId','')::uuid;
 -- Prevent two devices simultaneously creating the same explicit tag in one organisation.
 if identifier is not null then perform pg_advisory_xact_lock(hashtextextended(org::text||lower(identifier),43));end if;
 if existing is not null then
  if not exists(select 1 from public.dogs where id=existing and ngo_id=org) then raise exception 'Existing animal is outside your organisation';end if;
  dog:=existing;
 elsif identifier is not null and exists(select 1 from public.dogs where ngo_id=org and (lower(code)=lower(identifier) or lower(straypaw_id)=lower(identifier))) then
  raise exception 'This identifier already exists. Review the animal register and link the existing animal.';
 else
  dog:=public.create_animal_with_location(p_city=>btrim(p_payload->>'city'),p_name=>nullif(btrim(p_payload->>'name'),''),p_species=>'dog',p_code=>identifier,p_zone=>nullif(btrim(p_payload->>'zone'),''),p_lat=>latitude,p_lng=>longitude,p_intake_notes=>p_payload->>'description',p_h3_r8=>p_payload->>'h3_r8');
  update public.dogs set identifiers=nullif(p_payload->>'identifiers',''),sex=nullif(p_payload->>'sex',''),identity_state='provisional',provenance='operator_created',source_metadata=source_metadata||jsonb_build_object('intake_request',p_request,'device_observed_at',observed,'gps_accuracy_m',p_payload->'accuracy') where id=dog;
 end if;
 if coalesce(p_payload->>'category','other') not in ('sterilisation','vaccination','rescue','other','injury') then raise exception 'Choose an intake purpose';end if;
 cid:=public.create_case_with_location(p_city=>btrim(p_payload->>'city'),p_title=>coalesce(nullif(btrim(p_payload->>'name'),''),'Animal intake')||' · '||coalesce(p_payload->>'category','other'),p_description=>p_payload->>'description',p_dog_id=>dog,p_zone=>nullif(btrim(p_payload->>'zone'),''),p_lat=>latitude,p_lng=>longitude,p_category=>(coalesce(p_payload->>'category','other'))::public.case_category,p_actor_id=>auth.uid(),p_actor_name=>public.sp_actor_name(),p_h3_r8=>p_payload->>'h3_r8');
 insert into public.animal_operation_events(ngo_id,case_id,dog_id,kind,occurred_at,actor_id,actor_name,payload) values(org,cid,dog,'intake',observed,auth.uid(),public.sp_actor_name(),p_payload) returning id into eid;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'animal_operation_events',eid,'field_intake',jsonb_build_object('request_id',p_request,'case_id',cid,'dog_id',dog,'linked_existing',existing is not null)) returning id into aid;
 return operations_private.receipt(p_request,org,'intake',p_payload,jsonb_build_object('record_id',eid,'case_id',cid,'dog_id',dog),aid);
end $$;

create function public.operations_record_event(p_request uuid,p_case uuid,p_kind text,p_payload jsonb,p_policy uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare org uuid:=public.my_ngo();c public.cases;result jsonb;input jsonb:=jsonb_build_array(p_case,p_kind,p_payload,p_policy);observed timestamptz;eid uuid;aid bigint;mid uuid;corrected uuid;rules jsonb;field text;medical jsonb;follow uuid;
begin
 if auth.uid() is null or org is null then raise exception 'Organisation access required';end if;
 select * into c from public.cases where id=p_case and ngo_id=org for update;if not found or c.dog_id is null then raise exception 'Open an animal-linked case in your organisation';end if;
 if p_kind not in ('capture','identification','sterilisation','vaccination','recovery','release','transfer','followup','complication','exception','correction') or p_payload->>'template' is distinct from 'lifecycle-v1' then raise exception 'Invalid operation template';end if;
 result:=operations_private.replay(p_request,'event',input);if result is not null then return result;end if;
 if p_kind in ('sterilisation','vaccination','correction','identification') and exists(select 1 from public.abc_attestations where case_id=c.id and revoked_at is null and kind in ('vet_authorised','evidence_reviewed')) then raise exception 'Withdraw the existing sign-off with a reason before changing an attested record';end if;

 observed:=(p_payload->>'occurredAt')::timestamptz;
 if observed is null or observed>now()+interval '5 minutes' or nullif(btrim(p_payload->>'notes'),'') is null or length(p_payload->>'notes')>3000 then raise exception 'Record the date and observations';end if;
 if p_policy is not null then select p.rules into rules from public.operations_policies p where p.id=p_policy and p.ngo_id=org;if not found then raise exception 'Choose a policy version in your organisation';end if;end if;
 for field in select jsonb_array_elements_text(coalesce(rules->'requiredFields'->p_kind,'[]')) loop
  if nullif(btrim(p_payload->>field),'') is null then raise exception 'Required by selected policy: %',field;end if;
 end loop;
 if p_kind in ('sterilisation','vaccination') and (nullif(btrim(p_payload->>'performedBy'),'') is null or nullif(btrim(p_payload->>'facility'),'') is null) then raise exception 'Record the reported clinician or vaccinator and facility';end if;
 if p_kind='sterilisation' and nullif(btrim(p_payload->>'procedure'),'') is null then raise exception 'Record the procedure description';end if;
 if p_kind in ('capture','release') and nullif(btrim(p_payload->>'location'),'') is null then raise exception 'Record the observed location';end if;
 if p_kind='transfer' and nullif(btrim(p_payload->>'destination'),'') is null then raise exception 'Record the receiving organisation or facility';end if;
 if p_kind in ('exception','correction') and nullif(btrim(p_payload->>'reason'),'') is null then raise exception 'Record the exception or correction reason';end if;
 if p_kind='correction' then corrected:=(p_payload->>'correctsId')::uuid;if not exists(select 1 from public.animal_operation_events where id=corrected and case_id=c.id and ngo_id=org) then raise exception 'Choose an original event in this case';end if;end if;
 if p_kind='identification' then
  if coalesce(public.sp_member_role(org),'') not in ('admin','coordinator') then raise exception 'Coordinator access required for identity review';end if;
  if p_payload->>'identityDecision' not in ('confirmed_distinct','possible_duplicate','linked_existing') then raise exception 'Record an identity decision';end if;
  if p_payload->>'identityDecision' in ('possible_duplicate','linked_existing') and not exists(select 1 from public.dogs where id=(p_payload->>'candidateId')::uuid and ngo_id=org and id<>c.dog_id) then raise exception 'Choose a different animal in your organisation';end if;
  update public.dogs set identity_state=case when p_payload->>'identityDecision'='confirmed_distinct' then 'confirmed' else 'possible_duplicate' end where id=c.dog_id;
 end if;
 if p_kind='release' and coalesce((rules->>'releaseRequiresVet')::boolean,false) and not exists(select 1 from public.abc_attestations where case_id=c.id and kind='vet_authorised' and revoked_at is null) then raise exception 'Selected policy requires veterinary authorisation before release';end if;
 if p_kind='vaccination' then
  medical:=public.field_confirm_vaccination(p_request,c.id,jsonb_build_object('template','arv-field-v1','dogId',c.dog_id,'eventDate',(observed at time zone 'Asia/Kolkata')::date,'vaccine',p_payload->>'vaccine','batch',p_payload->>'batch','performedBy',p_payload->>'performedBy','location',coalesce(p_payload->>'location',p_payload->>'facility'),'notes',p_payload->>'notes','dose',p_payload->>'dose','route',p_payload->>'route'));mid:=(medical->>'record_id')::uuid;
 elsif p_kind='sterilisation' then
  mid:=public.add_medical_event(c.dog_id,c.id,'sterilisation',(observed at time zone 'Asia/Kolkata')::date,'Field-reported procedure; separate veterinary authorisation required.'||E'\n'||p_payload::text||E'\nDevice request: '||p_request::text,p_payload->>'performedBy');
 elsif p_kind='followup' then
  if nullif(p_payload->>'dueDate','') is null then raise exception 'Choose a follow-up date';end if;
  follow:=public.add_case_followup(c.id,c.dog_id,(p_payload->>'dueDate')::date,p_payload->>'notes');
 end if;
 insert into public.animal_operation_events(ngo_id,case_id,dog_id,kind,occurred_at,actor_id,actor_name,payload,policy_id,medical_event_id,corrects_id)
 values(org,c.id,c.dog_id,p_kind,observed,auth.uid(),public.sp_actor_name(),p_payload,p_policy,mid,corrected) returning id into eid;
 perform public.add_case_note(c.id,auth.uid(),public.sp_actor_name(),p_kind||' recorded: '||(p_payload->>'notes'));
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'animal_operation_events',eid,'operation_'||p_kind,jsonb_build_object('request_id',p_request,'case_id',c.id,'medical_event_id',mid,'policy_id',p_policy,'followup_id',follow)) returning id into aid;
 return operations_private.receipt(p_request,org,'event',input,jsonb_build_object('record_id',eid,'case_id',c.id,'dog_id',c.dog_id,'medical_event_id',mid),aid);
end $$;

create function public.operations_review_event(p_request uuid,p_event uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare org uuid:=public.my_ngo();e public.animal_operation_events;input jsonb:=jsonb_build_array(p_event,p_decision,p_reason);result jsonb;rid uuid;aid bigint;
begin
 if auth.uid() is null or org is null or coalesce(public.sp_member_role(org),'') not in ('admin','coordinator') then raise exception 'Coordinator access required';end if;
 select * into e from public.animal_operation_events where id=p_event and ngo_id=org;if not found then raise exception 'Event not found in your organisation';end if;
 if p_decision not in ('confirmed','returned') or nullif(btrim(p_reason),'') is null or length(p_reason)>2000 then raise exception 'Record a review decision and reason';end if;
 result:=operations_private.replay(p_request,'review_event',input);if result is not null then return result;end if;
 insert into public.animal_operation_reviews(event_id,ngo_id,decision,reason,actor_id,actor_name) values(e.id,org,p_decision,btrim(p_reason),auth.uid(),public.sp_actor_name()) returning id into rid;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'animal_operation_reviews',rid,'review_operation',jsonb_build_object('request_id',p_request,'event_id',e.id,'decision',p_decision)) returning id into aid;
 return operations_private.receipt(p_request,org,'review_event',input,jsonb_build_object('record_id',rid),aid);
end $$;

create function public.operations_save_policy(p_request uuid,p_name text,p_version integer,p_rules jsonb,p_reference text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare org uuid:=public.my_ngo();input jsonb:=jsonb_build_array(p_name,p_version,p_rules,p_reference);result jsonb;rid uuid;aid bigint;
begin
 if auth.uid() is null or org is null or coalesce(public.sp_member_role(org),'') not in ('admin','coordinator') then raise exception 'Coordinator access required';end if;
 if nullif(btrim(p_reference),'') is null or p_version<1 or jsonb_typeof(p_rules) is distinct from 'object' or octet_length(p_rules::text)>20000 then raise exception 'Supply versioned workflow rules and their source reference';end if;
 if exists(select 1 from jsonb_object_keys(p_rules) k where k not in ('releaseRequiresVet','requiredFields')) or (p_rules?'releaseRequiresVet' and jsonb_typeof(p_rules->'releaseRequiresVet')<>'boolean') or (p_rules?'requiredFields' and jsonb_typeof(p_rules->'requiredFields')<>'object') then raise exception 'Unsupported policy shape';end if;
 if exists(select 1 from jsonb_each(coalesce(p_rules->'requiredFields','{}')) r where r.key not in ('capture','intake','sterilisation','vaccination','recovery','release','transfer','followup','complication','exception','correction','identification') or jsonb_typeof(r.value)<>'array') then raise exception 'Unsupported policy record type';end if;
 if exists(select 1 from jsonb_each(coalesce(p_rules->'requiredFields','{}')) r cross join lateral jsonb_array_elements_text(r.value) f where f not in ('performedBy','facility','procedure','location','destination','reason','dueDate','vaccine','batch','dose','route','notes')) then raise exception 'Unsupported required policy field';end if;
 result:=operations_private.replay(p_request,'policy',input);if result is not null then return result;end if;
 insert into public.operations_policies(ngo_id,name,version,rules,source_reference,created_by) values(org,btrim(p_name),p_version,p_rules,btrim(p_reference),auth.uid()) returning id into rid;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'operations_policies',rid,'configure_workflow_policy',jsonb_build_object('request_id',p_request,'version',p_version)) returning id into aid;
 return operations_private.receipt(p_request,org,'policy',input,jsonb_build_object('record_id',rid),aid);
end $$;
revoke all on function public.operations_intake(uuid,jsonb),public.operations_record_event(uuid,uuid,text,jsonb,uuid),public.operations_review_event(uuid,uuid,text,text),public.operations_save_policy(uuid,text,integer,jsonb,text) from public,anon;
grant execute on function public.operations_intake(uuid,jsonb),public.operations_record_event(uuid,uuid,text,jsonb,uuid),public.operations_review_event(uuid,uuid,text,text),public.operations_save_policy(uuid,text,integer,jsonb,text) to authenticated;

-- Independent audit readback, including a reviewer’s own authorised package actions.
create function public.operations_read_audit(p_audit bigint)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare a public.operational_audit_log;
begin
 select * into a from public.operational_audit_log where id=p_audit and actor_id=auth.uid();
 if not found then return null;end if;
 if a.ngo_id is distinct from public.my_ngo() and not exists(select 1 from public.operations_receipts r join public.review_office_members m on m.office_id=nullif(r.result->>'office_id','')::uuid where r.audit_id=a.id and r.actor_id=auth.uid() and m.user_id=auth.uid()) and not exists(
  select 1 from public.operations_receipts r join public.report_packages p on p.id=nullif(r.result->>'package_id','')::uuid
  join public.review_office_members m on m.office_id=p.office_id where r.audit_id=a.id and r.actor_id=auth.uid() and m.user_id=auth.uid() and p.status<>'draft'
 ) then return null;end if;
 return jsonb_build_object('id',a.id,'actor_id',a.actor_id,'entity_id',a.entity_id,'action',a.action,'after_data',a.after_data,'created_at',a.created_at);
end $$;
revoke all on function public.operations_read_audit(bigint) from public,anon;
grant execute on function public.operations_read_audit(bigint) to authenticated;
