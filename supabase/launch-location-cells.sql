-- Additive location-aware intake; prior RPCs remain compatible.
-- Additive wrappers preserve the existing membership/ownership checks and
-- write city + record in one transaction. A city is not an invented map pin.
create or replace function public.create_animal_with_location(
 p_city text, p_name text default null, p_species text default 'dog', p_code text default null,
 p_zone text default null, p_lat double precision default null, p_lng double precision default null,
 p_cover_photo text default null, p_intake_notes text default null, p_h3_r8 text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null or public.my_ngo() is null then raise exception 'Organisation access required'; end if;
 if nullif(btrim(p_city),'') is null then raise exception 'Choose the city for this dog'; end if;
 if p_species is distinct from 'dog' then raise exception 'StrayPaw records dogs only'; end if;
 if (p_lat is null) <> (p_lng is null) then raise exception 'Provide both latitude and longitude'; end if;
 if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then raise exception 'Invalid coordinates'; end if;
 if p_h3_r8 is not null and (p_lat is null or p_h3_r8 !~ '^88[0-9a-f]{13}$') then raise exception 'Invalid location cell'; end if;
 v_id := public.create_animal(p_name,p_species,p_code,p_zone,p_lat,p_lng,p_cover_photo,p_intake_notes);
 update public.dogs set h3_r8=p_h3_r8, city=coalesce(nullif(city,''),btrim(p_city)) where id=v_id;
 return v_id;
end $$;
revoke all on function public.create_animal_with_location(text,text,text,text,text,double precision,double precision,text,text,text) from public,anon;
grant execute on function public.create_animal_with_location(text,text,text,text,text,double precision,double precision,text,text,text) to authenticated;

create or replace function public.create_case_with_location(
 p_city text, p_title text, p_description text default null, p_dog_id uuid default null,
 p_zone text default null, p_lat double precision default null, p_lng double precision default null,
 p_severity public.case_severity default 'normal', p_category public.case_category default 'other',
 p_tags text[] default '{}', p_actor_id uuid default null, p_actor_name text default null,
 p_species text default 'dog', p_informer_contact text default null, p_hospital text default null,
 p_cost_estimate numeric default null, p_cost_spent numeric default null, p_h3_r8 text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_city text;
begin
 if auth.uid() is null or public.my_ngo() is null then raise exception 'Organisation access required'; end if;
 if p_species is distinct from 'dog' then raise exception 'StrayPaw records dogs only'; end if;
 if (p_lat is null) <> (p_lng is null) then raise exception 'Provide both latitude and longitude'; end if;
 if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then raise exception 'Invalid coordinates'; end if;
 if p_h3_r8 is not null and (p_lat is null or p_h3_r8 !~ '^88[0-9a-f]{13}$') then raise exception 'Invalid location cell'; end if;
 if (p_lat is null) <> (p_lng is null) then raise exception 'Provide both latitude and longitude'; end if;
 if p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180) then raise exception 'Invalid coordinates'; end if;
 select coalesce(nullif(btrim(p_city),''),city) into v_city from public.dogs where id=p_dog_id;
 v_city := coalesce(v_city,nullif(btrim(p_city),''));
 if v_city is null then raise exception 'Choose the city for this incident'; end if;
 v_id := public.create_case(p_title,p_description,p_dog_id,p_zone,p_lat,p_lng,p_severity,p_category,p_tags,p_actor_id,p_actor_name,p_species,p_informer_contact,p_hospital,p_cost_estimate,p_cost_spent);
 update public.cases set h3_r8=p_h3_r8, city=coalesce(nullif(city,''),v_city),
   is_demo=coalesce((select is_demo from public.dogs where id=p_dog_id),is_demo)
 where id=v_id;
 return v_id;
end $$;
revoke all on function public.create_case_with_location(text,text,text,uuid,text,double precision,double precision,public.case_severity,public.case_category,text[],uuid,text,text,text,text,numeric,numeric,text) from public,anon;
grant execute on function public.create_case_with_location(text,text,text,uuid,text,double precision,double precision,public.case_severity,public.case_category,text[],uuid,text,text,text,text,numeric,numeric,text) to authenticated;
