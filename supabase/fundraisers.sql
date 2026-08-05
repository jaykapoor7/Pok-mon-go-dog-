-- ════════════════════════════════════════════════════════════════
-- StrayPaw — NGO fundraisers (link-out model).
--
-- Run ONCE in the Supabase SQL editor (idempotent). Verified partner NGOs post
-- a campaign (story, goal, urgency, photo) and the Donate button links to the
-- NGO's OWN donation channel (their UPI / Razorpay / Milaap / Ketto / bank).
-- StrayPaw never holds or routes funds — it hosts the campaign and drives
-- traffic; money goes straight to the NGO. Depends on:
--   • location-privacy.sql → is_ngo_member()
--   • partner-onboarding.sql / ngo_members → ngo_id attribution
-- ════════════════════════════════════════════════════════════════

create table if not exists fundraisers (
  id              uuid primary key default gen_random_uuid(),
  ngo_id          uuid,                     -- owning org (from ngo_members)
  title           text not null,
  story           text,
  category        text not null default 'other', -- medical|bills|sterilisation|food|shelter|emergency|other
  goal_amount     integer,                  -- INR, optional
  currency        text not null default 'INR',
  donate_url      text not null,            -- the NGO's own donation link
  cover_photo     text,
  deadline        date,
  raised_reported integer,                  -- NGO self-reported progress (unverified)
  status          text not null default 'active', -- active | closed
  created_by_id   uuid,
  created_by_name text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists fundraisers_status_idx on fundraisers (status, created_at desc);

alter table fundraisers enable row level security;
drop policy if exists fundraisers_read on fundraisers;
create policy fundraisers_read on fundraisers for select using (status = 'active');
-- All writes go through the SECURITY DEFINER functions below.

-- Create — verified partner NGOs only; auto-linked to the creator's org.
create or replace function create_fundraiser(
  p_title       text,
  p_story       text,
  p_category    text,
  p_goal_amount integer,
  p_donate_url  text,
  p_cover_photo text default null,
  p_deadline    date default null,
  p_actor_id    uuid default null,
  p_actor_name  text default null
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
                           cover_photo, deadline, created_by_id, created_by_name)
  values ((select ngo_id from ngo_members where user_id = auth.uid()),
          btrim(p_title),
          nullif(btrim(coalesce(p_story,'')), ''),
          coalesce(nullif(p_category, ''), 'other'),
          p_goal_amount,
          btrim(p_donate_url),
          p_cover_photo,
          p_deadline,
          p_actor_id, p_actor_name)
  returning id into v_id;
  return v_id;
end;
$$;

-- Update / close — the owning creator only.
create or replace function update_fundraiser(
  p_id              uuid,
  p_story           text default null,
  p_goal_amount     integer default null,
  p_raised_reported integer default null,
  p_donate_url      text default null,
  p_deadline        date default null,
  p_status          text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update fundraisers set
    story           = coalesce(p_story, story),
    goal_amount     = coalesce(p_goal_amount, goal_amount),
    raised_reported = coalesce(p_raised_reported, raised_reported),
    donate_url      = coalesce(nullif(btrim(coalesce(p_donate_url,'')), ''), donate_url),
    deadline        = coalesce(p_deadline, deadline),
    status          = coalesce(nullif(p_status, ''), status),
    updated_at      = now()
  where id = p_id and created_by_id = auth.uid();
  return found;
end;
$$;

grant execute on function create_fundraiser(text,text,text,integer,text,text,date,uuid,text)
  to authenticated, service_role;
grant execute on function update_fundraiser(uuid,text,integer,integer,text,date,text)
  to authenticated, service_role;
