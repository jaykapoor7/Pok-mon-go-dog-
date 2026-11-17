-- The guided demo's team chat (staging only): #indiranagar in Bengaluru Animal Care Trust, where the team talks about
-- the day's bite request and the coordinator tags @Kaju to turn the thread into tasks. Every person and message is
-- fictional. Re-running it resets the channel: earlier messages, Kaju replies and the tasks made from them go.
do $$
declare
  ngo constant uuid := 'd0000000-0000-4000-8000-0000000000a0';
  lead constant uuid := 'd0000000-0000-4000-8000-000000000001';   -- Priya Nair
  field constant uuid := 'd0000000-0000-4000-8000-000000000004';  -- Manjunath K
  vet constant uuid := 'd0000000-0000-4000-8000-000000000003';    -- Dr. Anitha Rao
  coord constant uuid := 'd0000000-0000-4000-8000-000000000002';  -- Ravi Kumar
  ch uuid;
begin
  insert into public.nx_channels (org_id, name, topic, kind, private, created_by)
  values (ngo, 'indiranagar', 'Indiranagar: bite requests, sightings and field work', 'channel', false, lead)
  on conflict (org_id, name) do update set topic = excluded.topic
  returning id into ch;
  delete from public.nx_tasks where channel_id = ch;
  delete from public.nx_messages where channel_id = ch;
  insert into public.nx_messages (channel_id, author_id, author_kind, author_name, body, created_at) values
    (ch, field, 'person', 'Manjunath K', 'Morning, team. Two new puppies near the Indiranagar metro station. Both look healthy and the mother is with them.', now() - interval '96 minutes'),
    (ch, vet, 'person', 'Dr. Anitha Rao', 'The bite request from the Teaching Hospital describes a brown dog with no collar at the 100 Feet Road bus stop. That sounds like Simba.', now() - interval '64 minutes'),
    (ch, lead, 'person', 'Priya Nair', 'We need to observe Simba today and log it on his record.', now() - interval '51 minutes'),
    (ch, field, 'person', 'Manjunath K', 'I can be there at 4 pm. Someone should check that Simba''s vaccination card is uploaded.', now() - interval '38 minutes'),
    (ch, coord, 'person', 'Ravi Kumar', 'Follow up with the hospital once the observation is logged.', now() - interval '27 minutes');
end $$;
