import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";
const SITE = SITE_URL;

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
