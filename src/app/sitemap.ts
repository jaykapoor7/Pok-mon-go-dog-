import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";

/**
 * Public, indexable routes.
 *
 * Excluded on purpose: detail pages (/dog/[id], /feeding/[id], /org/[slug])
 * are discoverable through the map and lists and churn too fast to pin here;
 * gated surfaces (/partner/*, /cases, /admin, /moderate, /account) are not
 * public; auth and utility routes (/reset-password, /dashboard) have nothing
 * to index.
 */
const ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  // entry
  { path: "", priority: 1.0, freq: "daily" },
  { path: "/map", priority: 0.9, freq: "daily" },
  { path: "/app", priority: 0.8, freq: "daily" },
  { path: "/report", priority: 0.8, freq: "monthly" },

  // evidence layer — the substance of the product
  { path: "/gaps", priority: 0.8, freq: "weekly" },
  { path: "/needs", priority: 0.8, freq: "weekly" },
  { path: "/what-would-it-take", priority: 0.8, freq: "weekly" },
  { path: "/studies", priority: 0.8, freq: "weekly" },
  { path: "/interventions", priority: 0.8, freq: "weekly" },
  { path: "/outcomes", priority: 0.8, freq: "weekly" },
  { path: "/insights", priority: 0.7, freq: "weekly" },
  { path: "/explore", priority: 0.7, freq: "weekly" },
  { path: "/research", priority: 0.7, freq: "monthly" },

  // community + directory
  { path: "/feed", priority: 0.6, freq: "daily" },
  { path: "/news", priority: 0.6, freq: "daily" },
  { path: "/orgs", priority: 0.7, freq: "weekly" },
  { path: "/feeding", priority: 0.6, freq: "weekly" },
  { path: "/help", priority: 0.7, freq: "monthly" },
  { path: "/resources", priority: 0.7, freq: "monthly" },
  { path: "/learn", priority: 0.7, freq: "monthly" },
  { path: "/get-involved", priority: 0.7, freq: "monthly" },
  { path: "/take-action", priority: 0.6, freq: "monthly" },
  { path: "/surveys", priority: 0.5, freq: "weekly" },
  { path: "/fundraisers", priority: 0.5, freq: "weekly" },
  { path: "/donate", priority: 0.6, freq: "monthly" },

  // partner funnel
  { path: "/partner-apply", priority: 0.8, freq: "monthly" },
  { path: "/partnerships", priority: 0.6, freq: "monthly" },
  { path: "/what-we-do", priority: 0.6, freq: "monthly" },
  { path: "/journey", priority: 0.5, freq: "monthly" },

  // information
  { path: "/about", priority: 0.5, freq: "monthly" },
  { path: "/contact", priority: 0.5, freq: "monthly" },
  { path: "/privacy", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
  { path: "/community-guidelines", priority: 0.3, freq: "yearly" },
  { path: "/safety", priority: 0.4, freq: "yearly" },
  { path: "/cookies", priority: 0.3, freq: "yearly" },
  { path: "/report-content", priority: 0.3, freq: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map(({ path, priority, freq }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority,
  }));
}
