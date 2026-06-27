-- ════════════════════════════════════════════════════════════════
-- StrayPaw — case proofing & verification.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Depends on:
--   • location-privacy.sql  → is_ngo_member()
--   • colonies-and-proof.sql → cases.before_url/after_url/outcome_note + 9-arg
--     update_case_status
--
-- What this enforces:
--   1. Only VERIFIED partner NGOs (ngo_members) can claim or change a case.
--   2. Resolving a case REQUIRES an after photo + outcome note (proof).
--   3. A fresh resolution is "pending verification" until a StrayPaw admin
--      signs it off (verify_case). Reopening clears verification.
-- ════════════════════════════════════════════════════════════════

-- 1. Verification columns.
alter table cases add column if not exists proof_verified boolean not null default false;
alter table cases add column if not exists verified_at    timestamptz;
create index if not exists cases_verified_idx on cases (proof_verified);

-- 2. Claim — verified partner NGOs only.
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

-- 3. Status changes — NGO-only; proof required to resolve; resets verification.
drop function if exists update_case_status(uuid, case_status, uuid, text, case_resolution, text, text, text, text);

create or replace function update_case_status(
  p_case_id     uuid,
  p_to_status   case_status,
  p_actor_id    uuid,
  p_actor_name  text,
  p_resolution  case_resolution default null,
  p_note        text default null,
  p_before_url  text default null,
  p_after_url   text default null,
  p_outcome_note text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  c       cases;
  v_type  case_update_type := 'status_changed';
begin
  if not is_ngo_member() then
    return json_build_object('ok', false, 'error', 'Only verified partner NGOs can update cases.');
  end if;

  select * into c from cases where id = p_case_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;

  if c.assignee_id is null then
    return json_build_object('ok', false, 'error', 'Claim the case before updating it.');
  end if;
  if c.assignee_id <> p_actor_id then
    return json_build_object('ok', false, 'error', 'Only the assignee can update this case.');
  end if;
  if p_to_status = c.status then
    return json_build_object('ok', false, 'error', 'Case is already in that status.');
  end if;
  if p_to_status = 'unverified' then
    return json_build_object('ok', false, 'error', 'Cannot move a case back to unverified.');
  end if;

  -- Proof gate for resolution.
  if p_to_status = 'resolved' then
    if p_resolution is null then
      return json_build_object('ok', false, 'error', 'A resolution is required to resolve a case.');
    end if;
    if coalesce(btrim(coalesce(p_after_url, c.after_url, '')), '') = '' then
      return json_build_object('ok', false, 'error', 'An after photo is required to resolve a case.');
    end if;
    if coalesce(btrim(coalesce(p_outcome_note, c.outcome_note, '')), '') = '' then
      return json_build_object('ok', false, 'error', 'An outcome note is required to resolve a case.');
    end if;
  end if;

  if c.status in ('resolved','closed') and p_to_status = 'in_progress' then
    v_type := 'reopened';
  end if;

  update cases set
    status           = p_to_status,
    resolution       = case when p_to_status = 'resolved' then p_resolution
                            when p_to_status = 'in_progress' then null
                            else resolution end,
    resolved_at      = case when p_to_status = 'resolved' then now()
                            when v_type = 'reopened' then null
                            else resolved_at end,
    before_url       = coalesce(p_before_url, before_url),
    after_url        = coalesce(p_after_url, after_url),
    outcome_note     = coalesce(p_outcome_note, outcome_note),
    -- A new resolution is unverified until an admin signs off; reopening clears it.
    proof_verified   = case when p_to_status = 'resolved' then false
                            when v_type = 'reopened' then false
                            else proof_verified end,
    verified_at      = case when p_to_status = 'resolved' or v_type = 'reopened' then null
                            else verified_at end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type,
                            from_status, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, v_type, c.status, p_to_status, p_note);

  return json_build_object('ok', true, 'status', p_to_status);
end;
$$;

-- 4. Admin verification of a resolved case's outcome proof (service role only).
create or replace function verify_case(p_case_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  select * into c from cases where id = p_case_id;
  if not found then return false; end if;

  update cases set
    proof_verified   = true,
    verified_at      = now(),
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, null, 'StrayPaw admin', 'note', 'Outcome proof verified by StrayPaw.');
  return true;
end;
$$;

-- 5. Grants.
grant execute on function claim_case(uuid,uuid,text) to anon, authenticated, service_role;
grant execute on function update_case_status(
  uuid, case_status, uuid, text, case_resolution, text, text, text, text
) to anon, authenticated, service_role;
grant execute on function verify_case(uuid) to service_role;
