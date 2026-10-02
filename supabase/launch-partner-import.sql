-- Apply one reviewed workbook row atomically. Only the server's service role
-- can invoke this function; membership and batch ownership are checked again.
create or replace function public.import_partner_row(
 p_ngo_id uuid, p_actor_id uuid, p_actor_name text, p_batch_id uuid,
 p_source_row_number integer, p_raw jsonb, p_record jsonb, p_decision text,
 p_matched_dog_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_dog uuid; v_case uuid; v_city text; v_demo boolean := false;
 v_lat double precision; v_lng double precision; v_h3 text;
 v_date timestamptz; v_review timestamptz; v_category public.case_category;
begin
 if not exists(select 1 from public.ngo_members where ngo_id=p_ngo_id and user_id=p_actor_id)
 or not exists(select 1 from public.import_batches where id=p_batch_id and ngo_id=p_ngo_id)
 then raise exception 'Organisation import access required'; end if;
 if p_decision not in ('new','merge') or p_record->>'species' is distinct from 'dog'
 then raise exception 'Choose an explicit dog identity decision'; end if;
 v_lat := (p_record->>'latitude')::double precision; v_lng := (p_record->>'longitude')::double precision;
 if (v_lat is null) <> (v_lng is null) or (v_lat is not null and (v_lat not between -90 and 90 or v_lng not between -180 and 180))
 then raise exception 'Provide valid coordinates together'; end if;
 v_h3 := nullif(p_record->>'h3_r8','');
 if v_h3 is not null and (v_lat is null or v_h3 !~ '^88[0-9a-f]{13}$') then raise exception 'Invalid location cell'; end if;
 v_city := nullif(btrim(p_record->>'city'),'');
 v_date := coalesce((p_record->>'recorded_at')::timestamptz,now());
 v_review := (p_record->>'review_at')::timestamptz;
 v_category := (p_record->>'category')::public.case_category;
 if p_decision='merge' then
  select id,coalesce(v_city,nullif(city,'')),coalesce(is_demo,false) into v_dog,v_city,v_demo
  from public.dogs where id=p_matched_dog_id and ngo_id=p_ngo_id and species='dog' for update;
  if v_dog is null then raise exception 'Choose a dog in your organisation'; end if;
 else
  if v_city is null then raise exception 'Map a City column or provide coordinates in a known city'; end if;
  if nullif(p_record->>'animalCode','') is null and (nullif(p_record->>'name','') is null or nullif(p_record->>'location','') is null or (nullif(p_record->>'sex','') is null and nullif(p_record->>'colour','') is null))
  then raise exception 'This row needs identity review'; end if;
  insert into public.dogs(ngo_id,name,code,species,zone,city,lat,lng,h3_r8,status,color,created_by_id,created_by_name,sex,provenance,source_metadata)
  values(p_ngo_id,nullif(p_record->>'name',''),nullif(p_record->>'animalCode',''),'dog',coalesce(p_record->>'location',''),v_city,coalesce(v_lat,0),coalesce(v_lng,0),v_h3,'seen',coalesce(nullif(p_record->>'colour',''),'Unknown'),p_actor_id,p_actor_name,nullif(p_record->>'sex',''),'imported_historical_record',jsonb_build_object('import_batch_id',p_batch_id,'source_row',p_source_row_number,'source_sheet',p_record->>'source_sheet'))
  returning id into v_dog;
 end if;
 insert into public.cases(dog_id,ngo_id,title,description,zone,city,lat,lng,h3_r8,category,species,status,condition_text,follow_up_at,provenance,verification_state,created_at,last_activity_at,is_demo)
 values(v_dog,p_ngo_id,concat_ws(' · ',coalesce(nullif(p_record->>'condition',''),'Imported care record'),nullif(p_record->>'location','')),nullif(concat_ws(E'\n',nullif(p_record->>'caseDetail',''),nullif(p_record->>'detailedStatus','')),''),nullif(p_record->>'location',''),v_city,v_lat,v_lng,v_h3,v_category,'dog',case when coalesce(p_record->>'status','') ~* 'closed|completed|released|recovered' then 'closed'::public.case_status else 'in_progress'::public.case_status end,nullif(p_record->>'condition',''),v_review::date,'imported_historical_record','needs_review',v_date,now(),v_demo)
 returning id into v_case;
 if v_review is not null then
  insert into public.animal_followups(ngo_id,dog_id,case_id,due_at,kind,note,created_by)
  values(p_ngo_id,v_dog,v_case,v_review,'imported review','Imported from historical workbook. Confirm date before acting.',p_actor_id);
 end if;
 insert into public.animal_timeline_events(ngo_id,dog_id,case_id,event_type,title,details,occurred_at,actor_id,provenance,source_ref)
 values(p_ngo_id,v_dog,v_case,'imported_record','Historical record imported',nullif(concat_ws(' · ',nullif(p_record->>'condition',''),nullif(p_record->>'detailedStatus','')),''),v_date,p_actor_id,'imported_historical_record',jsonb_build_object('import_batch_id',p_batch_id,'source_row',p_source_row_number,'source_sheet',p_record->>'source_sheet'));
 insert into public.import_rows(batch_id,source_row_number,raw_row,normalized,decision,matched_dog_id,imported_dog_id,imported_case_id)
 values(p_batch_id,p_source_row_number,p_raw,p_record,p_decision,p_matched_dog_id,v_dog,v_case);
 return jsonb_build_object('dog_id',v_dog,'case_id',v_case);
end $$;
revoke all on function public.import_partner_row(uuid,uuid,text,uuid,integer,jsonb,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.import_partner_row(uuid,uuid,text,uuid,integer,jsonb,jsonb,text,uuid) to service_role;

