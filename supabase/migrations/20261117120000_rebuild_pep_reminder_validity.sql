-- PEP reminders are checked again at the moment of sending.
--
-- A reminder is queued by the morning automation and sent by the delivery worker later (once a day, or the next day
-- after a failed attempt). Before this change the worker sent whatever was queued. A reminder could therefore go to a
-- patient after the dose had been given, after the clinician stopped the course, after the patient withdrew consent,
-- to a number the patient had since changed, with a date the clinician had since moved, or after the date had passed.
--
-- Now nx_pep_outbox_due first cancels every queued reminder that no longer holds, with the reason, and returns only
-- the rest. Nothing is deleted: a cancelled reminder stays in the masked log staff already see.
--
-- Changes one function. No table, column, constraint or grant changes; 'cancelled' is already an allowed status.
-- Rollback: re-create nx_pep_outbox_due as in 20261116140000_rebuild_automations_v2.sql.

create or replace function public.nx_pep_outbox_due(p_limit int default 50)
returns table (id uuid, channel text, phone text, body text, vars jsonb, attempts int)
language plpgsql security definer set search_path = public as $$
declare
  td date := (now() at time zone 'Asia/Kolkata')::date;
begin
  update health.reminder_outbox r
     set status = 'cancelled', updated_at = now(),
         last_error = case
           when not e.reminder_consent then 'Not sent: the patient withdrew consent to reminders.'
           when e.contact_phone is distinct from r.phone then 'Not sent: the patient''s number changed.'
           when c.status <> 'active' then 'Not sent: the course is no longer active.'
           when d.status <> 'due' then 'Not sent: the dose is no longer due.'
           when d.due_on < td then 'Not sent: the dose date has passed.'
           else 'Not sent: the clinician moved the dose date.' end
    from health.pep_doses d
    join health.pep_courses c on c.id = d.course_id
    join health.exposures e on e.id = c.exposure_id
   where r.dose_id = d.id and r.status = 'queued'
     and (not e.reminder_consent or e.contact_phone is distinct from r.phone or c.status <> 'active' or d.status <> 'due'
          or d.due_on < td or (r.vars ->> 2) is distinct from to_char(d.due_on, 'DD Mon'));

  return query
    select o.id, o.channel, o.phone, o.body, o.vars, o.attempts
      from health.reminder_outbox o
     where o.status = 'queued' and o.next_attempt_at <= now()
     order by o.next_attempt_at
     limit least(p_limit, 200);
end $$;

revoke all on function public.nx_pep_outbox_due(int) from public, anon, authenticated;
grant execute on function public.nx_pep_outbox_due(int) to service_role;
