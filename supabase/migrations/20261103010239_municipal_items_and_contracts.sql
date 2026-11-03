-- Versioned, authorised contract configuration and per-animal claim review.
-- These records support reconciliation. They never initiate a payment.
create table public.operations_contracts (
 id uuid primary key default gen_random_uuid(),ngo_id uuid not null references public.ngos(id),office_id uuid not null references public.review_offices(id),
 name text not null check(length(name) between 3 and 160),version integer not null check(version>0),reference text not null,
 starts_on date not null,ends_on date not null,currency text not null default 'INR' check(currency='INR'),
 illustrative boolean not null default false,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 unique(ngo_id,office_id,name,version),check(ends_on>=starts_on)
);
create table public.operations_contract_rates (
 id uuid primary key default gen_random_uuid(),contract_id uuid not null references public.operations_contracts(id),
 code text not null check(code in ('sterilisation','vaccination','treatment','other')),label text not null,
 unit_rate numeric(14,2) not null check(unit_rate>=0),required_evidence text[] not null default '{}',required_events text[] not null default '{}',
 vet_required boolean not null default true,unique(contract_id,code)
);
create table public.operations_package_configurations (
 id uuid primary key default gen_random_uuid(),package_id uuid not null references public.report_packages(id),contract_id uuid references public.operations_contracts(id),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
alter table public.report_packages add column operations_configuration uuid references public.operations_package_configurations(id);
alter table public.report_packages add column item_review_enabled boolean not null default false;
alter table public.report_packages drop constraint if exists report_packages_status_check;
alter table public.report_packages add constraint report_packages_status_check check(status in ('draft','submitted','queried','accepted','returned','partially_accepted'));
alter table public.package_events drop constraint if exists package_events_kind_check;
alter table public.package_events add constraint package_events_kind_check check(kind in ('created','submitted','query','answer','accepted','returned','partial_review'));
create table public.operations_package_claims (
 id uuid primary key default gen_random_uuid(),configuration_id uuid not null references public.operations_package_configurations(id),
 package_id uuid not null references public.report_packages(id),case_id uuid not null references public.cases(id),rate_id uuid not null references public.operations_contract_rates(id),
 units numeric(8,2) not null check(units>0 and units<=1),unit_rate numeric(14,2) not null check(unit_rate>=0),
 unique(configuration_id,case_id,rate_id)
);
create index operations_claim_package on public.operations_package_claims(package_id,configuration_id,case_id);
create table public.operations_package_snapshots (
 id uuid primary key default gen_random_uuid(),package_id uuid not null references public.report_packages(id),case_id uuid not null references public.cases(id),
 source jsonb not null,source_hash bytea not null,recorded_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index operations_snapshot_case on public.operations_package_snapshots(package_id,case_id,created_at desc,id);
alter table public.operations_package_snapshots enable row level security;
revoke all on public.operations_package_snapshots from public,anon,authenticated;
grant select on public.operations_package_snapshots to authenticated;
create table public.operations_item_decisions (
 id uuid primary key default gen_random_uuid(),package_id uuid not null references public.report_packages(id),case_id uuid not null references public.cases(id),
 claim_id uuid references public.operations_package_claims(id),snapshot_id uuid references public.operations_package_snapshots(id),decision text not null check(decision in ('accepted','query','returned','rejected','answer')),
 accepted_units numeric(8,2),note text not null,actor_id uuid not null references auth.users(id),actor_name text not null,created_at timestamptz not null default now()
);
create index operations_decision_item on public.operations_item_decisions(package_id,case_id,claim_id,created_at desc,id);
create table public.operations_payment_evidence (
 id uuid primary key default gen_random_uuid(),package_id uuid not null references public.report_packages(id),amount numeric(14,2) not null check(amount>=0),
 paid_on date not null,reference text not null,document_url text not null,note text not null,
 actor_id uuid not null references auth.users(id),actor_name text not null,created_at timestamptz not null default now(),unique(package_id,reference)
);

create function public.operations_package_access(p_package uuid,p_finance boolean default false)
returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select auth.uid() is not null and exists(select 1 from public.report_packages p where p.id=p_package and (
 (p.ngo_id=public.my_ngo() and (not p_finance or coalesce(public.sp_member_role(p.ngo_id),'') in ('admin','coordinator')))
 or (p.status<>'draft' and exists(select 1 from public.review_office_members m where m.office_id=p.office_id and m.user_id=auth.uid()))))
$$;
revoke all on function public.operations_package_access(uuid,boolean) from public,anon;
grant execute on function public.operations_package_access(uuid,boolean) to authenticated;
alter table public.operations_contracts enable row level security;
alter table public.operations_contract_rates enable row level security;
alter table public.operations_package_configurations enable row level security;
alter table public.operations_package_claims enable row level security;
alter table public.operations_item_decisions enable row level security;
alter table public.operations_payment_evidence enable row level security;
revoke all on public.operations_contracts,public.operations_contract_rates,public.operations_package_configurations,public.operations_package_claims,public.operations_item_decisions,public.operations_payment_evidence from public,anon,authenticated;
grant select on public.operations_contracts,public.operations_contract_rates,public.operations_package_configurations,public.operations_package_claims,public.operations_item_decisions,public.operations_payment_evidence to authenticated;
create policy contract_read on public.operations_contracts for select to authenticated using((ngo_id=public.my_ngo() and coalesce(public.sp_member_role(ngo_id),'') in ('admin','coordinator')) or exists(select 1 from public.review_office_members m where m.office_id=operations_contracts.office_id and m.user_id=auth.uid()));
create policy contract_rate_read on public.operations_contract_rates for select to authenticated using(exists(select 1 from public.operations_contracts c where c.id=contract_id));
create policy snapshot_read on public.operations_package_snapshots for select to authenticated using(public.operations_package_access(package_id));
create policy configuration_read on public.operations_package_configurations for select to authenticated using(public.operations_package_access(package_id,true));
create policy claim_read on public.operations_package_claims for select to authenticated using(public.operations_package_access(package_id,true));
create policy decision_read on public.operations_item_decisions for select to authenticated using(public.operations_package_access(package_id));
create policy payment_reference_read on public.operations_payment_evidence for select to authenticated using(public.operations_package_access(package_id,true));

create function operations_private.capture_snapshot(p_package uuid,p_case uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;payload jsonb;rid uuid;
begin
 select * into p from public.report_packages where id=p_package;
 if auth.uid() is null or p.ngo_id is distinct from public.my_ngo() or coalesce(public.sp_member_role(p.ngo_id),'') not in ('admin','coordinator') or not p_case=any(p.case_ids) then raise exception 'Only the operator coordinator can submit a source snapshot';end if;
 payload:=jsonb_build_object('version','operations-snapshot-v1','case',(select jsonb_build_object('id',c.id,'case_code',c.case_code,'dog_id',c.dog_id,'title',c.title,'city',c.city,'provenance',c.provenance) from public.cases c where c.id=p_case),
 'evidence',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'url',e.url,'location',e.location_text,'at',e.captured_at) order by e.created_at,e.id),'[]') from public.evidence_items e where e.case_id=p_case),
 'attestations',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'kind',a.kind,'actor',a.actor_name,'snapshot',a.snapshot) order by a.created_at),'[]') from public.abc_attestations a where a.case_id=p_case and a.revoked_at is null),
 'operations',(select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'occurred_at',e.occurred_at,'payload',e.payload,'policy_id',e.policy_id) order by e.created_at),'[]') from public.animal_operation_events e where e.case_id=p_case));
 insert into public.operations_package_snapshots(package_id,case_id,source,source_hash,recorded_by) values(p.id,p_case,payload,sha256(convert_to(payload::text,'UTF8')),auth.uid()) returning id into rid;
 return rid;
end $$;
revoke all on function operations_private.capture_snapshot(uuid,uuid) from public,anon,authenticated;

create function public.operations_case_amendable(p_case uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select not exists(select 1 from public.report_packages p where p_case=any(p.case_ids) and (
  (not p.item_review_enabled and p.status in ('submitted','queried','accepted'))
  or (p.item_review_enabled and p.status<>'draft' and (
   exists(select 1 from public.operations_package_claims cl where cl.package_id=p.id and cl.configuration_id=p.operations_configuration and cl.case_id=p_case and coalesce((select decision from public.operations_item_decisions d where d.package_id=p.id and d.case_id=p_case and d.claim_id=cl.id order by d.created_at desc,d.id desc limit 1),'') not in ('query','returned'))
   or (not exists(select 1 from public.operations_package_claims cl where cl.package_id=p.id and cl.configuration_id=p.operations_configuration and cl.case_id=p_case) and coalesce((select decision from public.operations_item_decisions d where d.package_id=p.id and d.case_id=p_case and d.claim_id is null order by d.created_at desc,d.id desc limit 1),'') not in ('query','returned'))
  ))
 ))
$$;
revoke all on function public.operations_case_amendable(uuid) from public,anon,authenticated;

create function public.operations_create_contract(p_request uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare org uuid:=coalesce(nullif(p_payload->>'ngo_id','')::uuid,public.my_ngo());office uuid:=(p_payload->>'office_id')::uuid;result jsonb;rid uuid;aid bigint;rate jsonb;e text;
begin
 if auth.uid() is null or org is null or office is null then raise exception 'Choose an operator and reviewing office';end if;
 if not ((org=public.my_ngo() and coalesce(public.sp_member_role(org),'') in ('admin','coordinator')) or exists(select 1 from public.review_office_members where office_id=office and user_id=auth.uid())) then raise exception 'Contract configuration requires operator leadership or the named reviewing office';end if;
 if nullif(btrim(p_payload->>'reference'),'') is null or jsonb_typeof(p_payload->'rates') is distinct from 'array' or jsonb_array_length(p_payload->'rates') not between 1 and 10 then raise exception 'Record the source reference and at least one procedure rate';end if;
 result:=operations_private.replay(p_request,'contract',p_payload);if result is not null then return result;end if;
 insert into public.operations_contracts(ngo_id,office_id,name,version,reference,starts_on,ends_on,illustrative,created_by)
 values(org,office,btrim(p_payload->>'name'),(p_payload->>'version')::integer,btrim(p_payload->>'reference'),(p_payload->>'starts_on')::date,(p_payload->>'ends_on')::date,coalesce((p_payload->>'illustrative')::boolean,false),auth.uid()) returning id into rid;
 for rate in select * from jsonb_array_elements(p_payload->'rates') loop
  if not rate?'unit_rate' or rate->'unit_rate'='null'::jsonb or nullif(rate->>'unit_rate','') is null or (rate->>'unit_rate') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'A missing rate is unknown, not zero';end if;
  for e in select jsonb_array_elements_text(coalesce(rate->'required_evidence','[]')) loop if e not in ('capture_photo','surgery_record','ear_notch_photo','release_photo','release_location') then raise exception 'Unknown evidence requirement';end if;end loop;
  for e in select jsonb_array_elements_text(coalesce(rate->'required_events','[]')) loop if e not in ('capture','intake','sterilisation','vaccination','recovery','release','transfer','followup','identification') then raise exception 'Unknown operation requirement';end if;end loop;
  insert into public.operations_contract_rates(contract_id,code,label,unit_rate,required_evidence,required_events,vet_required)
  values(rid,rate->>'code',coalesce(nullif(rate->>'label',''),rate->>'code'),(rate->>'unit_rate')::numeric,array(select jsonb_array_elements_text(coalesce(rate->'required_evidence','[]'))),array(select jsonb_array_elements_text(coalesce(rate->'required_events','[]'))),coalesce((rate->>'vet_required')::boolean,true));
 end loop;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'operations_contracts',rid,'configure_contract',jsonb_build_object('request_id',p_request,'source_reference',p_payload->>'reference','illustrative',p_payload->'illustrative')) returning id into aid;
 return operations_private.receipt(p_request,org,'contract',p_payload,jsonb_build_object('record_id',rid,'office_id',office),aid);
end $$;

create function public.operations_configure_package(p_request uuid,p_package uuid,p_contract uuid,p_claims jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;c public.operations_contracts;input jsonb:=jsonb_build_array(p_package,p_contract,p_claims);result jsonb;rid uuid;aid bigint;claim jsonb;rate public.operations_contract_rates;cid uuid;
begin
 select * into p from public.report_packages where id=p_package for update;
 if not found or p.ngo_id is distinct from public.my_ngo() or coalesce(public.sp_member_role(p.ngo_id),'') not in ('admin','coordinator') then raise exception 'Only the operator coordinator can configure this package';end if;
 if p.status<>'draft' then raise exception 'Contract claims are fixed after submission';end if;
 if jsonb_typeof(p_claims) is distinct from 'array' or jsonb_array_length(p_claims)>2000 then raise exception 'Invalid package claims';end if;
 if p_contract is not null then select * into c from public.operations_contracts where id=p_contract and ngo_id=p.ngo_id and office_id=p.office_id;if not found or p.period_start<c.starts_on or p.period_end>c.ends_on then raise exception 'Choose a contract for this operator, office and reporting period';end if;end if;
 result:=operations_private.replay(p_request,'package_configuration',input);if result is not null then return result;end if;
 insert into public.operations_package_configurations(package_id,contract_id,created_by) values(p.id,p_contract,auth.uid()) returning id into rid;
 for claim in select * from jsonb_array_elements(p_claims) loop
  if (claim->>'units')::numeric is distinct from 1::numeric then raise exception 'Use one explicit animal/procedure unit per claim';end if;
  cid:=(claim->>'case_id')::uuid;if not cid=any(p.case_ids) then raise exception 'Claimed animal is outside the package';end if;
  select * into rate from public.operations_contract_rates where id=(claim->>'rate_id')::uuid and contract_id=p_contract;if not found then raise exception 'Choose a rate from the selected contract version';end if;
  insert into public.operations_package_claims(configuration_id,package_id,case_id,rate_id,units,unit_rate) values(rid,p.id,cid,rate.id,(claim->>'units')::numeric,rate.unit_rate);
 end loop;
 update public.report_packages set operations_configuration=rid,item_review_enabled=true where id=p.id;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(p.ngo_id,auth.uid(),'operations_package_configurations',rid,'configure_package_claims',jsonb_build_object('request_id',p_request,'package_id',p.id,'contract_id',p_contract,'claims',p_claims)) returning id into aid;
 return operations_private.receipt(p_request,p.ngo_id,'package_configuration',input,jsonb_build_object('record_id',rid,'package_id',p.id),aid);
end $$;

create function public.operations_package_items(p_package uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;items jsonb;
begin
 if not public.operations_package_access(p_package,true) then raise exception 'Package reconciliation requires operator leadership or the receiving office';end if;
 select * into p from public.report_packages where id=p_package;
 select coalesce(jsonb_agg(item order by item->>'case_code',item->>'procedure'),'[]') into items from (
  select jsonb_build_object('key',coalesce(cl.id,c.id),'case_id',c.id,'claim_id',cl.id,'case_code',c.case_code,'animal_id',c.dog_id,'title',c.title,
   'procedure',coalesce(rate.code,'animal_record'),'procedure_label',coalesce(rate.label,'Animal record · no rate configured'),'claimed_units',coalesce(cl.units,1),'unit_rate',cl.unit_rate::text,'claimed_amount',round(cl.units*cl.unit_rate,2)::text,
   'decision',case when d.decision='answer' then 'pending' else coalesce(d.decision,'pending') end,'accepted_units',case when d.decision='accepted' then d.accepted_units else null end,
   'decision_id',d.id,'snapshot_id',d.snapshot_id,'evidence_snapshot',snap.source->'evidence','signoffs_snapshot',snap.source->'attestations','snapshot_at',snap.created_at,'source_hash',encode(snap.source_hash,'hex'),'note',d.note,'reviewer',d.actor_name,'decided_at',d.created_at,
   'missing',to_jsonb(array(
    select 'Evidence: '||e from unnest(coalesce(rate.required_evidence,'{}')) e where not exists(select 1 from public.evidence_items ev where ev.case_id=c.id and ev.kind=e)
    union all select 'Operation: '||k from unnest(coalesce(rate.required_events,'{}')) k where not exists(select 1 from public.animal_operation_events oe where oe.case_id=c.id and oe.kind=k)
    union all select 'Procedure dated within the reporting period' where rate.code in ('sterilisation','vaccination','treatment') and not exists(select 1 from public.medical_events m where m.case_id=c.id and m.kind::text=rate.code and m.event_date between p.period_start and p.period_end)
    union all select 'Veterinary authorisation' where coalesce(rate.vet_required,true) and not exists(select 1 from public.abc_attestations a where a.case_id=c.id and a.kind='vet_authorised' and a.revoked_at is null)
    union all select 'Coordinator evidence review' where not exists(select 1 from public.abc_attestations a where a.case_id=c.id and a.kind='evidence_reviewed' and a.revoked_at is null)
    union all select 'Identity review' where exists(select 1 from public.dogs d where d.id=c.dog_id and d.identity_state in ('provisional','possible_duplicate'))
    union all select 'Disposition/exception review' where exists(select 1 from public.animal_operation_events e where e.case_id=c.id and e.kind in ('release','transfer','exception','correction') and coalesce((select decision from public.animal_operation_reviews v where v.event_id=e.id order by v.created_at desc,v.id desc limit 1),'')<>'confirmed')
   ))) as item
  from public.cases c
  left join public.operations_package_claims cl on cl.case_id=c.id and cl.package_id=p.id and cl.configuration_id=p.operations_configuration
  left join public.operations_contract_rates rate on rate.id=cl.rate_id
  left join lateral(select * from public.operations_item_decisions dec where dec.package_id=p.id and dec.case_id=c.id and dec.claim_id is not distinct from cl.id order by dec.created_at desc,dec.id desc limit 1) d on true
  left join lateral(select * from public.operations_package_snapshots ss where ss.package_id=p.id and ss.case_id=c.id and (d.snapshot_id is null or ss.id=d.snapshot_id) order by ss.created_at desc,ss.id desc limit 1) snap on true
  where c.id=any(p.case_ids)
 ) q;
 return items;
end $$;

create function public.operations_decide_item(p_request uuid,p_package uuid,p_case uuid,p_claim uuid,p_decision text,p_note text,p_units numeric default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;input jsonb:=jsonb_build_array(p_package,p_case,p_claim,p_decision,p_note,p_units);result jsonb;rid uuid;aid bigint;item jsonb;v_snapshot uuid;
begin
 select * into p from public.report_packages where id=p_package for update;
 if not found or not p.item_review_enabled or p.status='draft' or p.ngo_id=public.my_ngo() or not exists(select 1 from public.review_office_members m where m.office_id=p.office_id and m.user_id=auth.uid()) then raise exception 'Only an independent reviewer at the receiving office can decide submitted items';end if;
 if p_decision not in ('accepted','query','returned','rejected') or nullif(btrim(p_note),'') is null or length(p_note)>3000 then raise exception 'Record an individual decision and review note';end if;
 perform 1 from public.cases where id=p_case and ngo_id=p.ngo_id for update;
 select value into item from jsonb_array_elements(public.operations_package_items(p.id)) where (value->>'case_id')::uuid=p_case and nullif(value->>'claim_id','')::uuid is not distinct from p_claim;
 if item is null then raise exception 'This claim is not in the package’s current configuration';end if;
 if p_decision='accepted' and (p_units is null or p_units<=0 or p_units is distinct from (item->>'claimed_units')::numeric or jsonb_array_length(item->'missing')>0) then raise exception 'Resolve missing requirements and confirm accepted quantity within the claim';end if;
 result:=operations_private.replay(p_request,'item_decision',input);if result is not null then return result;end if;
 select id into v_snapshot from public.operations_package_snapshots where package_id=p.id and case_id=p_case order by created_at desc,id desc limit 1;
 if v_snapshot is null then raise exception 'No submitted source snapshot is available. Ask the operator to resubmit this item.';end if;
 if p_decision='accepted' and (exists(select 1 from public.abc_attestations a where a.case_id=p_case and a.revoked_at is null and a.kind in ('vet_authorised','evidence_reviewed') and not exists(select 1 from public.operations_package_snapshots ss cross join lateral jsonb_array_elements(ss.source->'attestations') aa where ss.id=v_snapshot and aa->>'id'=a.id::text)) or exists(select 1 from public.evidence_items ev where ev.case_id=p_case and not exists(select 1 from public.operations_package_snapshots ss cross join lateral jsonb_array_elements(ss.source->'evidence') ee where ss.id=v_snapshot and ee->>'id'=ev.id::text))) then raise exception 'The source changed after its submission snapshot. Ask the operator to submit an updated response first.';end if;
 insert into public.operations_item_decisions(package_id,case_id,claim_id,snapshot_id,decision,accepted_units,note,actor_id,actor_name) values(p.id,p_case,p_claim,v_snapshot,p_decision,case when p_decision='accepted' then p_units else null end,btrim(p_note),auth.uid(),public.sp_actor_name()) returning id into rid;
 -- Reopen review after an explicit reconsideration; individual accepted quantities remain recorded.
 update public.report_packages set status='submitted' where id=p.id and status in ('partially_accepted','returned','accepted');
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(p.ngo_id,auth.uid(),'operations_item_decisions',rid,'municipal_item_'||p_decision,jsonb_build_object('request_id',p_request,'package_id',p.id,'case_id',p_case,'claim_id',p_claim,'snapshot_id',v_snapshot,'accepted_units',p_units)) returning id into aid;
 return operations_private.receipt(p_request,p.ngo_id,'item_decision',input,jsonb_build_object('record_id',rid,'package_id',p.id),aid);
end $$;

create function public.operations_answer_item(p_request uuid,p_package uuid,p_case uuid,p_claim uuid,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;input jsonb:=jsonb_build_array(p_package,p_case,p_claim,p_note);result jsonb;rid uuid;aid bigint;last text;v_snapshot uuid;
begin
 select * into p from public.report_packages where id=p_package for update;
 if not found or p.status='draft' or p.ngo_id is distinct from public.my_ngo() or coalesce(public.sp_member_role(p.ngo_id),'') not in ('admin','coordinator') then raise exception 'Only the operator coordinator can answer';end if;
 if nullif(btrim(p_note),'') is null or length(p_note)>3000 then raise exception 'Write the response';end if;
 result:=operations_private.replay(p_request,'item_answer',input);if result is not null then return result;end if;

 select decision into last from public.operations_item_decisions where package_id=p.id and case_id=p_case and claim_id is not distinct from p_claim order by created_at desc,id desc limit 1;
 if last not in ('query','returned') or last is null then raise exception 'There is no open item query or return';end if;
 v_snapshot:=operations_private.capture_snapshot(p.id,p_case);
 insert into public.operations_item_decisions(package_id,case_id,claim_id,snapshot_id,decision,note,actor_id,actor_name) values(p.id,p_case,p_claim,v_snapshot,'answer',btrim(p_note),auth.uid(),public.sp_actor_name()) returning id into rid;
 update public.report_packages set status='submitted' where id=p.id;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(p.ngo_id,auth.uid(),'operations_item_decisions',rid,'operator_item_answer',jsonb_build_object('request_id',p_request,'package_id',p.id,'case_id',p_case)) returning id into aid;
 return operations_private.receipt(p_request,p.ngo_id,'item_answer',input,jsonb_build_object('record_id',rid,'package_id',p.id),aid);
end $$;

create function public.operations_finalize_package(p_request uuid,p_package uuid,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;input jsonb:=jsonb_build_array(p_package,p_note);result jsonb;items jsonb;accepted integer;total integer;next_status text;aid bigint;
begin
 select * into p from public.report_packages where id=p_package for update;
 if not found or not p.item_review_enabled or p.ngo_id=public.my_ngo() or not exists(select 1 from public.review_office_members m where m.office_id=p.office_id and m.user_id=auth.uid()) then raise exception 'Independent receiving-office review required';end if;
 if nullif(btrim(p_note),'') is null then raise exception 'Record the package decision summary';end if;
 result:=operations_private.replay(p_request,'finalize_package',input);if result is not null then return result;end if;
 if p.status<>'submitted' then raise exception 'The package is not waiting for review';end if;
 items:=public.operations_package_items(p.id);total:=jsonb_array_length(items);select count(*) into accepted from jsonb_array_elements(items) v where v->>'decision'='accepted';
 if total=0 or exists(select 1 from jsonb_array_elements(items) v where v->>'decision' in ('pending','query')) then raise exception 'Decide each item or resolve open queries before closing review';end if;
 next_status:=case when accepted=total then 'accepted' when accepted>0 then 'partially_accepted' else 'returned' end;
 update public.report_packages set status=next_status,decided_by=auth.uid(),decided_by_name=public.sp_actor_name(),decided_at=now() where id=p.id;
 insert into public.package_events(package_id,actor_id,actor_name,side,kind,body) values(p.id,auth.uid(),public.sp_actor_name(),'reviewer',case when next_status='partially_accepted' then 'partial_review' else next_status end,p_note);
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(p.ngo_id,auth.uid(),'report_package',p.id,'finalize_item_review',jsonb_build_object('request_id',p_request,'package_id',p.id,'status',next_status,'accepted_items',accepted,'items',total)) returning id into aid;
 return operations_private.receipt(p_request,p.ngo_id,'finalize_package',input,jsonb_build_object('record_id',p.id,'package_id',p.id,'status',next_status),aid);
end $$;

create function public.operations_case_accepted(p_case uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.report_packages p where p_case=any(p.case_ids) and (
  (not p.item_review_enabled and p.status='accepted')
  or (p.item_review_enabled and p.status<>'draft' and (
   exists(select 1 from public.operations_item_decisions d where d.package_id=p.id and d.case_id=p_case)
   and not exists(select 1 from public.operations_package_claims cl where cl.package_id=p.id and cl.configuration_id=p.operations_configuration and cl.case_id=p_case and coalesce((select decision from public.operations_item_decisions d where d.package_id=p.id and d.case_id=p_case and d.claim_id=cl.id order by d.created_at desc,d.id desc limit 1),'')<>'accepted')
   and (exists(select 1 from public.operations_package_claims cl where cl.package_id=p.id and cl.configuration_id=p.operations_configuration and cl.case_id=p_case) or coalesce((select decision from public.operations_item_decisions d where d.package_id=p.id and d.case_id=p_case and d.claim_id is null order by d.created_at desc,d.id desc limit 1),'')='accepted')
  ))
 ))
$$;
-- No direct external probing of claim status; callers enforce case access first.
revoke all on function public.operations_case_accepted(uuid) from public,anon,authenticated;

-- Keep old package actions for pre-upgrade records, under the existing checks.
alter function public.abc_package_act(uuid,text,text) rename to operations_legacy_package_act;
alter function public.operations_legacy_package_act(uuid,text,text) set search_path=pg_catalog,public,pg_temp;
revoke all on function public.operations_legacy_package_act(uuid,text,text) from public,anon,authenticated;
create function public.abc_package_act(p_package uuid,p_kind text,p_body text default null)
returns text language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;items jsonb;item jsonb;dog uuid;procedure text;cid uuid;
begin
 select * into p from public.report_packages where id=p_package for update;
 if p.item_review_enabled then
  if p_kind='accepted' then raise exception 'Review individual animal claims and close the package review';end if;
  if p_kind='returned' and exists(select 1 from public.operations_item_decisions d where d.package_id=p.id and d.decision='accepted') then raise exception 'Return individual records; accepted quantities have their own audit history';end if;
  if p_kind='submitted' then
   if p.ngo_id is distinct from public.my_ngo() or coalesce(public.sp_member_role(p.ngo_id),'') not in ('admin','coordinator') then raise exception 'Coordinator access required';end if;
   perform 1 from public.cases where id=any(p.case_ids) order by id for update;
   items:=public.operations_package_items(p.id);
   if exists(select 1 from jsonb_array_elements(items) i where jsonb_array_length(i->'missing')>0) then raise exception 'Resolve missing evidence, authorisations and disposition reviews before submission';end if;
   if exists(select 1 from jsonb_array_elements(items) i where i->>'animal_id' is not null and i->>'procedure'<>'animal_record' group by i->>'animal_id',i->>'procedure' having count(*)>1) then raise exception 'The same animal/procedure is claimed more than once in this package';end if;
   foreach cid in array p.case_ids loop perform operations_private.capture_snapshot(p.id,cid);end loop;
   for item in select * from jsonb_array_elements(items) loop
    dog:=nullif(item->>'animal_id','')::uuid;procedure:=item->>'procedure';
    if dog is not null and procedure<>'animal_record' then
     perform pg_advisory_xact_lock(hashtextextended(p.ngo_id::text||dog::text||procedure,44));
     if exists(select 1 from public.operations_package_claims cl join public.report_packages q on q.id=cl.package_id join public.cases c on c.id=cl.case_id join public.operations_contract_rates r on r.id=cl.rate_id where q.id<>p.id and cl.configuration_id=q.operations_configuration and q.ngo_id=p.ngo_id and q.status not in ('draft','returned') and c.dog_id=dog and r.code=procedure and q.period_start<=p.period_end and q.period_end>=p.period_start and coalesce((select dec.decision from public.operations_item_decisions dec where dec.package_id=q.id and dec.claim_id=cl.id order by dec.created_at desc,dec.id desc limit 1),'pending') not in ('returned','rejected')) then raise exception 'This animal/procedure is already claimed in an overlapping submitted reporting period';end if;
    end if;
   end loop;
  end if;
 end if;
 return public.operations_legacy_package_act(p_package,p_kind,p_body);
end $$;

-- Private package documents: payment references, not payment instructions.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('operations-documents','operations-documents',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy operations_documents_insert on storage.objects for insert to authenticated with check(bucket_id='operations-documents' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.operations_package_access((case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid else null end),true));
create policy operations_documents_read on storage.objects for select to authenticated using(bucket_id='operations-documents' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.operations_package_access((case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then ((storage.foldername(name))[1])::uuid else null end),true));
create function public.operations_record_payment_reference(p_request uuid,p_package uuid,p_amount numeric,p_paid_on date,p_reference text,p_document text,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;input jsonb:=jsonb_build_array(p_package,p_amount,p_paid_on,p_reference,p_document,p_note);result jsonb;rid uuid;aid bigint;path text;
begin
 select * into p from public.report_packages where id=p_package;
 if not found or p.status not in ('accepted','partially_accepted') or p.ngo_id=public.my_ngo() or not exists(select 1 from public.review_office_members m where m.office_id=p.office_id and m.user_id=auth.uid()) then raise exception 'Payment evidence requires the receiving office and a reviewed package';end if;
 if p_amount is null or p_amount<0 or p_paid_on is null or p_paid_on>current_date or nullif(btrim(p_reference),'') is null or nullif(btrim(p_note),'') is null then raise exception 'Record the amount, payment date, source reference and explanation';end if;
 path:=replace(p_document,'storage://operations-documents/','');if p_document not like 'storage://operations-documents/'||p.id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='operations-documents' and name=path) then raise exception 'Attach an authorised private source document';end if;
 result:=operations_private.replay(p_request,'payment_reference',input);if result is not null then return result;end if;
 insert into public.operations_payment_evidence(package_id,amount,paid_on,reference,document_url,note,actor_id,actor_name) values(p.id,p_amount,p_paid_on,btrim(p_reference),p_document,btrim(p_note),auth.uid(),public.sp_actor_name()) returning id into rid;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(p.ngo_id,auth.uid(),'operations_payment_evidence',rid,'record_external_payment_reference',jsonb_build_object('request_id',p_request,'package_id',p.id,'source_reference',p_reference,'amount',p_amount)) returning id into aid;
 return operations_private.receipt(p_request,p.ngo_id,'payment_reference',input,jsonb_build_object('record_id',rid,'package_id',p.id),aid);
end $$;

create function public.operations_reconciliation(p_package uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare p public.report_packages;items jsonb;contract jsonb;claimed numeric;reviewed numeric;accepted numeric;paid numeric;
begin
 items:=public.operations_package_items(p_package);select * into p from public.report_packages where id=p_package;
 select to_jsonb(c) into contract from public.operations_package_configurations cfg join public.operations_contracts c on c.id=cfg.contract_id where cfg.id=p.operations_configuration;
 if contract is not null and not exists(select 1 from jsonb_array_elements(items) i where i->>'unit_rate' is null) then
  select sum((i->>'claimed_amount')::numeric),coalesce(sum((i->>'claimed_amount')::numeric) filter(where i->>'decision' in ('accepted','rejected','returned')),0),coalesce(sum((i->>'accepted_units')::numeric*(i->>'unit_rate')::numeric) filter(where i->>'decision'='accepted'),0) into claimed,reviewed,accepted from jsonb_array_elements(items) i;
 end if;
 select sum(amount) into paid from public.operations_payment_evidence where package_id=p.id;
 return jsonb_build_object('package_id',p.id,'status',p.status,'item_review_enabled',p.item_review_enabled,'contract',contract,'items',items,'currency','INR','claimed_amount',round(claimed,2)::text,'reviewed_amount',round(reviewed,2)::text,'accepted_amount',round(accepted,2)::text,'paid_amount',round(paid,2)::text,'payment_exceeds_accepted',paid is not null and accepted is not null and paid>accepted,'generated_at',now(),'payment_processing',false);
end $$;

revoke all on function public.operations_create_contract(uuid,jsonb),public.operations_configure_package(uuid,uuid,uuid,jsonb),public.operations_package_items(uuid),public.operations_decide_item(uuid,uuid,uuid,uuid,text,text,numeric),public.operations_answer_item(uuid,uuid,uuid,uuid,text),public.operations_finalize_package(uuid,uuid,text),public.operations_record_payment_reference(uuid,uuid,numeric,date,text,text,text),public.operations_reconciliation(uuid),public.abc_package_act(uuid,text,text) from public,anon;
grant execute on function public.operations_create_contract(uuid,jsonb),public.operations_configure_package(uuid,uuid,uuid,jsonb),public.operations_package_items(uuid),public.operations_decide_item(uuid,uuid,uuid,uuid,text,text,numeric),public.operations_answer_item(uuid,uuid,uuid,uuid,text),public.operations_finalize_package(uuid,uuid,text),public.operations_record_payment_reference(uuid,uuid,numeric,date,text,text,text),public.operations_reconciliation(uuid),public.abc_package_act(uuid,text,text) to authenticated;

CREATE OR REPLACE FUNCTION public.abc_case_checklist(p_case_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare v_ngo uuid; v jsonb; v_kind text; v_required text[]; v_missing text[] := '{}'; k text;
begin
  select ngo_id,category::text into v_ngo,v_kind from cases where id = p_case_id;
  if v_ngo is null then raise exception 'Case not found'; end if;
  if v_ngo is distinct from public.my_ngo()
     and not exists (select 1 from report_packages p join review_office_members m on m.office_id = p.office_id
                     where m.user_id = auth.uid() and p.status <> 'draft' and p_case_id = any (p.case_ids)) then
    raise exception 'You cannot read this case';
  end if;
  v := jsonb_build_object();
  v_required:=case when v_kind='vaccination' then array['capture_photo','release_location'] else array['capture_photo','surgery_record','ear_notch_photo','release_photo','release_location'] end;
  foreach k in array v_required loop
    v := v || jsonb_build_object(k, exists (select 1 from evidence_items e where e.case_id = p_case_id and e.kind = k));
    if not exists (select 1 from evidence_items e where e.case_id = p_case_id and e.kind = k) then v_missing := v_missing || k; end if;
  end loop;
  return jsonb_build_object(
    'items', v, 'required',to_jsonb(v_required),'amendable',public.operations_case_amendable(p_case_id),'clinical_ready',exists(select 1 from public.medical_events m where m.case_id=p_case_id and m.kind=case when v_required=array['capture_photo','release_location']::text[] then 'vaccination' else 'sterilisation' end),
    'missing', to_jsonb(v_missing),
    'vet_authorised', exists (select 1 from abc_attestations a where a.case_id = p_case_id and a.kind = 'vet_authorised' and a.revoked_at is null),
    'evidence_reviewed', exists (select 1 from abc_attestations a where a.case_id = p_case_id and a.kind = 'evidence_reviewed' and a.revoked_at is null),
    'government_accepted', public.operations_case_accepted(p_case_id)
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.abc_vet_authorise(p_case_id uuid, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if public.sp_member_role(v_ngo) is distinct from 'veterinarian' then raise exception 'Only a veterinarian in this organisation can authorise a procedure'; end if;
  perform 1 from public.cases where id=p_case_id and ngo_id=v_ngo for update;
  if not found then raise exception 'That case is not in your organisation';end if;
  if exists(select 1 from cases where id=p_case_id and category='vaccination') then
    if not exists(select 1 from medical_events where case_id=p_case_id and kind='vaccination') then raise exception 'Record the vaccination details before veterinary authorisation';end if;
  elsif not exists (select 1 from evidence_items where case_id = p_case_id and kind = 'surgery_record') then raise exception 'Add the surgery record before authorising'; end if;
  insert into abc_attestations (ngo_id, case_id, kind, actor_id, actor_name, actor_role, note, snapshot)
  values (v_ngo, p_case_id, 'vet_authorised', auth.uid(), v_name, 'veterinarian', nullif(btrim(p_note), ''), public.abc_case_checklist(p_case_id)||jsonb_build_object('medical_records',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'date',event_date,'performed_by',performed_by,'notes',notes) order by created_at),'[]') from public.medical_events where case_id=p_case_id and kind in ('sterilisation','vaccination')),'operation_records',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'payload',payload) order by created_at),'[]') from public.animal_operation_events where case_id=p_case_id)))
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), v_name, 'note', 'Procedure authorised by veterinarian ' || v_name);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'case', p_case_id, 'abc_vet_authorise', jsonb_build_object('attestation', v_id));
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.abc_create_package(p_title text, p_start date, p_end date, p_office uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare v_ngo uuid := public.my_ngo(); v_ids uuid[]; v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can prepare a report package'; end if;
  if not exists (select 1 from review_offices where id = p_office) then raise exception 'Choose a reviewing office'; end if;
  if p_start is null or p_end is null or p_end-p_start>366 then raise exception 'Choose a reporting period up to 366 days';end if;
  if p_end < p_start then raise exception 'The period ends before it starts'; end if;
  select array_agg(c.id order by c.created_at) into v_ids from cases c
  where c.ngo_id = v_ngo and coalesce((select max(m.event_date) from medical_events m where m.case_id=c.id and m.kind in ('sterilisation','vaccination')),c.created_at::date) between p_start and p_end
    and exists (select 1 from abc_attestations a where a.case_id = c.id and a.kind = 'evidence_reviewed' and a.revoked_at is null)
    and not public.operations_case_accepted(c.id) and not exists (select 1 from report_packages q where c.id = any (q.case_ids) and q.status <> 'returned' and (q.status='draft' or not public.operations_case_amendable(c.id)));
  if coalesce(array_length(v_ids, 1), 0) = 0 then raise exception 'No reviewed records in that period that are not already in a package'; end if;
  if array_length(v_ids,1)>2000 then raise exception 'Use a reporting period with at most 2,000 records';end if;
  insert into report_packages (ngo_id, office_id, title, period_start, period_end, case_ids, summary, created_by,item_review_enabled)
  values (v_ngo, p_office, coalesce(nullif(btrim(p_title), ''), 'Report package'), p_start, p_end, v_ids,
          jsonb_build_object('records', array_length(v_ids, 1), 'vet_authorised', (select count(*) from abc_attestations a where a.case_id = any (v_ids) and a.kind = 'vet_authorised' and a.revoked_at is null),
                             'evidence_items', (select count(*) from evidence_items e where e.case_id = any (v_ids)), 'generated_at', now()),
          auth.uid(),true)
  returning id into v_id;
  insert into package_events (package_id, actor_id, actor_name, side, kind, body) values (v_id, auth.uid(), v_name, 'operator', 'created', null);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'report_package', v_id, 'abc_create_package', jsonb_build_object('records', array_length(v_ids, 1)));
  return v_id;
end $function$
;

-- Attested clinical details cannot be silently appended through a legacy write path.
create function operations_private.protect_attested_medical()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.case_id is not null then perform 1 from public.cases where id=new.case_id for update;end if;
 if new.case_id is not null and new.kind in ('sterilisation','vaccination') and exists(select 1 from public.abc_attestations where case_id=new.case_id and revoked_at is null and kind in ('vet_authorised','evidence_reviewed')) then raise exception 'Withdraw the existing clinical sign-off with a reason before adding another procedure to this case';end if;
 return new;
end $$;
revoke all on function operations_private.protect_attested_medical() from public,anon,authenticated;
create trigger operations_protect_attested_medical before insert on public.medical_events for each row execute function operations_private.protect_attested_medical();

create function public.operations_decision_source(p_decision uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
declare d public.operations_item_decisions;s public.operations_package_snapshots;
begin
 select * into d from public.operations_item_decisions where id=p_decision;
 if not found or not public.operations_package_access(d.package_id) then raise exception 'This decision source is not available to your account';end if;
 select * into s from public.operations_package_snapshots where id=d.snapshot_id and package_id=d.package_id and case_id=d.case_id;
 if not found then return null;end if;
 return jsonb_build_object('snapshot_id',s.id,'created_at',s.created_at,'hash',encode(s.source_hash,'hex'),'source',s.source,'decision_id',d.id);
end $$;
revoke all on function public.operations_decision_source(uuid) from public,anon;
grant execute on function public.operations_decision_source(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.abc_package_cases(p_package uuid)
 RETURNS TABLE(case_id uuid, case_code text, title text, city text, created_at timestamp with time zone, evidence jsonb, vet_name text, reviewer_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare p report_packages%rowtype;
begin
  select * into p from report_packages where id = p_package;
  if not found then raise exception 'Package not found'; end if;
  if not (p.ngo_id = public.my_ngo() or (p.status <> 'draft' and exists (select 1 from review_office_members m where m.office_id = p.office_id and m.user_id = auth.uid()))) then
    raise exception 'You cannot read this package';
  end if;
  return query
  select c.id, c.case_code, c.title, c.city, c.created_at,
    coalesce(ss.source->'evidence',(select jsonb_agg(jsonb_build_object('kind', e.kind, 'url', e.url, 'location', e.location_text, 'at', e.captured_at) order by e.kind) from evidence_items e where e.case_id = c.id), '[]'::jsonb),
    case when ss.id is not null then (select v->>'actor' from jsonb_array_elements(ss.source->'attestations') v where v->>'kind'='vet_authorised') else (select a.actor_name from abc_attestations a where a.case_id=c.id and a.kind='vet_authorised' and a.revoked_at is null) end,
    case when ss.id is not null then (select v->>'actor' from jsonb_array_elements(ss.source->'attestations') v where v->>'kind'='evidence_reviewed') else (select a.actor_name from abc_attestations a where a.case_id=c.id and a.kind='evidence_reviewed' and a.revoked_at is null) end
  from cases c left join lateral(select * from public.operations_package_snapshots snapshot where snapshot.package_id=p.id and snapshot.case_id=c.id order by snapshot.created_at desc,snapshot.id desc limit 1) ss on true where c.id=any(p.case_ids) order by c.created_at;
end $function$
;

CREATE OR REPLACE FUNCTION public.abc_add_evidence(p_case_id uuid, p_kind text, p_url text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_title text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_dog uuid;
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if p_kind not in ('capture_photo','surgery_record','ear_notch_photo','release_photo','release_location') then raise exception 'Unknown evidence kind'; end if;
  select dog_id into v_dog from cases where id = p_case_id and ngo_id = v_ngo for update;
  if not found then raise exception 'That case is not in your organisation'; end if;
  if not public.operations_case_amendable(p_case_id) then raise exception 'This submitted record is locked; the receiving office must query or return the individual claim first';end if;
  if p_kind<>'release_location' and (p_url is null or p_url not like 'storage://abc-evidence/'||v_ngo::text||'/'||p_case_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='abc-evidence' and name=replace(p_url,'storage://abc-evidence/',''))) then raise exception 'Upload a private source file for this evidence item';end if;
  if p_kind='release_location' and nullif(btrim(p_location),'') is null then raise exception 'Record the documented location';end if;
  if p_kind='surgery_record' and exists(select 1 from public.abc_attestations where case_id=p_case_id and kind='vet_authorised' and revoked_at is null) then raise exception 'Withdraw the clinical sign-off before adding another procedure document';end if;
  update public.abc_attestations set revoked_at=now(),revoked_by=auth.uid() where case_id=p_case_id and kind='evidence_reviewed' and revoked_at is null;
  insert into evidence_items (ngo_id, dog_id, case_id, kind, url, title, captured_at, location_text, provenance, verification_state, created_by)
  values (v_ngo, v_dog, p_case_id, p_kind, nullif(btrim(p_url), ''), coalesce(nullif(btrim(p_title), ''), replace(p_kind, '_', ' ')), now(), nullif(btrim(p_location), ''), 'operator_created', 'submitted', auth.uid())
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), public.sp_actor_name(), 'note', 'Evidence added: ' || replace(p_kind, '_', ' '));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'evidence_item', v_id, 'abc_add_evidence', jsonb_build_object('case_id', p_case_id, 'kind', p_kind));
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.abc_return_evidence(p_case_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can return evidence'; end if;
  perform 1 from public.cases where id=p_case_id and ngo_id=v_ngo for update;
  if not found then raise exception 'That case is not in your organisation';end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Say what is missing or wrong'; end if;
  if not public.operations_case_amendable(p_case_id) then raise exception 'This submitted record is locked; resolve it through individual municipal review';end if;
  update abc_attestations set revoked_at = now(), revoked_by = auth.uid() where case_id = p_case_id and kind in ('evidence_reviewed', 'evidence_returned') and revoked_at is null;
  insert into abc_attestations (ngo_id, case_id, kind, actor_id, actor_name, actor_role, note, snapshot)
  values (v_ngo, p_case_id, 'evidence_returned', auth.uid(), v_name, public.sp_member_role(v_ngo), btrim(p_reason), public.abc_case_checklist(p_case_id))
  returning id into v_id;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), v_name, 'note', 'Evidence returned by ' || v_name || ': ' || btrim(p_reason));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'case', p_case_id, 'abc_return_evidence', jsonb_build_object('attestation', v_id, 'reason', btrim(p_reason)));
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.abc_revoke_attestation(p_attestation uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare a abc_attestations%rowtype; v_ngo uuid := public.my_ngo(); v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  perform 1 from public.cases where id=(select case_id from public.abc_attestations where id=p_attestation and ngo_id=v_ngo) and ngo_id=v_ngo for update;
  select * into a from abc_attestations where id = p_attestation and ngo_id = v_ngo and revoked_at is null for update;
  if not found then raise exception 'Sign-off not found'; end if;
  if a.kind = 'evidence_returned' then raise exception 'A return is cleared by reviewing the evidence again'; end if;
  if a.actor_id <> auth.uid() and coalesce(public.sp_member_role(v_ngo), '') <> 'admin' then raise exception 'Only the person who signed, or an admin, can withdraw this'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'Say why it is withdrawn'; end if;
  if not public.operations_case_amendable(a.case_id) then raise exception 'This submitted record is locked; resolve it through individual municipal review';end if;
  update abc_attestations set revoked_at = now(), revoked_by = auth.uid()
  where revoked_at is null and (id = a.id or (a.kind = 'vet_authorised' and case_id = a.case_id and kind = 'evidence_reviewed'));
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (a.case_id, auth.uid(), v_name, 'note',
    case a.kind when 'vet_authorised' then 'Veterinary authorisation withdrawn by ' else 'Evidence review withdrawn by ' end || v_name || ': ' || btrim(p_reason));
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data) values (v_ngo, auth.uid(), 'case', a.case_id, 'abc_revoke_' || a.kind, jsonb_build_object('attestation', a.id), jsonb_build_object('reason', btrim(p_reason)));
end $function$
;

create or replace function public.abc_verification_queue(p_limit integer default 200)
returns table(case_id uuid,case_code text,title text,city text,created_at timestamptz,provenance text,evidence_count integer,missing text[],vet_authorised boolean,evidence_reviewed boolean,government_accepted boolean,vet_name text,reviewer_name text,returned_note text,returned_by text,in_package text)
language plpgsql stable security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 if auth.uid() is null or public.my_ngo() is null then raise exception 'Organisation access required';end if;
 return query select c.id,c.case_code,c.title,c.city,c.created_at,c.provenance,
 jsonb_array_length(chk.v->'required')-jsonb_array_length(chk.v->'missing'),array(select jsonb_array_elements_text(chk.v->'missing')),
 (chk.v->>'vet_authorised')::boolean,(chk.v->>'evidence_reviewed')::boolean,(chk.v->>'government_accepted')::boolean,
 (select a.actor_name from public.abc_attestations a where a.case_id=c.id and a.kind='vet_authorised' and a.revoked_at is null),
 (select a.actor_name from public.abc_attestations a where a.case_id=c.id and a.kind='evidence_reviewed' and a.revoked_at is null),
 (select a.note from public.abc_attestations a where a.case_id=c.id and a.kind='evidence_returned' and a.revoked_at is null),
 (select a.actor_name from public.abc_attestations a where a.case_id=c.id and a.kind='evidence_returned' and a.revoked_at is null),
 case when (chk.v->>'amendable')::boolean then null else (select p.status from public.report_packages p where c.id=any(p.case_ids) and p.status<>'draft' order by p.created_at desc limit 1) end
 from public.cases c cross join lateral(select public.abc_case_checklist(c.id) v) chk where c.ngo_id=public.my_ngo() and coalesce(c.provenance,'') not in ('imported_historical_record','public_dataset') and c.category in ('sterilisation','vaccination') order by c.created_at desc limit greatest(1,least(p_limit,500));
end $$;
revoke all on function public.abc_verification_queue(integer),public.abc_add_evidence(uuid,text,text,text,text),public.abc_revoke_attestation(uuid,text),public.abc_return_evidence(uuid,text),public.abc_case_checklist(uuid),public.abc_package_cases(uuid),public.abc_create_package(text,date,date,uuid),public.abc_vet_authorise(uuid,text) from public,anon;
grant execute on function public.abc_verification_queue(integer),public.abc_add_evidence(uuid,text,text,text,text),public.abc_revoke_attestation(uuid,text),public.abc_return_evidence(uuid,text),public.abc_case_checklist(uuid),public.abc_package_cases(uuid),public.abc_create_package(text,date,date,uuid),public.abc_vet_authorise(uuid,text) to authenticated;

-- Coordinator review serialises with evidence replacement and clinical sign-off.
CREATE OR REPLACE FUNCTION public.abc_review_evidence(p_case_id uuid, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO pg_catalog, public, pg_temp
AS $function$
declare v_ngo uuid := public.my_ngo(); v_id uuid; v_chk jsonb; v_name text := public.sp_actor_name();
begin
  if auth.uid() is null or v_ngo is null then raise exception 'Organisation access required'; end if;
  if coalesce(public.sp_member_role(v_ngo), '') not in ('admin', 'coordinator') then raise exception 'Only a coordinator or admin can review evidence'; end if;
  perform 1 from public.cases where id=p_case_id and ngo_id=v_ngo for update;
  if not found then raise exception 'That case is not in your organisation';end if;
  v_chk := public.abc_case_checklist(p_case_id);
  if jsonb_array_length(v_chk->'missing') > 0 then raise exception 'Evidence incomplete: %', (select string_agg(replace(x, '_', ' '), ', ') from jsonb_array_elements_text(v_chk->'missing') x); end if;
  if not (v_chk->>'vet_authorised')::boolean then raise exception 'A veterinarian has not authorised this procedure yet'; end if;
  if exists (select 1 from abc_attestations where case_id = p_case_id and kind = 'vet_authorised' and revoked_at is null and actor_id = auth.uid()) then raise exception 'You authorised this procedure; another person must review its evidence'; end if;
  insert into abc_attestations (ngo_id, case_id, kind, actor_id, actor_name, actor_role, note, snapshot)
  values (v_ngo, p_case_id, 'evidence_reviewed', auth.uid(), v_name, public.sp_member_role(v_ngo), nullif(btrim(p_note), ''), v_chk)
  returning id into v_id;
  update abc_attestations set revoked_at = now(), revoked_by = auth.uid() where case_id = p_case_id and kind = 'evidence_returned' and revoked_at is null;
  insert into case_updates (case_id, actor_id, actor_name, type, note) values (p_case_id, auth.uid(), v_name, 'note', 'Evidence reviewed and approved for reporting by ' || v_name);
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data) values (v_ngo, auth.uid(), 'case', p_case_id, 'abc_review_evidence', jsonb_build_object('attestation', v_id));
  return v_id;
end $function$
;
