-- Preserve captionless attachments and revalidate queued staff access.
-- A successful send API response alone is not evidence of message delivery.
begin;
alter table careos.outbox add column audience_user_id uuid;
alter table careos.outbox add column audience_ngo_id uuid;
alter table careos.outbox add column audience_case_id uuid;
create or replace function careos.say(p_phone text,p_body text,p_key text,p_notice text default 'reply',p_buttons jsonb default '[]') returns void
language sql security definer set search_path=pg_catalog,public,careos as $$
 insert into careos.outbox(phone,body,key,notice,buttons,audience_user_id,audience_ngo_id,audience_case_id)
 select p_phone,left(p_body,4000),p_key,p_notice,p_buttons,s.user_id,s.ngo_id,i.linked_case_id
 from (select 1) seed
 left join careos.staff s on s.phone=p_phone
 left join careos.inbox i on i.tracking=substring(p_body from '(SP-[A-F0-9]{12})') and i.ngo_id=s.ngo_id
 on conflict(key) do nothing;
$$;
create or replace function public.careos_process_job(p_id uuid,p_lease uuid,p_enriched jsonb default '{}') returns jsonb
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
   -- Keep attachments while asking for words; a photo without a caption must
   -- survive the next text message and the final confirmation.
   draft:=ct.state;
   if m ? 'media' and jsonb_array_length(coalesce(draft->'media','[]'))<5 then
    draft:=jsonb_set(draft,'{media}',coalesce(draft->'media','[]')||jsonb_build_array(m->'media'));
    update careos.contacts set state=draft where phone=ct.phone;
   end if;
   if length(txt)<5 and coalesce(length(m->'extraction'->>'description'),0)<5 then
    perform careos.say(ct.phone,careos.translate(ct.phone,'Please add a short description. If voice transcription is unavailable, type a few words.','छोटा विवरण भेजें। वॉइस उपलब्ध न हो तो कुछ शब्द टाइप करें।'),j.key||':reply');
   else
    draft:=jsonb_build_object('step','location','description',left(coalesce(nullif(m->'extraction'->>'description',''),txt),3000),'media',coalesce(draft->'media','[]'));
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

create or replace function public.careos_claim_outbox(p_limit int default 10) returns table(id uuid,phone text,body text,notice text,buttons jsonb,lease uuid,last_inbound timestamptz,language text,attempts int)
language plpgsql security definer set search_path = pg_catalog, public, careos as $$
begin
 -- Check staff identity/role again when a queued message is claimed. A link
 -- revoked after VIEW was queued must not receive its private report or pin.
 update careos.outbox o set state='blocked',error_code='staff_access_revoked'
 where o.state='pending' and o.audience_user_id is not null and (
  not exists(select 1 from careos.staff s where s.phone=o.phone and s.user_id=o.audience_user_id and s.ngo_id=o.audience_ngo_id)
  or careos.member_role(o.audience_user_id,o.audience_ngo_id) is null
  or (careos.member_role(o.audience_user_id,o.audience_ngo_id)='volunteer' and o.audience_case_id is not null
      and not exists(select 1 from public.cases c where c.id=o.audience_case_id and c.ngo_id=o.audience_ngo_id and c.assignee_id=o.audience_user_id))
 );
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
create or replace function public.careos_health() returns jsonb
language sql stable security definer set search_path=pg_catalog,public,careos as $$
 select jsonb_build_object(
 'connected',exists(select 1 from careos.routes r where r.ngo_id=m.ngo_id and r.enabled)
   and exists(select 1 from careos.inbox i join careos.outbox o on o.phone=i.phone where i.ngo_id=m.ngo_id and o.meta_id is not null and o.state in ('delivered','read')),
 'number_verified',exists(select 1 from careos.inbox i join careos.outbox o on o.phone=i.phone where i.ngo_id=m.ngo_id and o.meta_id is not null and o.state in ('delivered','read')))
 from public.ngo_members m where m.user_id=auth.uid() and careos.member_role(m.user_id,m.ngo_id) is not null;
$$;
notify pgrst,'reload schema';
commit;
