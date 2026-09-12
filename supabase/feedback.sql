-- ════════════════════════════════════════════════════════════════
-- StrayPaw, feedback.
--
-- Run ONCE in the Supabase SQL editor. Idempotent: running it again
-- changes nothing.
--
-- Somebody using the site should be able to say what is wrong with it
-- without finding an email address first. This is where that goes.
--
-- Write-only for the public, exactly like content_reports: RLS is on and
-- there is deliberately NO select policy, so the table cannot be read by
-- anon or by a signed-in member however the client asks. Submissions go
-- through a security-definer function that validates and trims, which is
-- the only path in. Reading is for the service role and the moderation
-- panel.
--
-- Nothing here is a tracker. No user agent, no IP, no referrer chain: the
-- page somebody was on when they wrote it, and an email only if they
-- typed one because they want an answer.
-- ════════════════════════════════════════════════════════════════

create table if not exists feedback (
  id          uuid primary key default gen_random_uuid(),
  -- idea | problem | praise. Free text rather than an enum so a new
  -- category never needs a migration to accept a row.
  kind        text not null default 'idea',
  message     text not null,
  -- The path they were on. Helps place a complaint that says "this page".
  page        text,
  -- Only if they want a reply. Optional on purpose.
  email       text,
  -- Set when signed in, so a reply can find them without an email.
  reporter_id uuid,
  status      text not null default 'open',   -- open | actioned | dismissed
  -- Filled in by whoever triages it, so the panel can show why it closed.
  resolution  text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

-- For installs created before the moderation panel could read this.
alter table feedback add column if not exists resolution  text;
alter table feedback add column if not exists resolved_at timestamptz;

create index if not exists feedback_created_idx on feedback (created_at desc);
create index if not exists feedback_status_idx on feedback (status, created_at desc);

alter table feedback enable row level security;
-- No public select policy, and that is the point. The service role
-- bypasses RLS for review.

-- Older installs may have had a permissive policy from a previous attempt.
drop policy if exists "feedback public read" on feedback;
drop policy if exists "feedback public insert" on feedback;

create or replace function submit_feedback(
  p_message text,
  p_kind    text default 'idea',
  p_page    text default null,
  p_email   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id      uuid;
  v_message text := btrim(coalesce(p_message, ''));
  v_kind    text := lower(btrim(coalesce(p_kind, 'idea')));
  v_email   text := lower(btrim(coalesce(p_email, '')));
begin
  if v_message = '' then
    raise exception 'Please write something first.';
  end if;
  -- A cap rather than a truncation: silently cutting somebody's paragraph
  -- in half and thanking them for it is worse than saying it is too long.
  if length(v_message) > 4000 then
    raise exception 'That is longer than this form can take. Please send the short version.';
  end if;
  if v_kind not in ('idea', 'problem', 'praise') then
    v_kind := 'idea';
  end if;
  if v_email <> '' and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email address does not look right. Leave it blank if you would rather not hear back.';
  end if;

  insert into feedback (kind, message, page, email, reporter_id)
  values (
    v_kind,
    v_message,
    nullif(left(btrim(coalesce(p_page, '')), 300), ''),
    nullif(v_email, ''),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function submit_feedback(text, text, text, text)
  to anon, authenticated, service_role;

-- ── Reading it ──────────────────────────────────────────────────
-- In the Supabase SQL editor (service role, so RLS does not apply):
--
--   select created_at, kind, page, email, message
--     from feedback
--    where status = 'open'
--    order by created_at desc;
--
-- and to close one off:
--
--   update feedback set status = 'actioned' where id = '...';
