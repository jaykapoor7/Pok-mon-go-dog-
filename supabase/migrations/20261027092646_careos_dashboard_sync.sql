-- Keep changes made through existing NGO dashboard RPCs in the shared
-- WhatsApp state/outbox too. Bot commands already audit/notify in careos.act.
begin;
create or replace function careos.act(p_user uuid,p_ngo uuid,p_case uuid,p_action text,p_data jsonb,p_key text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare r text; c public.cases; i careos.inbox; d uuid; f uuid; v_id uuid; amount numeric; prior_internal text;
begin
 r:=careos.member_role(p_user,p_ngo);
 if r is null then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into c from public.cases where id=p_case and ngo_id=p_ngo for update;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into i from careos.inbox where linked_case_id=c.id and ngo_id=p_ngo for update;
 if not found then raise exception 'Not a CareOS case' using errcode='42501'; end if;
 if exists(select 1 from careos.audit where key=p_key) then return jsonb_build_object('ok',true,'duplicate',true); end if;
 if r='volunteer' and (c.assignee_id is distinct from p_user or p_action not in ('rescue','note','followup_done')) then
 raise exception 'Not authorized' using errcode='42501'; end if;
 if c.status in ('closed','resolved') and p_action not in ('reopen','note') then raise exception 'Reopen this case first'; end if;
 if length(p_data::text)>8192 then raise exception 'Action is too large'; end if;
 if i.status='new' and p_action not in ('accept','reject','note') then raise exception 'Accept the report first'; end if;
 prior_internal:=current_setting('careos.internal_action',true);
 perform set_config('careos.internal_action','true',true);
 if p_action='accept' then
  if i.status='dismissed' then raise exception 'Report was dismissed'; end if;
  if i.status in ('triaged','linked') then perform set_config('careos.internal_action',coalesce(prior_internal,''),true); return jsonb_build_object('ok',true,'duplicate',true); end if;
  update careos.inbox set status='triaged',owner_id=p_user where id=i.id;
  update public.cases set stage='triage',first_action_at=coalesce(first_action_at,now()),status_reviewed_at=now() where id=c.id;
  perform careos.notify(i.id,'accepted','An NGO accepted your report.','एक संस्था ने आपकी रिपोर्ट स्वीकार की है।',p_key||':citizen');
 elsif p_action='reject' then
  if i.status<>'new' then raise exception 'Only an unaccepted report can be declined'; end if;
  if nullif(trim(p_data->>'note'),'') is null then raise exception 'A reason is required'; end if;
  update careos.inbox set status='dismissed',dismissed_reason=left(p_data->>'note',1000) where id=i.id;
  update public.cases set status='closed',stage='closed',status_class='no_action',closure_reason='not_attended',resolved_at=now() where id=c.id;
  perform careos.notify(i.id,'rejected','This team cannot attend. Please contact a local rescue service.','यह टीम सहायता नहीं कर सकती। कृपया स्थानीय बचाव सेवा से संपर्क करें।',p_key||':citizen');
 elsif p_action='assign' then
  v_id:=(p_data->>'user_id')::uuid;
  if careos.member_role(v_id,p_ngo) is null then raise exception 'Assignee must be a current member of this NGO' using errcode='42501'; end if;
  if exists(select 1 from public.volunteers where id=v_id and ngo_id is distinct from p_ngo) then raise exception 'Volunteer belongs to another organisation' using errcode='42501'; end if;
  insert into public.volunteers(id,name,ngo_id) values(v_id,'NGO team',p_ngo) on conflict(id) do nothing;
  update public.cases set assignee_id=v_id,assignee_name='NGO team',status='assigned',stage='assigned',status_class='open' where id=c.id;
  perform careos.notify(i.id,'team_assigned','A team member has been assigned.','एक टीम सदस्य को ज़िम्मेदारी दी गई है।',p_key||':citizen');
  perform careos.say(s.phone,i.tracking||': assigned to you. Send VIEW '||i.tracking,p_key||':assignee','staff_alert') from careos.staff s where s.user_id=v_id and s.ngo_id=p_ngo;
 elsif p_action='rescue' then
  update public.cases set status='in_progress',stage='rescued',status_class='in_progress' where id=c.id;
 elsif p_action in ('treatment','vaccination','sterilisation') then
  insert into public.medical_events(dog_id,case_id,kind,notes,created_by_id,source_metadata)
  values(c.dog_id,c.id,p_action,'Recorded by NGO staff. Private notes in Care Inbox.',p_user,jsonb_build_object('channel','whatsapp'));
  update public.cases set status='in_progress',stage='treatment',status_class='in_progress' where id=c.id;
  if c.dog_id is not null then
   if not exists(select 1 from public.dogs where id=c.dog_id and ngo_id=p_ngo) then raise exception 'Animal outside NGO' using errcode='42501'; end if;
   update public.dogs set vaccinated=case when p_action='vaccination' then true else vaccinated end,
    sterilised=case when p_action='sterilisation' then true else sterilised end,
    vaccination_status=case when p_action='vaccination' then 'vaccinated' else vaccination_status end,
    sterilisation_status=case when p_action='sterilisation' then 'sterilised' else sterilisation_status end
   where id=c.dog_id and ngo_id=p_ngo;
  end if;
  perform careos.notify(i.id,'treated','The NGO recorded care for this case.','संस्था ने इस मामले में देखभाल दर्ज की है।',p_key||':citizen');
 elsif p_action='expense' then
  amount:=(p_data->>'amount')::numeric;
  if amount is null or amount<=0 or amount>1000000 or scale(amount)>2 then raise exception 'Enter an INR amount between 0.01 and 1000000'; end if;
  update public.cases set cost_spent=coalesce(cost_spent,0)+amount where id=c.id;
 elsif p_action='followup' then
  if (p_data->>'due_at')::timestamptz is null or (p_data->>'due_at')::timestamptz<=now() then raise exception 'Follow-up must be in the future'; end if;
  insert into public.animal_followups(ngo_id,dog_id,case_id,due_at,kind,note,created_by,source_metadata)
  values(p_ngo,c.dog_id,c.id,(p_data->>'due_at')::timestamptz,'review','WhatsApp follow-up',p_user,jsonb_build_object('channel','whatsapp')) returning id into f;
  update public.cases set due_at=(p_data->>'due_at')::timestamptz,stage='follow_up' where id=c.id;
  perform careos.notify(i.id,'followup_scheduled','A follow-up has been scheduled.','अगली जाँच तय की गई है।',p_key||':citizen');
 elsif p_action='followup_done' then
  update public.animal_followups set status='done',completed_at=now(),updated_at=now()
  where id=(p_data->>'followup_id')::uuid and case_id=c.id and ngo_id=p_ngo and status in ('upcoming','missed','postponed') returning id into f;
  if f is null then raise exception 'No pending follow-up on this case'; end if;
 elsif p_action='close' then
  if nullif(trim(p_data->>'note'),'') is null then raise exception 'An outcome note is required'; end if;
  if coalesce(p_data->>'reason','') not in ('recovered','died','could_not_locate','caller_unreachable','other_ngo','duplicate','not_attended','other') then raise exception 'Choose an explicit closure reason'; end if;
  if exists(select 1 from public.animal_followups where case_id=c.id and ngo_id=p_ngo and status in ('upcoming','missed','postponed')) then raise exception 'Complete or cancel pending follow-ups first'; end if;
  update public.cases set status='closed',stage='closed',resolved_at=now(),resolved_at_source='recorded',status_class=case when p_data->>'reason'='recovered' then 'closed' else 'no_action' end,closure_reason=case when p_data->>'reason'='recovered' then null else p_data->>'reason' end,outcome_note='Outcome confirmed by NGO staff.' where id=c.id;
  perform careos.notify(i.id,'closed','The NGO has closed this case.','संस्था ने यह मामला बंद कर दिया है।',p_key||':citizen');
 elsif p_action='reopen' then
  if c.status not in ('closed','resolved') or nullif(trim(p_data->>'note'),'') is null then raise exception 'A closed case and reason are required'; end if;
  update public.cases set status='in_progress',stage='triage',resolved_at=null,resolution=null,closure_reason=null,status_class='in_progress' where id=c.id;
  update careos.inbox set status='triaged',dismissed_reason=null where id=i.id;
  perform careos.notify(i.id,'reopened','The NGO reopened this case.','संस्था ने यह मामला फिर खोला है।',p_key||':citizen');
 elsif p_action='link_animal' then
  d:=(p_data->>'dog_id')::uuid;
  if not exists(select 1 from public.dogs where id=d and ngo_id=p_ngo) then raise exception 'Animal outside NGO' using errcode='42501'; end if;
  if c.dog_id is not null and c.dog_id<>d then raise exception 'An animal is already linked; no automatic merging'; end if;
  update public.cases set dog_id=d where id=c.id;
  update careos.inbox set linked_dog_id=d,status='linked' where id=i.id;
 elsif p_action<>'note' then raise exception 'Unknown action';
 end if;
 if p_action in ('rescue','treatment','vaccination','sterilisation','note') and nullif(trim(p_data->>'note'),'') is null then raise exception 'A note is required'; end if;
 insert into careos.audit(key,ngo_id,actor_id,case_id,action,details) values(p_key,p_ngo,p_user,c.id,p_action,p_data);
 insert into public.case_updates(case_id,actor_id,actor_name,type,from_status,to_status,note)
 select c.id,p_user,'NGO team',case when p_action='reopen' then 'reopened'::public.case_update_type else 'note'::public.case_update_type end,c.status,x.status,'WhatsApp: '||p_action from public.cases x where x.id=c.id;
 update public.cases set updated_at=now(),last_activity_at=now() where id=c.id;
 select dog_id into d from public.cases where id=c.id;
 if d is not null then
 insert into public.animal_timeline_events(ngo_id,dog_id,case_id,followup_id,event_type,title,details,actor_id,actor_name,provenance,source_ref,visibility)
 values(p_ngo,d,c.id,f,'note','WhatsApp: '||p_action,'Care recorded by NGO staff.',p_user,'NGO team','whatsapp',jsonb_build_object('channel','whatsapp'),'private');
 end if;
 perform set_config('careos.internal_action',coalesce(prior_internal,''),true);
 return jsonb_build_object('ok',true,'case_id',c.id,'followup_id',f);
end $$;

create function careos.sync_dashboard() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,careos as $$
declare j jsonb:=to_jsonb(new); oldj jsonb; cid uuid; i careos.inbox; event_key text; note text; notice text:='status';
begin
 if current_setting('role',true)<>'authenticated' or current_setting('careos.internal_action',true)='true' then return new; end if;
 if tg_op='UPDATE' then
  oldj:=to_jsonb(old);
  if (j-array['updated_at','last_activity_at']) is not distinct from (oldj-array['updated_at','last_activity_at']) then return new; end if;
 end if;
 cid:=case when tg_table_name='cases' then new.id else (j->>'case_id')::uuid end;
 if cid is null then return new; end if;
 select * into i from careos.inbox where linked_case_id=cid for update;
 if not found or careos.member_role(auth.uid(),i.ngo_id) is null then return new; end if;
 event_key:='dashboard:'||gen_random_uuid();
 if tg_table_name='cases' then
  -- A deliberate assignment/start/outcome in the existing case UI is also a
  -- decision on its WhatsApp inbox item. Merely touching timestamps is not.
  if i.status='new' and (j->>'assignee_id' is not null or j->>'status' in ('assigned','in_progress','resolved','closed')) then
   update careos.inbox set status=case when j->>'status'='closed' and j->>'closure_reason' is not null then 'dismissed' when linked_dog_id is not null then 'linked' else 'triaged' end,
    owner_id=auth.uid(),dismissed_reason=case when j->>'status'='closed' then j->>'closure_reason' else null end where id=i.id;
  end if;
  if j->>'status' in ('closed','resolved') then notice:='closed';
  elsif j->>'assignee_id' is distinct from oldj->>'assignee_id' then notice:='team_assigned'; end if;
  note:=coalesce(j->>'outcome_note',j->>'resolution','Case updated in NGO dashboard');
 elsif tg_table_name='animal_followups' then
  notice:='followup_scheduled'; note:=coalesce(j->>'note','Follow-up updated in NGO dashboard');
 elsif tg_table_name='medical_events' then
  notice:='treated'; note:=coalesce(j->>'notes','Care updated in NGO dashboard');
 else note:=coalesce(j->>'note','History updated in NGO dashboard');
 end if;
 insert into careos.audit(key,ngo_id,actor_id,case_id,action,details)
 values(event_key,i.ngo_id,auth.uid(),cid,'dashboard_'||tg_table_name,jsonb_build_object('note',left(note,2000),'source_id',j->>'id'));
 -- Neutral wording cannot invent a clinical outcome or disclose staff notes.
 perform careos.notify(i.id,notice,'There is an update. Reply STATUS '||i.tracking,'एक अपडेट है। STATUS '||i.tracking||' भेजें।',event_key||':citizen');
 return new;
end $$;
revoke all on function careos.sync_dashboard() from public,anon,authenticated;
create trigger zzz_careos_dashboard_case after update on public.cases for each row execute function careos.sync_dashboard();
create trigger zzz_careos_dashboard_medical after insert or update on public.medical_events for each row execute function careos.sync_dashboard();
create trigger zzz_careos_dashboard_followup after insert or update on public.animal_followups for each row execute function careos.sync_dashboard();
create trigger zzz_careos_dashboard_note after insert on public.case_updates for each row execute function careos.sync_dashboard();

-- Reuse the platform's existing helpline page; never invent a local number.
do $$ declare definition text; en text:='For immediate danger contact a local rescue/vet.'; hi text:='तत्काल खतरे में स्थानीय बचाव सेवा या पशु चिकित्सक से संपर्क करें।'; begin
 definition:=pg_get_functiondef('public.careos_process_job(uuid,uuid,jsonb)'::regprocedure);
 if strpos(definition,en)=0 or strpos(definition,hi)=0 then raise exception 'CareOS consent prompt changed; review helpline patch'; end if;
 definition:=replace(definition,en,en||' Rescue helplines by city: https://www.straypaw.org/community/help#helplines');
 definition:=replace(definition,hi,hi||' शहर की हेल्पलाइन: https://www.straypaw.org/community/help#helplines');
 execute definition;
end $$;
notify pgrst,'reload schema';
commit;
