-- Private operational zones. Completion here is not coverage, clinical sign-off or municipal acceptance.
create table public.programme_work_zones (
 id uuid primary key, ngo_id uuid not null, campaign_id uuid not null references public.campaigns(id),
 name text not null check(length(name) between 3 and 120), boundary public.geometry(MultiPolygon,4326) not null,
 planned integer check(planned between 0 and 1000000),
 status text not null default 'assigned' check(status in ('assigned','reported_complete','supervisor_reviewed')),
 note text, updated_at timestamptz not null default now()
);
create table public.programme_zone_staff(zone_id uuid not null references public.programme_work_zones(id),user_id uuid not null references auth.users(id), primary key(zone_id,user_id));
create table public.programme_zone_receipts(actor_id uuid not null references auth.users(id),request_id uuid not null,ngo_id uuid not null,payload_hash bytea not null,zone_id uuid not null references public.programme_work_zones(id),audit_id bigint not null references public.operational_audit_log(id),primary key(actor_id,request_id));
alter table public.programme_work_zones enable row level security;
alter table public.programme_zone_staff enable row level security;
alter table public.programme_zone_receipts enable row level security;
revoke all on public.programme_work_zones,public.programme_zone_staff,public.programme_zone_receipts from public,anon,authenticated;
grant select on public.programme_work_zones,public.programme_zone_staff,public.programme_zone_receipts to authenticated;
create policy zone_read on public.programme_work_zones for select to authenticated using(ngo_id=public.my_ngo());
create policy zone_staff_read on public.programme_zone_staff for select to authenticated using(exists(select 1 from public.programme_work_zones z where z.id=zone_id and z.ngo_id=public.my_ngo()));
create policy zone_receipt_read on public.programme_zone_receipts for select to authenticated using(actor_id=auth.uid() and ngo_id=public.my_ngo());
create function public.org_work_zones() returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',z.id,'campaign_id',z.campaign_id,'name',z.name,'planned',z.planned,'status',z.status,'note',z.note,'updated_at',z.updated_at,'geometry',public.st_asgeojson(z.boundary)::jsonb,'staff',(select coalesce(jsonb_agg(s.user_id),'[]') from public.programme_zone_staff s where s.zone_id=z.id)) order by z.updated_at desc),'[]') from (select * from public.programme_work_zones where ngo_id=public.my_ngo() order by updated_at desc limit 200) z
$$;
create function public.zone_action(p_request uuid,p_zone uuid,p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();leader boolean;old public.programme_zone_receipts;z public.programme_work_zones;h bytea;g public.geometry;aid bigint;staff uuid;
begin
 if uid is null or org is null then raise exception 'Organisation access required';end if;
 if p_request is null or p_zone is null or p_action not in ('create','assign','report_complete','review_completion') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>100000 then raise exception 'Invalid zone action';end if;
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
  g:=public.st_multi(public.st_setsrid(public.st_geomfromgeojson(p_payload->>'geometry'),4326));
  if public.geometrytype(g)<>'MULTIPOLYGON' or public.st_isempty(g) or not public.st_isvalid(g) or public.st_xmin(g::public.box3d)<-180 or public.st_xmax(g::public.box3d)>180 or public.st_ymin(g::public.box3d)<-90 or public.st_ymax(g::public.box3d)>90 then raise exception 'Supply a valid GeoJSON Polygon or MultiPolygon in longitude/latitude';end if;
  insert into public.programme_work_zones(id,ngo_id,campaign_id,name,boundary,planned) values(p_zone,org,(p_payload->>'campaign_id')::uuid,btrim(p_payload->>'name'),g,nullif(p_payload->>'planned','')::integer);
 else
  select * into z from public.programme_work_zones where id=p_zone and ngo_id=org for update;
  if not found then raise exception 'Zone is not in your organisation';end if;
  if p_action='assign' then
   if not leader then raise exception 'Coordinator access required';end if;
   staff:=(p_payload->>'user_id')::uuid;
   if not exists(select 1 from public.ngo_members where user_id=staff and ngo_id=org) then raise exception 'Choose an authorised member of your organisation';end if;
   insert into public.programme_zone_staff values(p_zone,staff) on conflict do nothing;
  else
   if nullif(btrim(p_payload->>'note'),'') is null or length(p_payload->>'note')>1500 then raise exception 'Record the completion or review note';end if;
   if p_action='report_complete' then
    if z.status<>'assigned' or not exists(select 1 from public.programme_zone_staff where zone_id=p_zone and user_id=uid) then raise exception 'Only assigned staff can report active work complete';end if;
   elsif not leader or z.status<>'reported_complete' then raise exception 'Supervisor review requires reported completion';end if;
   update public.programme_work_zones set status=case when p_action='report_complete' then 'reported_complete' else 'supervisor_reviewed' end,note=btrim(p_payload->>'note'),updated_at=now() where id=p_zone;
  end if;
 end if;
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'programme_work_zones',p_zone,p_action,jsonb_build_object('request_id',p_request,'payload',p_payload)) returning id into aid;
 insert into public.programme_zone_receipts values(uid,p_request,org,h,p_zone,aid);
 return jsonb_build_object('zone_id',p_zone,'audit_id',aid,'replayed',false);
end $$;
revoke all on function public.org_work_zones(),public.zone_action(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.org_work_zones(),public.zone_action(uuid,uuid,text,jsonb) to authenticated;
-- Rollback disables the two functions before removing new tables after exporting
-- their audit-linked data. Existing campaigns, cases and audits remain intact.
