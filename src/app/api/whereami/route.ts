import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

/* Roughly where a visitor is, from the network (Vercel's IP geolocation),
   only so a map can open on their own city instead of all of India. Inside
   India only; nothing is stored or logged. No answer is a normal answer. */
export function GET(req: Request) {
  const h = req.headers;
  const lat = Number(h.get("x-vercel-ip-latitude")), lng = Number(h.get("x-vercel-ip-longitude"));
  if (h.get("x-vercel-ip-country") !== "IN" || !Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ at: null }, { headers: { "Cache-Control": "private, no-store" } });
  return NextResponse.json({ at: { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 } }, { headers: { "Cache-Control": "private, no-store" } });
}
