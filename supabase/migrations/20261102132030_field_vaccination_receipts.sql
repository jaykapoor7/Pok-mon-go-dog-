-- Observational ARV records only. This function never attests or accepts a claim.
create table public.field_vaccination_receipts(actor_id uuid not null references auth.users(id),request_id uuid not null,ngo_id uuid not null,payload_hash bytea not null,record_id uuid not null references public.medical_events(id),audit_id bigint not null references public.operational_audit_log(id),primary key(actor_id,request_id));
alter table public.field_vaccination_receipts enable row level security;
revoke all on public.field_vaccination_receipts from public,anon,authenticated;
grant select on public.field_vaccination_receipts to authenticated;
create policy field_vaccination_receipt_read on public.field_vaccination_receipts for select to authenticated using(actor_id=auth.uid() and ngo_id=public.my_ngo());
create function public.field_confirm_vaccination(p_request uuid,p_case uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();old public.field_vaccination_receipts;h bytea;rid uuid;aid bigint;animal uuid;details text;given date;
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
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'medical_events',rid,'field_vaccination_record',jsonb_build_object('request_id',p_request,'case_id',p_case,'dog_id',animal,'template','arv-field-v1')) returning id into aid;
 insert into public.field_vaccination_receipts values(uid,p_request,org,h,rid,aid);
 return jsonb_build_object('record_id',rid,'audit_id',aid,'replayed',false);
end $$;
revoke all on function public.field_confirm_vaccination(uuid,uuid,jsonb) from public,anon;
grant execute on function public.field_confirm_vaccination(uuid,uuid,jsonb) to authenticated;
