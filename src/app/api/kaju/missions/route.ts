import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { allowUserRequest } from "@/lib/rate-limit";
import { validatePlan } from "@/lib/kaju/registry";
import { recordLinkOf } from "@/lib/kaju/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Start a reviewed mission. The plan is validated again here and once more by the database (nx_mission_start), which
   runs the first steps at once and the rest on schedule, as the person who started it. `key` makes a double press start
   one mission, not two. */
export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!(await allowUserRequest(c.db, "ai-act"))) return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  const b = await req.json().catch(() => null) as { orgId?: unknown; plan?: unknown; key?: unknown; channelId?: unknown; deadline?: unknown; request?: unknown } | null;
  if (!b || typeof b.orgId !== "string" || typeof b.key !== "string" || !/^[A-Za-z0-9:_-]{8,80}$/.test(b.key)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const v = validatePlan(b.plan);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 422 });
  /* What the person asked, kept with the mission: their words, who planned it, and the record it is about, if any. The
     record link is cleaned to a known kind, an id and a short label; it is a label for the workroom and the record's
     list, never a permission (the record is read again with the person's own access wherever it is shown). */
  const raw = b.request && typeof b.request === "object" && !Array.isArray(b.request) ? (b.request as Record<string, unknown>) : {};
  const record = recordLinkOf(raw.record);
  const request = { ...(typeof raw.text === "string" ? { text: raw.text.slice(0, 2000) } : {}), ...(typeof raw.planner === "string" ? { planner: raw.planner.slice(0, 20) } : {}), ...(record ? { record } : {}) };
  const deadline = typeof b.deadline === "string" && !Number.isNaN(Date.parse(b.deadline)) ? new Date(b.deadline).toISOString() : null;
  const { data, error } = await c.db.rpc("nx_mission_start", {
    p_org: b.orgId, p_title: v.plan.title, p_request: request, p_steps: v.plan.steps,
    p_key: b.key, p_channel: typeof b.channelId === "string" ? b.channelId : null, p_deadline: deadline,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 400 });
  return NextResponse.json({ id: data });
}
