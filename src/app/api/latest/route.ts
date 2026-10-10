import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/* The three newest public entries on the record, for the "latest" line in
   the app sidebar and More sheet: newest requests and care from
   public_case_facts and newest approved sightings from public_live_sightings.
   Public fields only (what the entry was, the locality, when, and the animal
   it belongs to). Cached for five minutes. */

type Item = { what: string; where: string | null; at: string; dog: string | null };
const place = (z: string | null) => (z ?? "").split(",")[0].trim() || null;

export async function GET() {
  const supa = getSupabase();
  if (!supa) return NextResponse.json({ items: [] });
  const [cases, sightings] = await Promise.all([
    supa.from("public_case_facts").select("occurred_at,zone,condition_class,dog_id").order("occurred_at", { ascending: false }).limit(6),
    supa.from("public_live_sightings").select("created_at,zone,dog_id").order("created_at", { ascending: false }).limit(6),
  ]);
  const items: Item[] = [
    ...((cases.data ?? []) as { occurred_at: string; zone: string | null; condition_class: string | null; dog_id: string | null }[])
      .map((r) => ({ what: r.condition_class || "Request for help", where: place(r.zone), at: r.occurred_at, dog: r.dog_id })),
    ...((sightings.data ?? []) as { created_at: string; zone: string | null; dog_id: string | null }[])
      .map((r) => ({ what: "Sighting", where: place(r.zone), at: r.created_at, dog: r.dog_id })),
  ].filter((x) => x.at).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    /* One line per animal and kind: a case logged twice is one entry. */
    .filter((x, i, all) => all.findIndex((y) => y.dog === x.dog && y.what === x.what) === i).slice(0, 3);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" } });
}
