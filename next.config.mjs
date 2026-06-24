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
};

export default nextConfig;
