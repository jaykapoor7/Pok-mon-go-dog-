-- Dependable write audit, including StrayPaw AI-assisted writes.
-- STAGING first (ucxfxiddufwqithtdtix); same body proposed for production in
-- supabase/proposed/2026-10-31-release.sql.
--
-- Before: a confirmed StrayPaw AI change was saved through the normal,
-- permission-checked actions, and a separate log row was posted afterwards
-- by the browser, best-effort, to a table that was never applied. A record
-- could therefore exist with no structured audit row.
--
-- Now: every insert into the four tables StrayPaw AI (and people) write to
-- (cases, case_updates, animal_followups, medical_events) writes an
-- operational_audit_log row in the SAME transaction, naming the signed-in
-- person. If the saved text carries the confirmation mark that every AI
-- proposal adds ("Prepared with StrayPaw AI, confirmed by …"), the row is
-- recorded as ai_assisted_insert. The client cannot skip it: no audit row,
-- no write. Imports and service jobs (no signed-in user) keep their own
-- batch records and are not logged here.
-- Additive: one function, four triggers. Rollback at the end of this file.

create or replace function public.sp_audit_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_text text; v_case uuid; v_ai boolean;
begin
  if auth.uid() is null then return new; end if;
  if tg_table_name = 'cases' then
    v_ngo := new.ngo_id; v_text := new.description; v_case := new.id;
  elsif tg_table_name = 'case_updates' then
    select c.ngo_id into v_ngo from cases c where c.id = new.case_id; v_text := new.note; v_case := new.case_id;
  elsif tg_table_name = 'animal_followups' then
    v_ngo := new.ngo_id; v_text := new.note; v_case := new.case_id;
  elsif tg_table_name = 'medical_events' then
    select d.ngo_id into v_ngo from dogs d where d.id = new.dog_id; v_text := new.notes; v_case := new.case_id;
  end if;
  v_ai := position('Prepared with StrayPaw AI, confirmed by' in coalesce(v_text, '')) > 0;
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  values (v_ngo, auth.uid(), tg_table_name, new.id, case when v_ai then 'ai_assisted_insert' else 'insert' end,
          jsonb_build_object('case_id', v_case, 'ai_assisted', v_ai, 'by', public.sp_actor_name()));
  return new;
end $$;
revoke all on function public.sp_audit_write() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['cases', 'case_updates', 'animal_followups', 'medical_events'] loop
    if not exists (select 1 from pg_trigger where tgname = 'zz_sp_audit_write' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger zz_sp_audit_write after insert on public.%I for each row execute function public.sp_audit_write()', t);
    end if;
  end loop;
end $$;

-- Rollback:
--   drop trigger if exists zz_sp_audit_write on public.cases;
--   drop trigger if exists zz_sp_audit_write on public.case_updates;
--   drop trigger if exists zz_sp_audit_write on public.animal_followups;
--   drop trigger if exists zz_sp_audit_write on public.medical_events;
--   drop function if exists public.sp_audit_write();
