-- ════════════════════════════════════════════════════════════════
-- StrayPaw — "Can you help?" volunteer + NGO sign-ups.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Stores people who offer to
-- help a dog or volunteer, and NGOs registering interest. Submissions are
-- write-only for the public (insert via the RPC); only the service role / your
-- own dashboard reads them.
-- ════════════════════════════════════════════════════════════════

create table if not exists helpers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null,           -- phone or email
  message    text,
  is_ngo     boolean not null default false,
  ngo_name   text,
  dog_id     uuid,                     -- set when offering to help a specific dog
  zone       text,
  created_at timestamptz not null default now()
);
create index if not exists helpers_created_idx on helpers (created_at desc);

alter table helpers enable row level security;
-- No public SELECT. (Service role bypasses RLS for your own review/export.)

-- Public submit through a SECURITY DEFINER function (so direct table writes can
-- stay locked down).
create or replace function submit_helper(
  p_name     text,
  p_contact  text,
  p_message  text default null,
  p_is_ngo   boolean default false,
  p_ngo_name text default null,
  p_dog_id   uuid default null,
  p_zone     text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_contact), '') = '' then
    raise exception 'name and contact are required';
  end if;
  insert into helpers (name, contact, message, is_ngo, ngo_name, dog_id, zone)
  values (btrim(p_name), btrim(p_contact), nullif(btrim(coalesce(p_message,'')), ''),
          coalesce(p_is_ngo, false), nullif(btrim(coalesce(p_ngo_name,'')), ''),
          p_dog_id, nullif(btrim(coalesce(p_zone,'')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function submit_helper(text,text,text,boolean,text,uuid,text)
  to anon, authenticated, service_role;
