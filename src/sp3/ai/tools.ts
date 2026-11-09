import "server-only";
import {DESTINATIONS,canDiscover,type Role} from "@/sp/shell/workspaces";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyAction } from "./verify";
import { operationsInsights } from "./insights";
import { searchKnowledge } from "./knowledge";
import { extractFieldMessage } from "./extract";
import { planIntake, splitMessages } from "./intake";
import { checkPackage } from "./packageCheck";
import { preparedWork } from "./preparedWork";
import { claimDraft, officeBrief, overdueFollowups, wardActivity, weeklyDigest } from "./automationTools";
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

export type ToolProgress = { tool: string; summary: string; ok: boolean };
export type ToolCtx = { db: SupabaseClient; orgId: string | null; userName: string | null; userId?: string; actorRole?: string | null; pagePath?:string; conn?: ConnCtx | null; /** Called as each tool finishes, for streamed progress. Never carries record data. */ progress?: (e: ToolProgress) => void };
export type ToolOut = { data: unknown; summary: string; citations: Citation[]; proposals?: Proposal[]; navigate?: { href: string; label: string }; ok?: boolean };

const clean = (s: unknown, n = 80) => String(s ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, n);
const day = 86_400_000;
const pid = () => Math.random().toString(36).slice(2, 10);
const caseLabel = (c: { case_code?: string | null; title?: string | null; condition_class?: string | null }) => c.case_code ?? c.title ?? c.condition_class ?? "Case";
const animalLabel = (a: { name?: string | null; straypaw_id?: string | null; code?: string | null }) => a.name || a.straypaw_id || a.code || "Animal";
const NEEDS_ORG = { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false } satisfies ToolOut;

export const NAV:Record<string,{href:string;label:string;aliases?:string[]}>=Object.fromEntries(DESTINATIONS.filter(n=>n.assistantKey).map(n=>[n.assistantKey!,{href:n.href,label:n.label,aliases:n.aliases}]));

export const TOOL_DEFS = [
  { name: "prepared_work", description: "Find work that needs a person before anyone notices: critical cases with no update for 14 days, reviews promised in care notes but never scheduled, and localities spelled several ways. Returns follow-up proposals the person confirms. Changes nothing.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "prepare_intake", description: "Turn pasted WhatsApp messages or field reports into prepared records: extract the facts, link an animal only on an exact tag, find an open case it may duplicate, and return case or note proposals to confirm. Phone numbers are masked. Saves nothing.", input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } },
  { name: "check_package", description: "For a report package the person can see (municipal reviewer or operator): compare every animal claim with its evidence, sign-offs, contract rate and arithmetic; list exceptions and draft review notes. Never accepts, queries or rejects.", input_schema: { type: "object", properties: { package_id: { type: "string" } }, required: ["package_id"], additionalProperties: false } },
  {name:'current_record',description:'Read the selected case, animal, programme or review package after checking access. Use for “this record” questions. A page URL does not grant access. Does not change anything.',input_schema:{type:'object',properties:{},additionalProperties:false}},
  { name: "recent_confirmed_actions", description: "Independently verify up to five of this person’s recent confirmed Kaju actions by reading the saved records and audit rows. Use before claiming work was completed. Does not write.", input_schema: {type:"object",properties:{},additionalProperties:false} },
  { name: "operations_insights", description: "Run and store explainable operational checks for overdue follow-ups, missing ABC evidence, veterinary authorisation, municipal clarifications, programme activity and a lead-configured reporting deadline. Returns bounded findings, source links and a report proposal. Does not change cases or send notifications.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "weekly_digest", description: "What changed in the organisation over the last seven days (cases opened and closed, care recorded, vet sign-offs and evidence reviews, claims submitted and decided) and who needs to act now. Recorded counts only; an unreadable source is reported as unknown. Changes nothing.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "overdue_followups", description: "List follow-ups past their due date, grouped by who holds the case, and prepare reschedules (two days out) for the person to confirm. Changes nothing until confirmed.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "claim_draft", description: "Draft this month's ABC claim: the claimable count and amount from the database billing preview, and every record still blocked with the reason (missing evidence, waiting for a vet or coordinator, returned). Never submits.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "office_brief", description: "For a municipal reviewing office: packages waiting for a decision, oldest first, each pre-checked claim by claim for exceptions (missing evidence, sign-offs, rates, arithmetic, repeats). Never accepts, queries or returns.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "ward_activity", description: "Ward coverage (recorded animals with sterilisation and vaccination recorded; denominator is recorded animals, not population) and sudden drops or spikes in newly recorded animals per ward over eight weeks, for the organisation's or office's city.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "search_knowledge", description: "Search published StrayPaw Academy lessons about evidence, recorded counts, unknown status, coverage, population and field safety. Educational content, not current legislation or clinical advice. Returns cited passages; never invent policy.", input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false } },
  { name: "abc_verification_status", description: "Read the organisation ABC verification queue: missing evidence, vet authorisation and review flags. Bounded sample, never certifies a procedure.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "abc_package_status", description: "Read report package statuses visible to this organisation member or municipal reviewer. Includes periods and recorded summaries; never accepts a package.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "search_records", description: "Search animals, cases, programmes and places the user is allowed to read. Use for any question naming an animal, tag, case code, place or programme.", input_schema: { type: "object", properties: { query: { type: "string", description: "Words to search for: a name, StrayPaw tag, case code, locality or programme name." } }, required: ["query"], additionalProperties: false } },
  { name: "work_summary", description: "Summarise the organisation's current work: open cases, unassigned, critical, overdue follow-ups, historical imports awaiting review, and the most urgent open cases.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "find_missing_evidence", description: "Find the organisation's records that are missing evidence: animals with no photo, open cases with no linked animal or no place.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "find_by_identifier", description: "Find the organisation's animal carrying a microchip, RFID tag, QR code or printed tag number. Another organisation's identifier is reported only as registered elsewhere. Reads only.", input_schema: { type: "object", properties: { value: { type: "string", description: "The identifier as scanned or typed." } }, required: ["value"], additionalProperties: false } },
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
  if(name==='current_record')return currentRecord(ctx);
  switch (name) {
    case "prepared_work": return preparedTool(ctx);
    case "prepare_intake": return intakeTool(String(input.text ?? "").slice(0, 12000), ctx);
    case "check_package": return packageTool(clean(input.package_id, 64), ctx);
    case "abc_verification_status": return abcVerification(ctx);
    case "abc_package_status": return abcPackages(ctx);
    case "weekly_digest": return weeklyDigest(ctx);
    case "overdue_followups": return overdueFollowups(ctx);
    case "claim_draft": return claimDraft(ctx);
    case "office_brief": return officeBrief(ctx);
    case "ward_activity": return wardActivity(ctx);
    case "search_knowledge": return searchKnowledge(String(input.query ?? "").slice(0, 300));
    case "recent_confirmed_actions": return recentConfirmedActions(ctx);
    case "operations_insights": return operationsInsights(ctx);
    case "search_records": return searchRecords(clean(input.query), ctx);
    case "work_summary": return workSummary(ctx);
    case "find_missing_evidence": return missingEvidence(ctx);
    case "find_by_identifier": return byIdentifier(String(input.value ?? "").slice(0, 80), ctx);
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
      const destination=DESTINATIONS.find(d=>d.assistantKey===String(input.to));
      const role=['admin','coordinator','veterinarian','member'].includes(ctx.actorRole??'')?ctx.actorRole as Role:null;
      if(destination&&(!canDiscover(destination,role,ctx.actorRole==='municipal_reviewer')||destination.workspace==='ngo'&&!ctx.orgId))return {data:{error:'This screen requires an authorised workspace role'},summary:'This screen requires an authorised workspace role',citations:[],ok:false};
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
      db.from("org_case_facts").select("id,case_code,title,condition_class,status_class,zone,animal_name,straypaw_id,dog_id,occurred_at,assignee_name,provenance").eq("ngo_id",orgId).or(`title.ilike.%${q}%,case_code.ilike.%${q}%,animal_name.ilike.%${q}%,straypaw_id.ilike.%${q}%,zone.ilike.%${q}%`).order("occurred_at", { ascending: false, nullsFirst: false }).limit(8),
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
  const base = () => db.from("org_case_facts").select("id", { count: "exact", head: true }).eq("ngo_id",orgId).in("status_class", ["open", "in_progress"]);
  const [open, unassigned, critical, overdue, historical, urgent] = await Promise.all([
    base().or(current), base().or(current).is("assignee_name", null), base().or(current).in("condition_class", crit),
    base().or(current).not("next_due", "is", null).lt("next_due", now),
    base().eq("provenance", "imported_historical_record").is("reviewed_at", null),
    db.from("org_case_facts").select("id,case_code,title,condition_class,status_class,zone,assignee_name,next_due,occurred_at,severity").eq("ngo_id",orgId).in("status_class", ["open", "in_progress"]).or(current).order("next_due", { ascending: true, nullsFirst: false }).limit(6),
  ]);
  if ([open, unassigned, critical, overdue, historical, urgent].some((r) => r.error) || [open,unassigned,critical,overdue,historical].some(r=>typeof r.count!=="number")) return READ_FAILED;
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
    db.from("org_case_facts").select("id", { count: "exact", head: true }).eq("ngo_id",orgId).in("status_class", ["open", "in_progress"]).is("dog_id", null),
    db.from("org_case_facts").select("id", { count: "exact", head: true }).eq("ngo_id",orgId).in("status_class", ["open", "in_progress"]).is("zone", null).is("h3_r8", null),
    db.from("org_case_facts").select("id,case_code,title,condition_class,zone,dog_id,h3_r8,provenance").eq("ngo_id",orgId).in("status_class", ["open", "in_progress"]).or("dog_id.is.null,and(zone.is.null,h3_r8.is.null)").order("occurred_at", { ascending: false, nullsFirst: false }).limit(6),
  ]);
  if ([noPhoto, noAnimal, noPlace, list].some((r) => r.error) || [noPhoto,noAnimal,noPlace].some(r=>typeof r.count!=="number")) return READ_FAILED;
  const data = { animals_without_photo: noPhoto.count ?? 0, open_cases_without_animal: noAnimal.count ?? 0, open_cases_without_place: noPlace.count ?? 0, examples: (list.data ?? []).map((c) => ({ ...c, missing: [!c.dog_id && "linked animal", !c.zone && !c.h3_r8 && "place"].filter(Boolean) })) };
  return { data, summary: `${data.animals_without_photo} animals without a photo · ${data.open_cases_without_animal} open cases without an animal · ${data.open_cases_without_place} without a place`, citations: (list.data ?? []).map((c) => ({ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" as const })) };
}

async function byIdentifier(value: string, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const v = value.replace(/\s+/g, "").toUpperCase();
  if (v.length < 3) return { data: { error: "Give the identifier number." }, summary: "No identifier given", citations: [], ok: false };
  const { data, error } = await db.rpc("lookup_animal_identifier", { p_value: v });
  if (error) return { data: { error: "Identifiers are not available on this workspace yet." }, summary: "Identifier lookup unavailable", citations: [], ok: false };
  const hit = (data ?? {}) as { found?: boolean; own?: boolean; dog_id?: string; straypaw_id?: string | null; name?: string | null; kind?: string };
  if (!hit.found) return { data: { found: false, identifier: v }, summary: `No animal carries ${v}`, citations: [] };
  if (!hit.own || !hit.dog_id) return { data: { found: true, registered_elsewhere: true, identifier: v }, summary: `${v} is registered with another organisation`, citations: [] };
  return { data: { found: true, identifier: v, kind: hit.kind, animal: { id: hit.dog_id, straypaw_id: hit.straypaw_id, name: hit.name } }, summary: `${v} is on ${hit.name || hit.straypaw_id || "an animal"}`, citations: [{ id: hit.dog_id, label: animalLabel({ straypaw_id: hit.straypaw_id ?? null, name: hit.name ?? null }), href: `/ngo/animals/${hit.dog_id}`, kind: "animal" }] };
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

async function readCase(db: SupabaseClient, id: string, orgId:string) {
  const { data } = await db.from("org_case_facts").select("id,case_code,title,condition_class,dog_id").eq("ngo_id",orgId).eq("id", clean(id, 64)).eq("ngo_id",orgId).maybeSingle();
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
  const c = await readCase(db, String(i.case_id ?? ""),orgId);
  if (!c) return { data: { error: "That case is not in your organisation's register" }, summary: "Case not found", citations: [], ok: false };
  const note = String(i.note ?? "").trim().slice(0, 1500);
  if (!note) return { data: { error: "Empty note" }, summary: "Empty note", citations: [], ok: false };
  return { data: { prepared: true, confirm_required: true }, summary: `Prepared a note on ${caseLabel(c)}`, citations: [{ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" }], proposals: [{ id: pid(), kind: "add_note", why: "Note", caseId: c.id, caseLabel: caseLabel(c), note }] };
}

async function proposeFollowup(i: Record<string, unknown>, { db, orgId }: ToolCtx): Promise<ToolOut> {
  if (!orgId) return NEEDS_ORG;
  const c = await readCase(db, String(i.case_id ?? ""),orgId);
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

async function currentRecord(ctx:ToolCtx):Promise<ToolOut>{
 const path=ctx.pagePath??'';
 const match=path.match(/^\/(ngo\/(cases|verification|animals|programmes|packages)|city\/review)\/([0-9a-f-]{36})$/i);
 if(!match)return {ok:false,data:{error:'No selected record'},summary:'Open a case, animal, programme or review package first.',citations:[]};
 const id=match[3],kind=match[2]??'packages';
 if(kind!=='packages'&&!ctx.orgId)return NEEDS_ORG;
 const unavailable={ok:false,data:{error:'Record unavailable in this workspace'},summary:'This record is unavailable in your current workspace.',citations:[]} satisfies ToolOut;
 if(kind==='cases'||kind==='verification'){
  const own=await ctx.db.from('cases').select('id').eq('id',id).eq('ngo_id',ctx.orgId).maybeSingle();if(own.error)return READ_FAILED;if(!own.data)return unavailable;
  const [row,check]=await Promise.all([ctx.db.from('org_case_facts').select('id,case_code,title,status_class,provenance,occurred_at').eq('id',id).maybeSingle(),ctx.db.rpc('abc_case_checklist',{p_case_id:id})]);
  if(row.error||check.error)return READ_FAILED;if(!row.data)return unavailable;
  return {data:{record:row.data,checklist:check.data,note:'Recorded evidence and attestations only; not clinical certification.'},summary:`Checked ${caseLabel(row.data)} and its recorded evidence`,citations:[{id,label:caseLabel(row.data),href:`/ngo/verification/${id}`,kind:'case'}]};
 }
 if(kind==='packages'){
  const row=await ctx.db.from('report_packages').select('id,title,status,period_start,period_end,submitted_at').eq('id',id).maybeSingle();if(row.error)return READ_FAILED;if(!row.data)return unavailable;
  return {data:{record:row.data,note:'A person assigned to the reviewing office decides acceptance.'},summary:`Read ${row.data.title}: ${row.data.status}`,citations:[{id,label:row.data.title,href:path,kind:'page'}]};
 }
 const animal=kind==='animals';
 const row=animal?await ctx.db.from("dogs").select("id,name,straypaw_id,city,status,last_seen").eq("id",id).eq("ngo_id",ctx.orgId).maybeSingle():await ctx.db.from("campaigns").select("id,name,city,starts_on,ends_on").eq("id",id).eq("ngo_id",ctx.orgId).maybeSingle();if(row.error)return READ_FAILED;if(!row.data)return unavailable;
 return {data:{record:row.data},summary:`Read selected ${animal?'animal':'programme'}`,citations:[{id,label:animal?animalLabel(row.data):row.data.name,href:path,kind:animal?'animal':'programme'}]};
}


/* ── Kaju prepared work, intake and package checks as tools ─────────── */
async function preparedTool(ctx: ToolCtx): Promise<ToolOut> {
  if (!ctx.orgId || !ctx.userId) return NEEDS_ORG;
  const w = await preparedWork(ctx.db, ctx.orgId, ctx.userId);
  const open = w.proposals.filter((p) => !w.done.includes(p.id));
  return {
    data: { stalled: w.stalled, reviews: { missed: w.reviews.missed, upcoming: w.reviews.upcoming }, localities: w.localities.slice(0, 4), unavailable: w.unavailable, partial: w.partial, rules: w.rules },
    summary: `${w.stalled.length} quiet critical · ${w.reviews.missed} missed reviews · ${w.localities.length} split localities`,
    citations: w.stalled.map((x) => ({ id: x.caseId, label: x.label, href: `/ngo/cases/${x.caseId}`, kind: "case" as const })),
    proposals: open, ok: w.unavailable.length === 0,
  };
}
async function intakeTool(text: string, ctx: ToolCtx): Promise<ToolOut> {
  if (!ctx.orgId) return NEEDS_ORG;
  const msgs = splitMessages(text);
  if (!msgs.length) return { data: { error: "No report found in the text" }, summary: "Nothing to prepare", citations: [], ok: false };
  const now = new Date();
  const [{ data: org }, cases] = await Promise.all([
    ctx.db.from("ngos").select("city").eq("id", ctx.orgId).maybeSingle(),
    ctx.db.from("org_case_facts").select("id,case_code,title,dog_id,zone,occurred_at").eq("ngo_id", ctx.orgId).in("status_class", ["open", "in_progress"]).limit(800),
  ]);
  if (cases.error) return READ_FAILED;
  const xs = msgs.map((m) => extractFieldMessage(m, now));
  const tags = [...new Set(xs.map((x) => x.tag).filter(Boolean) as string[])];
  const dogs = tags.length ? await ctx.db.from("dogs").select("id,name,straypaw_id,code,zone,sex").eq("ngo_id", ctx.orgId).or(tags.map((t) => `straypaw_id.eq.${clean(t)},code.eq.${clean(t)}`).join(",")).limit(20) : { data: [], error: null };
  if (dogs.error) return READ_FAILED;
  const animals = (dogs.data ?? []).flatMap((d) => [d.straypaw_id, d.code].filter(Boolean).map((tag) => ({ id: d.id, label: animalLabel(d), tag: tag as string, zone: d.zone, sex: d.sex })));
  const openCases = (cases.data ?? []).map((c) => ({ id: c.id, label: c.case_code || c.title || "Open case", dogId: c.dog_id, zone: c.zone, occurredAt: c.occurred_at }));
  const plans = msgs.map((m, i) => planIntake(m, xs[i], { orgId: ctx.orgId as string, defaultCity: (org?.city as string | null) ?? null, animals, openCases, now }));
  return {
    data: plans.map((p) => ({ report: p.extracted.summary, missing: p.missing, blockers: p.blockers, duplicate: p.duplicate?.label ?? null, options: p.options.map((o) => ({ label: o.label, recommended: o.recommended })) })),
    summary: `Prepared ${plans.length} report${plans.length === 1 ? "" : "s"}; ${plans.filter((p) => p.clear).length} clear`,
    citations: plans.flatMap((p) => p.duplicate ? [{ id: p.duplicate.id, label: p.duplicate.label, href: `/ngo/cases/${p.duplicate.id}`, kind: "case" as const }] : []),
    proposals: plans.flatMap((p) => p.options.filter((o) => o.recommended).map((o) => o.proposal)),
  };
}
async function packageTool(id: string, ctx: ToolCtx): Promise<ToolOut> {
  if (!id) return { data: { error: "Which package?" }, summary: "No package given", citations: [], ok: false };
  const [r, c] = await Promise.all([ctx.db.rpc("operations_reconciliation", { p_package: id }), ctx.db.rpc("abc_package_cases", { p_package: id })]);
  if (r.error || c.error || !r.data) return { data: { error: "That package could not be read with your access" }, summary: "Package not readable", citations: [], ok: false };
  const rec = r.data as { items: Parameters<typeof checkPackage>[0]; status: string; contract: { name: string } | null };
  const chk = checkPackage(rec.items ?? [], (c.data ?? []) as Parameters<typeof checkPackage>[1]);
  return {
    data: { status: rec.status, contract: rec.contract?.name ?? null, clean: chk.clean, exceptions: chk.exceptions, decided: chk.decided, by_issue: chk.byIssue, exceptions_detail: chk.checks.filter((x) => !x.clean).slice(0, 15).map((x) => ({ claim: x.key, issues: x.issues, draft_note: x.draft })), note: "Kaju compares records; every decision is the reviewer's own." },
    summary: `${chk.clean} clean · ${chk.exceptions} with exceptions`,
    citations: [{ id, label: "Package", href: ctx.actorRole === "municipal_reviewer" ? `/city/review/${id}` : `/ngo/packages/${id}`, kind: "page" }],
  };
}
