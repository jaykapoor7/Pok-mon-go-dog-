-- PREVIEW ONLY. Requires demo-mode.sql and a dedicated NGO already created.
-- This data is stamped is_demo and hidden from public feeds/maps by RLS.
do $$ declare n uuid := '__DEMO_NGO_ID__'::uuid; d uuid; begin
  if not exists (select 1 from ngos where id=n and demo_mode) then raise exception 'Demo NGO must exist with demo_mode=true'; end if;
  delete from cases where ngo_id=n and is_demo; delete from dogs where ngo_id=n and is_demo;
  -- 48 animals: enough density for a credible PAWS campaign, not fake production data.
  insert into dogs (ngo_id,name,zone,city,lat,lng,status,color,sterilisation_status,vaccination_status,needs_help,cover_photo,last_seen,is_demo)
  select n, (array['Muthu','Kaveri','Sundari','Chai','Raja','Malli'])[1+(g%6)],
    (array['Kotturpuram','Adyar','Thiruvanmiyur','Besant Nagar'])[1+(g%4)], 'Chennai',
    13.00+(g%12)*.004, 80.23+(g%10)*.004, 'seen', (array['Brindle','Tan','Black and white','Cream'])[1+(g%4)],
    case when g<=28 then 'sterilised' when g<=39 then 'not_sterilised' else 'unknown' end,
    case when g<=34 then 'vaccinated' when g<=41 then 'not_vaccinated' else 'unknown' end,
    g in (1,7,19,31), '/seed-dogs/dog'||(1+(g%9))||'.jpg', now()-(g||' hours')::interval, true
  from generate_series(1,48) g;
  select id into d from dogs where ngo_id=n and is_demo order by created_at limit 1;
  insert into cases (ngo_id,dog_id,title,zone,lat,lng,severity,category,status,description,due_at,is_demo)
  values (n,d,'Limping near canal crossing','Kotturpuram',13.018,80.242,'high','injury','in_progress','Field team requested a welfare check before the evening round.',now()+interval '1 day',true);
  insert into cases (ngo_id,dog_id,title,zone,lat,lng,severity,category,status,description,due_at,is_demo)
  select n,id, 'ABC follow-up · '||coalesce(name,'Street dog'), zone, lat,lng,
    case when row_number() over ()<=4 then 'high' else 'normal' end, 'sterilisation',
    case when row_number() over ()<=6 then 'in_progress' when row_number() over ()<=12 then 'assigned' else 'resolved' end,
    'Preview case for PAWS Chennai launch footage.', now()+((row_number() over ())||' days')::interval, true
  from (select * from dogs where ngo_id=n and is_demo order by created_at limit 18) q;
  insert into campaigns (ngo_id,name,kind,starts_on,ends_on,zone,notes) values (n,'Adyar ABC & ARV round','sterilisation',current_date-3,current_date+4,'Adyar','Preview campaign for launch footage') on conflict do nothing;
end $$;
