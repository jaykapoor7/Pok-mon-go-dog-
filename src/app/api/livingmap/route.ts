import { NextResponse, type NextRequest } from "next/server";
import { findAnimals, getMapArea, getMapCities, getMapCity } from "@/lib/livingmap/server";

/* The Living Map's public reads: one city's complete area aggregates, or
 * one area's animals and requests. Never anything finer than an H3 area. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  if (q.get("kind") === "find") {
    try { return NextResponse.json({ animals: await findAnimals(q.get("q") ?? "") }, { headers: { "Cache-Control": "public, s-maxage=120" } }); }
    catch (error) { console.error("livingmap find failed", error); return NextResponse.json({ animals: [] }, { status: 503 }); }
  }
  if (q.get("kind") === "cities") {
    try { return NextResponse.json({ cities: await getMapCities() }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } }); }
    catch (error) { console.error("livingmap cities failed", error); return NextResponse.json({ error: "The map data is temporarily unavailable." }, { status: 503 }); }
  }
  const city = q.get("city")?.trim() ?? "";
  if (!city) return NextResponse.json({ error: "Choose a city." }, { status: 400 });
  const cache = { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" };
  try {
    if (q.get("kind") === "area") {
      const area = await getMapArea(city, q.get("h3") ?? "");
      if (!area) return NextResponse.json({ error: "No record for that area." }, { status: 404 });
      return NextResponse.json(area, { headers: cache });
    }
    const data = await getMapCity(city);
    if (!data) return NextResponse.json({ error: "No mapped record for that city yet." }, { status: 404 });
    return NextResponse.json(data, { headers: cache });
  } catch (error) {
    console.error("livingmap read failed", error);
    return NextResponse.json({ error: "The map data is temporarily unavailable. Retry in a moment." }, { status: 503 });
  }
}
