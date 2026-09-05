-- ════════════════════════════════════════════════════════════════
-- StrayPaw, content reports ("Report content" flagging).
--
-- Run ONCE in the Supabase SQL editor (idempotent). Stores user flags of
-- sightings/photos that break the guidelines. Write-only for the public
-- (insert via the RPC); only the service role / moderation panel reads them.
-- ════════════════════════════════════════════════════════════════

create table if not exists content_reports (
  id         uuid primary key default gen_random_uuid(),
  reason     text not null,
  details    text,
  link       text,
  reporter_id uuid,          -- set when signed in (optional)
  status     text not null default 'open',   -- open | actioned | dismissed
  created_at timestamptz not null default now()
);
create index if not exists content_reports_created_idx on content_reports (created_at desc);

alter table content_reports enable row level security;
-- No public SELECT. (Service role bypasses RLS for review.)

create or replace function submit_content_report(
  p_reason  text,
  p_details text default null,
  p_link    text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required.';
  end if;
  insert into content_reports (reason, details, link, reporter_id)
  values (btrim(p_reason),
          nullif(btrim(coalesce(p_details,'')), ''),
          nullif(btrim(coalesce(p_link,'')), ''),
          auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function submit_content_report(text,text,text) to anon, authenticated, service_role;
