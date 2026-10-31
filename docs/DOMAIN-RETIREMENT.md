# Retiring `straypaw.kapoorjay.com`

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
