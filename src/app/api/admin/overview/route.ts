import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { autoApprovalOn } from "@/lib/auto-approve";
import { photoCheckAvailable } from "@/lib/photo-check";
import { registerTotalsFromCities } from "@/lib/register/totals";
import { canonicalCity, type SpatialCity } from "@/lib/spatial/server";
import { kindOf } from "@/sp/atlas/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// The operator's overview. Same auth as the other admin routes.
//   GET /api/admin/overview
// What every public page prints (read from the same rollup they read),
// whether that rollup agrees with the records underneath it, what the
// data pipeline is doing, and the last week's activity. Read-only.
// ─────────────────────────────────────────────────────────────

type AuthState = "ok" | "unset" | "bad";

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return bearer === secret ? "ok" : "bad";
}

const one = <T,>(r: { data: T | null }) => r.data;

export async function GET(req: Request) {
  const state = authState(req);
  if (state === "unset") return NextResponse.json({ error: "Admin login isn't configured on the server. Set ADMIN_SECRET in Vercel and redeploy." }, { status: 503 });
  if (state === "bad") return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });

  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  const head = { count: "exact" as const, head: true };
  const [cityRes, animals, requests, live, queue, snap, batches, orgs, newAnimals, newRequests, newSightings, lastSighting, lastRequest] = await Promise.all([
    supa.rpc("list_public_spatial_cities", { p_limit: 200 }),
    supa.from("public_spatial_animals").select("id", head),
    supa.from("public_case_facts").select("id", head),
    supa.from("sightings").select("id", head).eq("status", "live"),
    supa.from("spatial_refresh_queue").select("city,requested_at,reason").order("requested_at").limit(50),
    supa.from("map_snapshots").select("built_at").eq("key", "cities").maybeSingle(),
    supa.from("import_batches").select("id,ngo_id,source_filename,status,rows_total,rows_imported,rows_needing_review,created_at,completed_at,ngos(name)").order("created_at", { ascending: false }).limit(10),
    supa.from("ngos").select("id,name,city,verified").order("name"),
    supa.from("dogs").select("id", head).gte("created_at", week),
    supa.from("cases").select("id", head).gte("created_at", week),
    supa.from("sightings").select("id", head).gte("created_at", week),
    supa.from("sightings").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supa.from("cases").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (cityRes.error) return NextResponse.json({ error: cityRes.error.message }, { status: 500 });

  /* The same merge the public pages make: aliases folded into one city. */
  const by = new Map<string, SpatialCity>();
  for (const row of (cityRes.data ?? []) as SpatialCity[]) {
    const city = canonicalCity(row.city);
    const c = by.get(city);
    if (!c) { by.set(city, { ...row, city }); continue; }
    c.animals += Number(row.animals || 0); c.cases += Number(row.cases || 0); c.cells += Number(row.cells || 0);
    c.sterilised = Number(c.sterilised || 0) + Number(row.sterilised || 0);
    c.vaccinated = Number(c.vaccinated || 0) + Number(row.vaccinated || 0);
  }
  const cities = [...by.values()];
  const totals = registerTotalsFromCities(cities);
  const clinical = cities.filter((c) => kindOf(c.city, c.cells) === "clinical").map((c) => ({ city: c.city, animals: Number(c.animals || 0) }));
  const sum = (k: "sterilised" | "vaccinated") => cities.reduce((n, c) => n + Number(c[k] || 0), 0);

  type Batch = { id: string; source_filename: string | null; status: string; rows_total: number | null; rows_imported: number | null; rows_needing_review: number | null; created_at: string; completed_at: string | null; ngos: { name: string } | { name: string }[] | null };
  const orgName = (b: Batch) => (Array.isArray(b.ngos) ? b.ngos[0]?.name : b.ngos?.name) ?? "Organisation not found";

  return NextResponse.json({
    record: {
      animals: totals.animals, requests: totals.cases, cities: totals.cities,
      sterilised: sum("sterilised"), vaccinated: sum("vaccinated"), clinical,
      topCities: [...cities].sort((a, b) => b.animals - a.animals).slice(0, 6).map((c) => ({ city: c.city, animals: c.animals, requests: c.cases, clinical: kindOf(c.city, c.cells) === "clinical" })),
    },
    source: { animals: animals.count ?? null, requests: requests.count ?? null, liveSightings: live.count ?? null },
    pipeline: {
      queue: one(queue) ?? [],
      mapBuiltAt: (one(snap) as { built_at: string } | null)?.built_at ?? null,
      imports: ((one(batches) ?? []) as Batch[]).map((b) => ({ id: b.id, org: orgName(b), file: b.source_filename, status: b.status, total: b.rows_total, imported: b.rows_imported, held: b.rows_needing_review, created_at: b.created_at, completed_at: b.completed_at })),
    },
    orgs: ((one(orgs) ?? []) as { id: string; name: string; city: string | null; verified: boolean | null }[]).map((o) => ({ id: o.id, name: o.name, city: o.city, verified: !!o.verified })),
    week: { animals: newAnimals.count ?? 0, requests: newRequests.count ?? 0, sightings: newSightings.count ?? 0 },
    last: { sighting: (one(lastSighting) as { created_at: string } | null)?.created_at ?? null, request: (one(lastRequest) as { created_at: string } | null)?.created_at ?? null },
    settings: { autoApproval: autoApprovalOn(), photoCheck: photoCheckAvailable() },
    at: new Date().toISOString(),
  });
}
