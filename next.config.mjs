/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
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
    ];
  },
};

export default nextConfig;
