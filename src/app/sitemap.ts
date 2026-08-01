import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.kapoorjay.com";

// Public, indexable routes. Detail pages (/dog/[id], /feeding/[id]) are
// discoverable via the map/lists and change often, so they're left out of the
// static sitemap intentionally.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/map",
    "/report",
    "/feed",
    "/news",
    "/feeding",
    "/help",
    "/donate",
    "/about",
    "/privacy",
    "/terms",
    "/community-guidelines",
    "/safety",
    "/contact",
    "/cookies",
  ];
  return routes.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/map" || path === "/news" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
