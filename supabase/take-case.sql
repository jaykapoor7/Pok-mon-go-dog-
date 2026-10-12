-- Taking a request: one tap from the Living Map, the case register or the case file.
-- claim_case only took unowned community reports (ngo_id is null), so a
-- member pressing "Take this case" on their own organisation's request was
-- always refused. take_case takes either kind, and only while nobody holds it,
-- so two people tapping at once cannot overwrite each other. The taker is
-- always auth.uid(); the client must have created its volunteers row
-- (ensureVolunteer) because cases.assignee_id references volunteers.
create or replace function public.take_case(p_case_id uuid, p_actor_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := my_ngo(); c cases;
begin
  if auth.uid() is null or v_ngo is null then return false; end if;
  update cases set assignee_id = auth.uid(), assignee_name = nullif(btrim(p_actor_name), ''),
      ngo_id = v_ngo, status = case when status = 'unverified' then 'assigned' else status end,
      updated_at = now(), last_activity_at = now()
   where id = p_case_id and assignee_id is null and coalesce(btrim(assignee_name), '') = ''
     and (ngo_id is null or ngo_id = v_ngo)
   returning * into c;
  if not found then return false; end if;
  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (p_case_id, auth.uid(), nullif(btrim(p_actor_name), ''), 'claimed', c.status, 'Case taken');
  return true;
end $$;
revoke all on function public.take_case(uuid, text) from public, anon;
grant execute on function public.take_case(uuid, text) to authenticated;
