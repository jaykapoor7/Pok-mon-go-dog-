-- Observational reporting never treats assignments or procedure totals as coverage.
create index if not exists operations_survey_response_order on public.survey_responses(survey_id,created_at,id);
create index if not exists operations_event_case_kind on public.animal_operation_events(case_id,kind);
create index if not exists operations_zone_boundary on public.programme_work_zones using gist(boundary);

create table public.operations_survey_assessments (
 id uuid primary key default gen_random_uuid(),ngo_id uuid not null references public.ngos(id),zone_id uuid not null references public.programme_work_zones(id),survey_id uuid not null references public.surveys(id),
 method text not null check(method in ('field_sample','complete_census')),method_version integer not null check(method_version>0),source_reference text not null,
 source jsonb not null,source_hash bytea not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.operations_survey_reviews (
 id uuid primary key default gen_random_uuid(),assessment_id uuid not null references public.operations_survey_assessments(id),decision text not null check(decision in ('confirmed','returned')),
 note text not null,actor_id uuid not null references auth.users(id),actor_name text not null,created_at timestamptz not null default now()
);
create index operations_survey_review_order on public.operations_survey_reviews(assessment_id,created_at desc,id);
alter table public.operations_survey_assessments enable row level security;
alter table public.operations_survey_reviews enable row level security;
revoke all on public.operations_survey_assessments,public.operations_survey_reviews from public,anon,authenticated;
grant select on public.operations_survey_assessments,public.operations_survey_reviews to authenticated;
create policy assessment_read on public.operations_survey_assessments for select to authenticated using(ngo_id=public.my_ngo());
create policy survey_review_read on public.operations_survey_reviews for select to authenticated using(exists(select 1 from public.operations_survey_assessments a where a.id=assessment_id and a.ngo_id=public.my_ngo()));

create function public.operations_submit_survey(p_request uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions,pg_temp as $$
declare org uuid:=public.my_ngo();rid uuid;aid bigint;result jsonb;
begin
 if auth.uid() is null or org is null or not exists(select 1 from public.surveys where id=(p_payload->>'surveyId')::uuid and ngo_id=org and status='active') then raise exception 'Choose an active survey in your organisation';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>30000 or coalesce((p_payload->>'count')::integer,0) not between 1 and 10000 or (p_payload->>'lat')::double precision not between -90 and 90 or (p_payload->>'lng')::double precision not between -180 and 180 then raise exception 'Invalid survey observation';end if;
 if nullif(p_payload->'attributes'->>'animal_id','') is not null and (not exists(select 1 from public.dogs where id=(p_payload->'attributes'->>'animal_id')::uuid and ngo_id=org) or (p_payload->>'count')::integer<>1) then raise exception 'A linked identification requires one animal in your organisation';end if;
 if coalesce(p_payload->'attributes'->>'vaccination_mark','unknown') not in ('marked','unmarked','unknown') then raise exception 'Unknown vaccination observation';end if;
 if nullif(p_payload->>'photoUrl','') is not null and ((p_payload->>'photoUrl') not like 'storage://operations-survey-evidence/'||org::text||'/'||(p_payload->>'surveyId')||'/%' or not exists(select 1 from storage.objects where bucket_id='operations-survey-evidence' and name=replace(p_payload->>'photoUrl','storage://operations-survey-evidence/',''))) then raise exception 'Upload the private source photograph first';end if;
 result:=operations_private.replay(p_request,'survey_observation',p_payload);if result is not null then return result;end if;
 rid:=public.submit_survey_response((p_payload->>'surveyId')::uuid,nullif(p_payload->>'areaId','')::uuid,(p_payload->>'lat')::double precision,(p_payload->>'lng')::double precision,nullif(p_payload->>'photoUrl',''),'dog',(p_payload->>'count')::integer,coalesce(p_payload->'attributes','{}'),p_payload->>'notes');
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'survey_responses',rid,'record_survey_observation',jsonb_build_object('request_id',p_request,'survey_id',p_payload->>'surveyId')) returning id into aid;
 return operations_private.receipt(p_request,org,'survey_observation',p_payload,jsonb_build_object('record_id',rid),aid);
end $$;

create function public.operations_assess_survey(p_request uuid,p_zone uuid,p_survey uuid,p_method text,p_version integer,p_reference text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions,pg_temp as $$
declare org uuid:=public.my_ngo();input jsonb:=jsonb_build_array(p_zone,p_survey,p_method,p_version,p_reference);result jsonb;source jsonb;rid uuid;aid bigint;
begin
 if auth.uid() is null or org is null or not exists(select 1 from public.programme_work_zones where id=p_zone and ngo_id=org) or not exists(select 1 from public.surveys where id=p_survey and ngo_id=org) then raise exception 'Choose a survey and working zone in your organisation';end if;
 if p_method not in ('field_sample','complete_census') or p_version is null or p_version<1 or nullif(btrim(p_reference),'') is null or length(p_reference)>2000 then raise exception 'Supply the documented method, version and source reference';end if;
 result:=operations_private.replay(p_request,'survey_assessment',input);if result is not null then return result;end if;
 if (select count(*) from public.survey_responses where survey_id=p_survey)>25000 then raise exception 'This assessment exceeds 25,000 observations; divide the survey into documented reporting units';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'count',r.count,'lat',r.lat,'lng',r.lng,'attributes',r.attributes,'recorded_by',r.recorded_by,'at',r.created_at,'inside',case when r.lat between -90 and 90 and r.lng between -180 and 180 then st_covers(z.boundary,st_setsrid(st_makepoint(r.lng,r.lat),4326)) else false end) order by r.created_at,r.id),'[]') into source from public.survey_responses r join public.programme_work_zones z on z.id=p_zone where r.survey_id=p_survey;
 insert into public.operations_survey_assessments(ngo_id,zone_id,survey_id,method,method_version,source_reference,source,source_hash,created_by) values(org,p_zone,p_survey,p_method,p_version,btrim(p_reference),source,sha256(convert_to(source::text,'UTF8')),auth.uid()) returning id into rid;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,auth.uid(),'operations_survey_assessments',rid,'prepare_survey_assessment',jsonb_build_object('request_id',p_request,'zone_id',p_zone,'survey_id',p_survey,'source_reference',p_reference)) returning id into aid;
 return operations_private.receipt(p_request,org,'survey_assessment',input,jsonb_build_object('record_id',rid),aid);
end $$;

create function public.operations_review_survey(p_request uuid,p_assessment uuid,p_decision text,p_note text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions,pg_temp as $$
declare a public.operations_survey_assessments;input jsonb:=jsonb_build_array(p_assessment,p_decision,p_note);rid uuid;aid bigint;result jsonb;
begin
 select * into a from public.operations_survey_assessments where id=p_assessment;
 if auth.uid() is null or a.ngo_id is distinct from public.my_ngo() or a.created_by=auth.uid() or coalesce(public.sp_member_role(a.ngo_id),'') not in ('admin','coordinator') then raise exception 'A separate coordinator must review this assessment';end if;
 if p_decision not in ('confirmed','returned') or nullif(btrim(p_note),'') is null or length(p_note)>3000 then raise exception 'Record a decision and method review note';end if;
 result:=operations_private.replay(p_request,'survey_review',input);if result is not null then return result;end if;
 insert into public.operations_survey_reviews(assessment_id,decision,note,actor_id,actor_name) values(a.id,p_decision,btrim(p_note),auth.uid(),public.sp_actor_name()) returning id into rid;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(a.ngo_id,auth.uid(),'operations_survey_reviews',rid,'review_survey_assessment',jsonb_build_object('request_id',p_request,'assessment_id',a.id,'decision',p_decision)) returning id into aid;
 return operations_private.receipt(p_request,a.ngo_id,'survey_review',input,jsonb_build_object('record_id',rid),aid);
end $$;

create function public.operations_survey_result(p_assessment uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,extensions,pg_temp as $$
declare a public.operations_survey_assessments;review public.operations_survey_reviews;n bigint;animals bigint;marked bigint;unknowns bigint;unlocated bigint;unique_animals bigint;singletons boolean;coverage numeric;observed numeric;reasons text[]:='{}';
begin
 select * into a from public.operations_survey_assessments where id=p_assessment and ngo_id=public.my_ngo();if not found then raise exception 'Organisation assessment required';end if;
 select * into review from public.operations_survey_reviews where assessment_id=a.id order by created_at desc,id desc limit 1;
 select count(*),sum((r->>'count')::integer),sum((r->>'count')::integer) filter(where r->'attributes'->>'vaccination_mark'='marked'),count(*) filter(where coalesce(r->'attributes'->>'vaccination_mark','unknown') not in ('marked','unmarked')),count(*) filter(where coalesce((r->>'inside')::boolean,false)=false),count(distinct nullif(r->'attributes'->>'animal_id','')),bool_and((r->>'count')::integer=1) into n,animals,marked,unknowns,unlocated,unique_animals,singletons from jsonb_array_elements(a.source) r;
 if n=0 then reasons:=array_append(reasons,'No observations');end if;
 if unknowns>0 then reasons:=array_append(reasons,'Vaccination marking is unknown for some observations');end if;
 if unlocated>0 then reasons:=array_append(reasons,'Some observations have missing coordinates or fall outside the working zone');end if;
 if n>0 and unknowns=0 and unlocated=0 and animals>0 then observed:=round(coalesce(marked,0)::numeric/animals*100,2);end if;
 if a.method<>'complete_census' then reasons:=array_append(reasons,'A field sample does not establish population coverage');end if;
 if not coalesce(singletons,false) or unique_animals<>n then reasons:=array_append(reasons,'A complete census requires one unique identified animal per observation');end if;
 if review.decision is distinct from 'confirmed' then reasons:=array_append(reasons,'Independent coordinator confirmation of method and completeness is missing');end if;
 if cardinality(reasons)=0 then coverage:=observed;end if;
 return jsonb_build_object('assessment_id',a.id,'method',a.method,'method_version',a.method_version,'source_reference',a.source_reference,'snapshot_at',a.created_at,'source_hash',encode(a.source_hash,'hex'),'observations',n,'animals',animals,'observed_marked_percent',observed,'coverage_percent',coverage,'limitations',reasons,'review',case when review.id is not null then jsonb_build_object('decision',review.decision,'actor',review.actor_name,'note',review.note,'at',review.created_at) else null end,'interpretation','Observed vaccination markings; not clinical certification or municipal acceptance');
end $$;

create function public.operations_zone_progress(p_zone uuid,p_start date,p_end date)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,extensions,pg_temp as $$
declare z public.programme_work_zones;result jsonb;
begin
 select * into z from public.programme_work_zones where id=p_zone and ngo_id=public.my_ngo();if not found then raise exception 'Organisation zone required';end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>366 then raise exception 'Choose a reporting period up to 366 days';end if;
 with located as (select c.id,c.dog_id,c.provenance from public.cases c where c.ngo_id=z.ngo_id and c.lat between -90 and 90 and c.lng between -180 and 180 and st_covers(z.boundary,st_setsrid(st_makepoint(c.lng,c.lat),4326))),events as(select e.*,l.provenance from public.animal_operation_events e join located l on l.id=e.case_id where e.occurred_at>=p_start and e.occurred_at<p_end+1)
 select jsonb_build_object('zone_id',z.id,'name',z.name,'planned',z.planned,'assignment_status',z.status,'start',p_start,'end',p_end,'generated_at',now(),'basis','Case registered coordinates inside boundary; later movement is not inferred','field_records',(select count(*) from events),'reported_sterilisations',(select count(*) from events where kind='sterilisation'),'reported_vaccinations',(select count(*) from events where kind='vaccination'),'awaiting_coordinator_review',(select count(*) from events e where not exists(select 1 from public.animal_operation_reviews r where r.event_id=e.id)),'veterinarian_authorised_cases',(select count(distinct e.case_id) from events e join public.abc_attestations a on a.case_id=e.case_id and a.kind='vet_authorised' and a.revoked_at is null),'coordinator_reviewed_cases',(select count(distinct e.case_id) from events e join public.abc_attestations a on a.case_id=e.case_id and a.kind='evidence_reviewed' and a.revoked_at is null),'municipally_accepted_cases',(select count(distinct e.case_id) from events e where public.operations_case_accepted(e.case_id)),'source_provenance',(select coalesce(jsonb_agg(v),'[]') from(select provenance,count(*) records from events group by provenance)v),'coverage_percent',null) into result;
 return result;
end $$;
revoke all on function public.operations_submit_survey(uuid,jsonb),public.operations_assess_survey(uuid,uuid,uuid,text,integer,text),public.operations_review_survey(uuid,uuid,text,text),public.operations_survey_result(uuid),public.operations_zone_progress(uuid,date,date) from public,anon;
grant execute on function public.operations_submit_survey(uuid,jsonb),public.operations_assess_survey(uuid,uuid,uuid,text,integer,text),public.operations_review_survey(uuid,uuid,text,text),public.operations_survey_result(uuid),public.operations_zone_progress(uuid,date,date) to authenticated;

-- Device-held survey photographs synchronise to a private organisation store.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('operations-survey-evidence','operations-survey-evidence',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy operations_survey_photo_read on storage.objects for select to authenticated using(bucket_id='operations-survey-evidence' and (storage.foldername(name))[1]=public.my_ngo()::text);
create policy operations_survey_photo_insert on storage.objects for insert to authenticated with check(bucket_id='operations-survey-evidence' and (storage.foldername(name))[1]=public.my_ngo()::text and exists(select 1 from public.surveys s where s.id::text=(storage.foldername(name))[2] and s.ngo_id=public.my_ngo()));

alter table public.programme_zone_staff add column active boolean not null default true;

create or replace function public.zone_action(p_request uuid,p_zone uuid,p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions,pg_temp as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();leader boolean;old public.programme_zone_receipts;z public.programme_work_zones;h bytea;g geometry;aid bigint;staff uuid;
begin
 if uid is null or org is null then raise exception 'Organisation access required';end if;
 if p_request is null or p_zone is null or p_action not in ('create','assign','unassign','report_complete','review_completion') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>100000 then raise exception 'Invalid zone action';end if;
 select exists(select 1 from public.ngo_members where user_id=uid and ngo_id=org and role in ('admin','coordinator')) into leader;
 h:=sha256(convert_to(jsonb_build_array(p_zone,p_action,p_payload)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended(uid::text||p_request::text,9));
 select * into old from public.programme_zone_receipts where actor_id=uid and request_id=p_request;
 if found then
  if old.ngo_id<>org or old.payload_hash<>h then raise exception 'Request already used for another change';end if;
  return jsonb_build_object('zone_id',old.zone_id,'audit_id',old.audit_id,'replayed',true);
 end if;
 if p_action='create' then
  if not leader then raise exception 'Coordinator access required';end if;
  if not exists(select 1 from public.campaigns where id=(p_payload->>'campaign_id')::uuid and ngo_id=org and archived_at is null) then raise exception 'Choose an active programme in your organisation';end if;
  if length(btrim(coalesce(p_payload->>'name','')))<3 then raise exception 'Name the working zone';end if;
  g:=st_multi(st_setsrid(st_geomfromgeojson(p_payload->>'geometry'),4326));
  if geometrytype(g)<>'MULTIPOLYGON' or st_isempty(g) or not st_isvalid(g) or st_xmin(g::box3d)<-180 or st_xmax(g::box3d)>180 or st_ymin(g::box3d)<-90 or st_ymax(g::box3d)>90 then raise exception 'Supply a valid GeoJSON Polygon or MultiPolygon in longitude/latitude';end if;
  insert into public.programme_work_zones(id,ngo_id,campaign_id,name,boundary,planned) values(p_zone,org,(p_payload->>'campaign_id')::uuid,btrim(p_payload->>'name'),g,nullif(p_payload->>'planned','')::integer);
 else
  select * into z from public.programme_work_zones where id=p_zone and ngo_id=org for update;
  if not found then raise exception 'Zone is not in your organisation';end if;
  if p_action in ('assign','unassign') then
   if not leader then raise exception 'Coordinator access required';end if;
   staff:=(p_payload->>'user_id')::uuid;
   if not exists(select 1 from public.ngo_members where user_id=staff and ngo_id=org) then raise exception 'Choose an authorised member of your organisation';end if;
   if p_action='assign' then insert into public.programme_zone_staff(zone_id,user_id,active) values(p_zone,staff,true) on conflict(zone_id,user_id) do update set active=true;else update public.programme_zone_staff set active=false where zone_id=p_zone and user_id=staff;end if;
  else
   if nullif(btrim(p_payload->>'note'),'') is null or length(p_payload->>'note')>1500 then raise exception 'Record the completion or review note';end if;
   if p_action='report_complete' then
    if z.status<>'assigned' or not exists(select 1 from public.programme_zone_staff where zone_id=p_zone and user_id=uid and active) then raise exception 'Only assigned staff can report active work complete';end if;
   elsif not leader or z.status<>'reported_complete' then raise exception 'Supervisor review requires reported completion';end if;
   if p_action='review_completion' and exists(select 1 from public.operational_audit_log a where a.entity_id=p_zone and a.action='report_complete' and a.actor_id=uid order by a.created_at desc limit 1) then raise exception 'A separate supervisor must review reported completion';end if;
   update public.programme_work_zones set status=case when p_action='report_complete' then 'reported_complete' else 'supervisor_reviewed' end,note=btrim(p_payload->>'note'),updated_at=now() where id=p_zone;
  end if;
 end if;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'programme_work_zones',p_zone,p_action,jsonb_build_object('request_id',p_request,'payload',p_payload)) returning id into aid;
 insert into public.programme_zone_receipts values(uid,p_request,org,h,p_zone,aid);
 return jsonb_build_object('zone_id',p_zone,'audit_id',aid,'replayed',false);
end $$;

create or replace function public.org_work_zones() returns jsonb language sql stable security invoker set search_path=pg_catalog,public,extensions,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',z.id,'campaign_id',z.campaign_id,'name',z.name,'planned',z.planned,'status',z.status,'note',z.note,'updated_at',z.updated_at,'geometry',st_asgeojson(z.boundary)::jsonb,'staff',(select coalesce(jsonb_agg(s.user_id),'[]') from public.programme_zone_staff s where s.zone_id=z.id and s.active)) order by z.updated_at desc),'[]') from(select * from public.programme_work_zones where ngo_id=public.my_ngo() order by updated_at desc limit 200) z
$$;
