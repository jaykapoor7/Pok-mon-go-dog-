-- STAGING ONLY. Keeps the five shared sample accounts usable on the public
-- live demo (demo.straypaw.org signs visitors in to them automatically).
-- A visitor holding a sample session cannot change that account's password,
-- email or phone, ban it, or remove the sample accounts' organisation or
-- office memberships. Everything else in the sample workspace stays editable,
-- which is the point of a live demo. Changes made from the database console
-- (session user postgres or supabase_admin) are allowed, so the seed script
-- and password rotation still work. Never apply this file to production.
-- Additive; safe to re-run.

CREATE OR REPLACE FUNCTION public.demo_account_guard()
 RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if session_user in ('postgres', 'supabase_admin') then
    return coalesce(new, old);
  end if;
  if tg_table_schema = 'auth' then
    if old.email like 'demo-%@straypaw.invalid'
       and (new.encrypted_password is distinct from old.encrypted_password
         or new.email is distinct from old.email
         or new.email_change is distinct from old.email_change
         or new.phone is distinct from old.phone
         or new.banned_until is distinct from old.banned_until
         or new.deleted_at is distinct from old.deleted_at) then
      raise exception 'Sample demo accounts keep their sign-in details.';
    end if;
    return new;
  end if;
  -- ngo_members / review_office_members: removing or re-roling a sample account
  if exists (select 1 from auth.users u where u.id = old.user_id and u.email like 'demo-%@straypaw.invalid')
     and (tg_op = 'DELETE' or new.role is distinct from old.role or new.user_id is distinct from old.user_id) then
    raise exception 'Sample demo accounts keep their memberships.';
  end if;
  return coalesce(new, old);
end $function$;

REVOKE ALL ON FUNCTION public.demo_account_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS demo_account_guard ON auth.users;
CREATE TRIGGER demo_account_guard BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.demo_account_guard();
DROP TRIGGER IF EXISTS demo_account_guard ON public.ngo_members;
CREATE TRIGGER demo_account_guard BEFORE UPDATE OR DELETE ON public.ngo_members
  FOR EACH ROW EXECUTE FUNCTION public.demo_account_guard();
DROP TRIGGER IF EXISTS demo_account_guard ON public.review_office_members;
CREATE TRIGGER demo_account_guard BEFORE UPDATE OR DELETE ON public.review_office_members
  FOR EACH ROW EXECUTE FUNCTION public.demo_account_guard();
