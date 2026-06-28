-- ════════════════════════════════════════════════════════════════
-- StrayPaw — ear-notch (sterilisation mark).
--
-- Run ONCE in the Supabase SQL editor (idempotent). Adds the universal ABC
-- "ear-notch" marker so a sterilised dog is recognisable on sight and isn't
-- re-caught (best practice from ABC/CNVR sterilisation programmes).
-- Values: 'left' | 'right' | 'both' | null.
-- ════════════════════════════════════════════════════════════════

alter table dogs add column if not exists ear_notch text;

-- Extend update_dog_status with the ear-notch field (signature change, so drop
-- the old overload first). Contributor gating is unchanged.
drop function if exists update_dog_status(uuid, dog_status, boolean, boolean, boolean, boolean);

create or replace function update_dog_status(
  p_dog_id      uuid,
  p_status      dog_status,
  p_needs_help  boolean,
  p_vaccinated  boolean,
  p_sterilised  boolean,
  p_is_friendly boolean,
  p_ear_notch   text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;

  if not exists (
    select 1 from sightings where dog_id = p_dog_id and user_id = auth.uid()
  ) then
    return false;
  end if;

  update dogs set
    status      = coalesce(p_status, status),
    needs_help  = coalesce(p_needs_help, needs_help),
    vaccinated  = coalesce(p_vaccinated, vaccinated),
    sterilised  = coalesce(p_sterilised, sterilised),
    is_friendly = coalesce(p_is_friendly, is_friendly),
    -- empty string clears the notch; null leaves it unchanged.
    ear_notch   = case when p_ear_notch is null then ear_notch
                       when p_ear_notch = '' then null
                       else p_ear_notch end
  where id = p_dog_id;
  return found;
end;
$$;

grant execute on function update_dog_status(uuid,dog_status,boolean,boolean,boolean,boolean,text)
  to authenticated;
