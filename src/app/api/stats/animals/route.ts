import { NextResponse } from "next/server";
import { getPublicSpatialCities } from "@/lib/spatial/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Public totals come from the pre-aggregated spatial city index. This avoids
 * an exact COUNT over the public profile view on every hero/top-bar poll. */
export async function GET() {
  try {
    const cities = await getPublicSpatialCities(200);
    const count = cities.reduce((sum, row) => sum + Number(row.animals || 0), 0);
    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ count: null }, { status: 503 });
  }
}
