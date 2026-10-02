import { NextResponse } from "next/server";
import { getCityGround } from "@/lib/ground";

export const dynamic = "force-dynamic";

/* A city's honeycomb and a bounded window of its dated records, for the
   live ground under in-app pages. Public facts only; cached per city. */
export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city");
  const ground = await getCityGround(city).catch(() => null);
  if (!ground) return NextResponse.json({ error: "No mapped city is available." }, { status: 404 });
  return NextResponse.json(ground, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
}
