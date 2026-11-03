-- Additive; install and exercise on staging before deploying the field synchroniser.
create table public.field_note_receipts (
 actor_id uuid not null references auth.users(id), request_id uuid not null,
 ngo_id uuid not null, payload_hash bytea not null,
 record_id uuid not null, audit_id bigint not null references public.operational_audit_log(id),
 created_at timestamptz not null default now(), primary key(actor_id,request_id)
);
alter table public.field_note_receipts enable row level security;
revoke all on public.field_note_receipts from public, anon, authenticated;
grant select on public.field_note_receipts to authenticated;
create policy field_receipt_read on public.field_note_receipts for select to authenticated
 using(actor_id=(select auth.uid()) and ngo_id=public.my_ngo());
create function public.field_confirm_note(p_request uuid,p_case uuid,p_note text,p_captured timestamptz)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); org uuid:=public.my_ngo(); previous public.field_note_receipts;
 h bytea; rid uuid; aid bigint; who text; txt text;
begin
 if uid is null or org is null then raise exception 'Organisation access required'; end if;
 if p_request is null or p_case is null or p_captured is null or p_captured>now()+interval '5 minutes' or nullif(btrim(p_note),'') is null or length(p_note)>1500 then raise exception 'Check the note and capture date'; end if;
 if not exists(select 1 from public.cases where id=p_case and ngo_id=org) then raise exception 'Case is not in your organisation'; end if;
 h:=sha256(convert_to(jsonb_build_array(p_case,p_note,p_captured)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,8));
 select * into previous from public.field_note_receipts where actor_id=uid and request_id=p_request;
 if found then
  if previous.ngo_id<>org or previous.payload_hash<>h then raise exception 'Request ID already used for different work'; end if;
  return jsonb_build_object('record_id',previous.record_id,'audit_id',previous.audit_id,'replayed',true);
 end if;
 select coalesce(nullif(name,''),'Team member') into who from public.volunteers where id=uid;
 txt:=btrim(p_note)||E'\n\nField capture: '||p_captured::text||'. Device request '||p_request::text||'.';
 perform public.add_case_note(p_case,uid,coalesce(who,'Team member'),txt);
 select id into rid from public.case_updates where case_id=p_case and note=txt order by created_at desc limit 1;
 if rid is null then raise exception 'The note could not be verified'; end if;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data)
 values(org,uid,'case_updates',rid,'field_note_insert',jsonb_build_object('request_id',p_request,'case_id',p_case,'captured_at',p_captured)) returning id into aid;
 insert into public.field_note_receipts(actor_id,request_id,ngo_id,payload_hash,record_id,audit_id) values(uid,p_request,org,h,rid,aid);
 return jsonb_build_object('record_id',rid,'audit_id',aid,'replayed',false);
end $$;
revoke all on function public.field_confirm_note(uuid,uuid,text,timestamptz) from public,anon;
grant execute on function public.field_confirm_note(uuid,uuid,text,timestamptz) to authenticated;
-- Rollback: revoke execute, drop function then receipt policy/table after preserving
-- receipts for audit. Never delete the source notes or operational audit entries.
