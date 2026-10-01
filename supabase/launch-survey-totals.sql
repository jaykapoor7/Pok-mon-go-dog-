-- Exact organisation-scoped survey totals, independent of the detail page.
create or replace function public.survey_totals(p_survey_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from surveys where id=p_survey_id and ngo_id=public.my_ngo()) then raise exception 'Organisation access required'; end if;
 select jsonb_build_object('areas',(select count(*) from survey_areas where survey_id=p_survey_id),'responses',count(*),'animals',coalesce(sum(count),0),'covered',count(distinct area_id)) into result from survey_responses where survey_id=p_survey_id;
 return result;
end $$;
revoke all on function public.survey_totals(uuid) from public,anon;
grant execute on function public.survey_totals(uuid) to authenticated;

create or replace function public.survey_area_counts(p_survey_id uuid)
returns table(id uuid,survey_id uuid,name text,code text,target_count integer,status text,response_count bigint,animal_count bigint)
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from surveys s where s.id=p_survey_id and s.ngo_id=public.my_ngo()) then raise exception 'Organisation access required'; end if;
 return query select a.id,a.survey_id,a.name,a.code,a.target_count,a.status::text,count(r.id),coalesce(sum(r.count),0)::bigint
 from survey_areas a left join survey_responses r on r.area_id=a.id
 where a.survey_id=p_survey_id group by a.id order by a.created_at limit 1000;
end $$;
revoke all on function public.survey_area_counts(uuid) from public,anon;
grant execute on function public.survey_area_counts(uuid) to authenticated;
