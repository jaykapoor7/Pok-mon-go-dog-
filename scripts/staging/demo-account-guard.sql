-- STAGING ONLY: protects five public demo accounts from visitor lockouts.
-- Applied separately to staging (ucxfxiddufwqithtdtix). NEVER run on production.
-- Database owner (postgres/supabase_admin) retains recovery and reseeding access.
-- Guests can still edit illustrative case records; reset the workspace before demos.
-- To remove the guard, explicitly DROP the three triggers and the function.
--
CREATE OR REPLACE FUNCTION public.demo_account_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_SCHEMA = 'auth' THEN
    IF OLD.email IN (
      'demo-field@straypaw.invalid',
      'demo-vet@straypaw.invalid',
      'demo-coordinator@straypaw.invalid',
      'demo-lead@straypaw.invalid',
      'demo-municipal@straypaw.invalid'
    ) THEN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Sample demo accounts cannot be deleted.' USING ERRCODE = '42501';
      END IF;
      IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password
         OR NEW.email IS DISTINCT FROM OLD.email
         OR NEW.email_change IS DISTINCT FROM OLD.email_change
         OR NEW.phone IS DISTINCT FROM OLD.phone
         OR NEW.banned_until IS DISTINCT FROM OLD.banned_until
         OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
        RAISE EXCEPTION 'Sample demo accounts keep their sign-in details.' USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);  -- NEW is NULL on DELETE; returning it would silently cancel every user deletion
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = OLD.user_id
      AND u.email IN (
        'demo-field@straypaw.invalid',
        'demo-vet@straypaw.invalid',
        'demo-coordinator@straypaw.invalid',
        'demo-lead@straypaw.invalid',
        'demo-municipal@straypaw.invalid'
      )
  ) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Sample demo memberships cannot be deleted.' USING ERRCODE = '42501';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Sample demo memberships cannot be reassigned.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END
$fn$;

REVOKE ALL ON FUNCTION public.demo_account_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS demo_account_guard ON auth.users;
CREATE TRIGGER demo_account_guard BEFORE UPDATE OR DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.demo_account_guard();

DROP TRIGGER IF EXISTS demo_account_guard ON public.ngo_members;
CREATE TRIGGER demo_account_guard BEFORE UPDATE OR DELETE ON public.ngo_members
  FOR EACH ROW EXECUTE FUNCTION public.demo_account_guard();

DROP TRIGGER IF EXISTS demo_account_guard ON public.review_office_members;
CREATE TRIGGER demo_account_guard BEFORE UPDATE OR DELETE ON public.review_office_members
  FOR EACH ROW EXECUTE FUNCTION public.demo_account_guard();
