# StrayPaw — Launch Checklist (Vercel + Supabase)

Everything in the codebase is build-verified and on `main`. What remains is
host configuration. Work top to bottom; the app renders at every step but only
does real work once the **Required** block is done.

---

## 1. Supabase project

- [ ] Create / open the Supabase project that holds the Pawesome data.
- [ ] Run the SQL in the Supabase SQL editor **in this exact order** (all three
      are idempotent and safe to re-run; they do not delete data):
  1. [ ] `supabase/RUN-ALL-MIGRATIONS.sql` — the canonical bundle. Paste the
         whole file, run once. Includes the base schema, RPCs / SECURITY DEFINER
         functions, email accounts, and all feature tables.
  2. [ ] `supabase/security-hardening-rls.sql` — **the privacy gate.** Enables
         fail-closed RLS on every base table and re-exposes only narrow, safe
         public views. This is what keeps reporter info, staff pay/rent, and raw
         source rows private. NOT included in RUN-ALL — run it separately.
  3. [ ] `supabase/rollout-hardening.sql` — final rollout constraints. Also NOT
         in RUN-ALL — run it separately.
- [ ] Make yourself a partner NGO member so the console shows real data
      (replace the email):
  ```sql
  insert into ngo_members (user_id)
  select id from auth.users where email = 'YOUR_EMAIL_HERE'
  on conflict do nothing;
  ```
- [ ] Settings → API: copy **Project URL**, **anon public** key, **service_role** key.
- [ ] Authentication → URL Configuration: set **Site URL** to your domain
      (e.g. `https://straypaw.org`) and add it to Redirect URLs.
- [ ] Authentication → Providers → Email: either turn **Confirm email OFF**
      (the signup flow signs new accounts straight in), **or** configure custom
      SMTP (below). Password reset needs SMTP either way.

### Auth email (only if you want signup confirmation / password reset)
- [ ] Authentication → Emails → SMTP Settings: add a provider (Resend gives SMTP
      creds on your verified domain).
- [ ] Authentication → Rate Limits: raise from the default 30/hr once SMTP is on.
- Note: Supabase's built-in mailer only delivers to your project team and caps at
  2/hr — real Gmail/Outlook addresses never get it. Use custom SMTP or turn
  confirmation off.

---

## 2. Vercel environment variables
Project → Settings → Environment Variables → **Production** (and Preview if used).

### Required — app is inert without these
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = service_role key (server-only, never prefix NEXT_PUBLIC)
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://your-domain` (no trailing slash; drives OG images)

### Strongly recommended before public launch
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` = Mapbox GL token (else stylised fallback map)
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` = Cloudflare
      Turnstile (spam protection on the report form; both must be set to enable)
- [ ] `ADMIN_SECRET` = long random string (guards the moderation endpoint)

### Optional
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` = "your sighting is live" emails (verified domain)
- [ ] `NEXT_PUBLIC_DONATE_URL` = UPI/Razorpay/Ko-fi link shown on /donate
- [ ] `NEXT_PUBLIC_CARTO_API_KEY` = CARTO basemap key (free ≤5M tiles/mo)
- [ ] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` = operator ping on each new report
- [ ] `CRON_SECRET` = protects any scheduled endpoints if you enable Vercel Cron

After adding/changing any variable: **redeploy** (Vercel does not apply new env to
an existing build).

---

## 3. Deploy
- [ ] Connect the GitHub repo to Vercel, production branch = `main`.
- [ ] Build command `next build` (default), install `npm ci` (respects the lockfile —
      this is what keeps `xlsx` and the rest deterministic).
- [ ] Deploy. Confirm the build is green in Vercel.
- [ ] Point the custom domain at the deployment; confirm `NEXT_PUBLIC_SITE_URL`
      matches it exactly.

---

## 4. Smoke test on the live URL
- [ ] Home `/`, Map `/map`, Stories `/stories`, Orgs `/orgs` load with real data.
- [ ] `/report`: submit a photo + location → success; if Turnstile is on, the
      human check appears and blocks a missing token.
- [ ] Moderation: `GET /api/admin/sightings` with
      `Authorization: Bearer <ADMIN_SECRET>` lists the pending report; `POST`
      `{ "action":"approve", "id":"<id>" }` approves it and it appears publicly.
- [ ] NGO console `/partner`: sign in as a partner → dashboard shows real
      attention counts; `/partner/records` lists records with StrayPaw + source
      IDs; `/partner/map` and `/partner/reports` render.
- [ ] Signed-out `/partner` shows the "Set up your workspace" shell (not a
      perpetual "Loading…").
- [ ] Animal profile `/dog/[id]`: journey shows reported → rescued → treatment →
      follow-ups (with notes/status) → outcome.
- [ ] Phone check at ~390px: no horizontal scroll on home, dashboard, records,
      map, reports, profile.

---

## 5. Privacy gate (do before going public)
- [ ] Confirm RLS is ON for every table (security-hardening SQL). Reporter email/
      name, staff pay/rent, and raw source rows must be readable only by the
      service role, never by the anon key.
- [ ] Spot-check: hit a public read with the anon key and confirm no PII columns
      come back.

---

## Status at handoff
- Code: build green, typecheck clean, 0 broken internal links, mobile-clean.
- On `main` at commit `7d2aae6`.
- Not done here (needs your accounts/secrets): the steps above, and confirming the
  Pawesome dataset is present in the target Supabase project (not touched, per
  instruction).
