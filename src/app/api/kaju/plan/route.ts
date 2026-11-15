import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { allowUserRequest } from "@/lib/rate-limit";
import { preview, type Intent } from "@/lib/kaju/registry";
import { choosePlanner, type PlanContext } from "@/lib/kaju/planner";
import { modelPlanner } from "@/lib/kaju/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Plan a mission for review. Nothing is created here: the plan comes back with each step's level for this organisation,
   and the person starts it (POST /api/kaju/missions). The caller's own session reads everything, so row-level security
   decides what the planner can see. */
const ACTIONS = new Set(["prepare_followups", "find_overdue", "create_task", "message_channel", "email"]);
export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!(await allowUserRequest(c.db, "ai"))) return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  const b = await req.json().catch(() => null) as { orgId?: unknown; text?: unknown; intent?: unknown; page?: unknown } | null;
  if (!b || typeof b.orgId !== "string" || typeof b.text !== "string" || b.text.length > 4000) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const intent = b.intent && typeof b.intent === "object" && ACTIONS.has(String((b.intent as Intent).action)) ? (b.intent as Intent) : null;

  const ws = await c.db.rpc("nx_my_workspaces");
  const org = (ws.data as { org_id: string; name: string; workspace: string }[] | null)?.find((o) => o.org_id === b.orgId);
  if (ws.error || !org) return NextResponse.json({ error: "You are not a member of that organisation." }, { status: 403 });
  const [chans, people, zones] = await Promise.all([
    c.db.from("nx_channels").select("name").eq("org_id", org.org_id).in("kind", ["channel", "announcement"]).limit(100),
    c.db.rpc("nx_org_people", { p_org: org.org_id }),
    org.workspace === "ngo" ? c.db.rpc("org_zones") : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const page = b.page && typeof b.page === "object" ? { path: String((b.page as { path?: unknown }).path ?? "").slice(0, 200), title: String((b.page as { title?: unknown }).title ?? "").slice(0, 160) } : null;
  const ctx: PlanContext = {
    text: b.text, intent, page,
    org: { id: org.org_id, name: org.name, workspace: org.workspace },
    channels: ((chans.data ?? []) as { name: string }[]).map((x) => x.name),
    people: ((people.data ?? []) as { user_id: string; name: string }[]).map((p) => ({ id: p.user_id, name: p.name })),
    places: ((zones.data ?? []) as ({ zone?: string; name?: string } | string)[]).map((z) => (typeof z === "string" ? z : z.zone ?? z.name ?? "")).filter(Boolean),
  };
  const planner = await choosePlanner(ctx, () => modelPlanner({ purpose: "kaju_chat", userId: c.userId, orgId: org.org_id, db: c.db }));
  if ("unavailable" in planner) return NextResponse.json({ ok: false, error: planner.unavailable, model: false });
  const r = await planner.plan(ctx, req.signal);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error, planner: r.planner });
  const tools = [...new Set(r.plan.steps.map((s) => s.tool))];
  const levels: Record<string, number> = {};
  await Promise.all(tools.map(async (t) => { const l = await c.db.rpc("nx_tool_level", { p_org: org.org_id, p_tool: t }); if (typeof l.data === "number") levels[t] = l.data; }));
  return NextResponse.json({ ok: true, planner: r.planner, plan: r.plan, steps: preview(r.plan, levels) }, { headers: { "Cache-Control": "no-store" } });
}
