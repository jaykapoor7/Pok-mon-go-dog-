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
    ],
  },
  // mapbox-gl / maplibre-gl ship untranspiled ESM in places; keep them happy.
  transpilePackages: ["react-map-gl", "mapbox-gl", "maplibre-gl"],

  // Security headers. CSP is scoped to frame-ancestors only (clickjacking
  // defence) so it can't break the map tiles / Supabase / inline runtime
  // scripts that a full script-src policy would.
  /* /research was a source index sitting next to /research-standards, which
     states how we design a study, two different things, one word. The index
     is now /sources; the old path keeps working. */
  async redirects() {
    return [
      { source: "/research", destination: "/sources", permanent: true },
      /* Two pages answered "the animals I care about" and only one of them
         was reachable: nothing on the site linked to /account, and Following
         is the entry in the console's nav. A permanent redirect rather than
         a deletion, so any link out in the world still lands somewhere. */
      { source: "/account", destination: "/following", permanent: true },
      /* /dashboard was already a client-side redirect component. Doing it
         here is one hop instead of two, and search engines see it. */
      { source: "/dashboard", destination: "/partner", permanent: true },
      /* Cases live in the organisation workspace. /cases was a second copy of
         the register whose server reads had no session and so always came
         back empty; old links and the query they carry (?q, ?dog) still land. */
      { source: "/cases", destination: "/partner/cases", permanent: true },
      { source: "/cases/new", has: [{ type: "query", key: "dog", value: "(?<dog>.+)" }], destination: "/partner/cases/new?dogId=:dog", permanent: true },
      { source: "/cases/new", destination: "/partner/cases/new", permanent: true },
      { source: "/cases/:id", destination: "/partner/cases/:id", permanent: true },
      /* The feed listed imported historical records one by one as
         "reported anonymously"; what changed near you lives on the
         community home now. */
      { source: "/feed", destination: "/app", permanent: false },
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
