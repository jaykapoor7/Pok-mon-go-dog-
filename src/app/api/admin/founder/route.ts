import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Authorization",
  "X-Robots-Tag": "noindex, nofollow",
};

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}
function authorized(req: Request): "ok" | "unset" | "denied" {
  const expected = process.env.ADMIN_SECRET?.trim();
  if (!expected) return "unset";
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return "denied";
  const supplied = header.slice(7).trim();
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b) ? "ok" : "denied";
}
function guard(req: Request): NextResponse | null {
  const state = authorized(req);
  if (state === "ok") return null;
  return response({ error: state === "unset" ? "Founder access is not configured." : "Invalid founder access credential." }, state === "unset" ? 503 : 401);
}
function productionPreviewBlocked() {
  return process.env.VERCEL_ENV === "preview" &&
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes("toujthlzjmhmoyykmayx");
}
function windowParams(req: Request) {
  const p = new URL(req.url).searchParams;
  const rawDays = Number(p.get("days") ?? 30);
  const days = [7, 30, 90].includes(rawDays) ? rawDays : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString(), days };
}

async function authSummary(supa: NonNullable<ReturnType<typeof getSupabaseAdmin>>, from: string, to: string) {
  let all = 0, newAccounts = 0, signedIn = 0, active7 = 0;
  let page = 1;
  const fromDate = Date.parse(from), toDate = Date.parse(to);
  const sevenDays = Date.parse(to) - 7 * 86400000;
  // Aggregate on the server; do not transfer emails, names, IPs or user IDs.
  for (; page <= 20; page += 1) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { available: false, reason: "Authentication data could not be read." };
    const users = data?.users ?? [];
    for (const user of users) {
      if (user.is_anonymous === true) continue;
      all += 1;
      const created = Date.parse(user.created_at);
      const last = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
      if (created >= fromDate && created < toDate) newAccounts += 1;
      if (last >= fromDate && last < toDate) signedIn += 1;
      if (last >= sevenDays && last <= toDate) active7 += 1;
    }
    if (users.length < 1000) break;
  }
  if (page > 20) return { available: false, reason: "User listing exceeded supported pagination." };
  return { available: true, registered: all, new_accounts: newAccounts,
    last_signed_in_period: signedIn, last_signed_in_7d: active7,
    note: "Last sign-in is not the same as qualifying product activity." };
}

type WebMetrics = {
  available: boolean; reason?: string;
  visitors?: number; pageviews?: number; from?: string; to?: string; source?: string;
};
async function webSummary(
  supa: NonNullable<ReturnType<typeof getSupabaseAdmin>>, from: string, to: string
): Promise<WebMetrics> {
  const project = process.env.FOUNDER_VERCEL_PROJECT_ID ?? "prj_x2JOsJP2eeirnVGH69wC2WKybDoS";
  const team = process.env.FOUNDER_VERCEL_TEAM_ID ?? "team_qRMlvTFfcxrezBvNVj8C02iF";
  const token = process.env.FOUNDER_VERCEL_ANALYTICS_TOKEN;
  // Only read matching dated snapshots, never present an old period as current.
  const snapshot = await supa.from("founder_web_snapshots")
    .select("visitors,pageviews,range_start,range_end,source")
    .eq("project_id", project).eq("range_start", from).eq("range_end", to)
    .maybeSingle();
  if (!snapshot.error && snapshot.data) {
    return { available: true, visitors: snapshot.data.visitors,
      pageviews: snapshot.data.pageviews, from, to, source: "vercel_snapshot" };
  }
  if (!token) return { available: false,
    reason: "Vercel analytics token not configured. Existing Vercel dashboard remains available." };
  try {
    const params = new URLSearchParams({ projectId: project, teamId: team, since: from, until: to });
    const result = await fetch(`https://api.vercel.com/v1/query/web-analytics/visits/count?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    if (!result.ok) return { available: false, reason: `Vercel analytics unavailable (HTTP ${result.status}).` };
    const json = await result.json() as { data?: { visitors?: number; pageviews?: number }; result?: { data?: { visitors?: number; pageviews?: number } } };
    const d = json.data ?? json.result?.data;
    if (typeof d?.visitors !== "number" || typeof d?.pageviews !== "number")
      return { available: false, reason: "Unexpected Vercel analytics response." };
    return { available: true, visitors: d.visitors, pageviews: d.pageviews, from, to, source: "vercel_live" };
  } catch {
    return { available: false, reason: "Vercel analytics could not be reached." };
  }
}

export async function GET(req: Request) {
  const rejected = guard(req);
  if (rejected) return rejected;
  if (productionPreviewBlocked()) return response({
    error: "Preview is connected to the production database. Configure the staging Supabase environment before testing analytics.",
  }, 503);
  const supa = getSupabaseAdmin();
  if (!supa) return response({ error: "Server database access is not configured." }, 503);
  const { from, to, days } = windowParams(req);
  const [rollup, auth, web, activity] = await Promise.all([
    supa.rpc("founder_analytics_rollup", { p_from: from, p_to: to }),
    authSummary(supa, from, to),
    webSummary(supa, from, to),
    supa.rpc("founder_activity_rollup", { p_from: from, p_to: to }),
  ]);
  if (rollup.error || !rollup.data) return response({
    error: "Founder reporting function is unavailable. Apply the founder-intelligence migration to this environment.",
    detail: rollup.error?.code ?? null,
  }, 503);
  return response({
    period: { days, from, to },
    environment: process.env.VERCEL_ENV ?? "unknown",
    analytics: rollup.data,
    authentication: auth,
    web,
    activity: activity.error || !activity.data
      ? { available: false, reason: "Workflow instrumentation reporting unavailable." }
      : { available: true, ...activity.data },
    definitions: {
      active_orgs: "Count verified member-attributed native workflow actions once a complete 7-day tracking window exists.",
      impact: "Historical imports are reported as data coverage, not platform-assisted outcomes.",
      visitor: "Vercel's privacy-preserving unique visitor estimate, not registered users.",
      source: "Counts and dates are drawn from production records only after explicit production migration and release.",
    },
  });
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAGES = new Set(["planned", "onboarding", "active", "paused", "completed", "sustained", "cancelled"]);
type PilotPayload = {
  id?: string; ngo_id?: string; label?: string; stage?: string;
  started_on?: string | null; ended_on?: string | null; notes?: string | null;
};
function pilotFields(body: PilotPayload) {
  const fields: Record<string, string | null> = {};
  if (body.stage !== undefined) {
    if (!STAGES.has(body.stage)) throw new Error("Invalid pilot stage");
    fields.stage = body.stage;
  }
  if (body.label !== undefined) {
    if (typeof body.label !== "string" || body.label.trim().length < 2 || body.label.length > 160)
      throw new Error("Pilot label must be between 2 and 160 characters");
    fields.label = body.label.trim();
  }
  if (body.notes !== undefined) {
    if (body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 2000))
      throw new Error("Notes are too long");
    fields.notes = body.notes ?? null;
  }
  for (const key of ["started_on", "ended_on"] as const) {
    if (body[key] !== undefined) {
      const d = body[key];
      if (d !== null && (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d))))
        throw new Error("Invalid date");
      fields[key] = d ?? null;
    }
  }
  return fields;
}
async function changePilot(req: Request, update: boolean) {
  const rejected = guard(req);
  if (rejected) return rejected;
  if (productionPreviewBlocked()) return response({ error: "Staging database required for preview." }, 503);
  const supa = getSupabaseAdmin();
  if (!supa) return response({ error: "Server database access is not configured." }, 503);
  let input: PilotPayload;
  try {
    input = (await req.json()) as PilotPayload;
    if (!input || typeof input !== "object" || Array.isArray(input))
      return response({ error: "Invalid payload." }, 400);
    const fields = pilotFields(input);
    if (update) {
      if (!input.id || !UUID.test(input.id)) return response({ error: "Valid pilot ID required." }, 400);
      if (!Object.keys(fields).length) return response({ error: "No changes supplied." }, 400);
      const { data, error } = await supa.from("founder_pilots").update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", input.id).select("id").maybeSingle();
      if (error) return response({ error: "Could not update pilot." }, 500);
      if (!data) return response({ error: "Pilot not found." }, 404);
      return response({ ok: true, pilot_id: data.id });
    }
    if (!input.ngo_id || !UUID.test(input.ngo_id) || !fields.label)
      return response({ error: "A real organization and a pilot label are required." }, 400);
    const { data: org, error: orgError } = await supa.from("ngos").select("id,demo_mode").eq("id", input.ngo_id).maybeSingle();
    if (orgError || !org || org.demo_mode === true) return response({ error: "Verified organization record required." }, 400);
    const { data, error } = await supa.from("founder_pilots")
      .insert({ ...fields, ngo_id: org.id }).select("id").single();
    if (error) return response({ error: "Could not create pilot." }, 500);
    return response({ ok: true, pilot_id: data.id }, 201);
  } catch (e) {
    return response({ error: e instanceof Error ? e.message : "Invalid payload." }, 400);
  }
}
export async function POST(req: Request) { return changePilot(req, false); }
export async function PATCH(req: Request) { return changePilot(req, true); }
