import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { inferenceMode } from "@/lib/ai/inference";
import build from "@/lib/build-info.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// The operator's view of the platform as it is now. Same auth as the
// other admin routes.   GET /api/admin/platform
//   live      production and the demonstration site: up, which build
//   partners  every organisation with a workspace, its people and how
//             recently it did any work
//   connected work passed between organisations in the last 7 days
//   site      what visitors opened on the public site in the last 7 days
// Read-only. Counts and names only: nothing here reads the health
// schema, a patient, or a message body.
// ─────────────────────────────────────────────────────────────

type AuthState = "ok" | "unset" | "bad";
function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  return bearer === secret ? "ok" : "bad";
}

const DEMO = "https://demo.straypaw.org";
const DAY = 864e5;

async function demoHealth(): Promise<{ up: boolean; sha: string | null; database: string | null; ms: number | null }> {
  const t0 = Date.now();
  try {
    const r = await fetch(`${DEMO}/api/health?deep=1`, { cache: "no-store", signal: AbortSignal.timeout(6000), headers: { Accept: "application/json" } });
    const b = (await r.json().catch(() => ({}))) as { sha?: string; database?: string };
    return { up: r.ok, sha: b.sha ?? null, database: b.database ?? null, ms: Date.now() - t0 };
  } catch { return { up: false, sha: null, database: null, ms: null }; }
}

type Row = { id: string; name: string; kind: string; city: string | null; sample: boolean; people: number; invites: number; week: number; month: number; last: string | null };

export async function GET(req: Request) {
  const state = authState(req);
  if (state === "unset") return NextResponse.json({ error: "Admin login isn't configured on the server. Set ADMIN_SECRET in Vercel and redeploy." }, { status: 503 });
  if (state === "bad") return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });

  const now = Date.now(), week = new Date(now - 7 * DAY).toISOString(), month = new Date(now - 30 * DAY).toISOString();
  const today = new Date(now).toISOString().slice(0, 10);
  const [demo, ngos, ngoMembers, ohOrgs, ohMembers, invites, cases, dogs, handoffs, samples, views, logins, automations] = await Promise.all([
    demoHealth(),
    supa.from("ngos").select("id,name,city,demo_mode"),
    supa.from("ngo_members").select("ngo_id"),
    supa.from("oh_organisations").select("id,kind,name,short_name,ngo_id,illustrative"),
    supa.from("oh_members").select("organisation_id"),
    supa.from("oh_invites").select("organisation_id").is("accepted_at", null).gt("expires_at", new Date(now).toISOString()),
    supa.from("cases").select("ngo_id,updated_at").gte("updated_at", month).limit(20000),
    supa.from("dogs").select("ngo_id,updated_at").gte("updated_at", month).limit(20000),
    supa.from("oh_handoffs").select("from_org,to_org,status,due_on,created_at,closed_at").gte("created_at", month).limit(20000),
    supa.from("oh_samples").select("submitted_by,laboratory_id,status,created_at,resulted_at").gte("created_at", month).limit(20000),
    supa.from("events").select("path,anon_id").eq("name", "page_view").gte("created_at", week).limit(50000),
    supa.from("events").select("id", { count: "exact", head: true }).eq("name", "login").gte("created_at", week),
    supa.from("automations").select("status"),
  ]);

  /* One row per organisation with a workspace. An NGO that also sits in a programme is one row. */
  const rows = new Map<string, Row>();
  const count = (xs: { [k: string]: unknown }[] | null, key: string) => { const m = new Map<string, number>(); for (const x of xs ?? []) { const k = x[key] as string | null; if (k) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
  const ngoPeople = count(ngoMembers.data, "ngo_id"), ohPeople = count(ohMembers.data, "organisation_id"), ohInvites = count(invites.data, "organisation_id");
  const ngoById = new Map((ngos.data ?? []).map((n) => [n.id as string, n]));
  const ohToRow = new Map<string, string>();
  for (const [id, people] of ngoPeople) {
    const n = ngoById.get(id); if (!n) continue;
    rows.set(`ngo:${id}`, { id, name: n.name as string, kind: "ngo", city: (n.city as string | null) ?? null, sample: !!n.demo_mode, people, invites: 0, week: 0, month: 0, last: null });
  }
  for (const o of ohOrgs.data ?? []) {
    const key = o.ngo_id && rows.has(`ngo:${o.ngo_id}`) ? `ngo:${o.ngo_id}` : `oh:${o.id}`;
    ohToRow.set(o.id as string, key);
    const r = rows.get(key);
    if (r) { r.people += ohPeople.get(o.id as string) ?? 0; r.invites += ohInvites.get(o.id as string) ?? 0; r.sample ||= !!o.illustrative; continue; }
    rows.set(key, { id: o.id as string, name: (o.short_name as string | null) || (o.name as string), kind: o.kind as string, city: null, sample: !!o.illustrative, people: ohPeople.get(o.id as string) ?? 0, invites: ohInvites.get(o.id as string) ?? 0, week: 0, month: 0, last: null });
  }
  const touch = (key: string | undefined, at: string | null) => {
    const r = key ? rows.get(key) : undefined; if (!r || !at) return;
    r.month++; if (at >= week) r.week++;
    if (!r.last || at > r.last) r.last = at;
  };
  for (const c of [...(cases.data ?? []), ...(dogs.data ?? [])]) touch(c.ngo_id ? `ngo:${c.ngo_id}` : undefined, c.updated_at as string);
  for (const h of handoffs.data ?? []) { touch(h.from_org ? ohToRow.get(h.from_org as string) : undefined, h.created_at as string); if (h.closed_at) touch(ohToRow.get(h.to_org as string), h.closed_at as string); }
  for (const s of samples.data ?? []) { touch(ohToRow.get(s.submitted_by as string), s.created_at as string); if (s.resulted_at) touch(ohToRow.get(s.laboratory_id as string), s.resulted_at as string); }

  /* Work passed between organisations: the part only a shared platform can do. */
  const hs = handoffs.data ?? [], ss = samples.data ?? [];
  const connected = {
    sent: hs.filter((h) => (h.created_at as string) >= week).length,
    answered: hs.filter((h) => h.closed_at && (h.closed_at as string) >= week).length,
    overdue: hs.filter((h) => (h.status === "open" || h.status === "accepted") && h.due_on && (h.due_on as string) < today).length,
    samplesSent: ss.filter((s) => (s.created_at as string) >= week).length,
    resulted: ss.filter((s) => s.resulted_at && (s.resulted_at as string) >= week).length,
    waitingAtLab: ss.filter((s) => ["collected", "dispatched", "received", "testing"].includes(s.status as string)).length,
  };

  /* What visitors opened. Paths only, grouped by their first segment; no person is identified. */
  const pv = views.data ?? [];
  const byPath = new Map<string, number>();
  for (const v of pv) { const p = `/${String(v.path ?? "/").split("?")[0].split("/")[1] ?? ""}`; byPath.set(p, (byPath.get(p) ?? 0) + 1); }
  const site = {
    views: pv.length, visitors: new Set(pv.map((v) => v.anon_id).filter(Boolean)).size, logins: logins.count ?? 0,
    pages: [...byPath].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([path, n]) => ({ path, n })),
    capped: pv.length >= 50000,
  };

  const missing = (e: { code?: string } | null) => e?.code === "42P01" || e?.code === "PGRST205";
  return NextResponse.json({
    live: {
      production: { sha: process.env.VERCEL_GIT_COMMIT_SHA || build.sha, environment: process.env.VERCEL_ENV || "local" },
      demo,
      kaju: inferenceMode(),
      automations: missing(automations.error) ? { state: "awaiting_database" as const, on: 0 } : automations.error ? { state: "unread" as const, on: 0 } : { state: "ready" as const, on: (automations.data ?? []).filter((a) => a.status === "active").length },
    },
    partners: [...rows.values()].sort((a, b) => Number(a.sample) - Number(b.sample) || (b.last ?? "").localeCompare(a.last ?? "") || a.name.localeCompare(b.name)),
    connected,
    site,
    unread: [ngos.error && "organisations", handoffs.error && "hand-offs", samples.error && "samples", views.error && "site visits"].filter(Boolean),
    at: new Date(now).toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
