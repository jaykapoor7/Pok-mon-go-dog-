-- ════════════════════════════════════════════════════════════════
-- Content-report moderation, capture the reporter's email (so we can tell them
-- when their report is investigated/resolved) and let the reporter provide it.
-- Depends on: content-reports.sql. Idempotent.
-- ════════════════════════════════════════════════════════════════
alter table content_reports add column if not exists reporter_email text;
alter table content_reports add column if not exists resolution text;
alter table content_reports add column if not exists resolved_at timestamptz;

-- Redefine the submit RPC to accept an optional reporter email.
create or replace function submit_content_report(
  p_reason  text,
  p_details text default null,
  p_link    text default null,
  p_email   text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required.';
  end if;
  insert into content_reports (reason, details, link, reporter_id, reporter_email)
  values (btrim(p_reason),
          nullif(btrim(coalesce(p_details,'')), ''),
          nullif(btrim(coalesce(p_link,'')), ''),
          auth.uid(),
          nullif(btrim(coalesce(p_email,'')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function submit_content_report(text,text,text,text) to anon, authenticated, service_role;
