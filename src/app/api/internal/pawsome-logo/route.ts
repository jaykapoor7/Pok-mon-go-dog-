import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = await fetch("https://unavatar.io/x/pawsome_people?size=400&fallback=false", {
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ error: `avatar fetch failed: ${response.status}` }, { status: 502 });
  }
  const type = response.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  return NextResponse.json({
    contentType: type,
    finalUrl: response.url,
    base64: bytes.toString("base64"),
  });
}
