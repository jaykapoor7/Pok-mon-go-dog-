import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";
import { getPartnerDirectory } from "@/lib/partners";
import { getSupabase } from "@/lib/supabase";
const SITE = SITE_URL;

// A sitemap must not turn deployment into a full-register export. The public
// route is generated on demand from a small, indexed recent-record sample.
export const revalidate = 3600;

/** Public, indexable routes. Private partner/auth/detail surfaces stay out. */
const ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, freq: "daily" },
  { path: "/map", priority: 0.9, freq: "daily" },
  { path: "/report", priority: 0.8, freq: "monthly" },
  { path: "/stories", priority: 0.9, freq: "daily" },

  { path: "/explore", priority: 0.9, freq: "daily" },
  { path: "/education", priority: 0.8, freq: "monthly" },
  { path: "/evidence", priority: 0.8, freq: "weekly" },
  { path: "/programmes", priority: 0.8, freq: "weekly" },
  { path: "/insights", priority: 0.6, freq: "weekly" },


  { path: "/orgs", priority: 0.7, freq: "weekly" },
  { path: "/help", priority: 0.7, freq: "monthly" },

  { path: "/for-ngos", priority: 0.8, freq: "monthly" },
  { path: "/partner-apply", priority: 0.8, freq: "monthly" },
  { path: "/partnerships", priority: 0.6, freq: "monthly" },

  { path: "/for-funders", priority: 0.7, freq: "monthly" },
  { path: "/research-standards", priority: 0.5, freq: "monthly" },
  { path: "/data-governance", priority: 0.4, freq: "monthly" },
  { path: "/get-involved", priority: 0.6, freq: "monthly" },
  { path: "/about", priority: 0.7, freq: "monthly" },
  { path: "/for-governments", priority: 0.7, freq: "monthly" },
  { path: "/contact", priority: 0.5, freq: "monthly" },
  { path: "/privacy", priority: 0.3, freq: "yearly" },
  { path: "/terms", priority: 0.3, freq: "yearly" },
  { path: "/community-guidelines", priority: 0.3, freq: "yearly" },
  { path: "/safety", priority: 0.4, freq: "yearly" },
  { path: "/cookies", priority: 0.3, freq: "yearly" },
];

/* Animal records are the atomic unit of this product and the thing worth
   citing, so each one belongs in the sitemap rather than being reachable
   only by browsing. The cap is deliberate: a sitemap has a 50,000-URL limit
   and this is generated per request, so the register's most recently active
   records are listed rather than all of it. Split into indexed sitemaps if
   the register outgrows this. */
const MAX_RECORDS = 1000;

async function recordEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  try {
    const supa = getSupabase();
    if (!supa) return [];
    const { data, error } = await supa
      .from("public_animal_profiles")
      .select("id,last_seen")
      .order("last_seen", { ascending: false })
      .limit(MAX_RECORDS);
    if (error) return [];
    return (data ?? []).map((dog) => ({
      url: `${SITE}/dog/${dog.id}`,
      ...(dog.last_seen ? { lastModified: new Date(dog.last_seen) } : {}),
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
    changeFrequency: freq,
    priority,
  }));
  const [records, organisations] = await Promise.all([recordEntries(now), getPartnerDirectory().catch(() => [])]);
  return [...routes, ...organisations.map(org => ({ url: `${SITE}/org/${org.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })), ...records];
}
