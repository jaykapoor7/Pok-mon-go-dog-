# API

## Shape

StrayPaw uses Next.js App Router route handlers under `src/app/api/**/route.ts`. The API is an internal web application interface, not a separately versioned public REST platform unless a route explicitly documents otherwise.

Current route families include public reporting/contact/feedback, spatial queries, statistics, partner/organisation exports/imports/stories, team invitations, volunteer verification and privileged admin operations.

Always search the current route tree before adding a new endpoint.

## Conventions

- Use Next.js `Request` / `NextResponse` patterns already present in neighboring routes.
- Treat all query params, headers and JSON bodies as untrusted.
- Normalize/trim strings and enforce expected types/ranges server-side.
- Return JSON for application APIs unless the route intentionally produces a file/report/HTML export.
- Keep error shapes simple and non-sensitive.
- Use explicit status codes: 400/422 for invalid input, 401 for missing authentication, 403 for authenticated-but-forbidden, 404 for missing resources, 429 for abuse limits, 5xx for server/provider failures.

## Authentication

Authorization depends on route purpose:

- Public routes may be anonymous but still need validation, rate limiting and anti-bot controls.
- Personal routes should authenticate the current user.
- Organisation routes must establish both user identity and organisation membership/scope.
- Admin routes require the existing admin/privileged gate.
- A client-supplied role or organisation ID is never sufficient proof.

## Supabase usage

Use the anon client when RLS/RPCs are the intended security boundary. Use `getSupabaseAdmin()` only in server-only code that performs its own authorization or a deliberately public, field-minimised operation.

Do not move a query to service-role simply because an RLS-protected query fails. Fix the authorization/data contract.

## Public data

Public endpoints and widgets should consume public-safe projections. Avoid returning raw table rows when they contain private reporter/contact, internal workflow, exact sensitive location, or organisation-only metadata.

The public NGO widget map is an example: it uses coarse aggregated cells rather than exact field records.

## Abuse controls

Reuse the existing database-backed rate-limit primitive and Turnstile patterns for exposed write routes. If a new route can send email, create records, upload content, enumerate identifiers or trigger expensive spatial work, consider abuse limits part of the endpoint design.

## Caching

Cache only data that is safe to share across callers. Never apply shared public caching to authenticated/private responses. When changing cached public data, identify the invalidation/revalidation path.

## External services

Environment variables, provider errors and secret credentials stay server-side. Do not pass Resend, Supabase service-role, Turnstile secret, Telegram credentials or DB URIs to the client.

## Adding or changing an endpoint

1. Search for an existing route/domain helper.
2. Define caller and authorization boundary.
3. Define request validation.
4. Define public/private response fields.
5. Define abuse controls.
6. Reuse `src/lib/` domain/data code.
7. Add targeted tests for success, invalid input and forbidden access.
8. Update this file if the API contract/conventions materially change.
