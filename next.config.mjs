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
  // mapbox-gl ships untranspiled ESM in places; keep it happy in the bundle.
  transpilePackages: ["react-map-gl", "mapbox-gl"],
};

export default nextConfig;
