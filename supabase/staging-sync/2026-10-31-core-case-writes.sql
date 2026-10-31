-- STAGING ONLY (project straypaw-staging, ucxfxiddufwqithtdtix). Never run on production.
--
-- Staging drift found 2026-10-31: production has ~75 public functions that
-- staging lacks. This file copies, verbatim from production
-- (pg_get_functiondef, toujthlzjmhmoyykmayx), only the three the case write
-- path needs, so case creation, follow-ups and StrayPaw AI confirmed writes
-- can be tested in staging. Every table and column they touch was checked to
-- exist in staging first. Grants match production: authenticated and
-- service_role only, never anon.

CREATE OR REPLACE FUNCTION public.create_case_with_location(p_city text, p_title text, p_description text DEFAULT NULL::text, p_dog_id uuid DEFAULT NULL::uuid, p_zone text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_severity case_severity DEFAULT 'normal'::case_severity, p_category case_category DEFAULT 'other'::case_category, p_tags text[] DEFAULT '{}'::text[], p_actor_id uuid DEFAULT NULL::uuid, p_actor_name text DEFAULT NULL::text, p_species text DEFAULT 'dog'::text, p_informer_contact text DEFAULT NULL::text, p_hospital text DEFAULT NULL::text, p_cost_estimate numeric DEFAULT NULL::numeric, p_cost_spent numeric DEFAULT NULL::numeric, p_h3_r8 text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$;

CREATE OR REPLACE FUNCTION public.add_case_followup(p_case_id uuid, p_dog_id uuid DEFAULT NULL::uuid, p_due_at date DEFAULT NULL::date, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_ngo uuid; v_dog uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null or p_due_at is null then raise exception 'Organisation access and a follow-up date are required'; end if;
  if not exists (select 1 from cases where id = p_case_id and ngo_id = v_ngo) then raise exception 'That case is not in your organisation'; end if;
  select coalesce(p_dog_id, dog_id) into v_dog from cases where id = p_case_id;
  if v_dog is not null and not exists (select 1 from dogs where id = v_dog and ngo_id = v_ngo) then raise exception 'That animal is not in your organisation'; end if;
  insert into animal_followups (ngo_id, dog_id, case_id, due_at, kind, note, created_by)
  values (v_ngo, v_dog, p_case_id, p_due_at, 'follow-up', nullif(btrim(p_note), ''), auth.uid()) returning id into v_id;
  update cases set follow_up_at = p_due_at, last_activity_at = now(), updated_at = now() where id = p_case_id and ngo_id = v_ngo;
  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, auth.uid(), nullif(auth.jwt() ->> 'email', ''), 'note',
          'Follow-up scheduled for ' || to_char(p_due_at, 'DD Mon YYYY') || case when nullif(btrim(p_note), '') is null then '' else E'\n' || btrim(p_note) end);
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.update_case_followup_status(p_followup_id uuid, p_status text, p_note text DEFAULT NULL::text, p_due_at date DEFAULT NULL::date)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ngo uuid;
  v_case uuid;
  v_status text;
begin
  select my_ngo() into v_ngo;
  v_status := lower(coalesce(p_status, ''));
  if v_ngo is null then raise exception 'Organisation access required'; end if;
  if v_status not in ('upcoming','done','missed','postponed','cancelled') then
    raise exception 'Invalid follow-up status';
  end if;

  select case_id into v_case
  from animal_followups
  where id = p_followup_id and ngo_id = v_ngo;
  if v_case is null then raise exception 'Follow-up not found in your organisation'; end if;

  update animal_followups
     set status = v_status,
         note = case when p_note is null then note else nullif(btrim(p_note), '') end,
         due_at = case when p_due_at is null then due_at else p_due_at::timestamptz end,
         completed_at = case when v_status = 'done' then coalesce(completed_at, now()) else null end,
         updated_at = now()
   where id = p_followup_id and ngo_id = v_ngo;

  update cases
     set follow_up_at = (
       select min(af.due_at)::date
       from animal_followups af
       where af.case_id = v_case and af.ngo_id = v_ngo
         and af.status in ('upcoming','postponed')
     ),
     last_activity_at = now(),
     updated_at = now()
   where id = v_case and ngo_id = v_ngo;

  insert into case_updates(case_id, actor_id, actor_name, type, note)
  values (
    v_case, auth.uid(), nullif(auth.jwt() ->> 'email',''), 'note',
    case v_status
      when 'done' then 'Follow-up completed'
      when 'missed' then 'Follow-up marked missed'
      when 'cancelled' then 'Follow-up cancelled'
      when 'postponed' then 'Follow-up postponed'
      else 'Follow-up reopened'
    end || case when nullif(btrim(p_note), '') is null then '' else E'\n' || btrim(p_note) end
  );
  return true;
end $function$;

REVOKE ALL ON FUNCTION public.create_case_with_location(text, text, text, uuid, text, double precision, double precision, case_severity, case_category, text[], uuid, text, text, text, text, numeric, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_case_followup(uuid, uuid, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_case_followup_status(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_case_with_location(text, text, text, uuid, text, double precision, double precision, case_severity, case_category, text[], uuid, text, text, text, text, numeric, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_case_followup(uuid, uuid, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_case_followup_status(uuid, text, text, date) TO authenticated, service_role;
