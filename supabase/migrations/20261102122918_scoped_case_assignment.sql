-- Repair the self-claim RPC expected by the existing client and scope legacy writes.
create or replace function public.take_case(p_case_id uuid,p_actor_name text) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();c public.cases;who text;
begin
 if uid is null or org is null then raise exception 'Organisation access required';end if;
 select * into c from public.cases where id=p_case_id and (ngo_id=org or ngo_id is null) and assignee_id is null and coalesce(btrim(assignee_name),'')='' for update;
 if not found then return false;end if;
 select coalesce(nullif(name,''),'Team member') into who from public.volunteers where id=uid;who:=coalesce(who,'Team member');
 update public.cases set ngo_id=org,assignee_id=uid,assignee_name=who,status=case when status='unverified' then 'assigned' else status end,updated_at=now(),last_activity_at=now() where id=c.id;
 insert into public.case_updates(case_id,actor_id,actor_name,type,to_status,note) values(c.id,uid,who,'claimed',c.status,who||' claimed this case');
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'cases',c.id,'case_claimed',jsonb_build_object('assignee_id',uid));
 return true;
end $$;
create or replace function public.claim_case(p_case_id uuid,p_actor_id uuid,p_actor_name text) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null or auth.uid()<>p_actor_id then raise exception 'Actor does not match the signed-in user';end if;
 if not exists(select 1 from public.cases where id=p_case_id and ngo_id is null) then return false;end if;
 return public.take_case(p_case_id,p_actor_name);
end $$;
create or replace function public.assign_case(p_case_id uuid,p_assignee_id uuid,p_assignee_name text,p_actor_id uuid,p_actor_name text) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();org uuid:=public.my_ngo();who text;assigned text;
begin
 if uid is null or org is null or uid<>p_actor_id or not exists(select 1 from public.ngo_members where user_id=uid and ngo_id=org and role in ('admin','coordinator')) then raise exception 'Coordinator access required';end if;
 if not exists(select 1 from public.ngo_members where user_id=p_assignee_id and ngo_id=org) then raise exception 'Assignee is not in your organisation';end if;
 perform 1 from public.cases where id=p_case_id and ngo_id=org for update;if not found then raise exception 'Case is not in your organisation';end if;
 select coalesce(nullif(name,''),'Team member') into who from public.volunteers where id=uid;
 select coalesce(nullif(name,''),'Team member') into assigned from public.volunteers where id=p_assignee_id;
 update public.cases set assignee_id=p_assignee_id,assignee_name=coalesce(assigned,'Team member'),status=case when status='unverified' then 'assigned' else status end,updated_at=now(),last_activity_at=now() where id=p_case_id and ngo_id=org;
 insert into public.case_updates(case_id,actor_id,actor_name,type,note) values(p_case_id,uid,coalesce(who,'Team member'),'assigned','Assigned to '||coalesce(assigned,'Team member'));
 insert into public.operational_audit_log(ngo_id,actor_id,entity_type,entity_id,action,after_data) values(org,uid,'cases',p_case_id,'case_assigned',jsonb_build_object('assignee_id',p_assignee_id));
end $$;
revoke all on function public.take_case(uuid,text),public.claim_case(uuid,uuid,text),public.assign_case(uuid,uuid,text,uuid,text) from public,anon;
grant execute on function public.take_case(uuid,text),public.claim_case(uuid,uuid,text),public.assign_case(uuid,uuid,text,uuid,text) to authenticated;
