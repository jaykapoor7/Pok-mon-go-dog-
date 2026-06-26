-- ════════════════════════════════════════════════════════════════
-- StrayPaw — colonies + before/after proof + response-time timestamps.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Adds the persistence the
-- NGO dashboard's Impact view needs for REAL data:
--   • dogs.colony / dogs.city   → group strays into named colonies (the unit
--     grants and municipal ABC contracts measure).
--   • cases.resolved_at         → flagged → resolved response time (median).
--   • cases.before_url / after_url / outcome_note → before/after outcome proof.
--
-- The app already treats all of these as optional, so nothing breaks before or
-- after running this; it just lets real NGO data populate the same widgets the
-- demo seed does today.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Columns ──────────────────────────────────────────────────
alter table dogs  add column if not exists colony text;
alter table dogs  add column if not exists city   text;
create index if not exists dogs_colony_idx on dogs (colony);

alter table cases add column if not exists resolved_at   timestamptz;
alter table cases add column if not exists before_url     text;
alter table cases add column if not exists after_url      text;
alter table cases add column if not exists outcome_note   text;

-- ── 2. Backfill resolved_at for existing resolved/closed cases ──
-- Prefer the timestamp of the audit row that moved the case to 'resolved';
-- fall back to its last activity.
update cases c
set resolved_at = sub.ts
from (
  select case_id, max(created_at) as ts
  from case_updates
  where to_status = 'resolved'
  group by case_id
) sub
where c.id = sub.case_id and c.resolved_at is null;

update cases
set resolved_at = last_activity_at
where status in ('resolved', 'closed') and resolved_at is null;

-- ── 3. update_case_status → also stamp resolved_at + store proof ──
-- Signature changes (3 new optional params), so drop the old one first to
-- avoid an ambiguous overload, then recreate with the original logic intact.
drop function if exists update_case_status(uuid, case_status, uuid, text, case_resolution, text);

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
  if p_to_status = 'resolved' and p_resolution is null then
    return json_build_object('ok', false, 'error', 'A resolution is required to resolve a case.');
  end if;

  if c.status in ('resolved','closed') and p_to_status = 'in_progress' then
    v_type := 'reopened';
  end if;

  update cases set
    status           = p_to_status,
    resolution       = case when p_to_status = 'resolved' then p_resolution
                            when p_to_status = 'in_progress' then null
                            else resolution end,
    -- Stamp the resolution time on resolve; clear it on reopen so response
    -- time reflects the latest cycle.
    resolved_at      = case when p_to_status = 'resolved' then now()
                            when v_type = 'reopened' then null
                            else resolved_at end,
    -- Persist before/after proof + outcome when supplied (kept if not).
    before_url       = coalesce(p_before_url, before_url),
    after_url        = coalesce(p_after_url, after_url),
    outcome_note     = coalesce(p_outcome_note, outcome_note),
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type,
                            from_status, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, v_type, c.status, p_to_status, p_note);

  return json_build_object('ok', true, 'status', p_to_status);
end;
$$;

-- ── 4. Grant the new signature ──────────────────────────────────
grant execute on function update_case_status(
  uuid, case_status, uuid, text, case_resolution, text, text, text, text
) to anon, authenticated, service_role;
