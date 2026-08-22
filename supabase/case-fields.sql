-- ════════════════════════════════════════════════════════════════
-- Case fields for real field operations (DDS): species at creation,
-- structured medical notes, and case-level photos.
-- Depends on: cases.sql, platform-foundation.sql (species column).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

alter table cases add column if not exists medical_notes text;
alter table cases add column if not exists photos        text[] not null default '{}';

-- Recreate create_case with a trailing species param (drop the old signature
-- so PostgREST resolves the new one unambiguously).
drop function if exists create_case(text,text,uuid,text,float,float,case_severity,case_category,text[],uuid,text);

create or replace function create_case(
  p_title       text,
  p_description text default null,
  p_dog_id      uuid default null,
  p_zone        text default null,
  p_lat         float default null,
  p_lng         float default null,
  p_severity    case_severity default 'normal',
  p_category    case_category default 'other',
  p_tags        text[] default '{}',
  p_actor_id    uuid default null,
  p_actor_name  text default null,
  p_species     text default 'dog'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into cases (dog_id, title, description, zone, lat, lng, severity,
                     category, tags, species, status, created_by_id, created_by_name)
  values (p_dog_id, p_title, p_description, p_zone, p_lat, p_lng, p_severity,
          p_category, p_tags, coalesce(p_species, 'dog'), 'unverified',
          p_actor_id, p_actor_name)
  returning id into v_id;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (v_id, p_actor_id, p_actor_name, 'created', 'unverified', 'Case opened');
  return v_id;
end;
$$;

-- Medical notes — case handler or verified NGO member.
create or replace function set_case_medical(p_case_id uuid, p_medical_notes text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update cases set medical_notes = p_medical_notes, last_activity_at = now()
   where id = p_case_id and (assignee_id = auth.uid() or is_ngo_member());
  return found;
end $$;

-- Append a photo to a case — handler or verified NGO member.
create or replace function add_case_photo(p_case_id uuid, p_url text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update cases set photos = array_append(photos, p_url), last_activity_at = now()
   where id = p_case_id and (assignee_id = auth.uid() or is_ngo_member());
  return found;
end $$;

grant execute on function create_case(text,text,uuid,text,float,float,case_severity,case_category,text[],uuid,text,text) to anon, authenticated, service_role;
grant execute on function set_case_medical(uuid,text) to authenticated;
grant execute on function add_case_photo(uuid,text) to authenticated;
