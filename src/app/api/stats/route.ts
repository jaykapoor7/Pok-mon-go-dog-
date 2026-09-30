import { getPublicSpatialCities } from "@/lib/spatial/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight public count for the top bar, backed by the cached city rollup.
export async function GET() {
  try {
    const cities = await getPublicSpatialCities(200);
    const dogs = cities.reduce((sum, row) => sum + Number(row.animals || 0), 0);
    return Response.json(
      { dogs },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch {
    return Response.json({ dogs: null }, { status: 503 });
  }
}
