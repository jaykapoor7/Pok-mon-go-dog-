import type { MetadataRoute } from "next";

// Web App Manifest → enables "Add to Home Screen" / installable PWA. Next.js
// serves this at /manifest.webmanifest and links it automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StrayPaw, Open-sourcing stray-animal care",
    short_name: "StrayPaw",
    description:
      "An open, community-run map for India's street animals, spot, report and care.",
    start_url: "/map",
    display: "standalone",
    background_color: "#fbfdff",
    /* The logo's own ground, so the install splash and the icon agree. */
    theme_color: "#164a8c",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
