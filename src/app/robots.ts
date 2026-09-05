import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Operator/private surfaces stay out of search.
      disallow: ["/admin", "/moderate", "/account", "/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
