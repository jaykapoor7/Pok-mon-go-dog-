-- Kaju missions that wait for a person. Additive: one column and one index on nx_tasks, and three functions.
-- A mission is planned and drafted at once from the organisation's own records, by fixed rules; it then stops.
-- A case that already has an open follow-up task is never given a second one, by this mission or another.
-- Only the person who started it can approve it. Approving twice changes nothing the second time.

alter table public.nx_tasks add column if not exists mission_id uuid references public.nx_missions on delete set null;
create unique index if not exists nx_tasks_mission_record_uidx on public.nx_tasks (mission_id, record_id) where mission_id is not null;

-- Start: "prepare follow-ups". p_request: { place?, when?: today|tomorrow|this week|next week, team?, channel? }
create or replace function public.nx_mission_followups(p_org uuid, p_request jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_place text := nullif(btrim(p_request->>'place'), '');
  v_when text := lower(coalesce(nullif(btrim(p_request->>'when'), ''), 'any'));
  v_team text := nullif(btrim(p_request->>'team'), '');
  v_channel text := nullif(btrim(p_request->>'channel'), '');
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_from date; v_to date; v_id uuid; v_found jsonb; v_n int; v_title text; v_recent int; v_skip int;
begin
  if auth.uid() is null or not nx_is_member(p_org) then raise exception 'You are not a member of this organisation.' using errcode = '42501'; end if;
  select count(*) into v_recent from nx_missions where owner_id = auth.uid() and created_at > now() - interval '1 minute';
  if v_recent >= 5 then raise exception 'Too many missions started in the last minute. Try again shortly.' using errcode = 'P0001'; end if;
  if v_when = 'today' then v_from := v_today; v_to := v_today;
  elsif v_when = 'tomorrow' then v_from := v_today + 1; v_to := v_today + 1;
  elsif v_when = 'this week' then v_from := v_today; v_to := v_today + (7 - extract(isodow from v_today)::int);
  elsif v_when = 'next week' then v_from := v_today + (8 - extract(isodow from v_today)::int); v_to := v_from + 6;
  else v_when := 'any'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', coalesce(c.case_code, upper(left(c.id::text, 8))), 'title', coalesce(nullif(c.title, ''), 'Case'), 'place', coalesce(c.zone, c.city), 'due', coalesce(c.due_at, c.follow_up_at::timestamptz)::date) order by coalesce(c.due_at, c.follow_up_at::timestamptz) nulls last), '[]'::jsonb), count(*)
    into v_found, v_n
    from (select * from cases c
           where c.ngo_id = p_org and c.resolved_at is null
             and (v_place is null or c.zone ilike v_place or c.city ilike v_place)
             and (v_when = 'any' or coalesce(c.due_at, c.follow_up_at::timestamptz)::date between v_from and v_to)
             and not exists (select 1 from nx_tasks t where t.org_id = p_org and t.record_kind = 'case' and t.record_id = c.id::text and t.state = 'open')
           order by coalesce(c.due_at, c.follow_up_at::timestamptz) nulls last limit 50) c;

  -- Cases that matched but already have an open follow-up are left alone, and said so.
  select count(*) into v_skip from cases c
   where c.ngo_id = p_org and c.resolved_at is null
     and (v_place is null or c.zone ilike v_place or c.city ilike v_place)
     and (v_when = 'any' or coalesce(c.due_at, c.follow_up_at::timestamptz)::date between v_from and v_to)
     and exists (select 1 from nx_tasks t where t.org_id = p_org and t.record_kind = 'case' and t.record_id = c.id::text and t.state = 'open');

  v_title := 'Prepare follow-ups' || coalesce(' in ' || v_place, '') || case when v_when = 'any' then '' else ' due ' || v_when end;
  insert into nx_missions (org_id, owner_id, title, request, state)
  values (p_org, auth.uid(), v_title, jsonb_build_object('kind', 'followups', 'place', v_place, 'when', v_when, 'from', v_from, 'to', v_to, 'team', v_team, 'channel', v_channel), case when v_n > 0 then 'waiting_person' else 'completed' end)
  returning id into v_id;

  insert into nx_mission_steps (mission_id, position, label, tool, state, result) values
    (v_id, 1, format('Found %s open %s%s%s needing a follow-up%s', v_n, case when v_n = 1 then 'case' else 'cases' end, coalesce(' in ' || v_place, ''), case when v_when = 'any' then '' else ' due ' || v_when end,
                     case when v_skip > 0 then format('; %s already %s one open', v_skip, case when v_skip = 1 then 'has' else 'have' end) else '' end), 'read_cases', 'done', jsonb_build_object('cases', v_found, 'already_open', v_skip));
  if v_n > 0 then
    insert into nx_mission_steps (mission_id, position, label, tool, state, result) values
      (v_id, 2, format('Drafted %s follow-up %s%s', v_n, case when v_n = 1 then 'task' else 'tasks' end, coalesce(' for ' || v_team, '')), 'draft_tasks', 'done', jsonb_build_object('tasks', (select jsonb_agg(jsonb_build_object('case_id', e->>'id', 'title', 'Follow up: ' || (e->>'title'), 'label', e->>'code', 'due', e->>'due')) from jsonb_array_elements(v_found) e))),
      (v_id, 3, 'Create the tasks' || coalesce(' and tell #' || v_channel, '') || ' — waiting for your approval', 'create_tasks', 'waiting_approval', null);
    update nx_mission_steps set needs_approval = true, idempotency_key = v_id::text || ':create' where mission_id = v_id and position = 3;
  end if;
  return v_id;
end $$;

create or replace function public.nx_mission_approve(p_mission uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m nx_missions%rowtype; s nx_mission_steps%rowtype; v_made int := 0; v_ch uuid; v_posted boolean := false; v_name text;
begin
  select * into m from nx_missions where id = p_mission for update;
  if not found or m.owner_id is distinct from auth.uid() then raise exception 'Only the person who started this mission can approve it.' using errcode = '42501'; end if;
  if not nx_is_member(m.org_id) then raise exception 'You are no longer a member of this organisation.' using errcode = '42501'; end if;
  if m.state = 'completed' then return jsonb_build_object('state', 'completed', 'created', 0, 'already', true); end if;
  if m.state <> 'waiting_person' then raise exception 'This mission is not waiting for approval.' using errcode = 'P0001'; end if;
  select * into s from nx_mission_steps where mission_id = p_mission and position = 3 for update;
  select coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)) into v_name from auth.users where id = auth.uid();

  insert into nx_tasks (org_id, title, state, due_on, assignee_name, created_by, source_kind, record_kind, record_id, record_label, mission_id)
  select m.org_id, left(t->>'title', 240), 'open', nullif(t->>'due', '')::date, m.request->>'team', auth.uid(), 'kaju', 'case', t->>'case_id', t->>'label', m.id
    from nx_mission_steps d, jsonb_array_elements(d.result->'tasks') t
   where d.mission_id = p_mission and d.position = 2
     and not exists (select 1 from nx_tasks x where x.org_id = m.org_id and x.record_kind = 'case' and x.record_id = t->>'case_id' and x.state = 'open')
  on conflict (mission_id, record_id) where mission_id is not null do nothing;
  get diagnostics v_made = row_count;

  if m.request->>'channel' is not null then
    select id into v_ch from nx_channels where org_id = m.org_id and name = m.request->>'channel';
    if v_ch is not null and nx_can_read_channel(v_ch) then
      insert into nx_messages (channel_id, author_id, author_kind, author_name, body)
      values (v_ch, null, 'kaju', 'Kaju', format('%s follow-up %s created from open cases%s, approved by %s.', v_made, case when v_made = 1 then 'task' else 'tasks' end, coalesce(' in ' || (m.request->>'place'), ''), coalesce(v_name, 'a member')));
      v_posted := true;
    end if;
  end if;

  update nx_mission_steps set state = 'done', approved_by = auth.uid(), approved_at = now(), attempts = attempts + 1,
         label = format('Created %s %s%s', v_made, case when v_made = 1 then 'task' else 'tasks' end, case when v_posted then ' and told #' || (m.request->>'channel') when m.request->>'channel' is not null then '; #' || (m.request->>'channel') || ' not found, nothing posted' else '' end),
         result = jsonb_build_object('created', v_made, 'posted', v_posted)
   where id = s.id;
  update nx_missions set state = 'completed', updated_at = now() where id = p_mission;
  return jsonb_build_object('state', 'completed', 'created', v_made, 'posted', v_posted);
end $$;

create or replace function public.nx_mission_cancel(p_mission uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update nx_missions set state = 'cancelled', updated_at = now() where id = p_mission and owner_id = auth.uid() and state in ('draft', 'ready', 'waiting_person', 'blocked');
  if not found then raise exception 'This mission cannot be cancelled.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'skipped' where mission_id = p_mission and state in ('todo', 'waiting_approval');
end $$;

revoke all on function public.nx_mission_followups(uuid, jsonb), public.nx_mission_approve(uuid), public.nx_mission_cancel(uuid) from public, anon;
grant execute on function public.nx_mission_followups(uuid, jsonb), public.nx_mission_approve(uuid), public.nx_mission_cancel(uuid) to authenticated;
