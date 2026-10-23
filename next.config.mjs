/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Most pages are rendered per request, and with no client cache every
     Back and every return to a page waited on the server again. Thirty
     seconds is long enough for back-and-forth between screens and short
     enough that nothing a person just changed looks stale for long. */
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
  /* Metadata goes in the <head> of the first response for every visitor,
     as it would for a crawler, instead of streaming in behind the page.
     The streamed form adds a Suspense boundary after every page body, and
     the one hydration mismatch traced on /partner/reports landed on it. */
  htmlLimitedBots: /.*/,
  // This checkout lives beneath a shared Codex workspace that also has a
  // lockfile. Explicitly anchoring file tracing here prevents Next from
  // treating the parent workspace as the application root during builds.
  outputFileTracingRoot: new URL(".", import.meta.url).pathname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "inaturalist-open-data.s3.amazonaws.com" },
      { protocol: "https", hostname: "static.inaturalist.org" },
    ],
  },
  // react-map-gl / MapLibre ship untranspiled ESM in places; keep them happy.\n  transpilePackages: ["react-map-gl", "maplibre-gl"],

  // Security headers. CSP is scoped to frame-ancestors only (clickjacking
  // defence) so it can't break the map tiles / Supabase / inline runtime
  // scripts that a full script-src policy would.
  /* /research was a source index sitting next to /research-standards, which
     states how we design a study, two different things, one word. The index
     is now /sources; the old path keeps working. */
  async redirects() {
    /* StrayPaw 2.0 replaced every post-app screen. Each old URL lands on
       its new home, query strings carried, so links in the world, emails
       and bookmarks keep working. Temporary (307) on purpose: a rollback
       to 1.0 must not be fought by browsers caching permanent redirects. */
    const to = (pairs) => pairs.map(([source, destination]) => ({ source, destination, permanent: false }));
    return [
      ...to([
        /* Community */
        ["/app", "/community"], ["/map", "/community"], ["/atlas", "/community"], ["/feed", "/community"],
        ["/report", "/community/report"], ["/following", "/community/activity"], ["/account", "/community/activity"],
        ["/dog/:id", "/animal/:id"],
        ["/stories", "/community/stories"], ["/journey", "/community/stories"], ["/timeline", "/community/stories"], ["/outcomes", "/community/stories"], ["/rescues", "/community/stories"], ["/care", "/community/stories"],
        ["/orgs", "/community/organisations"], ["/adopt", "/community/organisations"], ["/org/:slug", "/community/organisations/:slug"],
        ["/help", "/community/help"],
        ["/feeding", "/community/feeding"], ["/feeding/new", "/community/feeding"], ["/feeding/:id", "/community/feeding/:id"], ["/feeder", "/community/feeding"],
        /* Municipality */
        ["/municipality", "/city"], ["/insights", "/city/insights"], ["/transparency", "/city/insights"],
        ["/art-credits", "/licences"], ["/programmes", "/city/programmes"], ["/programmes/:id", "/city/programmes/:id"], ["/interventions", "/city/programmes"], ["/studies", "/city/programmes"],
        /* Education */
        ["/resources", "/learn/resources"],
        /* Trust */
        ["/moderate", "/trust"], ["/admin", "/trust/console"],
        /* NGO: every /partner screen with a 2.0 home. Parked features
           (fundraising, surveys, projects, organisation feeding spots, care
           ledger, data quality, volunteer sign-ups, story publishing and
           evidence files) keep their 1.0 pages until they are redesigned. */
        ["/dashboard", "/ngo"], ["/partner", "/ngo"], ["/partner/operations", "/ngo"],
        ["/partner/followups", "/ngo?focus=followup"],
        ["/partner/cases", "/ngo"], ["/cases", "/ngo"],
        ["/partner/animals", "/ngo/animals"], ["/partner/records", "/ngo/animals"],
        ["/partner/animals/:id", "/ngo/animals/:id"],
        ["/partner/map", "/ngo/map"],
        ["/partner/inbox", "/ngo/inbox"], ["/partner/incoming", "/ngo/inbox"],
        ["/partner/review", "/ngo/review"],
        ["/partner/field", "/ngo/field"], ["/partner/import", "/ngo/import"],
        ["/partner/drives", "/ngo/programmes"], ["/partner/drives/:id", "/ngo/programmes/:id"],
        ["/partner/reports", "/ngo/proof"],
        ["/partner/team", "/ngo/team"], ["/partner/codes", "/ngo/team"],
        ["/partner/settings", "/ngo/settings"],
        ["/partner/medical", "/ngo/care"], ["/partner/quality", "/ngo/quality"], ["/partner/volunteers", "/ngo/volunteers"],
        ["/partner/stories", "/ngo/stories"], ["/partner/resources", "/ngo/evidence"], ["/partner/fundraising", "/ngo/fundraising"],
        ["/partner/fundraisers/new", "/ngo/fundraising/new"], ["/partner/surveys", "/ngo/surveys"], ["/partner/projects", "/ngo/projects"],
        ["/partner/feeding", "/ngo/feeding"],
        /* Site pages that predate 2.0 */
        ["/research", "/evidence"], ["/changelog", "/our-story"], ["/about", "/our-story"], ["/company", "/our-story"],
      ]),
      ...["/why-straypaw", "/the-data", "/gaps", "/needs", "/wards", "/data", "/sources", "/take-action", "/what-would-it-take", "/news"]
        .map((source) => ({ source, destination: "/evidence", permanent: false })),
      ...["/what-we-do"].map((source) => ({ source, destination: "/our-story", permanent: true })),
      { source: "/organisations", destination: "/solutions", permanent: true },
      /* A case opened from an animal: the old ?dog / ?dogId become ?dog. */
      { source: "/partner/cases/new", has: [{ type: "query", key: "dogId", value: "(?<dog>.+)" }], destination: "/ngo/cases/new?dog=:dog", permanent: false },
      { source: "/cases/new", has: [{ type: "query", key: "dog", value: "(?<dog>.+)" }], destination: "/ngo/cases/new?dog=:dog", permanent: false },
      { source: "/partner/cases/new", destination: "/ngo/cases/new", permanent: false },
      { source: "/cases/new", destination: "/ngo/cases/new", permanent: false },
      { source: "/partner/cases/:id", destination: "/ngo/cases/:id", permanent: false },
      { source: "/cases/:id", destination: "/ngo/cases/:id", permanent: false },
      { source: "/index", destination: "/", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        // The public website widget is intentionally the sole externally
        // frameable surface. Every other route keeps clickjacking defence.
        source: "/:path((?!embed(?:/|$)).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), geolocation=(self), microphone=()",
          },
        ],
      },
      {
        source: "/embed/:path*",
        headers: [
          // No X-Frame-Options is emitted for this route. XFO has no valid
          // multi-origin allowlist, while this CSP explicitly permits an NGO
          // to put its own public records widget on its website.
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
