import { NextResponse } from "next/server";
import { caller } from "@/lib/connections/server";
import { allowUserRequest } from "@/lib/rate-limit";
import { extractFieldMessage } from "@/sp3/ai/extract";
import { clean, planIntake, splitMessages, type AnimalCandidate, type CaseCandidate } from "@/sp3/ai/intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Pasted reports → prepared intake plans. Reads only, under the caller's
   own session; saving happens on Confirm through /api/ai/act. */

const like = (s: string) => s.replace(/[%,()*\\_]/g, " ").trim().slice(0, 60);
const label = (d: { name?: string | null; straypaw_id?: string | null; code?: string | null }) => d.name || d.straypaw_id || d.code || "Unnamed animal";

export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  if (!c.ngoId) return NextResponse.json({ error: "An organisation workspace is required." }, { status: 403 });
  if (!(await allowUserRequest(c.db, "ai"))) return NextResponse.json({ error: "Kaju is busy for a moment. Try again shortly." }, { status: 429 });
  const body = await req.json().catch(() => null);
  /* Pasted text, or already-separated messages (the WhatsApp inbox, once connected). */
  const messages = Array.isArray(body?.messages)
    ? clean(body.messages.filter((m: unknown): m is string => typeof m === "string").map((m: string) => m.slice(0, 2000)))
    : splitMessages(typeof body?.text === "string" ? body.text.slice(0, 12000) : "");
  if (!messages.length) return NextResponse.json({ error: "Paste at least one report." }, { status: 400 });

  const now = new Date();
  const extracted = messages.map((m) => extractFieldMessage(m, now));
  const tags = [...new Set(extracted.map((x) => x.tag).filter(Boolean) as string[])];
  const places = [...new Set(extracted.map((x) => x.place).filter((p): p is string => !!p && p.length >= 4))].slice(0, 12);

  const dogCols = "id,name,straypaw_id,code,zone,sex";
  const [ngo, cases, byTag, ...byPlace] = await Promise.all([
    c.db.from("ngos").select("city").eq("id", c.ngoId).maybeSingle(),
    c.db.from("org_case_facts").select("id,case_code,title,dog_id,zone,occurred_at").eq("ngo_id", c.ngoId).in("status_class", ["open", "in_progress"]).limit(800),
    tags.length ? c.db.from("dogs").select(dogCols).eq("ngo_id", c.ngoId).or(tags.map((t) => `straypaw_id.eq.${like(t)},code.eq.${like(t)}`).join(",")).limit(20) : Promise.resolve({ data: [], error: null }),
    ...places.map((p) => c.db.from("dogs").select(dogCols).eq("ngo_id", c.ngoId).ilike("zone", `%${like(p)}%`).order("last_seen", { ascending: false }).limit(4)),
  ]);
  if (cases.error || byTag.error || byPlace.some((r) => r.error)) {
    return NextResponse.json({ error: "The register could not be read, so duplicates cannot be checked. Nothing was prepared; try again." }, { status: 503 });
  }
  type Dog = { id: string; name: string | null; straypaw_id: string | null; code: string | null; zone: string | null; sex: string | null };
  const seen = new Set<string>();
  const animals: AnimalCandidate[] = [];
  for (const d of [...(byTag.data ?? []), ...byPlace.flatMap((r) => r.data ?? [])] as Dog[]) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    for (const tag of [d.straypaw_id, d.code].filter(Boolean) as string[]) animals.push({ id: d.id, label: label(d), tag, zone: d.zone, sex: d.sex });
    if (!d.straypaw_id && !d.code) animals.push({ id: d.id, label: label(d), tag: null, zone: d.zone, sex: d.sex });
  }
  const openCases: CaseCandidate[] = (cases.data ?? []).map((x) => ({ id: x.id, label: x.case_code || x.title || "Open case", dogId: x.dog_id, zone: x.zone, occurredAt: x.occurred_at }));
  const defaultCity = (ngo.data?.city as string | null) ?? null;

  const plans = messages.map((m, i) => planIntake(m, extracted[i], { orgId: c.ngoId as string, defaultCity, animals, openCases, now }));
  const ids = plans.flatMap((p) => p.options.map((o) => o.proposal.id));
  const done = ids.length ? (await c.db.from("kaju_action_receipts").select("request_id,record_id,record_table").eq("actor_id", c.userId).in("request_id", ids)).data ?? [] : [];
  /* Only the 800 most recent open cases are compared; say so rather than imply a full check. */
  const partial = (cases.data ?? []).length >= 800;
  return NextResponse.json({ plans, done, defaultCity, partial }, { headers: { "Cache-Control": "no-store" } });
}
