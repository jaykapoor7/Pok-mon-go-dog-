-- Add only columns missing from older staging schemas; production already has these.
begin;
alter table public.cases add column if not exists cost_spent numeric;
alter table public.cases add column if not exists medical_notes text;
alter table public.cases add column if not exists photos text[] default '{}'::text[] not null;
alter table public.cases add column if not exists cost_estimate numeric;
alter table public.dogs add column if not exists created_by_id uuid;
alter table public.dogs add column if not exists created_by_name text;
alter table public.dogs add column if not exists data_source_id uuid;
alter table public.dogs add column if not exists source_record_id text;
alter table public.dogs add column if not exists original_observed_at timestamptz;
alter table public.dogs add column if not exists observed_date_precision text;
alter table public.dogs add column if not exists importer_version text;
alter table public.dogs add column if not exists external_image_url text;
alter table public.dogs add column if not exists geographic_precision text;
alter table public.dogs add column if not exists photo_sensitive bool;

create unique index careos_inbox_case_unique on careos.inbox(linked_case_id) where linked_case_id is not null;
create index careos_inbox_dog_idx on careos.inbox(linked_dog_id) where linked_dog_id is not null;

-- Restrictive policies compose with legacy policies rather than replacing them.
-- Non-CareOS records keep their current access model.
create function public.careos_record_access(p_case uuid,p_dog uuid default null) returns boolean
language plpgsql stable security definer set search_path=pg_catalog,public,careos as $$
declare i careos.inbox; r text;
begin
 select * into i from careos.inbox where linked_case_id=p_case or (p_dog is not null and linked_dog_id=p_dog) limit 1;
 if not found then return true; end if;
 r:=careos.member_role(auth.uid(),i.ngo_id);
 if r is null then return false; end if;
 if r='volunteer' then return exists(select 1 from public.cases where id=i.linked_case_id and assignee_id=auth.uid()); end if;
 return true;
end $$;
revoke all on function public.careos_record_access(uuid,uuid) from public;
grant execute on function public.careos_record_access(uuid,uuid) to anon,authenticated,service_role;
create policy careos_case_read on public.cases as restrictive for select to anon,authenticated using(public.careos_record_access(id));
create policy careos_updates_read on public.case_updates as restrictive for select to anon,authenticated using(public.careos_record_access(case_id));
create policy careos_medical_read on public.medical_events as restrictive for select to anon,authenticated using(public.careos_record_access(case_id,dog_id));
create policy careos_followups_read on public.animal_followups as restrictive for select to anon,authenticated using(public.careos_record_access(case_id,dog_id));
create policy careos_timeline_read on public.animal_timeline_events as restrictive for select to anon,authenticated using(public.careos_record_access(case_id,dog_id));

-- Legacy SECURITY DEFINER mutators bypass RLS. These row guards also apply to
-- them, but only for a case/animal linked to CareOS. No legacy function is renamed.
create function careos.guard_case_record() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,careos as $$
declare j jsonb; oldj jsonb; i careos.inbox; c public.cases; cid uuid; did uuid; r text; v_ngo uuid;
begin
 if current_setting('role',true) in ('none','postgres','supabase_admin','service_role') then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 j:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 oldj:=case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 cid:=case when tg_table_name='cases' then (j->>'id')::uuid else (j->>'case_id')::uuid end;
 did:=case when tg_table_name='dogs' then (j->>'id')::uuid else (j->>'dog_id')::uuid end;
 select * into i from careos.inbox where linked_case_id=cid or (did is not null and linked_dog_id=did)
  or (tg_op='UPDATE' and linked_case_id=(oldj->>'case_id')::uuid) limit 1;
 if not found then if tg_op='DELETE' then return old; else return new; end if; end if;
 r:=careos.member_role(auth.uid(),i.ngo_id);
 if r is null then raise exception 'Not authorized for this CareOS record' using errcode='42501'; end if;
 if tg_op='DELETE' then raise exception 'CareOS audit records cannot be deleted through client APIs' using errcode='42501'; end if;
 if cid is not null then
 select * into c from public.cases where id=cid;
 if c.ngo_id is distinct from i.ngo_id then raise exception 'Cross-NGO case' using errcode='42501'; end if;
 end if;
 if j ? 'ngo_id' and (j->>'ngo_id')::uuid is distinct from i.ngo_id then raise exception 'Cross-NGO ownership' using errcode='42501'; end if;
 if did is not null and tg_table_name<>'dogs' then
 select ngo_id into v_ngo from public.dogs where id=did;
 if v_ngo is distinct from i.ngo_id then raise exception 'Cross-NGO animal' using errcode='42501'; end if;
 end if;
 if tg_table_name='cases' and j->>'assignee_id' is not null and careos.member_role((j->>'assignee_id')::uuid,i.ngo_id) is null then raise exception 'Assignee outside NGO' using errcode='42501'; end if;
 if r='volunteer' then
 if c.assignee_id is distinct from auth.uid() then raise exception 'Not your assignment' using errcode='42501'; end if;
 if tg_table_name='cases' then
  if j->>'status' not in ('assigned','in_progress') or
   (j-array['status','stage','status_class','updated_at','last_activity_at']) is distinct from
   (oldj-array['status','stage','status_class','updated_at','last_activity_at']) then raise exception 'Volunteer action not permitted' using errcode='42501'; end if;
 elsif tg_table_name='animal_followups' then
  if tg_op<>'UPDATE' or j->>'status'<>'done' or
   (j-array['status','completed_at','updated_at']) is distinct from (oldj-array['status','completed_at','updated_at']) then raise exception 'Volunteer action not permitted' using errcode='42501'; end if;
 elsif tg_table_name not in ('case_updates','animal_timeline_events') or tg_op<>'INSERT' then raise exception 'Volunteer action not permitted' using errcode='42501';
 end if;
 end if;
 if tg_table_name='case_updates' then new.actor_id:=auth.uid(); new.actor_name:='NGO team';
 elsif tg_table_name='medical_events' then new.created_by_id:=auth.uid();
 elsif tg_table_name='animal_timeline_events' then new.actor_id:=auth.uid(); new.actor_name:='NGO team'; new.visibility:='private';
 end if;
 return new;
end $$;
revoke all on function careos.guard_case_record() from public,anon,authenticated;
create trigger zz_careos_case_guard before update or delete on public.cases for each row execute function careos.guard_case_record();
create trigger zz_careos_updates_guard before insert or update or delete on public.case_updates for each row execute function careos.guard_case_record();
create trigger zz_careos_medical_guard before insert or update or delete on public.medical_events for each row execute function careos.guard_case_record();
create trigger zz_careos_followups_guard before insert or update or delete on public.animal_followups for each row execute function careos.guard_case_record();
create trigger zz_careos_timeline_guard before insert or update or delete on public.animal_timeline_events for each row execute function careos.guard_case_record();

-- Protect sensitive changes to a linked animal, while preserving public feeds
-- and other existing non-clinical counters on its public record.
create function careos.guard_animal() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,careos as $$
declare n uuid; r text; keys text[]:=array['ngo_id','vaccinated','sterilised','vaccination_status','sterilisation_status','needs_help','status','lat','lng','cover_photo','name','owner_name','owner_contact'];
begin
 if current_setting('role',true) in ('none','postgres','supabase_admin','service_role') then return new; end if;
 select ngo_id into n from careos.inbox where linked_dog_id=old.id limit 1;
 if not found then return new; end if;
 if exists(select 1 from unnest(keys) k where to_jsonb(new)->k is distinct from to_jsonb(old)->k) then
 r:=careos.member_role(auth.uid(),n);
 if r is null or r='volunteer' or new.ngo_id is distinct from n then raise exception 'Not authorized for this CareOS animal' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function careos.guard_animal() from public,anon,authenticated;
create trigger zz_careos_animal_guard before update on public.dogs for each row execute function careos.guard_animal();

-- Public projection owners bypass RLS, so exclude new private cases explicitly.
-- Preserve definitions for a reversible rollback; no underlying data is deleted.
create table careos.view_backups(name text primary key,definition text not null);
alter table careos.view_backups enable row level security;
do $$ declare v record; original text; begin
 for v in select * from (values('public_case_facts','id'),('public_care_facts','case_id'),('public_case_stories','id')) t(name,key) loop
 if exists(select 1 from pg_views where schemaname='public' and viewname=v.name) then
  original:=rtrim(pg_get_viewdef(('public.'||v.name)::regclass,true),';'||chr(10)||' ');
  insert into careos.view_backups values(v.name,original);
  execute format('create or replace view public.%I as select q.* from (%s) q where not exists (select 1 from careos.inbox i where i.linked_case_id=q.%I)',v.name,original,v.key);
 end if;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
