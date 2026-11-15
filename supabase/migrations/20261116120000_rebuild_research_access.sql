-- Research data access (Stage 4 of the rebuild). Additive: two tables and five functions. No existing row changes.
--
-- A research group asks a programme for data without joining it. The programme's coordinators (its data stewards) approve,
-- deny or later revoke. An approved request gives versioned extracts: suppressed, aggregated counts only, never patient
-- rows, computed with the approving steward's own access, for the period and variables approved. Revoking stops new
-- extracts and hides the ones already taken. Every request, decision and extract is kept.

create table if not exists public.nx_data_requests (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.oh_programmes on delete cascade,
  requester_org uuid not null references public.oh_organisations on delete cascade,
  requested_by uuid not null default auth.uid(),
  title text not null check (length(title) between 3 and 160),
  purpose text not null check (length(purpose) between 20 and 2000),
  variables text[] not null check (cardinality(variables) between 1 and 4 and variables <@ array['week', 'area', 'species', 'category']),
  period_from date not null,
  period_to date not null check (period_to >= period_from and period_to - period_from <= 1095),
  status text not null default 'requested' check (status in ('requested', 'approved', 'denied', 'revoked', 'withdrawn')),
  decided_by uuid, decided_at timestamptz,
  decision_note text check (length(decision_note) <= 1000),
  expires_on date,
  created_at timestamptz not null default now()
);
create index if not exists nx_data_requests_programme on public.nx_data_requests (programme_id, status);

create table if not exists public.nx_data_extracts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.nx_data_requests on delete cascade,
  version int not null,
  taken_by uuid not null default auth.uid(),
  taken_at timestamptz not null default now(),
  query jsonb not null,
  suppress_below int not null,
  row_count int not null,
  rows jsonb not null,
  unique (request_id, version)
);

alter table public.nx_data_requests enable row level security;
alter table public.nx_data_extracts enable row level security;

-- The requesting group sees its own requests; the programme's coordinators see the requests made to their programme.
drop policy if exists nx_data_requests_read on public.nx_data_requests;
create policy nx_data_requests_read on public.nx_data_requests for select to authenticated using (
  public.nx_is_member(requester_org) or public.oh_can_manage(programme_id));
-- Extracts are readable by the requesting group only while the approval stands.
drop policy if exists nx_data_extracts_read on public.nx_data_extracts;
create policy nx_data_extracts_read on public.nx_data_extracts for select to authenticated using (
  exists (select 1 from public.nx_data_requests r where r.id = request_id and public.nx_is_member(r.requester_org)
          and r.status = 'approved' and (r.expires_on is null or r.expires_on >= current_date)));
grant select on public.nx_data_requests, public.nx_data_extracts to authenticated;
revoke all on public.nx_data_requests, public.nx_data_extracts from anon;

-- Programmes a research group can ask: names only, of programmes that are running.
create or replace function public.nx_requestable_programmes()
returns table (id uuid, name text, status text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.status from oh_programmes p where auth.uid() is not null and p.status in ('pilot', 'active') order by p.name;
$$;
revoke all on function public.nx_requestable_programmes() from public, anon;
grant execute on function public.nx_requestable_programmes() to authenticated;

create or replace function public.nx_request_data(p_programme uuid, p_org uuid, p_title text, p_purpose text, p_variables text[], p_from date, p_to date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not nx_is_member(p_org) then raise exception 'You are not a member of that research group.' using errcode = '42501'; end if;
  if not exists (select 1 from oh_organisations where id = p_org and kind in ('research', 'coordinator', 'state', 'municipal', 'ngo')) then
    raise exception 'Only an organisation can ask for data.' using errcode = '42501'; end if;
  if exists (select 1 from nx_data_requests where requester_org = p_org and programme_id = p_programme and status = 'requested') then
    raise exception 'Your group already has a request waiting with this programme.' using errcode = 'P0001'; end if;
  insert into nx_data_requests (programme_id, requester_org, title, purpose, variables, period_from, period_to)
  values (p_programme, p_org, btrim(p_title), btrim(p_purpose), p_variables, p_from, p_to) returning id into v;
  -- The programme's coordinators hear about it.
  insert into nx_notifications (user_id, org_id, kind, title, body, href)
  select distinct m.user_id, m.organisation_id, 'approval', left('Data request: ' || btrim(p_title), 200), 'A research group asked for programme data. You decide.', '/gov/data-requests'
    from oh_participations pp join oh_organisations o on o.id = pp.organisation_id and o.kind in ('coordinator', 'state')
    join oh_members m on m.organisation_id = o.id and m.role in ('lead', 'coordinator')
   where pp.programme_id = p_programme;
  return v;
end $$;
revoke all on function public.nx_request_data(uuid, uuid, text, text, text[], date, date) from public, anon;
grant execute on function public.nx_request_data(uuid, uuid, text, text, text[], date, date) to authenticated;

-- The steward's decision: approve (optionally until a date), deny, or revoke an approval. Signed by name, kept for audit.
create or replace function public.nx_decide_data_request(p_request uuid, p_decision text, p_note text default null, p_expires_on date default null)
returns text language plpgsql security definer set search_path = public as $$
declare r nx_data_requests;
begin
  select * into r from nx_data_requests where id = p_request for update;
  if r.id is null or not oh_can_manage(r.programme_id) then raise exception 'Only the programme''s coordinators decide on its data.' using errcode = '42501'; end if;
  if p_decision = 'approve' and r.status = 'requested' then
    if not exists (select 1 from oh_my_memberships() m join oh_participations pp on pp.organisation_id = m.organisation_id
                    where pp.programme_id in (select id from oh_programme_line(r.programme_id)) and (oh_can(m.organisation_id, 'analyse') or oh_can(m.organisation_id, 'oversee'))) then
      raise exception 'Approving needs a coordinator or analyst role in this programme.' using errcode = '42501'; end if;
    update nx_data_requests set status = 'approved', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_note, 1000), expires_on = p_expires_on where id = r.id;
  elsif p_decision = 'deny' and r.status = 'requested' then
    update nx_data_requests set status = 'denied', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_note, 1000) where id = r.id;
  elsif p_decision = 'revoke' and r.status = 'approved' then
    update nx_data_requests set status = 'revoked', decided_by = auth.uid(), decided_at = now(), decision_note = left(p_note, 1000) where id = r.id;
  else
    raise exception 'That request is not waiting for this decision.' using errcode = 'P0001';
  end if;
  insert into nx_notifications (user_id, org_id, kind, title, href)
  values (r.requested_by, r.requester_org, 'system', left('Your data request was ' || case p_decision when 'approve' then 'approved' when 'deny' then 'declined' else 'revoked' end || ': ' || r.title, 200), '/research/datasets');
  return p_decision;
end $$;
revoke all on function public.nx_decide_data_request(uuid, text, text, date) from public, anon;
grant execute on function public.nx_decide_data_request(uuid, text, text, date) to authenticated;

create or replace function public.nx_withdraw_data_request(p_request uuid) returns boolean
language sql security definer set search_path = public as $$
  update nx_data_requests set status = 'withdrawn' where id = p_request and status = 'requested' and nx_is_member(requester_org) returning true;
$$;
revoke all on function public.nx_withdraw_data_request(uuid) from public, anon;
grant execute on function public.nx_withdraw_data_request(uuid) to authenticated;

-- Take a versioned extract under an approved request. The counts come from the programme's own suppressed extract, run with
-- the approving steward's access, then cut to the approved period and variables (regrouped, re-suppressed).
create or replace function public.nx_take_extract(p_request uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare r nx_data_requests; v_claims text := current_setting('request.jwt.claims', true); v_raw jsonb; v_rows jsonb; v_sup int; v_ver int; v_id uuid; v_me uuid := auth.uid();
begin
  select * into r from nx_data_requests where id = p_request;
  if r.id is null or not nx_is_member(r.requester_org) then raise exception 'That request is not your group''s.' using errcode = '42501'; end if;
  if r.status <> 'approved' then raise exception 'This request is not approved.' using errcode = '42501'; end if;
  if r.expires_on is not null and r.expires_on < current_date then raise exception 'The approval for this request has expired.' using errcode = '42501'; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', r.decided_by, 'role', 'authenticated')::text, true);
  begin
    v_raw := oh_research_extract(r.programme_id, greatest(30, least(1095, (current_date - r.period_from) + 1)));
  exception when others then
    perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    raise exception 'The approving coordinator no longer has access to this programme''s data, so no extract can be taken. Ask the programme to review the approval.' using errcode = '42501';
  end;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  v_sup := coalesce((v_raw->>'suppress_below')::int, 5);
  select coalesce(jsonb_agg(row_to_json(g)::jsonb - 'n' || jsonb_build_object('exposures', oh_suppress(g.n, v_sup))), '[]'::jsonb) into v_rows from (
    select case when 'week' = any (r.variables) then (e->>'week') end as week,
           case when 'area' = any (r.variables) then (e->>'area') end as area,
           case when 'species' = any (r.variables) then (e->>'species') end as species,
           case when 'category' = any (r.variables) then (e->>'category') end as category,
           sum(nullif(e->>'exposures', '')::int) filter (where (e->>'exposures') ~ '^\d+$') as n
      from jsonb_array_elements(coalesce(v_raw->'rows', '[]'::jsonb)) e
     where (e->>'week')::date between r.period_from and r.period_to and (e->>'exposures') ~ '^\d+$'
     group by 1, 2, 3, 4 order by 1, 2, 3, 4) g;
  select coalesce(max(version), 0) + 1 into v_ver from nx_data_extracts where request_id = r.id;
  insert into nx_data_extracts (request_id, version, taken_by, query, suppress_below, row_count, rows)
  values (r.id, v_ver, v_me, jsonb_build_object('programme_id', r.programme_id, 'source', 'oh_research_extract', 'period_from', r.period_from, 'period_to', r.period_to,
          'variables', r.variables, 'measure', 'exposures (count)', 'note', 'Cells already suppressed in the source are left out before regrouping, then every regrouped cell is suppressed again.'),
          v_sup, jsonb_array_length(v_rows), v_rows) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.nx_take_extract(uuid) from public, anon;
grant execute on function public.nx_take_extract(uuid) to authenticated;
