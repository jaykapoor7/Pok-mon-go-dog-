import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueueRow } from "@/lib/abc";
import { EVIDENCE_LABEL, stageOf } from "@/lib/abc";
import { isDecided, isWaitingOnOffice } from "@/lib/machines/package";
import { shortCode } from "@/lib/caseCode";
import { activityShifts, daysSince, digestLines, overdueGroups, rescheduleDate, wardCoverage, weeklySeries, type OverdueFollowup } from "./automations";
import { monthBounds, monthlyPlan } from "./monthly";
import { checkPackage } from "./packageCheck";
import type { Citation, Proposal } from "./types";

/* ════════════════════════════════════════════════════════════════════
   Kaju automations that read records. Every read runs under the caller's
   own session (row-level security decides what comes back). A failed read
   is reported as unknown, never as zero. Nothing here writes: follow-ups
   come back as proposals the person confirms.
   ════════════════════════════════════════════════════════════════════ */

type Ctx = { db: SupabaseClient; orgId: string | null; userId?: string; actorRole?: string | null };
type Out = { data: unknown; summary: string; citations: Citation[]; proposals?: Proposal[]; ok?: boolean };

const DAY = 86_400_000;
const FAILED: Out = { data: { error: "Records could not be read. Counts are unknown; try again." }, summary: "Could not read the records. Try again.", citations: [], ok: false };
const NEEDS_ORG: Out = { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false };
const NEEDS_OFFICE: Out = { data: { error: "Reviewing office access required" }, summary: "This is for a municipal reviewing office", citations: [], ok: false };
const pid = () => Math.random().toString(36).slice(2, 10);
const current = "provenance.is.null,provenance.neq.imported_historical_record";
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

/* ── NGO: the weekly digest ─────────────────────────────────────────── */
export async function weeklyDigest({ db, orgId }: Ctx): Promise<Out> {
  if (!orgId) return NEEDS_ORG;
  const now = Date.now(), since = new Date(now - 7 * DAY).toISOString();
  const facts = () => db.from("org_case_facts").select("id", { count: "exact", head: true }).eq("ngo_id", orgId);
  const [opened, closed, care, signs, pk, queue, overdue] = await Promise.all([
    facts().gte("occurred_at", since).or(current),
    facts().eq("status_class", "closed").gte("last_activity_at", since),
    db.from("medical_events").select("kind,dogs!inner(ngo_id)").eq("dogs.ngo_id", orgId).gte("event_date", since.slice(0, 10)).limit(2000),
    db.from("abc_attestations").select("kind").eq("ngo_id", orgId).is("revoked_at", null).gte("created_at", since).limit(2000),
    db.from("report_packages").select("submitted_at,decided_at").eq("ngo_id", orgId).or(`submitted_at.gte.${since},decided_at.gte.${since}`).limit(200),
    db.rpc("abc_verification_queue", { p_limit: 500 }),
    db.from("animal_followups").select("id,dogs!inner(ngo_id)", { count: "exact", head: true }).eq("dogs.ngo_id", orgId).eq("status", "upcoming").lt("due_at", new Date(now).toISOString()),
  ]);
  const careBy: Record<string, number> | null = care.error ? null : {};
  if (careBy) for (const r of (care.data ?? []) as { kind: string | null }[]) { const k = r.kind ?? "other"; careBy[k] = (careBy[k] ?? 0) + 1; }
  const signRows = (signs.data ?? []) as { kind: string }[];
  const pkRows = (pk.data ?? []) as { submitted_at: string | null; decided_at: string | null }[];
  const waiting = queue.error ? null : { vet: 0, review: 0, evidence: 0 };
  if (waiting) for (const r of (queue.data ?? []) as QueueRow[]) { const s = stageOf(r); if (s === "vet") waiting.vet++; else if (s === "review") waiting.review++; else if (s === "evidence") waiting.evidence++; }
  const lines = digestLines({
    opened: opened.error ? null : opened.count ?? null, closed: closed.error ? null : closed.count ?? null,
    care: careBy,
    signoffs: signs.error ? null : { vet: signRows.filter((s) => s.kind === "vet_authorised").length, reviewed: signRows.filter((s) => s.kind === "evidence_reviewed").length },
    packages: pk.error ? null : { submitted: pkRows.filter((p) => p.submitted_at && p.submitted_at >= since).length, decided: pkRows.filter((p) => p.decided_at && p.decided_at >= since).length },
    waiting, overdue: overdue.error ? null : overdue.count ?? null,
  });
  const failed = [opened, closed, care, signs, pk, queue, overdue].filter((r) => r.error).length;
  if (failed === 7) return FAILED;
  const citations: Citation[] = [
    { id: "work", label: "Work queue", href: "/ngo/work", kind: "page" },
    { id: "abc", label: "ABC queue", href: "/ngo/verification", kind: "page" },
  ];
  return { data: { since, ...lines, partial: failed > 0 }, summary: `Last 7 days${failed ? ` · ${failed} source${failed === 1 ? "" : "s"} unreadable` : ""}`, citations };
}

/* ── NGO: overdue follow-ups, prepared for one-tap rescheduling ────────── */
export async function overdueFollowups({ db, orgId }: Ctx): Promise<Out> {
  if (!orgId) return NEEDS_ORG;
  const now = Date.now();
  const f = await db.from("animal_followups").select("id,case_id,dog_id,due_at,kind,dogs!inner(ngo_id,name,straypaw_id,code)").eq("dogs.ngo_id", orgId).eq("status", "upcoming").lt("due_at", new Date(now).toISOString()).order("due_at", { ascending: true }).limit(200);
  if (f.error) return FAILED;
  type Row = { id: string; case_id: string | null; dog_id: string | null; due_at: string; kind: string | null; dogs: { name: string | null; straypaw_id: string | null; code: string | null } | { name: string | null; straypaw_id: string | null; code: string | null }[] | null };
  const rows = (f.data ?? []) as Row[];
  const caseIds = [...new Set(rows.map((r) => r.case_id).filter(Boolean) as string[])];
  const cases = caseIds.length ? await db.from("org_case_facts").select("id,case_code,assignee_name").eq("ngo_id", orgId).in("id", caseIds.slice(0, 150)) : { data: [], error: null };
  if (cases.error) return FAILED;
  const byCase = new Map(((cases.data ?? []) as { id: string; case_code: string | null; assignee_name: string | null }[]).map((c) => [c.id, c]));
  const items: OverdueFollowup[] = rows.map((r) => {
    const d = one(r.dogs), c = r.case_id ? byCase.get(r.case_id) : undefined;
    return { id: r.id, case_id: r.case_id, dog_id: r.dog_id, due_at: r.due_at, kind: r.kind, holder: c?.assignee_name ?? null, label: d?.name || (d?.straypaw_id ? shortCode(d.straypaw_id) : null) || (c?.case_code ? shortCode(c.case_code) : "Animal") };
  });
  const groups = overdueGroups(items, now);
  const due = rescheduleDate(now);
  const proposals: Proposal[] = groups.flatMap((g) => g.items).filter((i) => i.case_id).slice(0, 6).map((i) => ({
    id: pid(), why: `Overdue by ${i.daysLate} day${i.daysLate === 1 ? "" : "s"}${i.holder ? ` · held by ${i.holder}` : ""}`, kind: "schedule_followup" as const, caseId: i.case_id!, caseLabel: i.label, dogId: i.dog_id, dueAt: due,
    note: `${(i.kind ?? "Follow-up").replace(/_/g, " ")} was due ${new Date(i.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} and not recorded. Rescheduled.`,
  }));
  const citations: Citation[] = groups.flatMap((g) => g.items).slice(0, 8).map((i) => ({ id: i.id, label: `${i.label} · ${i.daysLate}d late`, href: i.case_id ? `/ngo/cases/${i.case_id}` : i.dog_id ? `/ngo/animals/${i.dog_id}` : "/ngo/work", kind: i.case_id ? "case" as const : "animal" as const }));
  return { data: { total: items.length, groups: groups.map((g) => ({ holder: g.holder, count: g.items.length, oldest: g.items[0]?.daysLate ?? 0 })), reschedule_to: due, limit: 200 }, summary: `${items.length} overdue follow-up${items.length === 1 ? "" : "s"}`, citations, proposals };
}

/* ── NGO: this month's claim, drafted with its blockers ───────────────── */
export async function claimDraft({ db, orgId }: Ctx): Promise<Out> {
  if (!orgId) return NEEDS_ORG;
  const now = new Date(), b = monthBounds(now), today = now.toISOString().slice(0, 10);
  const [queue, contracts] = await Promise.all([
    db.rpc("abc_verification_queue", { p_limit: 500 }),
    db.from("operations_contracts").select("office_id,starts_on,ends_on,name").eq("ngo_id", orgId).lte("starts_on", today).gte("ends_on", today).limit(20),
  ]);
  if (queue.error) return FAILED;
  const rows = (queue.data ?? []) as QueueRow[];
  const plan = monthlyPlan(rows, now);
  const offices = [...new Set(((contracts.data ?? []) as { office_id: string }[]).map((c) => c.office_id))];
  let ready: { count: number; total: string | null; unpriced: number } | null = null;
  if (!contracts.error && offices.length === 1) {
    const p = await db.rpc("abc_billing_preview", { p_start: b.start, p_end: b.end, p_office: offices[0] });
    if (!p.error && p.data) { const d = p.data as { count: number; total: string | null; unpriced: number }; ready = { count: d.count, total: d.total, unpriced: d.unpriced }; }
  }
  const inMonth = rows.filter((r) => r.provenance !== "imported_historical_record" && r.created_at.slice(0, 10) >= b.start && r.created_at.slice(0, 10) <= b.end);
  const blocked = inMonth.filter((r) => ["evidence", "vet", "review", "returned"].includes(stageOf(r))).slice(0, 8).map((r) => {
    const s = stageOf(r);
    const why = s === "evidence" ? `missing ${r.missing.map((k) => EVIDENCE_LABEL[k].toLowerCase()).join(", ")}` : s === "vet" ? "waiting for a vet" : s === "review" ? "waiting for coordinator review" : `returned: ${r.returned_note ?? "see note"}`;
    return { case_id: r.case_id, code: shortCode(r.case_code), why };
  });
  const citations: Citation[] = [{ id: "packages", label: "Monthly claim", href: "/ngo/packages", kind: "page" }, ...blocked.map((x) => ({ id: x.case_id, label: `${x.code} · ${x.why}`, href: `/ngo/verification/${x.case_id}`, kind: "case" as const }))];
  return {
    data: { month: b.label, ready, contract: contracts.error ? "unknown" : offices.length === 1 ? "one office" : offices.length ? "several offices" : "none", blocked_by: plan.blockedBy, blocked_records: blocked, partial: plan.partial },
    summary: `${b.label}: ${ready ? `${ready.count} claimable` : "claimable amount unknown"} · ${plan.blockedBy.reduce((t, x) => t + x.count, 0)} blocked`, citations,
  };
}

/* ── Municipal: the office brief with a pre-check of every waiting package ─ */
export async function officeBrief({ db }: Ctx): Promise<Out> {
  const ctx = await db.rpc("abc_my_context");
  if (ctx.error) return FAILED;
  const offices = ((ctx.data as { offices?: { id: string; name: string; city: string | null }[] } | null)?.offices ?? []);
  if (!offices.length) return NEEDS_OFFICE;
  const pk = await db.from("report_packages").select("id,ngo_id,title,status,submitted_at,decided_at,summary").in("office_id", offices.map((o) => o.id)).order("submitted_at", { ascending: true }).limit(200);
  if (pk.error) return FAILED;
  type P = { id: string; ngo_id: string; title: string; status: string; submitted_at: string | null; decided_at: string | null; summary: { records?: number } | null };
  const rows = (pk.data ?? []) as P[];
  const now = Date.now();
  const waiting = rows.filter((r) => isWaitingOnOffice(r.status));
  const names = new Map<string, string>();
  const ngoIds = [...new Set(waiting.map((r) => r.ngo_id))];
  if (ngoIds.length) { const n = await db.from("ngos").select("id,name").in("id", ngoIds); for (const x of (n.data ?? []) as { id: string; name: string }[]) names.set(x.id, x.name); }
  const checked = await Promise.all(waiting.slice(0, 5).map(async (p) => {
    const [r, c] = await Promise.all([db.rpc("operations_reconciliation", { p_package: p.id }), db.rpc("abc_package_cases", { p_package: p.id })]);
    if (r.error || c.error || !r.data) return { id: p.id, title: p.title, operator: names.get(p.ngo_id) ?? null, waitingDays: daysSince(p.submitted_at, now), claims: null as number | null, exceptions: null as number | null, top: null as string | null };
    const items = ((r.data as { items?: Parameters<typeof checkPackage>[0] }).items ?? []);
    const chk = checkPackage(items, (c.data ?? []) as Parameters<typeof checkPackage>[1]);
    return { id: p.id, title: p.title, operator: names.get(p.ngo_id) ?? null, waitingDays: daysSince(p.submitted_at, now), claims: items.length, exceptions: chk.exceptions, top: chk.byIssue[0]?.issue ?? null };
  }));
  const month = monthBounds(new Date());
  const decidedThisMonth = rows.filter((r) => isDecided(r.status) && r.decided_at && r.decided_at.slice(0, 10) >= month.start).length;
  const citations: Citation[] = checked.map((p) => ({ id: p.id, label: p.title, href: `/city/review/${p.id}`, kind: "page" as const }));
  return {
    data: { offices: offices.map((o) => o.name), waiting: waiting.length, checked, decided_this_month: decidedThisMonth, with_operator: rows.filter((r) => r.status === "queried" || r.status === "returned").length },
    summary: `${waiting.length} package${waiting.length === 1 ? "" : "s"} waiting · ${checked.reduce((t, p) => t + (p.exceptions ?? 0), 0)} exceptions found`, citations,
  };
}

/* ── Both: ward coverage and sudden changes in recorded activity ──────── */
export async function wardActivity({ db, orgId }: Ctx): Promise<Out> {
  let city: string | null = null;
  if (orgId) { const o = await db.from("ngos").select("city").eq("id", orgId).maybeSingle(); if (o.error) return FAILED; city = (o.data as { city: string | null } | null)?.city ?? null; }
  if (!city) { const c = await db.rpc("abc_my_context"); if (!c.error) city = ((c.data as { offices?: { city: string | null }[] } | null)?.offices ?? []).find((o) => o.city)?.city ?? null; }
  if (!city) return { data: { error: "No city on your organisation or office" }, summary: "Set your organisation's city first", citations: [], ok: false };
  const a = await db.from("public_spatial_animals").select("zone,sterilisation_status,vaccination_status,first_seen").eq("city", city).limit(5000);
  if (a.error) return FAILED;
  type A = { zone: string | null; sterilisation_status: string | null; vaccination_status: string | null; first_seen: string | null };
  const rows = (a.data ?? []) as A[];
  const coverage = wardCoverage(rows).slice(0, 8);
  const shifts = activityShifts(weeklySeries(rows, (r) => r.zone, (r) => r.first_seen, Date.now(), 8)).slice(0, 5);
  return {
    data: { city, animals_on_record: rows.length, capped: rows.length >= 5000, coverage, shifts, basis: "Animals on the public register for this city. Shares are of recorded animals, not of the street population." },
    summary: `${city}: ${coverage.length} wards with records · ${shifts.length} change${shifts.length === 1 ? "" : "s"} in new records`,
    citations: [{ id: "city", label: `${city} map`, href: orgId ? "/ngo/map" : `/city/insights?city=${encodeURIComponent(city)}`, kind: "page" }],
  };
}
