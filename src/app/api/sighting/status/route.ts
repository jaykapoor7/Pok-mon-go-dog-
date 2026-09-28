import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

type RequestedSighting = { sightingId?: unknown; ownerToken?: unknown };

/**
 * A guest's device holds the original report secret. It is the only proof of
 * ownership needed here, so the endpoint exposes a small, read-only timeline
 * only after the stored hash matches. This keeps a normal resident informed
 * without making pending reports public or requiring an account.
 */
export async function POST(req: Request) {
  let body: { sightings?: RequestedSighting[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const requested = Array.isArray(body.sightings)
    ? body.sightings
        .filter((item) => typeof item.sightingId === "string" && typeof item.ownerToken === "string" && UUID.test(item.sightingId) && item.ownerToken.length >= 24)
        .slice(0, 20) as { sightingId: string; ownerToken: string }[]
    : [];
  if (!requested.length) return NextResponse.json({ sightings: [] });

  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Reporting status is unavailable." }, { status: 503 });

  const rows = await Promise.all(requested.map(async ({ sightingId, ownerToken }) => {
    const { data, error } = await supa
      .from("sightings")
      .select("id, dog_id, nickname, zone, mood_tags, status, created_at")
      .eq("id", sightingId)
      .eq("owner_hash", hash(ownerToken))
      .maybeSingle();
    return error ? null : data;
  }));

  return NextResponse.json({ sightings: rows.filter(Boolean) });
}
