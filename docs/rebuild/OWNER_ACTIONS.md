# What only you can do

Everything below is already built and tested with test doubles. Each feature shows "Not connected" until you do the
step, and starts working without a code change once you have. Nothing here is needed for the rest of the app to work.

| # | What | Why it needs you | How to switch it on |
| --- | --- | --- | --- |
| 1 | ~~Run the staging database change~~ | Done 2026-11-15 | Applied with your approval in the session and checked. |
| 2 | ~~Approve the production database change~~ | Done 2026-11-15 | Applied with your approval in the session and checked. |
| 3 | Claude for free-form Kaju answers and planning | A paid model needs your key and a spending decision | In Vercel, set `ANTHROPIC_API_KEY`, `STRAYPAW_AI_MODE=model`, `STRAYPAW_AI_AUTHORISED_BY=<your name>:<date>`, `STRAYPAW_AI_MONTHLY_CEILING_INR`, `STRAYPAW_AI_USER_DAILY_REQUESTS`, `STRAYPAW_AI_ORG_DAILY_REQUESTS`, `STRAYPAW_AI_INR_PER_MTOK_IN`, `STRAYPAW_AI_INR_PER_MTOK_OUT`. Without all of them Kaju answers and plans by fixed rules and says so. |
| 4 | Email notifications | A sending domain must be verified in your name | Verify the domain in Resend, set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. People who turned email on then receive it; attempts before that are listed as not connected. |
| 5 | Browser push notifications | Push keys identify the site to browsers | Generate VAPID keys (`npx web-push generate-vapid-keys`), set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:<a contact address>` in Vercel. |
| 6 | SMS reminders for PEP doses | India's DLT rules need a registered sender and approved template | Register a DLT template with three variables (facility, dose number, date) in MSG91. Set `MSG91_AUTH_KEY` and `MSG91_PEP_TEMPLATE_ID`. Clinics then turn on "Reminders to patients who agreed". |
| 7 | WhatsApp Business | Meta must verify the business and approve templates | Complete Meta verification and template approval; then connect it in CareOS settings. Until then WhatsApp shows as not connected everywhere. |
| 8 | Gmail / Outlook / Zoho for Kaju and mission emails | OAuth apps must be registered and verified in your name | Register the OAuth apps, set the provider keys listed in `docs/CONNECTIONS.md`, and set `CONNECTIONS_ENC_KEY`. Each person then connects their own account in Settings. |
| 9 | Delivery runs more often than daily | Vercel's Hobby plan runs scheduled jobs once a day | Either move to a plan that allows hourly jobs (then change the `/api/admin/notifications/deliver` schedule in `vercel.json` to `*/10 * * * *`), or enable `pg_net` in Supabase and schedule a call to that route. Kaju missions and automations already run every minute or hour inside the database and do not need this. |
| 10 | Clinical and laboratory partner agreements | Real patient and laboratory data need data-sharing agreements | Sign agreements with the facilities. The software keeps patient identity inside the treating facility either way. |
| 11 | Reviewing offices | A municipal office decides on public money, so it is never self-registered | Set up each office with StrayPaw directly (the Start page says so). |
