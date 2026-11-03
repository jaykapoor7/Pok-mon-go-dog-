alter table public.field_note_receipts add column record_table text not null default 'case_updates' check(record_table in ('case_updates','evidence_items'));
create function public.field_confirm_evidence(p_request uuid,p_case uuid,p_kind text,p_url text,p_location text,p_captured timestamptz) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();old public.field_note_receipts;h bytea;rid uuid;aid bigint;
begin
 if uid is null or org is null or not exists(select 1 from public.cases where id=p_case and ngo_id=org) then raise exception 'Case is not in your organisation';end if;
 if p_request is null or p_kind not in ('capture_photo','surgery_record','ear_notch_photo','release_photo','release_location') or p_captured is null or p_captured>now()+interval '5 minutes' or length(coalesce(p_location,''))>1500 or length(coalesce(p_url,''))>1000 then raise exception 'Invalid field evidence';end if;
 if p_kind<>'release_location' and coalesce(p_url,'') not like 'storage://abc-evidence/'||org::text||'/'||p_case::text||'/'||p_request::text||'.%' then raise exception 'Evidence must use this request’s private storage path';end if;
 h:=sha256(convert_to(jsonb_build_array('evidence',p_case,p_kind,p_url,p_location,p_captured)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,8));
 select * into old from public.field_note_receipts where actor_id=uid and request_id=p_request;
 if found then
  if old.ngo_id<>org or old.payload_hash<>h then raise exception 'Request ID already used for different work';end if;
  return jsonb_build_object('record_id',old.record_id,'record_table',old.record_table,'audit_id',old.audit_id,'replayed',true);
 end if;
 rid:=public.abc_add_evidence(p_case_id=>p_case,p_kind=>p_kind,p_url=>p_url,p_location=>p_location,p_title=>'Field observation captured '||p_captured::text);
 if rid is null then raise exception 'Evidence did not return a record';end if;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'evidence_items',rid,'field_evidence_insert',jsonb_build_object('request_id',p_request,'case_id',p_case,'captured_at',p_captured)) returning id into aid;
 insert into public.field_note_receipts(actor_id,request_id,ngo_id,payload_hash,record_id,audit_id,record_table) values(uid,p_request,org,h,rid,aid,'evidence_items');
 return jsonb_build_object('record_id',rid,'record_table','evidence_items','audit_id',aid,'replayed',false);
end $$;
revoke all on function public.field_confirm_evidence(uuid,uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.field_confirm_evidence(uuid,uuid,text,text,text,timestamptz) to authenticated;
