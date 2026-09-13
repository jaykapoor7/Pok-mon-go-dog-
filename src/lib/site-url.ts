/* ════════════════════════════════════════════════════════════════════
   One answer to "what is this site's address?".

   Eight files derived it separately and all eight fell back to
   straypaw.org, which is not where the site is served from. That fallback
   goes into the sitemap, every canonical tag, the Open Graph image URL and
   the links inside invitation emails, so a wrong value there is a wrong
   value in Google's index, in a link preview and in somebody's inbox.

   The order is deliberate:
     1. NEXT_PUBLIC_SITE_URL, when it is set, because an explicit answer
        beats an inferred one.
     2. The production domain Vercel assigns the project, which it sets
        automatically at build time. This is the one that makes a fresh
        deployment correct without anybody configuring anything.
     3. straypaw.org, for local builds and anywhere neither exists.
   ════════════════════════════════════════════════════════════════════ */

function clean(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const SITE_URL =
  clean(process.env.NEXT_PUBLIC_SITE_URL) ??
  clean(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  "https://straypaw.org";
