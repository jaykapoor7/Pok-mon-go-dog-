-- Staging-only schema parity with existing production surveys. No customer data copied.
create table public.surveys (id uuid default gen_random_uuid() not null,ngo_id uuid,title text not null,species text default 'dog'::text not null,description text,status text default 'active'::text not null,created_by_id uuid,created_at timestamp with time zone default now() not null,is_demo boolean default false not null);
create table public.survey_areas (id uuid default gen_random_uuid() not null,survey_id uuid not null,name text not null,code text,target_count integer,status text default 'pending'::text not null,created_at timestamp with time zone default now() not null);
create table public.survey_responses (id uuid default gen_random_uuid() not null,survey_id uuid not null,area_id uuid,lat double precision,lng double precision,photo_url text,species text,count integer default 1 not null,attributes jsonb default '{}'::jsonb not null,notes text,recorded_by uuid,created_at timestamp with time zone default now() not null);
alter table public.surveys add constraint surveys_pkey PRIMARY KEY (id);
alter table public.surveys add constraint surveys_species_dog_only CHECK ((NOT (species IS DISTINCT FROM 'dog'::text)));
alter table public.survey_areas add constraint survey_areas_pkey PRIMARY KEY (id);
alter table public.survey_areas add constraint survey_areas_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE;
alter table public.survey_responses add constraint survey_responses_area_id_fkey FOREIGN KEY (area_id) REFERENCES survey_areas(id) ON DELETE SET NULL;
alter table public.survey_responses add constraint survey_responses_pkey PRIMARY KEY (id);
alter table public.survey_responses add constraint survey_responses_species_dog_only CHECK ((NOT (species IS DISTINCT FROM 'dog'::text)));
alter table public.survey_responses add constraint survey_responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE;
alter table public.surveys enable row level security;revoke all on public.surveys from public,anon,authenticated;grant select on public.surveys to authenticated;
alter table public.survey_areas enable row level security;revoke all on public.survey_areas from public,anon,authenticated;grant select on public.survey_areas to authenticated;
alter table public.survey_responses enable row level security;revoke all on public.survey_responses from public,anon,authenticated;grant select on public.survey_responses to authenticated;
create policy survey_areas_org_read on public.survey_areas for select to authenticated using ((EXISTS ( SELECT 1
   FROM surveys s
  WHERE ((s.id = survey_areas.survey_id) AND (s.ngo_id = my_ngo())))));
create policy survey_responses_org_read on public.survey_responses for select to authenticated using ((EXISTS ( SELECT 1
   FROM surveys s
  WHERE ((s.id = survey_responses.survey_id) AND (s.ngo_id = my_ngo())))));
create policy surveys_org_read on public.surveys for select to authenticated using ((ngo_id = my_ngo()));
CREATE OR REPLACE FUNCTION public.add_survey_area(p_survey_id uuid, p_name text, p_code text DEFAULT NULL::text, p_target integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  if not exists (select 1 from surveys where id = p_survey_id and ngo_id = my_ngo()) then
    raise exception 'Not your survey';
  end if;
  insert into survey_areas (survey_id, name, code, target_count)
  values (p_survey_id, p_name, p_code, p_target)
  returning id into v_id;
  return v_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.create_survey(p_title text, p_species text DEFAULT 'dog'::text, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Not a partner organization'; end if;
  insert into surveys (ngo_id, title, species, description, created_by_id)
  values (v_ngo, p_title, coalesce(p_species,'dog'), p_description, auth.uid())
  returning id into v_id;
  return v_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.submit_survey_response(p_survey_id uuid, p_area_id uuid DEFAULT NULL::uuid, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_photo_url text DEFAULT NULL::text, p_species text DEFAULT NULL::text, p_count integer DEFAULT 1, p_attributes jsonb DEFAULT '{}'::jsonb, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id uuid;
begin
  if my_ngo() is null or not exists (select 1 from surveys where id = p_survey_id and ngo_id = my_ngo()) then
    raise exception 'Not your survey';
  end if;
  if p_area_id is not null and not exists (select 1 from survey_areas where id = p_area_id and survey_id = p_survey_id) then
    raise exception 'Area does not belong to this survey';
  end if;
  insert into survey_responses (survey_id, area_id, lat, lng, photo_url, species, count, attributes, notes, recorded_by)
  values (p_survey_id, p_area_id, p_lat, p_lng, p_photo_url, p_species,
          greatest(1, coalesce(p_count, 1)), coalesce(p_attributes, '{}'::jsonb), p_notes, auth.uid())
  returning id into v_id;
  return v_id;
end $function$
;
CREATE OR REPLACE FUNCTION public.survey_area_counts(p_survey_id uuid)
 RETURNS TABLE(id uuid, survey_id uuid, name text, code text, target_count integer, status text, response_count bigint, animal_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from surveys s where s.id=p_survey_id and s.ngo_id=public.my_ngo()) then raise exception 'Organisation access required'; end if;
 return query select a.id,a.survey_id,a.name,a.code,a.target_count,a.status::text,count(r.id),coalesce(sum(r.count),0)::bigint
 from survey_areas a left join survey_responses r on r.area_id=a.id
 where a.survey_id=p_survey_id group by a.id order by a.created_at limit 1000;
end $function$
;
CREATE OR REPLACE FUNCTION public.survey_totals(p_survey_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from surveys where id=p_survey_id and ngo_id=public.my_ngo()) then raise exception 'Organisation access required'; end if;
 select jsonb_build_object('areas',(select count(*) from survey_areas where survey_id=p_survey_id),'responses',count(*),'animals',coalesce(sum(count),0),'covered',count(distinct area_id)) into result from survey_responses where survey_id=p_survey_id;
 return result;
end $function$
;
revoke all on function public.create_survey(text,text,text),public.add_survey_area(uuid,text,text,integer),public.submit_survey_response(uuid,uuid,double precision,double precision,text,text,integer,jsonb,text),public.survey_totals(uuid),public.survey_area_counts(uuid) from public,anon;grant execute on function public.create_survey(text,text,text),public.add_survey_area(uuid,text,text,integer),public.submit_survey_response(uuid,uuid,double precision,double precision,text,text,integer,jsonb,text),public.survey_totals(uuid),public.survey_area_counts(uuid) to authenticated;
