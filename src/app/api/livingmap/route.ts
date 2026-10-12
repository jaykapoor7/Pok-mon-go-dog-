import { NextResponse, type NextRequest } from "next/server";
import { findAnimals, getMapArea, getMapCities, getMapCity, getOrgMapArea, getOrgMapCities, getOrgMapCity, getUnplaced } from "@/lib/livingmap/server";

/* The Living Map's public reads: one city's complete area aggregates, or
 * one area's animals and requests. Never anything finer than an H3 area. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  /* An organisation's own map: its member's token, its own records, no caching. */
  if (q.get("scope") === "org") {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
    if (!token) return NextResponse.json({ error: "Sign in with your organisation to see its map." }, { status: 401 });
    const priv = { "Cache-Control": "private, no-store" };
    try {
      if (q.get("kind") === "cities") return NextResponse.json(await getOrgMapCities(token), { headers: priv });
      const city = q.get("city")?.trim() ?? "";
      if (!city) return NextResponse.json({ error: "Choose a city." }, { status: 400 });
      if (q.get("kind") === "area") {
        const area = await getOrgMapArea(token, city, q.get("h3") ?? "");
        return area ? NextResponse.json(area, { headers: priv }) : NextResponse.json({ error: "No record for that area." }, { status: 404 });
      }
      const data = await getOrgMapCity(token, city);
      return data ? NextResponse.json(data, { headers: priv }) : NextResponse.json({ error: "Your organisation has no mapped record in that city." }, { status: 404 });
    } catch (error) {
      /* A token the database will not accept is a sign-in problem, not an outage. */
      const msg = String((error as { message?: string; code?: string })?.message ?? "") + String((error as { code?: string })?.code ?? "");
      if (/jwt|token|PGRST30[0-3]|401/i.test(msg)) return NextResponse.json({ error: "Sign in again with your organisation to see its map." }, { status: 401 });
      console.error("livingmap org read failed", error);
      return NextResponse.json({ error: "Your organisation's map is temporarily unavailable." }, { status: 503 });
    }
  }
  if (q.get("kind") === "find") {
    try { return NextResponse.json({ animals: await findAnimals(q.get("q") ?? "") }, { headers: { "Cache-Control": "public, s-maxage=120" } }); }
    catch (error) { console.error("livingmap find failed", error); return NextResponse.json({ animals: [] }, { status: 503 }); }
  }
  if (q.get("kind") === "cities") {
    try { const [cities, unplaced] = await Promise.all([getMapCities(), getUnplaced()]); return NextResponse.json({ cities, unplaced }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } }); }
    catch (error) { console.error("livingmap cities failed", error); return NextResponse.json({ error: "The map data is temporarily unavailable." }, { status: 503 }); }
  }
  const city = q.get("city")?.trim() ?? "";
  if (!city) return NextResponse.json({ error: "Choose a city." }, { status: 400 });
  const cache = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" };
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
