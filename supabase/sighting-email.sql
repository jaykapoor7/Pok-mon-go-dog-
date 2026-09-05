-- ════════════════════════════════════════════════════════════════
-- StrayPaw, optional reporter email (notify on approval + build a list).
--
-- Run ONCE in the Supabase SQL editor (idempotent). Lets a reporter leave an
-- email so we can email them when their sighting goes live. Stored on the
-- sighting; the approval route reads it and sends the "it's live" email.
-- Depends on auth-accounts.sql (report_sighting).
-- ════════════════════════════════════════════════════════════════

alter table sightings add column if not exists reporter_email text;

-- Redefine report_sighting with a trailing p_reporter_email param (drop the old
-- 10-arg overload first to avoid ambiguity).
drop function if exists report_sighting(text,float,float,text,text,text[],text,text,text,uuid);

create or replace function report_sighting(
  p_photo_url      text,
  p_lat            float,
  p_lng            float,
  p_zone           text,
  p_nickname       text default null,
  p_mood_tags      text[] default '{}',
  p_notes          text default null,
  p_reporter_name  text default null,
  p_owner_hash     text default null,
  p_user_id        uuid default null,
  p_reporter_email text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_trust    int;
  v_sighting uuid;
begin
  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status, user_id, reporter_email)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash,
          'pending', p_user_id,
          nullif(lower(btrim(coalesce(p_reporter_email,''))), ''))
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust);
end;
$$;

grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text,uuid,text)
  to anon, authenticated, service_role;
