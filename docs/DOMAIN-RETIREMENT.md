# Retiring `straypaw.kapoorjay.com`

## Current rule — 1 November 2026

An existing NGO user reported a missing-URL login error. Both the legacy domain and the canonical sign-in page currently return 200, so that report is not proof the domain was removed. The default Vercel hostname still redirects to the legacy domain. Existing staff codes and memberships must remain intact.

**Keep the old domain, DNS and certificate.** `next.config.mjs` now redirects the two exact legacy hosts to `https://www.straypaw.org`, preserving the path/query and using HTTP 307. A permanent retirement must not strand NGO bookmarks. A missing-page screen also provides a direct workspace sign-in link.

Sessions are stored per origin. A person moving from the old domain may need to enter their existing email/code once at the canonical sign-in page. Do not copy session tokens across domains, reset a valid code, delete DNS/email records, or remove the alias as a login fix.

The connector can inspect domains but does not expose the existing-project-domain PATCH operation. The application redirect is the verified fallback. If changing the Vercel-level redirect later, point `pok-mon-go-dog.vercel.app` directly at `www.straypaw.org` and keep the old custom domain as a redirect. Recheck old root URLs, sign-in aliases, deep links and the actual code endpoint.

The older removal checklist below is historical and **must not be followed for active NGO entry links**.

Audited 2026-10-31. `straypaw.org` stays the canonical production domain
(`NEXT_PUBLIC_SITE_URL=https://straypaw.org`; `src/lib/site-url.ts` serves
canonicals on `https://www.straypaw.org`, which is where the apex 308-redirects).

## What depends on the subdomain today

| Where | Finding | Action |
|---|---|---|
| Repository code, docs, config, git history | No reference to `kapoorjay` anywhere | None needed |
| Vercel project `pok-mon-go-dog` domains | `straypaw.kapoorjay.com` attached (serves the site, 200) | Remove (step 2) |
| Vercel project domain `pok-mon-go-dog.vercel.app` | **307-redirects to `straypaw.kapoorjay.com`** | Repoint first (step 1) |
| `NEXT_PUBLIC_SITE_URL` | `https://straypaw.org` | Unchanged |
| `EMAIL_FROM` | `hello@straypaw.org` (not the subdomain) | Unchanged |
| Vercel DNS zone `kapoorjay.com` | `CNAME straypaw`, Resend records `TXT resend._domainkey.straypaw`, `TXT send.straypaw`, `MX send.straypaw` (old sending domain, superseded by `straypaw.org`) | Delete (step 3) |
| Supabase Auth URL configuration | Not readable from this environment | Check (step 4) |
| Resend dashboard | Old `straypaw.kapoorjay.com` sending domain may still be listed | Remove after step 3 |
| Cloudflare Turnstile hostnames | Not readable from this environment | Remove the hostname if listed |

## Safe order

1. **Vercel → Project → Settings → Domains → `pok-mon-go-dog.vercel.app` → Edit:**
   change the redirect target from `straypaw.kapoorjay.com` to `www.straypaw.org`
   (308). Check `curl -sI https://pok-mon-go-dog.vercel.app/` shows
   `location: https://www.straypaw.org/`.
2. **Same page → `straypaw.kapoorjay.com` → Remove.** Do not remove `straypaw.org`
   or `www.straypaw.org`. The project, deployments and history are untouched.
3. **Vercel → Domains → `kapoorjay.com` → DNS records:** delete the four records
   named `straypaw`, `resend._domainkey.straypaw`, `send.straypaw` (TXT) and
   `send.straypaw` (MX). Leave the apex records, CAA and the Google verification TXT.
4. **Supabase → Authentication → URL Configuration:** remove any
   `https://straypaw.kapoorjay.com/**` entry from Redirect URLs. Keep the Site URL
   on `https://straypaw.org` (or `www`) and the `straypaw.org` entries.
5. Verify:
   ```bash
   for u in https://straypaw.org/ https://www.straypaw.org/ https://www.straypaw.org/community https://www.straypaw.org/ngo https://www.straypaw.org/city https://www.straypaw.org/api/health https://pok-mon-go-dog.vercel.app/; do curl -s -o /dev/null -w "%{http_code} $u -> %{redirect_url}\n" "$u"; done
   ```
   Then sign in once with a code and send one contact-form message to confirm
   auth and email.

Why this order: deleting the DNS record or the project domain before step 1
would send every `pok-mon-go-dog.vercel.app` visitor to a dead host.
