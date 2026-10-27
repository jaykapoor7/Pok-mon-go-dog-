-- Additive transport state. No existing rows are changed; no legacy RPC is replaced.
-- careos MUST NOT be included in PostgREST's exposed schemas.
begin;
create schema if not exists careos;
revoke all on schema careos from public, anon, authenticated;

create table careos.contacts (
 phone text primary key check (phone ~ '^[0-9]{7,15}$'),
 handle uuid not null default gen_random_uuid(), language text not null default 'en' check(language in ('en','hi')),
 consent boolean not null default false, last_inbound timestamptz not null default '-infinity',
 state jsonb not null default '{}', rate_start timestamptz not null default now(), rate_count int not null default 0
);
create table careos.staff (
 phone text primary key references careos.contacts(phone), user_id uuid not null references auth.users(id) on delete cascade,
 ngo_id uuid not null references public.ngos(id), linked_at timestamptz not null default now(), unique(user_id)
);
create table careos.link_codes (
 hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 ngo_id uuid not null references public.ngos(id), expires_at timestamptz not null, phone text not null,
 created_at timestamptz not null default now()
);
create table careos.routes (
 ngo_id uuid primary key references public.ngos(id), lat float8 not null check(lat between -90 and 90),
 lng float8 not null check(lng between -180 and 180), radius_km float8 not null check(radius_km > 0 and radius_km <= 100),
 enabled boolean not null default false, updated_at timestamptz not null default now()
);
create table careos.inbox (
 id uuid primary key default gen_random_uuid(), tracking text unique not null default ('SP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 phone text not null references careos.contacts(phone), ngo_id uuid references public.ngos(id),
 received_at timestamptz not null default now(), text text not null, language text not null,
 lat float8 not null check(lat between -90 and 90), lng float8 not null check(lng between -180 and 180),
 urgency text not null check(urgency in ('routine','urgent','emergency','unknown')),
 status text not null default 'new' check(status in ('new','triaged','linked','dismissed')),
 owner_id uuid, linked_case_id uuid references public.cases(id), linked_dog_id uuid references public.dogs(id),
 dismissed_reason text, media jsonb not null default '[]', escalated_at timestamptz
);
create index careos_inbox_ngo_idx on careos.inbox(ngo_id,status,received_at desc);
create index careos_inbox_contact_idx on careos.inbox(phone,received_at desc);
create table careos.jobs (
 sequence bigint generated always as identity unique,
 id uuid primary key default gen_random_uuid(), key text not null unique, kind text not null check(kind in ('message','status')),
 payload jsonb not null, state text not null default 'pending' check(state in ('pending','processing','done','dead')),
 attempts int not null default 0, available_at timestamptz not null default now(), lease uuid,
 lease_until timestamptz, created_at timestamptz not null default now(), completed_at timestamptz, error_code text
);
create index careos_jobs_pending_idx on careos.jobs(state,available_at,created_at);
create index careos_jobs_sender_idx on careos.jobs((payload->>'from'),sequence) where state in ('pending','processing');
create table careos.outbox (
 sequence bigint generated always as identity unique,
 id uuid primary key default gen_random_uuid(), key text not null unique,
 phone text not null references careos.contacts(phone), body text not null, notice text not null default 'reply',
 buttons jsonb not null default '[]', state text not null default 'pending'
 check(state in ('pending','sending','sent','delivered','read','failed','blocked','uncertain')),
 attempts int not null default 0, available_at timestamptz not null default now(), lease uuid, lease_until timestamptz,
 meta_id text unique, status_at timestamptz, error_code text, created_at timestamptz not null default now()
);
create index careos_outbox_pending_idx on careos.outbox(state,available_at,created_at);
create table careos.delivery_receipts (
 meta_id text not null, phone text not null, status text not null, occurred_at timestamptz not null,
 error_code text, primary key(meta_id,status,occurred_at)
);
create table careos.audit (
 key text primary key, ngo_id uuid, actor_id uuid, case_id uuid, action text not null,
 details jsonb not null default '{}', created_at timestamptz not null default now()
);
-- Private tables have RLS even though the schema is inaccessible to API clients.
do $$ declare t text; begin
 foreach t in array array['contacts','staff','link_codes','routes','inbox','jobs','outbox','delivery_receipts','audit'] loop
 execute format('alter table careos.%I enable row level security', t);
 end loop;
end $$;

create function careos.member_role(p_user uuid,p_ngo uuid) returns text
language sql stable security definer set search_path = pg_catalog, public, careos as $$
 select m.role from public.ngo_members m join public.ngos n on n.id=m.ngo_id
 join auth.users u on u.id=m.user_id
 where m.user_id=p_user and m.ngo_id=p_ngo and n.verified is true and coalesce(u.banned_until,'-infinity') < now()
 and m.role in ('owner','admin','lead','member','volunteer');
$$;
create function careos.say(p_phone text,p_body text,p_key text,p_notice text default 'reply',p_buttons jsonb default '[]') returns void
language sql security definer set search_path = pg_catalog, public, careos as $$
 insert into careos.outbox(phone,body,key,notice,buttons) values(p_phone,left(p_body,4000),p_key,p_notice,p_buttons)
 on conflict(key) do nothing;
$$;
create function careos.translate(p_phone text,p_en text,p_hi text) returns text
language sql stable security definer set search_path = pg_catalog, public, careos as $$
 select case when language='hi' then p_hi else p_en end from careos.contacts where phone=p_phone;
$$;
create function careos.route(p_lat float8,p_lng float8) returns uuid
language sql stable security definer set search_path = pg_catalog, public, careos as $$
 select r.ngo_id from careos.routes r join public.ngos n on n.id=r.ngo_id
 cross join lateral (select 6371 * 2 * asin(least(1,sqrt(power(sin(radians(r.lat-p_lat)/2),2) + cos(radians(p_lat))*cos(radians(r.lat))*power(sin(radians(r.lng-p_lng)/2),2)))) as km) d
 where r.enabled and n.verified is true and d.km <= r.radius_km
 order by d.km,r.ngo_id limit 1;
$$;
create function careos.notify(p_item uuid,p_notice text,p_en text,p_hi text,p_key text) returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare i careos.inbox;
begin
 select * into i from careos.inbox where id=p_item;
 if exists(select 1 from careos.contacts where phone=i.phone and consent) then
 perform careos.say(i.phone,careos.translate(i.phone,i.tracking||': '||p_en,i.tracking||': '||p_hi),p_key,p_notice);
 end if;
end $$;
create function careos.staff_notice(p_ngo uuid,p_body text,p_key text) returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare s record;
begin
 for s in select * from careos.staff where ngo_id=p_ngo loop
 if careos.member_role(s.user_id,s.ngo_id) in ('owner','admin','lead','member') then
 perform careos.say(s.phone,p_body,p_key||':'||s.user_id,'staff_alert');
 end if;
 end loop;
end $$;
create function careos.open_case(p_item uuid) returns uuid
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare i careos.inbox; c uuid;
begin
 select * into i from careos.inbox where id=p_item for update;
 if i.ngo_id is null then return null; end if;
 if i.linked_case_id is not null then return i.linked_case_id; end if;
 -- Raw messages, names, exact pins, media and private notes NEVER enter public projections.
 -- Existing dashboard tables receive non-identifying facts; the inbox holds private evidence.
 insert into public.cases(title,description,ngo_id,status,severity,category,intake_channel,created_by_name,source_metadata)
 values('WhatsApp care request',null,i.ngo_id,'unverified',
 (case i.urgency when 'emergency' then 'critical' when 'urgent' then 'high' else 'normal' end)::public.case_severity,
 'rescue','resident_report','StrayPaw',jsonb_build_object('channel','whatsapp')) returning id into c;
 update careos.inbox set linked_case_id=c where id=i.id;
 insert into public.case_updates(case_id,type,to_status,note) values(c,'created','unverified','WhatsApp report received. Private evidence is in Care Inbox.');
 perform careos.staff_notice(i.ngo_id,i.tracking||' • '||i.urgency||E'\nNew report. Send VIEW '||i.tracking||' to review, or open Care Inbox.','new:'||i.id);
 return c;
end $$;

-- Central authorization boundary used by both website and verified individual staff DMs.
create function careos.act(p_user uuid,p_ngo uuid,p_case uuid,p_action text,p_data jsonb,p_key text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare r text; c public.cases; i careos.inbox; d uuid; f uuid; v_id uuid; amount numeric;
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
 if p_action='accept' then
  if i.status='dismissed' then raise exception 'Report was dismissed'; end if;
  if i.status in ('triaged','linked') then return jsonb_build_object('ok',true,'duplicate',true); end if;
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
 return jsonb_build_object('ok',true,'case_id',c.id,'followup_id',f);
end $$;

create function public.careos_staff_link_code(p_phone text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare n uuid; code text;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid();
 if careos.member_role(auth.uid(),n) is null or p_phone !~ '^[0-9]{7,15}$' then raise exception 'Not authorized' using errcode='42501'; end if;
 if exists(select 1 from careos.link_codes where user_id=auth.uid() and created_at>now()-interval '1 minute') then raise exception 'Wait one minute before generating another code'; end if;
 code:=replace(gen_random_uuid()::text,'-','');
 delete from careos.link_codes where user_id=auth.uid();
 insert into careos.link_codes(hash,user_id,ngo_id,expires_at,phone) values(encode(sha256(convert_to(code,'UTF8')),'hex'),auth.uid(),n,now()+interval '10 minutes',p_phone);
 return jsonb_build_object('code',code,'expires_in',600);
end $$;
create function public.careos_staff_unlink() returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
begin
 if auth.uid() is null then raise exception 'Not authorized' using errcode='42501'; end if;
 delete from careos.staff where user_id=auth.uid(); delete from careos.link_codes where user_id=auth.uid();
end $$;
create function public.careos_configure_route(p_lat float8,p_lng float8,p_radius_km float8,p_enabled boolean) returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare n uuid;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid();
 if coalesce(careos.member_role(auth.uid(),n),'') not in ('owner','admin','lead') or n is null then raise exception 'Team lead required' using errcode='42501'; end if;
 insert into careos.routes values(n,p_lat,p_lng,p_radius_km,p_enabled,now()) on conflict(ngo_id) do update set lat=excluded.lat,lng=excluded.lng,radius_km=excluded.radius_km,enabled=excluded.enabled,updated_at=now();
end $$;
create function public.careos_health() returns jsonb
language sql stable security definer set search_path = pg_catalog, public, careos as $$
 select jsonb_build_object('connected',exists(select 1 from careos.routes r where r.ngo_id=m.ngo_id and r.enabled),'number_verified',exists(select 1 from careos.outbox o where o.meta_id is not null and o.state in ('sent','delivered','read')))
 from public.ngo_members m where m.user_id=auth.uid() and careos.member_role(m.user_id,m.ngo_id) is not null;
$$;
create function careos.item_json(i careos.inbox) returns jsonb
language sql stable security definer set search_path = pg_catalog, public, careos as $$
 select jsonb_build_object('id',i.id,'ngo_id',i.ngo_id,'channel','whatsapp','thread_id',i.id,'reporter_handle',c.handle,'reporter_name',null,
 'received_at',i.received_at,'text',i.tracking||E'\n'||i.text,'language',i.language,'text_en',null,
 'media',i.media,'location',jsonb_build_object('lat',i.lat,'lng',i.lng,'label',null),'urgency',i.urgency,
 'status',i.status,'owner_id',i.owner_id,'owner_name',null,'linked_case_id',i.linked_case_id,'linked_dog_id',i.linked_dog_id,'dismissed_reason',i.dismissed_reason)
 from careos.contacts c where c.phone=i.phone;
$$;
create function public.careos_inbox_list(p_status text[] default null,p_limit int default 200,p_offset int default 0) returns setof jsonb
language plpgsql stable security definer set search_path = pg_catalog, public, careos as $$
declare n uuid; r text;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid(); r:=careos.member_role(auth.uid(),n);
 if r is null or r='volunteer' then raise exception 'Not authorized' using errcode='42501'; end if;
 return query select careos.item_json(i) from careos.inbox i where i.ngo_id=n and (p_status is null or i.status=any(p_status)) order by i.received_at desc limit least(greatest(p_limit,1),200) offset greatest(p_offset,0);
end $$;
create function public.careos_inbox_act(p_action jsonb) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare i careos.inbox; n uuid; a text; result jsonb;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid();
 select * into i from careos.inbox where id=(p_action->>'item_id')::uuid and ngo_id=n;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 a:=p_action->>'type';
 if a in ('claim','open_case') then a:='accept'; elsif a='dismiss' then a:='reject'; end if;
 if a='link_case' then
  -- Existing case attachment is only allowed when the report already references it.
  if i.linked_case_id is distinct from (p_action->>'case_id')::uuid then raise exception 'Use the existing CareOS case; duplicate case linking is disabled'; end if;
  a:='note';
 end if;
 result:=careos.act(auth.uid(),n,i.linked_case_id,a,p_action||jsonb_build_object('note',coalesce(p_action->>'reason','Reviewed in Care Inbox')),'web:'||gen_random_uuid());
 select * into i from careos.inbox where id=i.id;
 return careos.item_json(i);
end $$;
create function public.careos_case_action(p_case_id uuid,p_action text,p_data jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare n uuid;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid();
 return careos.act(auth.uid(),n,p_case_id,p_action,p_data,'web:'||p_request_id);
end $$;
create function public.careos_notify_reporter(p_case_id uuid,p_notice text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare i careos.inbox; n uuid;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid();
 if careos.member_role(auth.uid(),n) is null or careos.member_role(auth.uid(),n)='volunteer' then raise exception 'Not authorized' using errcode='42501'; end if;
 select * into i from careos.inbox where linked_case_id=p_case_id and ngo_id=n;
 if not found then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_notice not in ('received','team_assigned','treated','followup_scheduled','closed') then raise exception 'Unknown notice'; end if;
 -- Website cannot invent treatment/outcomes: sends a neutral status-check invitation.
 perform careos.notify(i.id,'status','There is an update. Reply STATUS '||i.tracking,'एक अपडेट है। STATUS '||i.tracking||' भेजें।','status:'||i.id||':'||date_trunc('hour',now()));
 return jsonb_build_object('queued',exists(select 1 from careos.contacts where phone=i.phone and consent));
end $$;
create function public.careos_media_path(p_id text) returns text
language plpgsql stable security definer set search_path = pg_catalog, public, careos as $$
declare p text; n uuid; r text;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid(); r:=careos.member_role(auth.uid(),n);
 if r is null or r='volunteer' then raise exception 'Not authorized' using errcode='42501'; end if;
 select m->>'path' into p from careos.inbox i cross join lateral jsonb_array_elements(i.media) m where i.ngo_id=n and m->>'id'=p_id limit 1;
 if p is null then raise exception 'Not authorized' using errcode='42501'; end if; return p;
end $$;

-- Durable receipt happens before HTTP 200. Duplicate messages never re-enter the state machine.
create function public.careos_enqueue(p_events jsonb) returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
begin
 if jsonb_array_length(p_events)>100 then raise exception 'Batch too large'; end if;
 insert into careos.jobs(key,kind,payload) select e->>'key',e->>'kind',e->'payload' from jsonb_array_elements(p_events) e on conflict(key) do nothing;
end $$;
create function public.careos_claim_jobs(p_limit int default 10) returns table(id uuid,lease uuid,kind text,payload jsonb)
language sql security definer set search_path = pg_catalog, public, careos as $$
 update careos.jobs target set state='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 where target.id in (select j.id from careos.jobs j where ((j.state='pending' and j.available_at<=now()) or (j.state='processing' and j.lease_until<now()))
 and not exists(select 1 from careos.jobs earlier where earlier.kind='message' and j.kind='message' and earlier.payload->>'from'=j.payload->>'from' and earlier.state in ('pending','processing') and earlier.sequence<j.sequence)
 order by j.sequence for update skip locked limit least(greatest(p_limit,1),20)) returning target.id,target.lease,target.kind,target.payload;
$$;
create function public.careos_fail_job(p_id uuid,p_lease uuid,p_error text) returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare j careos.jobs;
begin
 update careos.jobs set state=case when attempts>=5 then 'dead' else 'pending' end,available_at=now()+least(3600,power(2,attempts)::int*10)*interval '1 second',error_code=left(p_error,60),lease_until=null
 where id=p_id and lease=p_lease and state='processing' returning * into j;
 if j.state='dead' and j.kind='message' and exists(select 1 from careos.contacts where phone=j.payload->>'from' and consent) then
 perform careos.say(j.payload->>'from','We could not process that attachment. Please resend a typed description. / मीडिया पढ़ा नहीं जा सका। विवरण टाइप करके भेजें।',j.key||':failure');
 end if;
end
$$;

create function public.careos_process_job(p_id uuid,p_lease uuid,p_enriched jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare j careos.jobs; m jsonb; ct careos.contacts; s careos.staff; lc careos.link_codes;
 i careos.inbox; draft jsonb; txt text; cmd jsonb; reply text; result jsonb; route_id uuid; case_id uuid; note text;
 new_id uuid; body text; x record; accepted bool:=false;
begin
 select * into j from careos.jobs where id=p_id and lease=p_lease and state='processing' and lease_until>now() for update;
 if not found then raise exception 'Lease lost'; end if;
 m:=j.payload;
 if j.kind='status' then
  insert into careos.delivery_receipts(meta_id,phone,status,occurred_at,error_code)
  values(m->>'id',m->>'recipient',m->>'status',to_timestamp((m->>'timestamp')::float8),m->>'error') on conflict do nothing;
  -- Do not allow late sent/delivered receipts to regress read; preserve failures for retry diagnostics.
  update careos.outbox set state=case
   when state='read' then 'read' when state='delivered' and m->>'status'='sent' then 'delivered'
   else m->>'status' end,status_at=to_timestamp((m->>'timestamp')::float8),error_code=m->>'error'
  where meta_id=m->>'id' and phone=m->>'recipient' and (status_at is null or status_at<=to_timestamp((m->>'timestamp')::float8));
  update careos.jobs set state='done',completed_at=now(),payload='{}' where id=j.id;
  return jsonb_build_object('ok',true);
 end if;
 -- Only derived fields from our media/extraction worker may enrich an immutable signed payload.
 m:=m || jsonb_strip_nulls(jsonb_build_object('media',p_enriched->'media','extraction',p_enriched->'extraction','command',p_enriched->'command','transcript',p_enriched->'transcript'));
 insert into careos.contacts(phone) values(m->>'from') on conflict(phone) do nothing;
 select * into ct from careos.contacts where phone=m->>'from' for update;
 if ct.rate_start<now()-interval '1 minute' then ct.rate_count:=0; ct.rate_start:=now(); end if;
 update careos.contacts set rate_count=ct.rate_count+1,rate_start=ct.rate_start,last_inbound=greatest(last_inbound,least(now(),to_timestamp((m->>'timestamp')::float8))) where phone=ct.phone;
 txt:=trim(coalesce(nullif(m->>'text',''),m->>'transcript',''));
 if txt ~ '[ऀ-ॿ]' then update careos.contacts set language='hi' where phone=ct.phone; ct.language:='hi'; end if;
 cmd:=m->'command';
 if upper(txt) in ('STOP','UNSUBSCRIBE','बंद','रोकें') then
  update careos.contacts set consent=false,state='{}' where phone=ct.phone;
  update careos.outbox set state='blocked',error_code='opted_out' where phone=ct.phone and state='pending';
  perform careos.say(ct.phone,'Updates stopped. Send START to opt in again. / अपडेट बंद हैं। फिर शुरू करने के लिए START भेजें।',j.key||':reply','optout_ack');
 elsif ct.rate_count>=30 then
  if ct.rate_count=30 then perform careos.say(ct.phone,'Too many messages. Please wait one minute. / कृपया एक मिनट रुकें।',j.key||':reply'); end if;
 elsif upper(txt) in ('EN','ENGLISH','HI','HINDI','हिंदी','हिन्दी') then
  update careos.contacts set language=case when upper(txt) in ('EN','ENGLISH') then 'en' else 'hi' end where phone=ct.phone;
  perform careos.say(ct.phone,careos.translate(ct.phone,'English selected. Send REPORT to report a dog.','हिन्दी चुनी गई। कुत्ते की रिपोर्ट के लिए REPORT भेजें।'),j.key||':reply');
 elsif upper(txt) like 'LINK %' then
  select * into lc from careos.link_codes where hash=encode(sha256(convert_to(trim(substr(txt,6)),'UTF8')),'hex') and phone=ct.phone and expires_at>now() for update;
  if found and careos.member_role(lc.user_id,lc.ngo_id) is not null then
   delete from careos.staff where user_id=lc.user_id;
   insert into careos.staff(phone,user_id,ngo_id) values(ct.phone,lc.user_id,lc.ngo_id) on conflict(phone) do update set user_id=excluded.user_id,ngo_id=excluded.ngo_id,linked_at=now();
   delete from careos.link_codes where hash=lc.hash;
   update careos.contacts set consent=true,state='{}' where phone=ct.phone;
   perform careos.say(ct.phone,'Staff number linked. Operational updates enabled. Send HELP for actions, STOP to stop updates, UNLINK to revoke this phone.',j.key||':reply');
  else perform careos.say(ct.phone,'Invalid or expired link. Generate a new code in NGO Settings for this phone number.',j.key||':reply'); end if;
 else
  select * into s from careos.staff where phone=ct.phone;
  if s.phone is not null and careos.member_role(s.user_id,s.ngo_id) is null then
   delete from careos.staff where phone=ct.phone; s:=null;
  end if;
  if upper(txt)='UNLINK' then
   delete from careos.staff where phone=ct.phone;
   update careos.contacts set state='{}' where phone=ct.phone;
   perform careos.say(ct.phone,'Staff phone unlinked.',j.key||':reply');
  elsif upper(txt)='CANCEL' or txt='cancel_action' then
   update careos.contacts set state='{}' where phone=ct.phone;
   perform careos.say(ct.phone,careos.translate(ct.phone,'Cancelled. Nothing was changed.','रद्द कर दिया। कोई बदलाव नहीं हुआ।'),j.key||':reply');
  elsif (upper(txt)='CONFIRM' or txt='confirm_action') and ct.state ? 'pending_action' then
   draft:=ct.state->'pending_action';
   if s.phone is null or (draft->>'expires_at')::timestamptz<now() then reply:='Confirmation expired. Send the command again.';
   else
    begin
     result:=careos.act(s.user_id,s.ngo_id,(draft->>'case_id')::uuid,draft->>'action',draft->'data',draft->>'key');
     reply:='Saved. '||(draft->>'tracking')||coalesce(E'\nFollow-up ID: '||(result->>'followup_id'),'');
    exception when insufficient_privilege then reply:='Not authorized for this case or action.';
     when raise_exception then reply:=SQLERRM;
     when others then reply:='Invalid action details. Check the command and try again.';
    end;
   end if;
   update careos.contacts set state='{}' where phone=ct.phone;
   perform careos.say(ct.phone,reply,j.key||':reply');
  elsif s.phone is not null and cmd is not null then
   if cmd->>'action'='help' then
    reply:=E'VIEW SP-id | MY | TEAM | MATCH SP-id\nACCEPT SP-id | REJECT SP-id reason\nASSIGN SP-id user-uuid\nRESCUE SP-id note | TREAT SP-id note\nVACCINATE SP-id note | STERILISE SP-id note\nEXPENSE SP-id INR note\nFOLLOWUP SP-id ISO-date-time note\nDONE SP-id followup-uuid\nCLOSE SP-id reason note | REOPEN SP-id reason\nClosure reasons: recovered, died, could_not_locate, caller_unreachable, other_ngo, duplicate, not_attended, other\nANIMAL SP-id dog-uuid\nEvery change needs CONFIRM. REPORT starts a community report. HI selects Hindi.';
   elsif cmd->>'action'='team' then
    select string_agg(m.user_id::text||' '||m.role,E'\n') into reply from public.ngo_members m where m.ngo_id=s.ngo_id;
   elsif cmd->>'action'='my' then
    select string_agg(t.tracking||' • '||t.status,E'\n') into reply from (select b.tracking,c.status from careos.inbox b join public.cases c on c.id=b.linked_case_id where b.ngo_id=s.ngo_id and c.status not in ('closed','resolved') and (careos.member_role(s.user_id,s.ngo_id)<>'volunteer' or c.assignee_id=s.user_id) order by b.received_at desc limit 10) t;
    reply:=coalesce(reply,'No active cases for your scope.');
   else
    select * into i from careos.inbox where tracking=cmd->>'tracking' and ngo_id=s.ngo_id;
    if not found or (careos.member_role(s.user_id,s.ngo_id)='volunteer' and not exists(select 1 from public.cases where id=i.linked_case_id and assignee_id=s.user_id)) then reply:='Not authorized for this case or action.';
    elsif cmd->>'action'='view' then
     select status::text into note from public.cases where id=i.linked_case_id;
     reply:=i.tracking||' • '||coalesce(note,'not assigned')||E'\n'||left(i.text,1800)||E'\nGPS: '||i.lat||', '||i.lng||E'\nPrivate media and notes: NGO Care Inbox.';
    elsif cmd->>'action'='match' then
     select string_agg(t.id::text||' '||coalesce(t.name,'Unnamed'),E'\n') into reply from (
      select d.id,d.name from public.dogs d where d.ngo_id=s.ngo_id and abs(d.lat-i.lat)<0.003 and abs(d.lng-i.lng)<0.003 order by power(d.lat-i.lat,2)+power(d.lng-i.lng,2) limit 5) t;
     reply:=coalesce(reply,'No nearby animal on your NGO register.')||E'\nSuggestions only. ANIMAL '||i.tracking||' dog-uuid links after confirmation; never merges.';
    else
     if careos.member_role(s.user_id,s.ngo_id)='volunteer' and cmd->>'action' not in ('rescue','note','followup_done') then reply:='Not authorized for this case or action.';
     else
      update careos.contacts set state=jsonb_build_object('pending_action',jsonb_build_object('case_id',i.linked_case_id,'tracking',i.tracking,'action',cmd->>'action','data',cmd->'data','key',j.key||':action','expires_at',now()+interval '5 minutes')) where phone=ct.phone;
      reply:='Confirm: '||left(txt,1000)||E'\nSend CONFIRM or CANCEL.';
      accepted:=true;
     end if;
    end if;
   end if;
   perform careos.say(ct.phone,reply,j.key||':reply','reply',case when accepted then '[{"id":"confirm_action","title":"Confirm / पुष्टि"},{"id":"cancel_action","title":"Cancel / रद्द"}]'::jsonb else '[]'::jsonb end);
  elsif upper(txt) like 'STATUS %' then
   select * into i from careos.inbox where tracking=upper(trim(substr(txt,8))) and phone=ct.phone;
   if not found then reply:=careos.translate(ct.phone,'No matching report for this number.','इस नंबर की ऐसी रिपोर्ट नहीं मिली।');
   else
    select status::text into note from public.cases where id=i.linked_case_id;
    reply:=i.tracking||': '||coalesce(note,'received; no NGO assigned yet')||'. '||careos.translate(ct.phone,'Not an emergency dispatch service.','यह आपातकालीन सेवा नहीं है।');
   end if;
   perform careos.say(ct.phone,reply,j.key||':reply');
  elsif upper(txt) in ('START','REPORT','HELP','HI','HELLO','रिपोर्ट','शुरू') or ct.state='{}' then
   update careos.contacts set state=jsonb_build_object('step','consent') where phone=ct.phone;
   perform careos.say(ct.phone,careos.translate(ct.phone,
   'StrayPaw records reports for partner NGOs, not emergency dispatch. For immediate danger contact a local rescue/vet. Dogs only. May we privately share your report, GPS and media with a local partner, use AI to transcribe/summarise it for your confirmation, and send status updates? Reply YES to consent, NO to cancel. Send HI for Hindi, EN for English, STOP to stop updates.',
   'StrayPaw सहयोगी संस्थाओं के लिए रिपोर्ट दर्ज करता है, आपातकालीन सेवा नहीं है। तत्काल खतरे में स्थानीय बचाव सेवा या पशु चिकित्सक से संपर्क करें। केवल कुत्तों के लिए। क्या हम रिपोर्ट, GPS और मीडिया संस्था से निजी तौर पर साझा करें, AI से वॉइस/सारांश तैयार करके आपकी पुष्टि लें और अपडेट भेजें? YES = सहमति, NO = रद्द। HI = हिन्दी, EN = English, STOP = अपडेट बंद।'),j.key||':reply');
  elsif ct.state->>'step'='consent' then
   if upper(txt) in ('YES','हाँ','हां') then
    update careos.contacts set consent=true,state=jsonb_build_object('step','description') where phone=ct.phone;
    perform careos.say(ct.phone,careos.translate(ct.phone,'Describe the dog and what happened. You can send a voice note or a photo with a caption.','कुत्ते और समस्या का वर्णन करें। वॉइस नोट या कैप्शन के साथ फोटो भी भेज सकते हैं।'),j.key||':reply');
   else
    update careos.contacts set state='{}' where phone=ct.phone;
    perform careos.say(ct.phone,careos.translate(ct.phone,'No report shared. Send REPORT to begin again.','रिपोर्ट साझा नहीं की गई। फिर शुरू करने के लिए REPORT भेजें।'),j.key||':reply');
   end if;
  elsif ct.state->>'step'='description' then
   if length(txt)<5 and coalesce(length(m->'extraction'->>'description'),0)<5 then
    perform careos.say(ct.phone,careos.translate(ct.phone,'Please add a short description. If voice transcription is unavailable, type a few words.','छोटा विवरण भेजें। वॉइस उपलब्ध न हो तो कुछ शब्द टाइप करें।'),j.key||':reply');
   else
    draft:=jsonb_build_object('step','location','description',left(coalesce(nullif(m->'extraction'->>'description',''),txt),3000),'media',case when m ? 'media' then jsonb_build_array(m->'media') else '[]'::jsonb end);
    update careos.contacts set state=draft where phone=ct.phone;
    perform careos.say(ct.phone,careos.translate(ct.phone,'Share a GPS location pin (attachment → Location).','GPS लोकेशन पिन भेजें (अटैचमेंट → Location)।'),j.key||':reply');
   end if;
  elsif m ? 'media' and ct.state->>'step' in ('location','urgency','confirm') then
   if jsonb_array_length(coalesce(ct.state->'media','[]'))>=5 then reply:='Maximum five attachments. Send the GPS pin or confirm the report.';
   else
    update careos.contacts set state=jsonb_set(ct.state,'{media}',coalesce(ct.state->'media','[]')||jsonb_build_array(m->'media')) where phone=ct.phone;
    reply:=careos.translate(ct.phone,'Attachment added. Send the GPS pin, urgency, or CONFIRM for the current step.','मीडिया जोड़ दिया। वर्तमान चरण के लिए GPS, प्राथमिकता या CONFIRM भेजें।');
   end if;
   perform careos.say(ct.phone,reply,j.key||':reply');
  elsif ct.state->>'step'='location' then
   if m ? 'location' then
    update careos.contacts set state=ct.state||jsonb_build_object('step','urgency','location',m->'location') where phone=ct.phone;
    perform careos.say(ct.phone,careos.translate(ct.phone,'Urgency? Reply 1 immediate danger, 2 urgent, or 3 routine. You decide; this is not emergency dispatch.','प्राथमिकता? 1 तत्काल खतरा, 2 ज़रूरी, 3 सामान्य भेजें। यह आपातकालीन सेवा नहीं है।'),j.key||':reply');
   else perform careos.say(ct.phone,careos.translate(ct.phone,'Please use WhatsApp attachment → Location to share the pin.','WhatsApp अटैचमेंट → Location से पिन साझा करें।'),j.key||':reply'); end if;
  elsif ct.state->>'step'='urgency' then
   note:=case upper(txt) when '1' then 'emergency' when '2' then 'urgent' when '3' then 'routine' else null end;
   if note is null then perform careos.say(ct.phone,'Reply 1, 2 or 3. / 1, 2 या 3 भेजें।',j.key||':reply');
   else
    draft:=ct.state||jsonb_build_object('step','confirm','urgency',note);
    update careos.contacts set state=draft where phone=ct.phone;
    perform careos.say(ct.phone,careos.translate(ct.phone,'Check your report: ','अपनी रिपोर्ट जाँचें: ')||(draft->>'description')||E'\nGPS: '||(draft->'location'->>'lat')||', '||(draft->'location'->>'lng')||E'\n'||note||E'\n'||careos.translate(ct.phone,'Send CONFIRM to submit or CANCEL to discard.','दर्ज करने के लिए CONFIRM, रद्द करने के लिए CANCEL भेजें।'),j.key||':reply','reply','[{"id":"confirm_report","title":"Submit / दर्ज करें"},{"id":"cancel_action","title":"Cancel / रद्द"}]');
   end if;
  elsif ct.state->>'step'='confirm' and (upper(txt)='CONFIRM' or txt='confirm_report') then
   if not ct.consent then raise exception 'Consent required'; end if;
   draft:=ct.state;
   route_id:=careos.route((draft->'location'->>'lat')::float8,(draft->'location'->>'lng')::float8);
   insert into careos.inbox(phone,ngo_id,text,language,lat,lng,urgency,media)
   values(ct.phone,route_id,draft->>'description',ct.language,(draft->'location'->>'lat')::float8,(draft->'location'->>'lng')::float8,draft->>'urgency',coalesce(draft->'media','[]')) returning * into i;
   case_id:=careos.open_case(i.id);
   update careos.contacts set state='{}' where phone=ct.phone;
   perform careos.say(ct.phone,i.tracking||E'\n'||case when route_id is null then careos.translate(ct.phone,'Report saved privately. No participating NGO covers this pin yet. Nobody has accepted it.','रिपोर्ट निजी रूप से सुरक्षित है। इस स्थान के लिए अभी कोई सहयोगी संस्था नहीं है। किसी ने स्वीकार नहीं किया है।') else careos.translate(ct.phone,'Report received and sent to an NGO for review. Not accepted yet.','रिपोर्ट प्राप्त हुई और संस्था को समीक्षा के लिए भेजी गई। अभी स्वीकार नहीं हुई है।') end||E'\nSTATUS '||i.tracking,j.key||':reply','received');
  else perform careos.say(ct.phone,careos.translate(ct.phone,'Please complete the current step, CANCEL, or send HELP.','वर्तमान चरण पूरा करें, CANCEL या HELP भेजें।'),j.key||':reply');
  end if;
 end if;
 update careos.jobs set state='done',completed_at=now(),payload='{}',error_code=null where id=j.id;
 return jsonb_build_object('ok',true);
end $$;

create function public.careos_claim_outbox(p_limit int default 10) returns table(id uuid,phone text,body text,notice text,buttons jsonb,lease uuid,last_inbound timestamptz,language text,attempts int)
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
begin
 -- An expired send lease is ambiguous: never automatically send the same notification twice.
 update careos.outbox o set state='uncertain',error_code='send_lease_expired' where o.state='sending' and o.lease_until<now();
 update careos.outbox o set state='blocked',error_code='opted_out' from careos.contacts c where o.phone=c.phone and not c.consent and o.notice not in ('reply','optout_ack') and o.state='pending';
 return query with claimed as (
 update careos.outbox o set state='sending',attempts=o.attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 where o.id in (select q.id from careos.outbox q where q.state='pending' and q.available_at<=now()
 and not exists(select 1 from careos.outbox earlier where earlier.phone=q.phone and earlier.sequence<q.sequence and earlier.state in ('pending','sending'))
 order by q.sequence for update skip locked limit least(greatest(p_limit,1),20)) returning o.*)
 select o.id,o.phone,o.body,o.notice,o.buttons,o.lease,c.last_inbound,c.language,o.attempts from claimed o join careos.contacts c on c.phone=o.phone;
end $$;
create function public.careos_finish_outbox(p_id uuid,p_lease uuid,p_state text,p_meta_id text default null,p_error text default null) returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare o careos.outbox; r careos.delivery_receipts;
begin
 if p_state not in ('sent','pending','failed','blocked','uncertain') then raise exception 'Invalid state'; end if;
 update careos.outbox set state=case when p_state='pending' and attempts>=5 then 'failed' else p_state end,
 meta_id=coalesce(p_meta_id,meta_id),error_code=left(p_error,60),available_at=now()+least(3600,power(2,attempts)::int*10)*interval '1 second',lease_until=null
 where id=p_id and lease=p_lease and state='sending' returning * into o;
 -- A receipt may arrive before the send response is committed. Reconcile it now.
 if o.meta_id is not null then
 select * into r from careos.delivery_receipts where meta_id=o.meta_id and phone=o.phone
 order by case status when 'read' then 4 when 'delivered' then 3 when 'failed' then 2 else 1 end desc,occurred_at desc limit 1;
 if found then update careos.outbox set state=r.status,status_at=r.occurred_at,error_code=r.error_code where id=o.id; end if;
 end if;
end $$;
create function public.careos_automations() returns void
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
declare i careos.inbox; f record; s record; n uuid; body text;
begin
 -- Retry unrouted reports after an NGO enables geographic coverage.
 for i in select * from careos.inbox where ngo_id is null and status='new' order by received_at limit 50 for update skip locked loop
 n:=careos.route(i.lat,i.lng);
 if n is not null then
 update careos.inbox set ngo_id=n where id=i.id; perform careos.open_case(i.id);
 perform careos.notify(i.id,'routed','Your report has been sent to a participating NGO for review.','रिपोर्ट एक सहयोगी संस्था को समीक्षा के लिए भेजी गई है।','routed:'||i.id);
 end if;
 end loop;
 for i in select * from careos.inbox where ngo_id is not null and status='new' and escalated_at is null and received_at<now()-interval '30 minutes' order by received_at limit 50 for update skip locked loop
 perform careos.staff_notice(i.ngo_id,i.tracking||': report still awaiting a decision. This is an escalation, not dispatch confirmation.','escalation:'||i.id);
 update careos.inbox set escalated_at=now() where id=i.id;
 end loop;
 for f in select af.*,b.tracking from public.animal_followups af join careos.inbox b on b.linked_case_id=af.case_id and b.ngo_id=af.ngo_id where af.status in ('upcoming','missed') and af.due_at<=now()+interval '2 hours' order by af.due_at limit 100 loop
 perform careos.staff_notice(f.ngo_id,f.tracking||E'\nFollow-up due: '||f.due_at||E'\nDONE '||f.tracking||' '||f.id,'reminder:'||f.id||':'||(now() at time zone 'Asia/Kolkata')::date);
 end loop;
 -- Daily summary from shared case state, never another NGO's data. Sent once per IST date.
 for s in select st.* from careos.staff st where careos.member_role(st.user_id,st.ngo_id) in ('owner','admin','lead','member') loop
 select 'StrayPaw daily digest: '||count(*) filter(where c.status not in ('closed','resolved'))||' active cases, '||count(*) filter(where b.status='new')||' awaiting acceptance. Reply MY or open NGO Work.' into body from careos.inbox b join public.cases c on c.id=b.linked_case_id where b.ngo_id=s.ngo_id;
 perform careos.say(s.phone,body,'digest:'||s.user_id||':'||(now() at time zone 'Asia/Kolkata')::date,'digest');
 end loop;
 -- Retention: remove abandoned evidence metadata and expired codes, redact old completed jobs.
 delete from careos.link_codes where expires_at<now();
 delete from careos.delivery_receipts where occurred_at<now()-interval '30 days';
 update careos.contacts set state='{}' where state<>'{}' and last_inbound<now()-interval '2 days';
end $$;

-- Inbox evidence bucket is private. No client storage SELECT policy is granted.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('careos-private','careos-private',false,16777216,array['image/jpeg','image/png','image/webp','audio/ogg','audio/mpeg','audio/mp4','audio/aac','audio/amr','video/mp4','application/pdf'])
on conflict(id) do nothing;
-- Defence against pre-existing permissive policies on storage.objects. Only the
-- server may download/upload this bucket, after the caller-specific media RPC.
create policy careos_private_server_only on storage.objects as restrictive
 for all to anon,authenticated using(bucket_id<>'careos-private') with check(bucket_id<>'careos-private');
do $$ begin
 if exists(select 1 from storage.buckets where id='careos-private' and public) then raise exception 'CareOS bucket must be private'; end if;
end $$;

create function public.careos_enrichment_context(p_phone text) returns jsonb
language sql stable security definer set search_path = pg_catalog, public, careos as $$
 select jsonb_build_object('consent',c.consent,'step',c.state->>'step','count',case when c.rate_start<now()-interval '1 minute' then 0 else c.rate_count end,'staff',exists(select 1 from careos.staff s where s.phone=c.phone)) from careos.contacts c where c.phone=p_phone;
$$;
create function public.careos_case_notes(p_case_id uuid) returns setof jsonb
language plpgsql stable security definer set search_path = pg_catalog, public, careos as $$
declare n uuid;
begin
 select ngo_id into n from public.ngo_members where user_id=auth.uid();
 if careos.member_role(auth.uid(),n) is null or careos.member_role(auth.uid(),n)='volunteer' or not exists(select 1 from public.cases where id=p_case_id and ngo_id=n) then raise exception 'Not authorized' using errcode='42501'; end if;
 return query select jsonb_build_object('action',a.action,'note',a.details->>'note','created_at',a.created_at) from careos.audit a where a.ngo_id=n and a.case_id=p_case_id order by a.created_at desc limit 30;
end $$;

-- Public API surfaces are explicit. No function retains default PUBLIC execute.
revoke all on all functions in schema careos from public, anon, authenticated;
revoke all on all tables in schema careos from public, anon, authenticated;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'careos_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 if f.proname in ('careos_staff_link_code','careos_staff_unlink','careos_configure_route','careos_health','careos_inbox_list','careos_inbox_act','careos_case_action','careos_notify_reporter','careos_media_path','careos_case_notes') then
 execute format('grant execute on function %s to authenticated',f.signature);
 else execute format('grant execute on function %s to service_role',f.signature); end if;
 end loop;
end $$;
notify pgrst, 'reload schema';
commit;
