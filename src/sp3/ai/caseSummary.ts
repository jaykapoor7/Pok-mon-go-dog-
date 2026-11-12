import "server-only";
import { EVIDENCE_LABEL, STAGE_LABEL, stageOf, type EvidenceKind, type QueueRow, type Stage } from "@/lib/abc";
import { STAGE_NEXT } from "@/lib/machines/abc-stage";
import { PACKAGE_STATE, isPackageStatus } from "@/lib/machines/package";
import { shortCode } from "@/lib/caseCode";
import { careNote } from "@/lib/care-note";
import { STATUS_META, type StatusClass } from "@/lib/register/taxonomy";
import { redact } from "./intake";
import type { ToolCtx, ToolOut } from "./tools";
import type { Citation } from "./types";

/* ════════════════════════════════════════════════════════════════════
   case_summary: one case, in plain words, from its own records.

   Reads only what the signed-in person can already read (their own
   session; row-level security decides, and every read also names the
   organisation): the case and its facts, its updates and notes, its
   follow-ups, the animal's care events on this case and, for an ABC
   record, the evidence checklist, sign-offs and the package it is in.
   Nothing else. It never reads the programme's human-health records
   (bites, patients, courses, doses): those stay with the treating
   hospital.

   The summary is written deterministically from those rows. A field that
   is empty is "not recorded"; a read that failed is "could not be read"
   and never shown as none or zero; a case that cannot be found is said
   to be not found, and nothing is guessed in its place. Changes nothing.
   ════════════════════════════════════════════════════════════════════ */

const LIMIT = 40;
const SHOWN = 8;
const DAY = 86_400_000;
const IST_MS = 5.5 * 3_600_000;
const ABC_KINDS = ["sterilisation", "vaccination"] as const;
const NOT_ABC_WORKFLOW = ["imported_historical_record", "public_dataset"];
const HEAD = "id,case_code,title,condition_class,status_class,zone,city,assignee_name,dog_id,animal_name,straypaw_id,occurred_at,last_activity_at,next_action,provenance,reviewed_at,closure_reason";

/* ── which case ──────────────────────────────────────────────────────── */
const UUID = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;
const CODE_AFTER_CASE = /\bcase\s+(?:no\.?\s*|number\s+|#\s*)?([A-Za-z]{2,5}(?:-[A-Za-z0-9]{2,}){1,3})\b/i;
const CODE = /\b([A-Za-z]{2,5}(?:-[A-Za-z]{2,5})?-(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{3,})\b/i;
const PAGE = /^\/ngo\/(?:cases|verification)\/([0-9a-f-]{36})$/i;

/** A case code named in the text: with a digit, or written in capitals as codes are shown ("case BLR-ADYAR"). "case re-opened" is not a code. */
function codeIn(q: string): string | null {
  const c = q.match(CODE_AFTER_CASE)?.[1] ?? q.match(CODE)?.[1] ?? null;
  return c && (/\d/.test(c) || c === c.toUpperCase()) ? c.toUpperCase() : null;
}

export type CaseRef = { by: "id" | "code" | "page"; value: string } | { by: "none" };
/** The case a question is about: an id or a code in the text first, then the case open on the page. */
export function caseReference(q: string, pagePath?: string | null): CaseRef {
  const id = q.match(UUID)?.[1];
  if (id) return { by: "id", value: id.toLowerCase() };
  const code = codeIn(q);
  if (code) return { by: "code", value: code };
  const page = pagePath?.match(PAGE)?.[1];
  return page ? { by: "page", value: page.toLowerCase() } : { by: "none" };
}

const ASKS = [
  /\bsummar(?:y|ise|ize|ies)\b|\bsum (?:it |this |that )?up\b|\brecap\b|\boverview\b|\bbrief me\b|\bcatch me up\b/,
  /\bstatus\b|\blatest (?:on|about|for|with)\b|\bwhat(?:'s| is) the latest\b(?! case)|\bupdates? (?:on|about|for)\b|\bhistory\b|\bstory so far\b|\btell me about\b|\bwalk me through\b/,
  /\bwhat(?:'s|s| is| has been)? (?:happening|happened|going on)\b|\bgoing on with\b|\bwhere (?:is|does|do) (?:this |the |that )?case\b|\bwhere (?:are|do) we\b|\bhow is (?:this |the |that )?case\b/,
];
/* Commands and how-to questions keep their own routes. */
const NOT_A_SUMMARY = [
  /^(?:please\s+)?how (?:do|can|should|to) |^(?:please\s+)?(?:can|could) (?:i|we) /,
  /\b(?:add|write|log|put)\b[^:]*\bnote\b|\b(?:schedule|book|set)\b.*\bfollow[- ]?up\b|\bfollow[- ]?up (?:on|for)\b/,
  /^(?:please\s+)?(?:(?:update|change|set|mark|close|assign|edit|delete|remove|create|log|file|reopen)\b(?!\s+(?:on|about|for)\b)|open (?:a|new)\b|new case\b)/,
];
/** "Summarise this case", "what's happening with case BLR-…", "status of this case": one case, in words. */
export function caseSummaryAsked(q: string): boolean {
  if (q.length > 160 || /\n/.test(q)) return false;
  const t = q.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  const names = UUID.test(q) || !!codeIn(q);
  /* One case: a code or id, or the word "case" (not "cases"). */
  if (!names && (!/\bcase\b/.test(t) || /\bcases\b/.test(t))) return false;
  /* Counting or grouping words with no case named are a question about cases ("which case is overdue", "case status by zone"). */
  if (!names && /\b(?:how many|which|by (?:zone|area|ward|person|assignee|status|month|condition)|per (?:zone|area|ward|person|month))\b/.test(t)) return false;
  if (NOT_A_SUMMARY.some((re) => re.test(t))) return false;
  return ASKS.some((re) => re.test(t));
}

/** A question that reaches for people's health records. The answer says plainly that those never reach Kaju. */
export const ASKS_ABOUT_PEOPLE = /\b(patients?|victims?|bitten (?:person|child|man|woman|people|boy|girl)|(?:person|child|man|woman|people|boy|girl) (?:who was |who were )?bitten|human|pep|post[- ]exposure|exposures?|doses?|vaccine course|injections?)\b/i;

/* ── what is read ────────────────────────────────────────────────────── */
type Head = { id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null; zone: string | null; city: string | null; assignee_name: string | null; dog_id: string | null; animal_name: string | null; straypaw_id: string | null; occurred_at: string | null; last_activity_at: string | null; next_action: string | null; provenance: string | null; reviewed_at: string | null; closure_reason: string | null };
type UpdateRow = { id: string; type: string | null; to_status: string | null; note: string | null; actor_name: string | null; created_at: string };
type FollowupRow = { id: string; due_at: string | null; status: string | null; kind: string | null; completed_at: string | null };
type CareRow = { id: string; kind: string | null; event_date: string | null; notes: string | null; performed_by: string | null };
type Attestation = { kind: string; actor_name: string | null; note: string | null; created_at: string; revoked_at: string | null };
type Checklist = { required?: string[]; missing?: string[]; vet_authorised?: boolean; evidence_reviewed?: boolean; government_accepted?: boolean };

export type Entry = { at: string; what: string; who: string | null };
export type Signed = { recorded: boolean | null; by: string | null; at: string | null };
export type AbcPart = {
  kind: (typeof ABC_KINDS)[number];
  /** null when the checklist could not be read. */
  required: string[] | null; missing: string[] | null;
  vet: Signed; review: Signed;
  returned: { by: string | null; at: string; note: string | null } | null;
  accepted: boolean | null;
  /** undefined when the package read failed; null when the record is in no package. */
  pkg?: { id: string; title: string; status: string } | null;
  stage: Stage | null;
};
export type CaseSummary = {
  found: true;
  id: string; label: string; condition: string | null;
  status: string | null; closure: string | null; holder: string | null;
  animal: { id: string; name: string | null; tag: string | null } | null;
  place: string | null; opened: string | null; lastActivity: string | null;
  imported: boolean; reviewed: boolean;
  outcome: string | null; nextAction: string | null;
  /** Oldest first; null when none of the history could be read. */
  history: Entry[] | null; historyMore: boolean;
  /** Some of the history (updates, care or follow-ups) could not be read: the list may be incomplete. */
  historyPartial: boolean;
  /** null when follow-ups could not be read. */
  next: { due: string; what: string } | null | undefined; upcoming: number | null;
  /** null: not an ABC record in the verification workflow. */
  abc: AbcPart | null;
  /** Parts that could not be read: unknown, never empty. */
  unread: string[];
};

const realName = (s: string | null | undefined) => { const t = (s ?? "").trim(); return t && !/·/.test(t) ? t : null; };
const person = (s: string | null | undefined) => { const t = realName(s); return t ? (t.includes("@") ? t.split("@")[0].replace(/^demo-/, "") : t) : null; };
/** Free text as a short quote: contact details masked, one line, at most n characters. */
const clip = (s: string | null | undefined, n = 120) => { const t = redact(String(s ?? "")).replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t; };
const words = (s: string | null | undefined) => (s ?? "").replace(/_/g, " ").trim();
const failed = (r: { error: unknown }) => !!r.error;

export async function caseSummary(ref: string, ctx: ToolCtx): Promise<ToolOut> {
  if (!ctx.orgId) return { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false };
  const orgId = ctx.orgId;
  const asked = ref.trim();
  const page = ctx.pagePath?.match(PAGE)?.[1]?.toLowerCase() ?? null;
  /* An id, else a code (codes always carry a hyphen: SPC-…, BLR-…), else ("", "this case", "current") the case open on the page. */
  const named = asked.match(UUID)?.[1]?.toLowerCase() ?? null;
  const code = named ? null : /^[A-Za-z0-9]{2,8}(?:-[A-Za-z0-9]{2,})+$/.test(asked) ? asked.toUpperCase() : null;
  const id = named ?? (code ? null : page);
  if (!id && !code) return { data: { error: "No case named" }, summary: "Open a case first, or give its case code as it is shown on the case.", citations: [], ok: false };

  /* The case itself, inside this organisation only. */
  let headRow: Head | null = null;
  if (id) {
    const r = await ctx.db.from("org_case_facts").select(HEAD).eq("ngo_id", orgId).eq("id", id).maybeSingle();
    if (r.error) return { data: { error: "Case could not be read" }, summary: "The case could not be read just now. Nothing is shown; try again.", citations: [], ok: false };
    headRow = (r.data as Head | null) ?? null;
  } else {
    const r = await ctx.db.from("org_case_facts").select(HEAD).eq("ngo_id", orgId).ilike("case_code", `${code}%`).order("occurred_at", { ascending: false, nullsFirst: false }).limit(3);
    if (r.error || !Array.isArray(r.data)) return { data: { error: "Cases could not be read" }, summary: "Your cases could not be read just now. Nothing is shown; try again.", citations: [], ok: false };
    const rows = r.data as unknown as Head[];
    headRow = rows.find((x) => (x.case_code ?? "").toUpperCase() === code) ?? (rows.length === 1 ? rows[0] : null);
    if (!headRow && rows.length > 1) {
      return { data: { found: false, ambiguous: rows.map((x) => ({ id: x.id, label: shortCode(x.case_code, x.title ?? "Case") })) }, summary: `${rows.length} cases start with ${code}`, citations: rows.map((x) => ({ id: x.id, label: shortCode(x.case_code, x.title ?? "Case"), href: `/ngo/cases/${x.id}`, kind: "case" as const })) };
    }
  }
  if (!headRow) return { data: { found: false, asked: code ?? "the case open on this page" }, summary: code ? `No case in your organisation matches ${code}` : "This case is not in your organisation's records", citations: [] };
  const h = headRow;
  const caseId = h.id;

  const [kindRes, updRes, fuRes, careRes] = await Promise.all([
    ctx.db.from("cases").select("id,category,resolution,outcome_note").eq("ngo_id", orgId).eq("id", caseId).maybeSingle(),
    ctx.db.from("case_updates").select("id,type,to_status,note,actor_name,created_at").eq("case_id", caseId).order("created_at", { ascending: false }).limit(LIMIT),
    ctx.db.from("animal_followups").select("id,due_at,status,kind,completed_at").eq("ngo_id", orgId).eq("case_id", caseId).order("due_at", { ascending: true }).limit(LIMIT),
    ctx.db.from("medical_events").select("id,kind,event_date,notes,performed_by").eq("case_id", caseId).order("event_date", { ascending: false }).limit(LIMIT),
  ]);
  const unread: string[] = [];
  const kind = failed(kindRes) ? null : ((kindRes.data ?? null) as { category: string | null; resolution: string | null; outcome_note: string | null } | null);
  if (failed(kindRes)) unread.push("whether this is an ABC record");
  const updates = failed(updRes) || !Array.isArray(updRes.data) ? null : (updRes.data as unknown as UpdateRow[]);
  if (!updates) unread.push("updates and notes");
  const followups = failed(fuRes) || !Array.isArray(fuRes.data) ? null : (fuRes.data as unknown as FollowupRow[]);
  if (!followups) unread.push("follow-ups");
  const care = failed(careRes) || !Array.isArray(careRes.data) ? null : (careRes.data as unknown as CareRow[]);
  if (!care) unread.push("care events");

  /* ABC: evidence, sign-offs and the package, only for records in the verification workflow. */
  let abc: AbcPart | null = null;
  const category = kind?.category ?? null;
  if (category && (ABC_KINDS as readonly string[]).includes(category) && !NOT_ABC_WORKFLOW.includes(h.provenance ?? "")) {
    const [chk, att, pkg] = await Promise.all([
      ctx.db.rpc("abc_case_checklist", { p_case_id: caseId }),
      ctx.db.from("abc_attestations").select("kind,actor_name,note,created_at,revoked_at").eq("ngo_id", orgId).eq("case_id", caseId).order("created_at", { ascending: true }).limit(20),
      ctx.db.from("report_packages").select("id,title,status,created_at").eq("ngo_id", orgId).contains("case_ids", [caseId]).neq("status", "returned").order("created_at", { ascending: false }).limit(1),
    ]);
    const c = failed(chk) || !chk.data || typeof chk.data !== "object" ? null : (chk.data as Checklist);
    const atts = failed(att) || !Array.isArray(att.data) ? null : (att.data as unknown as Attestation[]).filter((a) => !a.revoked_at);
    const pk = failed(pkg) || !Array.isArray(pkg.data) ? undefined : ((pkg.data as unknown as { id: string; title: string | null; status: string }[])[0] ?? null);
    if (!c) unread.push("evidence and sign-off");
    if (!atts) unread.push("who signed off");
    if (pk === undefined) unread.push("which package it is in");
    const signed = (k: string, flag: boolean | undefined): Signed => {
      const a = atts?.filter((x) => x.kind === k).at(-1);
      return { recorded: a ? true : c ? flag === true : null, by: person(a?.actor_name), at: a?.created_at ?? null };
    };
    const ret = atts?.filter((x) => x.kind === "evidence_returned").at(-1);
    const part: AbcPart = {
      kind: category as AbcPart["kind"],
      required: c ? (Array.isArray(c.required) ? c.required : category === "vaccination" ? ["capture_photo", "release_location"] : ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"]) : null,
      missing: c && Array.isArray(c.missing) ? c.missing : null,
      vet: signed("vet_authorised", c?.vet_authorised), review: signed("evidence_reviewed", c?.evidence_reviewed),
      returned: ret ? { by: person(ret.actor_name), at: ret.created_at, note: ret.note ? clip(ret.note) : null } : null,
      accepted: c ? c.government_accepted === true : null,
      pkg: pk === undefined ? undefined : pk ? { id: pk.id, title: clip(pk.title ?? "Report package", 80), status: pk.status } : null,
      stage: null,
    };
    /* The stage only when every flag it needs was read; otherwise it is unknown. */
    if (c && atts && pk !== undefined && part.missing) {
      const row = { government_accepted: c.government_accepted === true, in_package: pk?.status ?? null, evidence_reviewed: c.evidence_reviewed === true, returned_note: ret ? (ret.note ?? "returned") : null, vet_authorised: c.vet_authorised === true, missing: part.missing as EvidenceKind[] } as unknown as QueueRow;
      part.stage = stageOf(row);
    }
    abc = part;
  }

  /* What has happened, oldest first. */
  let history: Entry[] | null = null;
  let historyMore = false;
  if (updates || care || followups) {
    const all: Entry[] = [];
    for (const u of updates ?? []) {
      const note = clip(u.note);
      const what = u.type === "created" ? "Case opened" : u.type === "claimed" ? "Taken on" : u.type === "assigned" ? note || "Assigned" : u.type === "reopened" ? "Reopened"
        : u.type === "status_changed" ? `Status changed${u.to_status ? ` to ${words(u.to_status)}` : ""}${note ? `: “${note}”` : ""}`
        : u.type === "note" ? (note ? `Note: “${note}”` : "Note added") : note ? `${words(u.type) || "Update"}: “${note}”` : words(u.type) || "Update";
      all.push({ at: u.created_at, what, who: person(u.actor_name) });
    }
    for (const m of care ?? []) {
      if (!m.event_date) continue;
      const said = clip(careNote(m.notes), 100);
      all.push({ at: m.event_date, what: `Care recorded: ${words(m.kind) || "care"}${said ? `, ${said}` : ""}`, who: person(m.performed_by) });
    }
    for (const f of followups ?? []) {
      if (f.status === "upcoming") continue;
      const at = f.status === "done" ? f.completed_at ?? f.due_at : f.due_at;
      if (!at) continue;
      all.push({ at, what: `Follow-up ${f.status === "done" ? "done" : f.status === "missed" ? "missed" : words(f.status) || "recorded"}${f.kind ? ` (${words(f.kind)})` : ""}`, who: null });
    }
    all.sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0));
    historyMore = all.length > SHOWN || [updates, care, followups].some((x) => (x?.length ?? 0) >= LIMIT);
    history = all.slice(-SHOWN);
  }

  /* What is next. */
  let next: CaseSummary["next"] = undefined;
  let upcoming: number | null = null;
  if (followups) {
    const due = followups.filter((f) => f.status === "upcoming" && f.due_at).sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
    upcoming = due.length;
    next = due[0] ? { due: due[0].due_at!, what: words(due[0].kind) || "follow-up" } : null;
  }

  const label = shortCode(h.case_code, h.title ?? "Case");
  const summary: CaseSummary = {
    found: true, id: caseId, label, condition: h.condition_class && h.condition_class !== "Not recorded" ? h.condition_class : null,
    status: h.status_class, closure: h.closure_reason && h.closure_reason !== "unspecified" ? words(h.closure_reason) : null, holder: person(h.assignee_name),
    animal: h.dog_id ? { id: h.dog_id, name: realName(h.animal_name), tag: h.straypaw_id ? shortCode(h.straypaw_id) : null } : null,
    place: [h.zone, h.city].map((x) => (x ?? "").trim()).filter(Boolean).join(", ") || null,
    opened: h.occurred_at, lastActivity: h.last_activity_at,
    imported: h.provenance === "imported_historical_record", reviewed: !!h.reviewed_at,
    outcome: kind?.resolution ? `${words(kind.resolution)}${kind.outcome_note ? `, ${clip(kind.outcome_note)}` : ""}` : null,
    nextAction: h.next_action ? clip(h.next_action) : null,
    history, historyMore, historyPartial: !!history && (!updates || !care || !followups), next, upcoming, abc, unread,
  };
  const citations: Citation[] = [{ id: caseId, label, href: `/ngo/cases/${caseId}`, kind: "case" }];
  if (abc) citations.push({ id: `verification:${caseId}`, label: `Evidence and sign-off · ${label}`, href: `/ngo/verification/${caseId}`, kind: "page" });
  if (summary.animal) citations.push({ id: summary.animal.id, label: summary.animal.name ?? summary.animal.tag ?? "Animal", href: `/ngo/animals/${summary.animal.id}`, kind: "animal" });
  if (abc?.pkg) citations.push({ id: abc.pkg.id, label: abc.pkg.title, href: `/ngo/packages/${abc.pkg.id}`, kind: "page" });
  return { data: summary, summary: `Read ${label}${unread.length ? `; could not read ${unread.join(", ")}` : ""}`.slice(0, 160), citations };
}

/* ── the summary in words ────────────────────────────────────────────── */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** A calendar day in India for a date or a timestamp. */
function indiaDay(at: string | null | undefined): string | null {
  if (!at) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at;
  const t = Date.parse(at);
  return Number.isFinite(t) ? new Date(t + IST_MS).toISOString().slice(0, 10) : null;
}
/** "3 Nov 2026", or null when there is no readable date. */
export function dmy(at: string | null | undefined): string | null {
  const d = indiaDay(at);
  if (!d) return null;
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MON[m - 1]} ${y}`;
}
/** Whole days from today (in India) to that day: negative in the past. */
function daysFrom(at: string, now: number): number | null {
  const d = indiaDay(at), today = indiaDay(new Date(now).toISOString());
  return d && today ? Math.round((Date.parse(d) - Date.parse(today)) / DAY) : null;
}
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const evidenceName = (k: string) => (EVIDENCE_LABEL as Record<string, string>)[k]?.toLowerCase() ?? words(k);
const WHO: Record<string, string> = { field: "the field team", vet: "a veterinarian", coordinator: "a coordinator", office: "the municipal office", nobody: "" };

/** The case in plain words: where it stands, what has happened, ABC evidence and sign-off, and what is next. Unknowns are said to be unknown. */
export function sayCaseSummary(s: CaseSummary, now = Date.now()): string {
  const status = s.status ? STATUS_META[s.status as StatusClass]?.label ?? words(s.status) : null;
  const lines: string[] = [`**${s.label}** · ${s.condition ?? "condition not recorded"}`];
  lines.push(`- **Status:** ${status ?? "not recorded"}${s.closure ? ` (${s.closure})` : ""}. ${s.holder ? `Held by ${s.holder}.` : "Nobody holds it."}`);
  lines.push(`- **Animal:** ${s.animal ? `${s.animal.name ?? "Unnamed animal"}${s.animal.tag ? ` (${s.animal.tag})` : ""}` : "no animal linked"}. **Place:** ${s.place ?? "not recorded"}.`);
  lines.push(`- **Opened:** ${dmy(s.opened) ?? "date not recorded"} · last activity ${dmy(s.lastActivity) ?? "not recorded"}.`);
  if (s.outcome) lines.push(`- **Outcome:** ${s.outcome}.`);
  if (s.imported) lines.push(`- This is an imported historical record${s.reviewed ? " that has been reviewed" : " that nobody has reviewed yet"}; it is not today's work.`);

  lines.push("", "**What has happened**, oldest first");
  if (!s.history) lines.push("- The case history could not be read just now, so it is unknown.");
  else if (!s.history.length) lines.push(s.historyPartial ? "- Nothing was found in the part of the history that could be read; the rest is unknown." : "- Nothing is recorded on this case yet.");
  else {
    if (s.historyMore) lines.push("- …earlier entries are on the case page.");
    for (const e of s.history) lines.push(`- ${dmy(e.at) ?? "Date not recorded"} · ${e.what}${e.who ? ` (${e.who})` : ""}`);
    if (s.historyPartial) lines.push("- Part of the history could not be read, so this list may be incomplete.");
  }

  if (s.abc) {
    const a = s.abc;
    lines.push("", `**Evidence and veterinary sign-off** (${a.kind} record)`);
    if (!a.required || !a.missing) lines.push("- Evidence could not be read just now, so it is unknown.");
    else lines.push(`- Evidence: ${a.required.length - a.missing.length} of ${a.required.length} recorded${a.missing.length ? `; missing ${andList(a.missing.map(evidenceName))}` : ""}.`);
    const sign = (x: Signed) => x.recorded === null ? "unknown (could not be read)" : x.recorded ? `recorded${x.by ? ` by ${x.by}` : ""}${x.at ? ` on ${dmy(x.at)}` : ""}` : "not recorded";
    lines.push(`- Veterinary sign-off: ${sign(a.vet)}.`, `- Coordinator review: ${sign(a.review)}.`);
    if (a.returned) lines.push(`- Returned${a.returned.by ? ` by ${a.returned.by}` : ""} on ${dmy(a.returned.at)}${a.returned.note ? `: “${a.returned.note}”` : ""}.`);
    if (a.pkg) lines.push(`- In package **${a.pkg.title}**: ${isPackageStatus(a.pkg.status) ? PACKAGE_STATE[a.pkg.status].label.toLowerCase() : words(a.pkg.status)}.`);
    if (a.accepted) lines.push("- Accepted by the municipal office. Accepted is not paid.");
    if (a.stage) { const step = STAGE_NEXT[a.stage]; lines.push(`- Stage: **${STAGE_LABEL[a.stage]}**.${a.stage === "accepted" || !WHO[step.who] ? "" : ` Next step for ${WHO[step.who]}: ${step.does.charAt(0).toLowerCase()}${step.does.slice(1)}.`}`); }
    else lines.push("- Stage: unknown, because part of the record could not be read.");
  }

  lines.push("", "**What is next**");
  if (s.next === undefined) lines.push("- Follow-ups could not be read just now, so what is scheduled is unknown.");
  else if (!s.next) lines.push("- No follow-up is scheduled.");
  else {
    const d = daysFrom(s.next.due, now);
    const when = d === null ? `due ${dmy(s.next.due) ?? "on a date not recorded"}` : d === 0 ? `due today (${dmy(s.next.due)})` : d > 0 ? `due ${dmy(s.next.due)}, in ${d} ${d === 1 ? "day" : "days"}` : `was due ${dmy(s.next.due)}, ${-d} ${d === -1 ? "day" : "days"} overdue`;
    const more = (s.upcoming ?? 1) - 1;
    lines.push(`- Follow-up (${s.next.what}) ${when}.${more > 0 ? ` ${more} more ${more === 1 ? "is" : "are"} scheduled after it.` : ""}`);
  }
  if (s.nextAction) lines.push(`- Next action noted on the case: “${s.nextAction}”.`);

  if (s.unread.length) lines.push("", `Could not be read just now: ${andList(s.unread)}. ${s.unread.length === 1 ? "That part is" : "Those parts are"} unknown, not empty.`);
  lines.push("", "From your organisation's own records. Nothing was changed.");
  return lines.join("\n");
}
