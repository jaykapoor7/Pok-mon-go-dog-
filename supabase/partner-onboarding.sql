-- ════════════════════════════════════════════════════════════════
-- StrayPaw — self-serve NGO partner onboarding + per-org attribution.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Depends on:
--   • location-privacy.sql  → ngo_members, is_ngo_member()
--   • case-proofing.sql     → claim_case (redefined below to stamp ngo_id)
--   • schema.sql            → ngos directory table
--
-- Flow: a signed-in user requests partner access → you approve it in /moderate
-- → they're inserted into ngo_members (linked to an ngos org row) and gain the
-- verified-partner tools. Cases they claim are stamped with their ngo_id so the
-- funder report can attribute impact per organisation (shared pool, per-org
-- credit — no data isolation).
-- ════════════════════════════════════════════════════════════════

-- 1. Partner access requests.
create table if not exists partner_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  org_name   text not null,
  area       text,
  contact    text,
  message    text,
  status     text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now()
);
create index if not exists partner_requests_status_idx on partner_requests (status, created_at desc);

alter table partner_requests enable row level security;
-- A user may read their own request(s); no public insert (RPC only); service
-- role reads all for the moderation panel.
drop policy if exists partner_requests_own_read on partner_requests;
create policy partner_requests_own_read on partner_requests
  for select using (user_id = auth.uid());

-- 2. Submit / re-submit a request (one open request per user).
create or replace function request_partner_access(
  p_org_name text,
  p_area     text default null,
  p_contact  text default null,
  p_message  text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if is_ngo_member() then raise exception 'You already have partner access.'; end if;
  if coalesce(btrim(p_org_name), '') = '' then
    raise exception 'Organisation name is required.';
  end if;

  delete from partner_requests where user_id = auth.uid() and status = 'pending';
  insert into partner_requests (user_id, org_name, area, contact, message)
  values (auth.uid(), btrim(p_org_name),
          nullif(btrim(coalesce(p_area,'')), ''),
          nullif(btrim(coalesce(p_contact,'')), ''),
          nullif(btrim(coalesce(p_message,'')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- 3. My org id (for per-org attribution + funder-report auto-fill).
create or replace function my_ngo()
returns uuid language sql security definer set search_path = public stable as $$
  select ngo_id from ngo_members where user_id = auth.uid() limit 1;
$$;

-- 4. Approve / reject (service role → moderation panel).
create or replace function approve_partner_request(p_request_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r partner_requests; v_ngo uuid;
begin
  select * into r from partner_requests where id = p_request_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;

  -- Directory org row (also used for the funder-report header + verified badge).
  insert into ngos (name, area, verified) values (r.org_name, r.area, true)
  returning id into v_ngo;

  -- Grant membership (one org per user; re-approving moves them).
  insert into ngo_members (user_id, ngo_id) values (r.user_id, v_ngo)
  on conflict (user_id) do update set ngo_id = excluded.ngo_id;

  update partner_requests set status = 'approved' where id = p_request_id;
  return json_build_object('ok', true, 'ngo_id', v_ngo);
end;
$$;

create or replace function reject_partner_request(p_request_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update partner_requests set status = 'rejected' where id = p_request_id;
  return found;
end;
$$;

-- 5. claim_case now stamps the claimant's org id (per-org attribution).
create or replace function claim_case(p_case_id uuid, p_actor_id uuid, p_actor_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  if not is_ngo_member() then
    raise exception 'Only verified partner NGOs can claim cases.';
  end if;

  update cases set
    assignee_id      = p_actor_id,
    assignee_name    = p_actor_name,
    ngo_id           = coalesce((select ngo_id from ngo_members where user_id = auth.uid()), ngo_id),
    status           = case when status = 'unverified' then 'assigned' else status end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id and assignee_id is null
  returning * into c;

  if not found then return false; end if;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, 'claimed', c.status,
          p_actor_name || ' claimed this case');
  return true;
end;
$$;

-- 6. Backfill ngo_id on already-claimed cases from their assignee's membership.
update cases c
set ngo_id = m.ngo_id
from ngo_members m
where c.assignee_id = m.user_id and c.ngo_id is null and m.ngo_id is not null;

-- 7. Grants.
grant execute on function request_partner_access(text,text,text,text) to authenticated;
grant execute on function my_ngo() to authenticated;
grant execute on function approve_partner_request(uuid) to service_role;
grant execute on function reject_partner_request(uuid) to service_role;
grant execute on function claim_case(uuid,uuid,text) to anon, authenticated, service_role;
