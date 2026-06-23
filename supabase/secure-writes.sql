-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — lock down sighting creation (defence in depth)
--
-- Run this AFTER you have:
--   1. set SUPABASE_SERVICE_ROLE_KEY in Vercel, and
--   2. set TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY, and
--   3. redeployed.
--
-- It revokes the public (anon) ability to call report_sighting directly, so the
-- ONLY way to create a sighting is through the Turnstile-protected /api/report
-- route (which runs as the service role). Until you run this, the form is still
-- spam-checked by Turnstile — this just closes the "call the RPC directly with
-- the anon key" bypass.
--
-- Safe to skip if you're comfortable with the Turnstile-only protection.
-- ════════════════════════════════════════════════════════════════

revoke execute on function report_sighting(text,float,float,text,text,text[],text,text)
  from anon, authenticated;

grant execute on function report_sighting(text,float,float,text,text,text[],text,text)
  to service_role;
