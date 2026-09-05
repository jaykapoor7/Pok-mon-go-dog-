-- ════════════════════════════════════════════════════════════════
-- Campaign detail layer, make a fundraiser credible enough that a funder
-- believes it: a use-of-funds budget, an updates feed, and an outcome.
--
-- Depends on: fundraisers.sql (fundraisers table, created_by_id ownership).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

-- 1. Budget (use of funds) + outcome on the campaign itself.
alter table fundraisers add column if not exists budget  jsonb default '[]'::jsonb;
alter table fundraisers add column if not exists outcome text;

-- 2. Campaign updates, the running story supporters follow.
create table if not exists fundraiser_updates (
  id            uuid primary key default gen_random_uuid(),
  fundraiser_id uuid not null references fundraisers(id) on delete cascade,
  body          text not null,
  photo_url     text,
  created_by_id uuid,
  created_at    timestamptz default now()
);
create index if not exists fundraiser_updates_fid_idx
  on fundraiser_updates (fundraiser_id, created_at desc);

alter table fundraiser_updates enable row level security;
drop policy if exists fundraiser_updates_read on fundraiser_updates;
create policy fundraiser_updates_read on fundraiser_updates for select using (true);

-- 3. Owner-only writes (a member of the org that owns the campaign).
create or replace function add_fundraiser_update(
  p_fundraiser_id uuid,
  p_body          text,
  p_photo_url     text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from fundraisers
    where id = p_fundraiser_id and created_by_id = auth.uid()
  ) then
    raise exception 'Not your campaign';
  end if;

  insert into fundraiser_updates (fundraiser_id, body, photo_url, created_by_id)
  values (p_fundraiser_id, p_body, p_photo_url, auth.uid())
  returning id into v_id;

  -- Bump the campaign so it surfaces as recently active.
  update fundraisers set updated_at = now() where id = p_fundraiser_id;
  return v_id;
end $$;

-- 4. Set the budget lines + outcome (owner only).
create or replace function set_fundraiser_details(
  p_id      uuid,
  p_budget  jsonb default null,
  p_outcome text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update fundraisers set
    budget  = coalesce(p_budget, budget),
    outcome = coalesce(p_outcome, outcome)
  where id = p_id and created_by_id = auth.uid();
  return found;
end $$;

grant execute on function add_fundraiser_update(uuid,text,text) to authenticated;
grant execute on function set_fundraiser_details(uuid,jsonb,text) to authenticated;
