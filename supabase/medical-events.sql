-- ════════════════════════════════════════════════════════════════
-- Structured medical + owner records (DDS working-animal needs).
-- A medical_events log per animal/case: vaccination, deworming,
-- sterilisation, wound care, treatment, rescue, rehabilitation, check-up.
-- Plus owner/community info on the animal record.
-- Depends on: schema.sql (dogs), animals.sql, cases.sql, partner-onboarding.
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

-- Owner / community info on the animal (working animals often have owners).
alter table dogs add column if not exists owner_name    text;
alter table dogs add column if not exists owner_contact text;

create table if not exists medical_events (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid references dogs(id) on delete cascade,
  case_id      uuid references cases(id) on delete set null,
  kind         text not null,   -- vaccination | deworming | sterilisation | wound | treatment | rescue | rehabilitation | checkup
  event_date   date not null default current_date,
  notes        text,
  performed_by text,
  created_by_id uuid,
  created_at   timestamptz not null default now()
);
create index if not exists medical_events_dog_idx  on medical_events (dog_id, event_date desc);
create index if not exists medical_events_case_idx on medical_events (case_id);

alter table medical_events enable row level security;
drop policy if exists medical_events_read on medical_events;
create policy medical_events_read on medical_events for select using (true);

-- Log a medical event, a verified NGO member or the case's handler.
create or replace function add_medical_event(
  p_dog_id uuid, p_case_id uuid default null, p_kind text default 'treatment',
  p_event_date date default current_date, p_notes text default null, p_performed_by text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_ngo_member() then raise exception 'Only partner NGOs can log medical events'; end if;
  insert into medical_events (dog_id, case_id, kind, event_date, notes, performed_by, created_by_id)
  values (p_dog_id, p_case_id, coalesce(p_kind,'treatment'), coalesce(p_event_date, current_date), p_notes, p_performed_by, auth.uid())
  returning id into v_id;

  -- Reflect key events on the animal's summary flags.
  if p_dog_id is not null then
    if p_kind = 'vaccination'   then update dogs set vaccinated = true where id = p_dog_id; end if;
    if p_kind = 'sterilisation' then update dogs set sterilised = true where id = p_dog_id; end if;
    update dogs set last_seen = now() where id = p_dog_id;
  end if;
  return v_id;
end $$;

grant execute on function add_medical_event(uuid,uuid,text,date,text,text) to authenticated;

-- Set owner/community info on an animal your org owns.
create or replace function set_animal_owner(p_dog_id uuid, p_owner_name text, p_owner_contact text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update dogs set owner_name = p_owner_name, owner_contact = p_owner_contact
   where id = p_dog_id and ngo_id = my_ngo();
  return found;
end $$;
grant execute on function set_animal_owner(uuid,text,text) to authenticated;
