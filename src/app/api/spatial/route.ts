import { NextResponse, type NextRequest } from "next/server";
import { getOrgDataset, getPublicDataset } from "@/lib/spatial/server";

/* The spatial dataset for the map, analytics and dashboards.

   ?scope=public (default) — the public register, cached and shared.
   ?scope=org — the caller's organisation, read with their own token
   (Authorization: Bearer …) so RLS decides what comes back. Never cached
   across people. */

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") ?? "public";
  const city = req.nextUrl.searchParams.get("city");

  if (scope === "org") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
    if (!token) return NextResponse.json({ error: "Sign in to see your organisation's register." }, { status: 401 });
    const ds = await getOrgDataset(token);
    if (!ds) return NextResponse.json({ error: "Could not read your organisation's register." }, { status: 502 });
    return NextResponse.json(ds, { headers: { "Cache-Control": "private, no-store" } });
  }

  const ds = await getPublicDataset(city && city.trim() ? city.trim() : null);
  if (!ds) return NextResponse.json({ error: "The register is unavailable right now." }, { status: 503 });
  return NextResponse.json(ds, {
    headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
  });
}
