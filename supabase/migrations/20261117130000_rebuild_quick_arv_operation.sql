-- A vaccination recorded with field mode's quick ARV form now counts for a contract that requires the vaccination
-- operation.
--
-- Field mode records a vaccination in one of two ways. The lifecycle form (operations_record_event, kind 'vaccination')
-- writes the vaccination operation and, through field_confirm_vaccination, its medical record. The quick ARV form calls
-- field_confirm_vaccination directly and wrote only the medical record. A contract rate can require the 'vaccination'
-- operation (required_events), so a package claiming a quick-form vaccination was refused with "Operation:
-- vaccination" missing. Recording it again with the lifecycle form would have written a second medical record for
-- the same dose.
--
-- Now field_confirm_vaccination also writes the operation, linked to the medical record, when it is called directly.
-- operations_record_event marks its own call for the length of that call, so the lifecycle form still writes exactly
-- one operation (its own, with its payload and policy) and one medical record. A replayed request returns its first
-- answer and writes nothing. No claim rule changes: a contract still asks for what it asked for.
--
-- Changes two functions. Both bodies are the live definitions (identical on staging; production differs only by one
-- blank line) plus the lines above. No table, column, constraint or grant changes. Existing rows are not changed:
-- production holds no quick-form vaccination yet.
--
-- Rollback: re-create field_confirm_vaccination from 20261102132030_field_vaccination_receipts.sql and
-- operations_record_event from 20261103004523_offline_intake_and_lifecycle.sql.

create or replace function public.field_confirm_vaccination(p_request uuid,p_case uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();old public.field_vaccination_receipts;h bytea;rid uuid;aid bigint;animal uuid;details text;given date;eid uuid;place text;
begin
 if uid is null or org is null then raise exception 'Organisation access required';end if;
 if p_request is null or p_case is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>4000 or p_payload->>'template' is distinct from 'arv-field-v1' then raise exception 'Invalid vaccination record template';end if;
 animal:=(p_payload->>'dogId')::uuid;given:=(p_payload->>'eventDate')::date;
 if animal is null or given is null or given>(now() at time zone 'Asia/Kolkata')::date or nullif(btrim(p_payload->>'vaccine'),'') is null or length(p_payload->>'vaccine')>200 or nullif(btrim(p_payload->>'batch'),'') is null or length(p_payload->>'batch')>100 or nullif(btrim(p_payload->>'performedBy'),'') is null or length(p_payload->>'performedBy')>100 or nullif(btrim(p_payload->>'location'),'') is null or length(p_payload->>'location')>300 or length(coalesce(p_payload->>'notes',''))>500 then raise exception 'Record the animal, date, vaccine, batch and reported vaccinator and location';end if;
 if not exists(select 1 from public.cases where id=p_case and ngo_id=org and dog_id=animal) or not exists(select 1 from public.dogs where id=animal and ngo_id=org) then raise exception 'Animal and case must match your organisation’s current record';end if;
 h:=sha256(convert_to(jsonb_build_array(p_case,p_payload)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,10));
 select * into old from public.field_vaccination_receipts where actor_id=uid and request_id=p_request;
 if found then
  if old.ngo_id<>org or old.payload_hash<>h then raise exception 'Request already used for different work';end if;
  return jsonb_build_object('record_id',old.record_id,'audit_id',old.audit_id,'replayed',true);
 end if;
 details:='Field-reported ARV vaccination; not a clinical attestation or municipal acceptance.'||E'\nTemplate: arv-field-v1'||E'\nVaccine: '||btrim(p_payload->>'vaccine')||E'\nBatch: '||btrim(p_payload->>'batch')||E'\nRecorded details: '||p_payload::text||E'\nDevice request: '||p_request::text;
 rid:=public.add_medical_event(p_dog_id=>animal,p_case_id=>p_case,p_kind=>'vaccination',p_event_date=>given,p_notes=>details,p_performed_by=>btrim(p_payload->>'performedBy'));
 if rid is null then raise exception 'Vaccination record was not saved';end if;
 -- The same vaccination is also the vaccination operation a contract can require. The lifecycle form records that
 -- operation itself (with its own payload and policy) and marks the call, so it is never recorded twice.
 if current_setting('straypaw.lifecycle_request',true) is distinct from p_request::text then
  place:=btrim(p_payload->>'location');
  insert into public.animal_operation_events(ngo_id,case_id,dog_id,kind,occurred_at,actor_id,actor_name,payload,medical_event_id)
  values(org,p_case,animal,'vaccination',
   case when given=(now() at time zone 'Asia/Kolkata')::date then now() else (given::timestamp at time zone 'Asia/Kolkata')+interval '12 hours' end,
   uid,public.sp_actor_name(),
   jsonb_strip_nulls(jsonb_build_object('template','arv-field-v1','vaccine',btrim(p_payload->>'vaccine'),'batch',btrim(p_payload->>'batch'),
    'performedBy',btrim(p_payload->>'performedBy'),'facility',place,'location',place,'dose',nullif(btrim(p_payload->>'dose'),''),
    'route',nullif(btrim(p_payload->>'route'),''),'notes',coalesce(nullif(btrim(p_payload->>'notes'),''),'Recorded with the quick ARV form.'),'request',p_request)),
   rid) returning id into eid;
 end if;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'medical_events',rid,'field_vaccination_record',jsonb_strip_nulls(jsonb_build_object('request_id',p_request,'case_id',p_case,'dog_id',animal,'template','arv-field-v1','operation_event_id',eid))) returning id into aid;
 insert into public.field_vaccination_receipts values(uid,p_request,org,h,rid,aid);
 return jsonb_strip_nulls(jsonb_build_object('record_id',rid,'audit_id',aid,'replayed',false,'operation_event_id',eid));
end $$;
revoke all on function public.field_confirm_vaccination(uuid,uuid,jsonb) from public,anon;
grant execute on function public.field_confirm_vaccination(uuid,uuid,jsonb) to authenticated;

create or replace function public.operations_record_event(p_request uuid,p_case uuid,p_kind text,p_payload jsonb,p_policy uuid default null)
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
  perform set_config('straypaw.lifecycle_request',p_request::text,true);
  medical:=public.field_confirm_vaccination(p_request,c.id,jsonb_build_object('template','arv-field-v1','dogId',c.dog_id,'eventDate',(observed at time zone 'Asia/Kolkata')::date,'vaccine',p_payload->>'vaccine','batch',p_payload->>'batch','performedBy',p_payload->>'performedBy','location',coalesce(p_payload->>'location',p_payload->>'facility'),'notes',p_payload->>'notes','dose',p_payload->>'dose','route',p_payload->>'route'));perform set_config('straypaw.lifecycle_request','',true);mid:=(medical->>'record_id')::uuid;
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
revoke all on function public.operations_record_event(uuid,uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.operations_record_event(uuid,uuid,text,jsonb,uuid) to authenticated;
