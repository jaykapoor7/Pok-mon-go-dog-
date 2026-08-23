import type { MetadataRoute } from "next";

// Web App Manifest → enables "Add to Home Screen" / installable PWA. Next.js
// serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StrayPaw — Open-sourcing stray-animal care",
    short_name: "StrayPaw",
    description:
      "An open, community-run map for India's street animals — spot, report and care.",
    start_url: "/app",
    display: "standalone",
    background_color: "#fbfdff",
    theme_color: "#3b7de6",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
