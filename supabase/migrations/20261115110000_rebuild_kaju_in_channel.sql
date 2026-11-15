-- Kaju in a channel, from fixed rules. The caller chooses only the channel and whether they want tasks or a recap;
-- the words Kaju posts are built here from messages the caller can already read, quoted as written.
-- No language model, no interpretation, and nothing from the health schema.
create or replace function public.nx_kaju_reply(p_channel uuid, p_want text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_tasks text[]; v_n int; v_body text; v_id uuid; v_recent int;
begin
  if auth.uid() is null or not nx_can_read_channel(p_channel) then
    raise exception 'You cannot read this channel.' using errcode = '42501';
  end if;
  -- At most six Kaju replies a minute in one channel.
  select count(*) into v_recent from nx_messages where channel_id = p_channel and author_kind = 'kaju' and created_at > now() - interval '1 minute';
  if v_recent >= 6 then raise exception 'Kaju is being asked a lot here. Try again in a minute.' using errcode = 'P0001'; end if;

  select count(*) into v_n from (
    select 1 from nx_messages where channel_id = p_channel and deleted_at is null and author_kind = 'person' and body !~* '@kaju' order by created_at desc limit 40) x;

  if p_want = 'tasks' then
    select array_agg(s order by first_at) into v_tasks from (
      select s, min(created_at) first_at from (
        select left(regexp_replace(btrim(part), '[.!?]+$', ''), 200) s, m.created_at
          from (select body, created_at from nx_messages where channel_id = p_channel and deleted_at is null and author_kind = 'person' and body !~* '@kaju' order by created_at desc limit 40) m,
               regexp_split_to_table(regexp_replace(m.body, '\s+', ' ', 'g'), '(?<=[.!?])\s+') part
         where length(btrim(part)) >= 8
           and part ~* '\m(need(s|ed)? to|needs?|must|should|have to|has to|return visit|follow[- ]?up|revisit|re-?capture|pending|missing|not (yet )?(done|found|available)|tomorrow|schedule|remind)\M') q
       group by s order by min(created_at) limit 8) t;
    if coalesce(array_length(v_tasks, 1), 0) > 0 then
      v_body := format('I found %s %s still to do in the last %s %s. They are quoted as written. Nothing is created until you accept.',
                       array_length(v_tasks, 1), case when array_length(v_tasks, 1) = 1 then 'thing' else 'things' end, v_n, case when v_n = 1 then 'message' else 'messages' end);
    else
      v_body := format('I read the last %s %s and found nothing phrased as still to do.', v_n, case when v_n = 1 then 'message' else 'messages' end);
    end if;
  else
    select string_agg('• ' || coalesce(author_name, 'Someone') || ': ' || left(regexp_replace(body, '\s+', ' ', 'g'), 220), E'\n' order by created_at) into v_body
      from (select author_name, body, created_at from nx_messages where channel_id = p_channel and deleted_at is null and author_kind = 'person' and body !~* '@kaju' order by created_at desc limit 5) r;
    v_body := case when v_body is null then 'There are no messages from people here yet.' else E'The latest messages, as written:\n' || v_body end;
  end if;

  insert into nx_messages (channel_id, author_id, author_kind, author_name, body, proposal)
  values (p_channel, null, 'kaju', 'Kaju', v_body, case when coalesce(array_length(v_tasks, 1), 0) > 0 then jsonb_build_object('tasks', to_jsonb(v_tasks), 'asked_by', auth.uid()) end)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.nx_kaju_reply(uuid, text) from public, anon;
grant execute on function public.nx_kaju_reply(uuid, text) to authenticated;
