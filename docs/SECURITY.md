# Security

## Security model

StrayPaw combines public reporting with authenticated personal and organisation operations. Security therefore depends on layered controls: Supabase RLS/grants, guarded RPCs, authenticated server routes, public-field minimisation, abuse controls and safe secret handling.

## Secrets

Server-only values include at least:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` / `SUPABASE_DATABASE_URL`
- `TURNSTILE_SECRET_KEY`
- `ADMIN_SECRET`
- `RESEND_API_KEY`
- Telegram bot credentials

Never prefix these with `NEXT_PUBLIC_`, serialize them into client props, expose them in error responses, or commit real values.

Values explicitly intended for browser use include the Supabase anon key, public site URL, public map token/API key and Turnstile site key. Public keys are still subject to provider restrictions; do not treat them as authorization.

## Authentication and authorization

- Client-side role/state is UX only.
- Protected operations must validate the authenticated user/server token and rely on RLS or explicit server authorization.
- Organisation access must resolve through the membership model, not a supplied `ngo_id` alone.
- Never disable RLS or replace scoped reads with service-role reads merely to make a screen work.
- When service-role access is required, minimize the query and perform authorization before returning or mutating data.

## RLS, views and grants

- New user/organisation tables should have RLS enabled unless there is a deliberate documented reason not to.
- Public views must be explicitly field-minimised.
- Prefer `security_invoker = true` for views that should respect underlying caller permissions.
- `SECURITY DEFINER` functions require special review: set a safe `search_path`, validate arguments, authorize the actor and grant execute only to intended roles.
- Do not assume `include anon grant` means the underlying data is safe; inspect every selected column.
- Public contact details, reporter identity, phone/email, private notes, internal case metadata, exact sensitive locations and operational records must not leak through convenience views.

## Anonymous writes and abuse

Public write paths are intentionally bounded. Reuse the existing `check_rate_limit` primitive and existing server/IP/Turnstile patterns rather than creating unbounded insert/update functions.

Anonymous RPCs should validate:
- required identifiers and data types,
- text length and allowed values,
- referenced record existence/visibility,
- rate limits,
- any required anti-bot proof.

Do not rely only on browser validation.

## API routes

- Parse untrusted JSON defensively.
- Return useful errors without stack traces, SQL text, credentials or internal paths.
- Use 4xx for caller errors and 5xx for server/provider failures.
- Admin endpoints must authenticate admin/privileged access before reading sensitive data.
- Do not log tokens, secrets, full auth headers or sensitive reporter/contact data.

## Embedding and headers

The site is clickjacking-protected by default. `/embed/*` is the intentional exception and emits a permissive `frame-ancestors` policy so partner sites can embed public widgets. Never remove global protection to solve an embed issue.

## Files and photos

Treat uploads as untrusted. Preserve existing photo compression/redaction and storage conventions. Do not expose private storage paths or signed URLs beyond their intended audience/duration.

## Database changes

For any SQL change:
1. inspect current RLS/grants/functions for the affected objects;
2. make the migration idempotent;
3. update the relevant migration bundle/workflow;
4. run the repository security audit/matrix and relevant RPC tests;
5. verify anonymous vs authenticated vs organisation behavior.

## Never do this

- Hardcode or commit credentials.
- Ship a service-role client to the browser.
- Trust an `ngo_id`, role, email or user ID merely because the client sent it.
- Create a public view with `select *` from a private/operational table.
- Add an anonymous mutation without validation and abuse controls.
- Turn off RLS to fix a failing query.
- Reveal exact private/sensitive location data in a public aggregate surface.
