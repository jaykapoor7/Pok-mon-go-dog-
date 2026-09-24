import { NextResponse } from "next/server";
import { getPublicOrgBySlug, getPublicOrgImpact, publicOrgSummary } from "@/lib/org-public";
import { SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A cacheable, deliberately narrow public response for an NGO's own website.
 * It never serialises profile rows, raw case rows, locations or contacts.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org?.slug) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const metrics = await getPublicOrgImpact(org.id);
  return NextResponse.json(
    {
      organization: publicOrgSummary(org),
      metrics,
      publicUrl: `${SITE_URL}/org/${org.slug}`,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        // A short CDN/browser cache keeps an NGO homepage responsive while
        // still reflecting operational changes within about a minute.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
