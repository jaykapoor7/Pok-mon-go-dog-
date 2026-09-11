import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* How many animals are on the record, right now.
   The hero renders a server count on first paint and then asks this, so the
   number climbs while somebody is looking at the page rather than only when
   they reload it. Cheap: a head request with an exact count, no rows. */
export async function GET() {
  const supa = getSupabase();
  if (!supa) return NextResponse.json({ count: null }, { status: 503 });

  const { count, error } = await supa
    .from("dogs")
    .select("id", { count: "exact", head: true });

  if (error) return NextResponse.json({ count: null }, { status: 500 });

  return NextResponse.json(
    { count: count ?? 0 },
    { headers: { "Cache-Control": "no-store" } }
  );
}
