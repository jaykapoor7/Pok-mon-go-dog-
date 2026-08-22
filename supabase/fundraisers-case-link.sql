-- ════════════════════════════════════════════════════════════════
-- Fundraising ↔ operations link (Phase 4 foundation) — a campaign can be
-- tied to the case it funds: Need → Case → Campaign → Outcome.
-- Depends on: fundraisers.sql, cases.sql. Idempotent.
-- ════════════════════════════════════════════════════════════════

alter table fundraisers add column if not exists case_id uuid;

-- Recreate create_fundraiser with a trailing p_case_id (drop old signature so
-- PostgREST resolves the new one unambiguously).
drop function if exists create_fundraiser(text,text,text,integer,text,text,date,uuid,text);

create or replace function create_fundraiser(
  p_title       text,
  p_story       text,
  p_category    text,
  p_goal_amount integer,
  p_donate_url  text,
  p_cover_photo text default null,
  p_deadline    date default null,
  p_actor_id    uuid default null,
  p_actor_name  text default null,
  p_case_id     uuid default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_ngo_member() then
    raise exception 'Only verified partner NGOs can start a fundraiser.';
  end if;
  if coalesce(btrim(p_title), '') = '' then
    raise exception 'A title is required.';
  end if;
  if p_donate_url is null or lower(btrim(p_donate_url)) not like 'http%' then
    raise exception 'A valid donation link (starting with https://) is required.';
  end if;

  insert into fundraisers (ngo_id, title, story, category, goal_amount, donate_url,
                           cover_photo, deadline, created_by_id, created_by_name, case_id)
  values ((select ngo_id from ngo_members where user_id = auth.uid()),
          btrim(p_title),
          nullif(btrim(coalesce(p_story,'')), ''),
          coalesce(nullif(p_category, ''), 'other'),
          p_goal_amount, btrim(p_donate_url), p_cover_photo, p_deadline,
          p_actor_id, p_actor_name, p_case_id)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function create_fundraiser(text,text,text,integer,text,text,date,uuid,text,uuid) to authenticated, service_role;
