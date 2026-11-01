import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyAction } from "./verify";
import { operationsInsights } from "./insights";
import { searchKnowledge } from "./knowledge";
import { extractFieldMessage } from "./extract";
import { CARE_KINDS, type Citation, type Proposal, type ToolRun } from "./types";
import { isResearchArchiveProgramme } from "@/lib/public-programmes";
import { isConnectionTool, runConnectionTool, type ConnCtx } from "./connectTools";

/* ════════════════════════════════════════════════════════════════════
   Kaju tools. Every read runs on `db`, a Supabase client carrying
   the caller's own access token, so row-level security decides what comes
   back: an NGO member sees their organisation's records, everyone else
   the public projections. Nothing here uses the service role.

   Write tools never write. They validate and return a Proposal; the
   person confirms it in the panel, and the browser saves it through the
   same server-authorised RPCs as the manual screens.
   ════════════════════════════════════════════════════════════════════ */

export type ToolCtx = { db: SupabaseClient; orgId: string | null; userName: string | null; actorRole?: string | null; conn?: ConnCtx | null };
export type ToolOut = { data: unknown; summary: string; citations: Citation[]; proposals?: Proposal[]; navigate?: { href: string; label: string }; ok?: boolean };

const clean = (s: unknown, n = 80) => String(s ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, n);
const day = 86_400_000;
const pid = () => Math.random().toString(36).slice(2, 10);
const caseLabel = (c: { case_code?: string | null; title?: string | null; condition_class?: string | null }) => c.case_code ?? c.title ?? c.condition_class ?? "Case";
const animalLabel = (a: { name?: string | null; straypaw_id?: string | null; code?: string | null }) => a.name || a.straypaw_id || a.code || "Animal";
const NEEDS_ORG = { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false } satisfies ToolOut;

export const NAV: Record<string, { href: string; label: string }> = {
  work: { href: "/ngo/work", label: "Work queue" }, inbox: { href: "/ngo/inbox", label: "Inbox" }, animals: { href: "/ngo/animals", label: "Animals" },
  programmes: { href: "/ngo/programmes", label: "Programmes" }, field: { href: "/ngo/field", label: "Field mode" }, review: { href: "/ngo/review", label: "Evidence review" },
  quality: { href: "/ngo/quality", label: "Data quality" }, reports: { href: "/ngo/proof", label: "Reports & proof" }, import: { href: "/ngo/import", label: "Import a register" },
  team: { href: "/ngo/team", label: "Team & access" }, settings: { href: "/ngo/settings", label: "Settings" }, new_case: { href: "/ngo/cases/new", label: "New case" },
  map: { href: "/community", label: "Community map" }, report_animal: { href: "/community/report", label: "Report an animal" },
  city: { href: "/city", label: "City evidence map" }, city_programmes: { href: "/city/programmes", label: "City programmes" }, city_report: { href: "/city/report", label: "City report" },
  insights: { href: "/city/insights", label: "City overview" }, academy: { href: "/learn", label: "Academy" }, care_ledger: { href: "/ngo/care", label: "Care ledger" },
};

export const TOOL_DEFS = [
  { name: "recent_confirmed_actions", description: "Independently verify up to five of this person’s recent confirmed Kaju actions by reading the saved records and audit rows. Use before claiming work was completed. Does not write.", input_schema: {type:"object",properties:{},additionalProperties:false} },
  { name: "operations_insights", description: "Run and store explainable operational checks for overdue follow-ups, missing ABC evidence, veterinary authorisation, municipal clarifications, programme activity and a lead-configured reporting deadline. Returns bounded findings, source links and a report proposal. Does not change cases or send notifications.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "search_knowledge", description: "Search published StrayPaw Academy lessons about evidence, recorded counts, unknown status, coverage, population and field safety. Educational content, not current legislation or clinical advice. Returns cited passages; never invent policy.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
  { name: "abc_verification_status", description: "Read the organisation ABC verification queue: missing evidence, vet authorisation and review flags. Bounded sample, never certifies a procedure.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "abc_package_status", description: "Read report package statuses visible to this organisation member or municipal reviewer. Includes periods and recorded summaries; never accepts a package.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "search_records", description: "Search animals, cases, programmes and places the user is allowed to read. Use for any question naming an animal, tag, case code, place or programme.", input_schema: { type: "object", properties: { query: { type: "string", description: "Words to search for: a name, StrayPaw tag, case code, locality or programme name." } }, required: ["query"], additionalProperties: false } },
  { name: "work_summary", description: "Summarise the organisation's current work: open cases, unassigned, critical, overdue follow-ups, historical imports awaiting review, and the most urgent open cases.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "find_missing_evidence", description: "Find the organisation's records that are missing evidence: animals with no photo, open cases with no linked animal or no place.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "find_duplicates", description: "Find possible duplicate animals in the organisation's register (same name and locality). Candidates only; a person decides.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "programme_report", description: "Recorded figures for programmes: the organisation's own drives when the user is a member, otherwise published programmes. Optional query filters by name or city.", input_schema: { type: "object", properties: { query: { type: "string" } }, additionalProperties: false } },
  { name: "extract_field_message", description: "Structure a pasted field update, WhatsApp message or register line into a draft (intervention, animal, place, date) and list what is missing. Does not save anything.", input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } },
  { name: "propose_case", description: "Prepare a new case for the user to confirm. Nothing is saved until they press Confirm.", input_schema: { type: "object", properties: { title: { type: "string" }, city: { type: "string" }, zone: { type: "string" }, category: { type: "string", enum: ["injury", "sterilisation", "rescue", "vaccination", "other"] }, severity: { type: "string", enum: ["low", "normal", "high", "critical"] }, description: { type: "string" }, dog_id: { type: "string" } }, required: ["title", "city", "category", "severity", "description"], additionalProperties: false } },
  { name: "propose_note", description: "Prepare a note on an existing case for the user to confirm.", input_schema: { type: "object", properties: { case_id: { type: "string" }, note: { type: "string" } }, required: ["case_id", "note"], additionalProperties: false } },
  { name: "propose_followup", description: "Prepare a follow-up on an existing case for the user to confirm. due_date is YYYY-MM-DD.", input_schema: { type: "object", properties: { case_id: { type: "string" }, due_date: { type: "string" }, note: { type: "string" } }, required: ["case_id", "due_date"], additionalProperties: false } },
  { name: "propose_care", description: "Prepare a care event (sterilisation, vaccination, treatment, checkup, deworming, other) on an animal for the user to confirm. It is a recorded claim by the organisation, never a clinician's sign-off.", input_schema: { type: "object", properties: { dog_id: { type: "string" }, kind: { type: "string", enum: [...CARE_KINDS] }, date: { type: "string" }, notes: { type: "string" } }, required: ["dog_id", "kind"], additionalProperties: false } },
  { name: "navigate", description: `Open a screen for the user. One of: ${Object.keys(NAV).join(", ")}.`, input_schema: { type: "object", properties: { to: { type: "string", enum: Object.keys(NAV) } }, required: ["to"], additionalProperties: false } },
] as const;

export type ToolName = (typeof TOOL_DEFS)[number]["name"];

export async function runTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolOut> {
  switch (name) {
    case "abc_verification_status": return abcVerification(ctx);
    case "abc_package_status": return abcPackages(ctx);
    case "search_knowledge": return searchKnowledge(String(input.query ?? "").slice(0, 300));
    case "recent_confirmed_actions": return recentConfirmedActions(ctx);
    case "operations_insights": return operationsInsights(ctx);
    case "search_records": return searchRecords(clean(input.query), ctx);
    case "work_summary": return workSummary(ctx);
    case "find_missing_evidence": return missingEvidence(ctx);
    case "find_duplicates": return duplicates(ctx);
    case "programme_report": return programmeReport(clean(input.query ?? ""), ctx);
    case "extract_field_message": {
      const x = extractFieldMessage(String(input.text ?? "").slice(0, 4000));
      return { data: x, summary: `${x.summary}${x.missing.length ? ` · missing ${x.missing.join(", ")}` : ""}`, citations: [] };
    }
    case "propose_case": return proposeCase(input, ctx);
    case "propose_note": return proposeNote(input, ctx);
    case "propose_followup": return proposeFollowup(input, ctx);
    case "propose_care": return proposeCare(input, ctx);
    case "navigate": {
      const n = NAV[String(input.to)];
      return n ? { data: n, summary: `Open ${n.label}`, citations: [], navigate: n } : { data: { error: "Unknown screen" }, summary: "Unknown screen", citations: [], ok: false };
    }
    default:
      if (isConnectionTool(name)) return runConnectionTool(name, input, ctx.conn ?? null, !!ctx.orgId);
      return { data: { error: `Unknown tool ${name}` }, summary: "Unknown tool", citations: [], ok: false };
  }
}

async function searchRecords(q: string, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (q.length < 2) return { data: { error: "Query too short" }, summary: "Query too short", citations: [], ok: false };
  const citations: Citation[] = [];
  const out: Record<string, unknown[]> = {};
  if (orgId) {
    const [dogs, cases] = await Promise.all([
      db.from("dogs").select("id,straypaw_id,name,code,zone,city,status,last_seen").eq("ngo_id", orgId).or(`name.ilike.%${q}%,code.ilike.%${q}%,zone.ilike.%${q}%,straypaw_id.ilike.%${q}%`).order("last_seen", { ascending: false }).limit(8),
      db.from("org_case_facts").select("id,case_code,title,condition_class,status_class,zone,animal_name,straypaw_id,dog_id,occurred_at,assignee_name,provenance").or(`title.ilike.%${q}%,case_code.ilike.%${q}%,animal_name.ilike.%${q}%,straypaw_id.ilike.%${q}%,zone.ilike.%${q}%`).order("occurred_at", { ascending: false, nullsFirst: false }).limit(8),
    ]);
    if (dogs.error || cases.error) return READ_FAILED;
    out.your_animals = dogs.data ?? [];
    out.your_cases = cases.data ?? [];
    for (const d of dogs.data ?? []) citations.push({ id: d.id, label: animalLabel(d), href: `/ngo/animals/${d.id}`, kind: "animal" });
    for (const c of cases.data ?? []) citations.push({ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" });
  }
  const [pub, progs] = await Promise.all([
    db.from("public_spatial_animals").select("id,name,straypaw_id,city,zone").or(`straypaw_id.ilike.%${q}%,name.ilike.%${q}%,zone.ilike.%${q}%`).limit(6),
    db.from("public_programme_cards").select("id,name,city,ngo_name,animals_recorded,sterilised_recorded,vaccinated_recorded,starts_on,ends_on").or(`name.ilike.%${q}%,city.ilike.%${q}%,ngo_name.ilike.%${q}%`).limit(5),
  ]);
  if (pub.error || progs.error) return READ_FAILED;
  out.public_animals = pub.data ?? [];
  out.programmes = (progs.data ?? []).filter((p) => !isResearchArchiveProgramme(p.id));
  for (const a of pub.data ?? []) if (!citations.some((c) => c.id === a.id)) citations.push({ id: a.id, label: animalLabel(a), href: `/animal/${a.id}`, kind: "animal" });
  for (const p of out.programmes as { id: string; name: string }[]) citations.push({ id: p.id, label: p.name, href: `/city/programmes/${p.id}`, kind: "programme" });
  const n = Object.values(out).reduce((s, v) => s + v.length, 0);
  return { data: out, summary: `${n} result${n === 1 ? "" : "s"} for “${q}”`, citations };
}

async function workSummary({ db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const now = new Date().toISOString();
  const current = "provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null";
  const crit = ["Road accident", "Maggot wound", "Human abuse", "Dog bite", "Entrapment", "Suspected rabies"];
  const base = () => db.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]);
  const [open, unassigned, critical, overdue, historical, urgent] = await Promise.all([
    base().or(current), base().or(current).is("assignee_name", null), base().or(current).in("condition_class", crit),
    base().or(current).not("next_due", "is", null).lt("next_due", now),
    base().eq("provenance", "imported_historical_record").is("reviewed_at", null),
    db.from("org_case_facts").select("id,case_code,title,condition_class,status_class,zone,assignee_name,next_due,occurred_at,severity").in("status_class", ["open", "in_progress"]).or(current).order("next_due", { ascending: true, nullsFirst: false }).limit(6),
  ]);
  if ([open, unassigned, critical, overdue, historical, urgent].some((r) => r.error)) return READ_FAILED;
  const data = { open_current: open.count ?? 0, unassigned: unassigned.count ?? 0, critical: critical.count ?? 0, overdue_followups: overdue.count ?? 0, historical_imports_awaiting_review: historical.count ?? 0, next_cases: urgent.data ?? [] };
  return {
    data,
    summary: `${data.open_current} open · ${data.unassigned} unassigned · ${data.overdue_followups} overdue`,
    citations: (urgent.data ?? []).map((c) => ({ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" as const })),
  };
}

async function missingEvidence({ db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const [noPhoto, noAnimal, noPlace, list] = await Promise.all([
    db.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", orgId).or("cover_photo.is.null,cover_photo.eq."),
    db.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).is("dog_id", null),
    db.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).is("zone", null).is("h3_r8", null),
    db.from("org_case_facts").select("id,case_code,title,condition_class,zone,dog_id,h3_r8,provenance").in("status_class", ["open", "in_progress"]).or("dog_id.is.null,and(zone.is.null,h3_r8.is.null)").order("occurred_at", { ascending: false, nullsFirst: false }).limit(6),
  ]);
  if ([noPhoto, noAnimal, noPlace, list].some((r) => r.error)) return READ_FAILED;
  const data = { animals_without_photo: noPhoto.count ?? 0, open_cases_without_animal: noAnimal.count ?? 0, open_cases_without_place: noPlace.count ?? 0, examples: (list.data ?? []).map((c) => ({ ...c, missing: [!c.dog_id && "linked animal", !c.zone && !c.h3_r8 && "place"].filter(Boolean) })) };
  return { data, summary: `${data.animals_without_photo} animals without a photo · ${data.open_cases_without_animal} open cases without an animal · ${data.open_cases_without_place} without a place`, citations: (list.data ?? []).map((c) => ({ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" as const })) };
}

async function duplicates({ db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const { data, error } = await db.from("dogs").select("id,straypaw_id,name,zone,city,last_seen").eq("ngo_id", orgId).not("name", "is", null).order("last_seen", { ascending: false }).limit(1000);
  if (error) return { data: { error: error.message }, summary: "Could not read the register", citations: [], ok: false };
  const by = new Map<string, typeof data>();
  for (const d of data ?? []) {
    const k = `${String(d.name).toLowerCase().trim()}|${String(d.zone ?? "").toLowerCase().trim()}`;
    if (!d.name || !d.zone) continue;
    by.set(k, [...(by.get(k) ?? []), d]);
  }
  const groups = [...by.values()].filter((g) => g.length > 1).slice(0, 8);
  return {
    data: { scanned: data?.length ?? 0, candidate_groups: groups, rule: "Same given name and same locality. A candidate, not a match." },
    summary: `${groups.length} candidate group${groups.length === 1 ? "" : "s"} in ${data?.length ?? 0} named animals`,
    citations: groups.flat().slice(0, 12).map((d) => ({ id: d.id, label: animalLabel(d), href: `/ngo/animals/${d.id}`, kind: "animal" as const })),
  };
}

async function programmeReport(q: string, { db, orgId }: ToolCtx): Promise<ToolOut> {
  const citations: Citation[] = [];
  const data: Record<string, unknown> = {};
  if (orgId) {
    const { data: own, error } = await db.rpc("org_campaigns", { p_include_archived: false });
    if (error) return READ_FAILED;
    const list = Array.isArray(own) ? own : [];
    data.your_programmes = list.filter((p: { name?: string }) => !q || String(p.name ?? "").toLowerCase().includes(q.toLowerCase())).slice(0, 10);
    for (const p of data.your_programmes as { id: string; name: string }[]) citations.push({ id: p.id, label: p.name, href: `/ngo/programmes/${p.id}`, kind: "programme" });
  }
  let pub = db.from("public_programme_cards").select("id,name,city,ngo_name,kind,animals_recorded,sterilised_recorded,vaccinated_recorded,starts_on,ends_on,public_summary").order("ends_on", { ascending: false, nullsFirst: false }).limit(11);
  if (q) pub = pub.or(`name.ilike.%${q}%,city.ilike.%${q}%,ngo_name.ilike.%${q}%`);
  const { data: all, error } = await pub;
  if (error) return READ_FAILED;
  const rows = (all ?? []).filter((p) => !isResearchArchiveProgramme(p.id));
  data.published_programmes = rows;
  data.note = "Figures are recorded counts from each programme's register, including imported history; they are not population estimates.";
  for (const p of rows) citations.push({ id: p.id, label: p.name, href: `/city/programmes/${p.id}`, kind: "programme" });
  return { data, summary: `${citations.length} programme${citations.length === 1 ? "" : "s"}`, citations };
}

async function readCase(db: SupabaseClient, id: string) {
  const { data } = await db.from("org_case_facts").select("id,case_code,title,condition_class,dog_id").eq("id", clean(id, 64)).maybeSingle();
  return data;
}

async function proposeCase(i: Record<string, unknown>, { orgId, userName }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const cats = ["injury", "sterilisation", "rescue", "vaccination", "other"] as const;
  const sev = ["low", "normal", "high", "critical"] as const;
  const category = cats.includes(i.category as never) ? (i.category as (typeof cats)[number]) : "other";
  const severity = sev.includes(i.severity as never) ? (i.severity as (typeof sev)[number]) : "normal";
  const title = String(i.title ?? "").trim().slice(0, 120);
  const city = String(i.city ?? "").trim().slice(0, 60);
  if (!title || !city) return { data: { error: "A case needs a title and a city" }, summary: "Missing title or city", citations: [], ok: false };
  const p: Proposal = { id: pid(), kind: "open_case", why: "New case", title, city, zone: i.zone ? String(i.zone).slice(0, 80) : null, category, severity, description: String(i.description ?? "").slice(0, 1500), dogId: i.dog_id ? String(i.dog_id) : null };
  return { data: { prepared: true, confirm_required: true, for: userName }, summary: `Prepared: ${title}`, citations: [], proposals: [p] };
}

async function proposeNote(i: Record<string, unknown>, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const c = await readCase(db, String(i.case_id ?? ""));
  if (!c) return { data: { error: "That case is not in your organisation's register" }, summary: "Case not found", citations: [], ok: false };
  const note = String(i.note ?? "").trim().slice(0, 1500);
  if (!note) return { data: { error: "Empty note" }, summary: "Empty note", citations: [], ok: false };
  return { data: { prepared: true, confirm_required: true }, summary: `Prepared a note on ${caseLabel(c)}`, citations: [{ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" }], proposals: [{ id: pid(), kind: "add_note", why: "Note", caseId: c.id, caseLabel: caseLabel(c), note }] };
}

async function proposeFollowup(i: Record<string, unknown>, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const c = await readCase(db, String(i.case_id ?? ""));
  if (!c) return { data: { error: "That case is not in your organisation's register" }, summary: "Case not found", citations: [], ok: false };
  const due = new Date(String(i.due_date ?? ""));
  if (isNaN(due.getTime()) || due.getTime() < Date.now() - day) return { data: { error: "due_date must be today or later, YYYY-MM-DD" }, summary: "Invalid date", citations: [], ok: false };
  return { data: { prepared: true, confirm_required: true }, summary: `Prepared a follow-up on ${caseLabel(c)}`, citations: [{ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" }], proposals: [{ id: pid(), kind: "schedule_followup", why: "Follow-up", caseId: c.id, caseLabel: caseLabel(c), dogId: c.dog_id ?? null, dueAt: due.toISOString(), note: String(i.note ?? "").slice(0, 500) }] };
}

async function proposeCare(i: Record<string, unknown>, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const { data: d } = await db.from("dogs").select("id,name,straypaw_id,code").eq("ngo_id", orgId).eq("id", clean(i.dog_id, 64)).maybeSingle();
  if (!d) return { data: { error: "That animal is not on your organisation's register" }, summary: "Animal not found", citations: [], ok: false };
  const kind = CARE_KINDS.includes(i.kind as never) ? String(i.kind) : "other";
  const date = i.date && !isNaN(new Date(String(i.date)).getTime()) ? new Date(String(i.date)).toISOString().slice(0, 10) : null;
  return { data: { prepared: true, confirm_required: true }, summary: `Prepared ${kind} on ${animalLabel(d)}`, citations: [{ id: d.id, label: animalLabel(d), href: `/ngo/animals/${d.id}`, kind: "animal" }], proposals: [{ id: pid(), kind: "record_care", why: "Care event", dogId: d.id, dogLabel: animalLabel(d), careKind: kind, date, notes: String(i.notes ?? "").slice(0, 800) }] };
}

export function toolRun(name: string, out: ToolOut): ToolRun { return { name, summary: out.summary, ok: out.ok !== false }; }

/** An unavailable read is unknown, never a zero or a successful empty result. */
const READ_FAILED: ToolOut = { data: { error: "Records could not be read. Counts are unknown; try again." }, summary: "Could not read the records. Try again.", citations: [], ok: false };

async function abcVerification({ db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const { data, error } = await db.rpc("abc_verification_queue", { p_limit: 100 });
  if (error) return READ_FAILED;
  const rows = Array.isArray(data) ? data.slice(0, 100) : [];
  return { data: { records: rows, sampled: rows.length, limit: 100, note: "At most 100 visible cases. Flags are database attestations, not a new certification." }, summary: `${rows.length} ABC records checked (up to 100)`, citations: rows.slice(0, 12).map((r) => ({ id: r.case_id, label: caseLabel(r), href: `/ngo/verification/${r.case_id}`, kind: "case" as const })) };
}

async function abcPackages({ db }: ToolCtx): Promise<ToolOut> {
  // RLS includes both organisation members and reviewers assigned to an office.
  const { data, error } = await db.from("report_packages").select("id,title,status,period_start,period_end,summary,submitted_at").order("created_at", { ascending: false }).limit(50);
  if (error) return READ_FAILED;
  const rows = data ?? [];
  const { data: context, error: contextError } = await db.rpc("abc_my_context");
  if (contextError) return READ_FAILED;
  const municipal = !context?.ngo_id && context?.offices?.length;
  return { data: { packages: rows, limit: 50, note: "Visible packages only; at most 50 most recent. No decision was made." }, summary: `${rows.length} visible report packages (up to 50)`, citations: rows.slice(0, 12).map((r) => ({ id: r.id, label: r.title, href: `${municipal ? "/city/review" : "/ngo/packages"}/${r.id}`, kind: "page" as const })) };
}

async function recentConfirmedActions({db,orgId}:ToolCtx):Promise<ToolOut>{
 if(!orgId)return NEEDS_ORG;
 const {data,error}=await db.from("kaju_action_receipts").select("actor_id,request_id").order("confirmed_at",{ascending:false}).limit(5);
 if(error)return READ_FAILED;
 const results=await Promise.all((data??[]).map(async r=>{try{return await verifyAction(db,r.actor_id,r.request_id);}catch{return {verified:false as const};}}));
 const verified=results.filter((r):r is Extract<Awaited<ReturnType<typeof verifyAction>>,{verified:true}>=>r.verified);
 return {data:{verified_actions:verified,pending:results.length-verified.length,limit:5},summary:`${verified.length} recent actions independently verified`,citations:verified.map(r=>({id:r.id,label:`${r.kind.replace(/_/g," ")} · audit ${r.auditId}`,href:r.href,kind:"page" as const}))};
}
