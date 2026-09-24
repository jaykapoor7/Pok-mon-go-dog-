import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";
const SITE = SITE_URL;

/** Public, indexable routes. Private partner/auth/detail surfaces stay out. */
const ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, freq: "daily" },
  { path: "/map", priority: 0.9, freq: "daily" },
  { path: "/app", priority: 0.8, freq: "daily" },
  { path: "/report", priority: 0.8, freq: "monthly" },
  { path: "/stories", priority: 0.9, freq: "daily" },

  { path: "/evidence", priority: 0.8, freq: "weekly" },
  { path: "/programmes", priority: 0.8, freq: "weekly" },
  { path: "/gaps", priority: 0.5, freq: "monthly" },
  { path: "/needs", priority: 0.6, freq: "weekly" },
  { path: "/insights", priority: 0.6, freq: "weekly" },
  { path: "/research", priority: 0.5, freq: "monthly" },


  { path: "/news", priority: 0.6, freq: "daily" },
  { path: "/orgs", priority: 0.7, freq: "weekly" },
  { path: "/help", priority: 0.7, freq: "monthly" },
  { path: "/resources", priority: 0.7, freq: "monthly" },
  { path: "/learn", priority: 0.6, freq: "monthly" },
  { path: "/following", priority: 0.5, freq: "weekly" },

  { path: "/for-ngos", priority: 0.8, freq: "monthly" },
  { path: "/partner-apply", priority: 0.8, freq: "monthly" },
  { path: "/partnerships", priority: 0.6, freq: "monthly" },
  { path: "/what-we-do", priority: 0.6, freq: "monthly" },

  { path: "/about", priority: 0.5, freq: "monthly" },
  { path: "/contact", priority: 0.5, freq: "monthly" },
  { path: "/privacy", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
  { path: "/community-guidelines", priority: 0.3, freq: "yearly" },
  { path: "/safety", priority: 0.4, freq: "yearly" },
  { path: "/cookies", priority: 0.3, freq: "yearly" },
  { path: "/report-content", priority: 0.3, freq: "yearly" },
];

/* Animal records are the atomic unit of this product and the thing worth
   citing, so each one belongs in the sitemap rather than being reachable
   only by browsing. The cap is deliberate: a sitemap has a 50,000-URL limit
   and this is generated per request, so the register's most recently active
   records are listed rather than all of it. Split into indexed sitemaps if
   the register outgrows this. */
const MAX_RECORDS = 5000;

async function recordEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const { getAllDogs } = await import("@/lib/data");
    const dogs = await getAllDogs();
    return dogs.slice(0, MAX_RECORDS).map((dog) => ({
      url: `${SITE}/dog/${dog.id}`,
      lastModified: dog.last_seen ? new Date(dog.last_seen) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    /* The register being unreachable must not take the sitemap with it. */
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = ROUTES.map(({ path, priority, freq }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: freq,
    priority,
  }));
  return [...routes, ...(await recordEntries(now))];
}
