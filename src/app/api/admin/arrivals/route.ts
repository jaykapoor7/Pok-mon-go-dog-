import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// What came in, newest first. Same auth as the other admin routes.
//   GET /api/admin/arrivals
// Every sighting in any status (pending, live, rejected), and every
// request for help opened in StrayPaw itself (rows from an imported
// register are history, not arrivals, and are left out). Each says who
// it came from: the community (a guest or a signed-in person) or an
// organisation. Read-only; informer contact details never leave here.
// ─────────────────────────────────────────────────────────────

type AuthState = "ok" | "unset" | "bad";

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return bearer === secret ? "ok" : "bad";
}


type SRow = {
  id: string; created_at: string; status: string | null; zone: string | null; nickname: string | null; photo_url: string | null; notes: string | null;
  reporter_name: string | null; volunteer_name: string | null; user_id: string | null; ngo_id: string | null; dog_id: string | null; claimed_dog_id: string | null;
  sterilisation_status: string | null; vaccination_status: string | null; is_demo: boolean | null;
};
type CRow = {
  id: string; created_at: string; status: string | null; title: string | null; zone: string | null; city: string | null; condition_text: string | null; severity: string | null;
  intake_channel: string | null; provenance: string | null; created_by_name: string | null; assignee_name: string | null; dog_id: string | null; case_code: string | null;
  verification_state: string | null; photos: string[] | null; before_url: string | null; is_demo: boolean | null; ngo_id: string | null;
};

export type Arrival = {
  id: string; kind: "sighting" | "request"; at: string; status: string;
  source: "community" | "organisation"; by: string; org: string | null;
  title: string; place: string | null; photo: string | null; notes: string | null;
  animal: string | null; code: string | null; channel: string | null; demo: boolean;
};

export async function GET(req: Request) {
  const state = authState(req);
  if (state === "unset") return NextResponse.json({ error: "Admin login isn't configured on the server. Set ADMIN_SECRET in Vercel and redeploy." }, { status: 503 });
  if (state === "bad") return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });

  const [s, c] = await Promise.all([
    supa.from("sightings")
      .select("id,created_at,status,zone,nickname,photo_url,notes,reporter_name,volunteer_name,user_id,ngo_id,dog_id,claimed_dog_id,sterilisation_status,vaccination_status,is_demo")
      .order("created_at", { ascending: false }).limit(80),
    supa.from("cases")
      .select("id,created_at,status,title,zone,city,condition_text,severity,intake_channel,provenance,created_by_name,assignee_name,dog_id,case_code,verification_state,photos,before_url,is_demo,ngo_id")
      .is("import_batch_id", null)
      .order("created_at", { ascending: false }).limit(80),
  ]);
  if (s.error) return NextResponse.json({ error: `Sightings could not be read: ${s.error.message}` }, { status: 500 });
  if (c.error) return NextResponse.json({ error: `Requests could not be read: ${c.error.message}` }, { status: 500 });
  const sRows = (s.data ?? []) as SRow[], cRows = (c.data ?? []) as CRow[];
  /* Organisation names by id: sightings.ngo_id carries no foreign key, so it cannot be embedded. */
  const ids = [...new Set([...sRows, ...cRows].map((r) => r.ngo_id).filter((x): x is string => !!x))];
  const orgs = ids.length ? await supa.from("ngos").select("id,name").in("id", ids) : { data: [] as { id: string; name: string }[], error: null };
  const names = new Map(((orgs.data ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]));
  const orgName = (id: string | null) => (id ? names.get(id) ?? null : null);

  const sightings: Arrival[] = sRows.map((r) => {
    const org = orgName(r.ngo_id);
    return {
      id: `s:${r.id}`, kind: "sighting", at: r.created_at, status: r.status ?? "pending",
      source: r.ngo_id ? "organisation" : "community",
      by: r.ngo_id ? `${org ?? "An organisation"}${r.volunteer_name ? ` · ${r.volunteer_name}` : ""}` : r.user_id ? `Signed-in reporter${r.reporter_name ? ` · ${r.reporter_name}` : ""}` : `Guest${r.reporter_name ? ` · ${r.reporter_name}` : ""}`,
      org, title: r.nickname?.trim() || "Sighting", place: r.zone, photo: r.photo_url, notes: r.notes,
      animal: r.claimed_dog_id ?? r.dog_id, code: null, channel: null, demo: !!r.is_demo,
    };
  });
  /* A request reported by the community stays the community's, even once an organisation takes it. */
  const requests: Arrival[] = cRows
    .filter((r) => !/import/i.test(r.provenance ?? ""))
    .map((r) => {
      const org = orgName(r.ngo_id), community = r.provenance === "community_report" || !r.ngo_id;
      return {
        id: `c:${r.id}`, kind: "request", at: r.created_at, status: r.status ?? "open",
        source: community ? "community" : "organisation",
        by: community ? `Community report${r.created_by_name ? ` · ${r.created_by_name}` : ""}` : `${org ?? "An organisation"}${r.created_by_name ? ` · ${r.created_by_name}` : ""}`,
        org, title: r.title?.trim() || r.condition_text?.trim() || "Request for help", place: [r.zone, r.city].filter(Boolean).join(", ") || null,
        photo: r.before_url ?? r.photos?.[0] ?? null, notes: r.condition_text && r.condition_text !== r.title ? r.condition_text : null,
        animal: r.dog_id, code: r.case_code, channel: r.intake_channel, demo: !!r.is_demo,
      };
    });

  const arrivals = [...sightings, ...requests].sort((a, b) => b.at.localeCompare(a.at));
  const week = Date.now() - 7 * 864e5;
  return NextResponse.json({ arrivals, week: arrivals.filter((a) => Date.parse(a.at) >= week).length, at: new Date().toISOString() });
}
