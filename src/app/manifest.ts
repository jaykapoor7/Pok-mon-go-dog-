import type { MetadataRoute } from "next";

// Web App Manifest → enables "Add to Home Screen" / installable PWA. Next.js
// serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StrayPaw — Open-sourcing stray-dog care",
    short_name: "StrayPaw",
    description:
      "An open, community-run map for India's street dogs — spot, report and care.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F3E9",
    theme_color: "#6E7A45",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
