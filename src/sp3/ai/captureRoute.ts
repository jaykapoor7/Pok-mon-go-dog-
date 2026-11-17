import "server-only";
import { shortCode } from "@/lib/caseCode";
import type { ToolCtx, ToolOut } from "./tools";
import type { Citation, Proposal, ToolRun } from "./types";
import { extractFieldMessage } from "./extract";
import { personName, workId } from "./prepare";
import { editDistance } from "./understand";
import { animalAtStart, codeIn, indiaDay, reportText, sayDay, type AnimalRef, type CareAsk, type FollowupAsk, type NoteAsk, type TaskAsk } from "./capture";

/* ════════════════════════════════════════════════════════════════════
   Capture, server side: the words parsed in capture.ts, matched to real
   records with the person's own access, and turned into proposals.

   Every lookup runs on ctx.db (the person's own session; row-level
   security decides) and names the organisation. A person, case or animal
   is linked only on an exact match; two matches are listed for the person
   to choose, never merged or guessed; no match is said. Nothing here
   saves: each proposal waits for the person's Confirm (/api/ai/act).
   ════════════════════════════════════════════════════════════════════ */

export type Sink = { citations: Citation[]; tools: ToolRun[]; proposals: Proposal[] };
export type Said = { text: string; suggestions?: string[] };
type Call = (name: string, input: Record<string, unknown>) => Promise<ToolOut>;
type CaseRow = { id: string; case_code: string | null; title: string | null; condition_class: string | null; dog_id: string | null; animal_name?: string | null };
type Dog = { id: string; name: string | null; code: string | null; straypaw_id: string | null; zone: string | null };
type Person = { user_id: string; name: string; role: string };

const NEEDS_ORG = "That needs an organisation workspace. Join your organisation with its code, then ask me again.";
const COULD_NOT = "I could not read your records just now, so nothing was prepared. Try again.";
const clean = (s: string) => s.replace(/[^A-Za-z0-9 '’-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
const caseLabel = (c: CaseRow) => (c.case_code ? shortCode(c.case_code) : null) || c.title || c.condition_class || "Case";
const dogTag = (d: Dog) => d.code || (d.straypaw_id ? shortCode(d.straypaw_id) : null);
const dogLabel = (d: Dog) => (d.name ? `${d.name}${dogTag(d) ? ` (${dogTag(d)})` : ""}` : dogTag(d) || "Animal");
const caseCite = (c: CaseRow): Citation => ({ id: c.id, label: caseLabel(c), href: `/ngo/cases/${c.id}`, kind: "case" });
const dogCite = (d: Dog): Citation => ({ id: d.id, label: dogLabel(d), href: `/ngo/animals/${d.id}`, kind: "animal" });
const cite = (sink: Sink, c: Citation) => { if (!sink.citations.some((x) => x.id === c.id)) sink.citations.push(c); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The workspace the person is working in: what the page says, else what its address says. Only a hint; access is checked on every read. */
export function workspaceHint(ctx: Pick<ToolCtx, "workspace" | "pagePath">): "ngo" | "government" | "healthcare" | "research" | null {
  const w = (ctx.workspace ?? "").toLowerCase();
  if (["ngo", "government", "healthcare", "research"].includes(w)) return w as "ngo";
  if (w === "health") return "healthcare";
  if (w === "gov") return "government";
  const p = ctx.pagePath ?? "";
  return p.startsWith("/health") ? "healthcare" : p.startsWith("/gov") ? "government" : p.startsWith("/research") ? "research" : p.startsWith("/ngo") ? "ngo" : null;
}

/** The record a note or report is about: what the page sent, else the record open on the page. Checked again before use. */
export function subjectOf(ctx: Pick<ToolCtx, "subject" | "pagePath">): { caseId: string | null; dogId: string | null } {
  const path = ctx.pagePath ?? "";
  const caseId = ctx.subject?.caseId && UUID.test(ctx.subject.caseId) ? ctx.subject.caseId : path.match(/^\/ngo\/(?:cases|verification)\/([0-9a-f-]{36})$/i)?.[1] ?? null;
  const dogId = ctx.subject?.dogId && UUID.test(ctx.subject.dogId) ? ctx.subject.dogId : path.match(/^\/ngo\/animals\/([0-9a-f-]{36})$/i)?.[1] ?? null;
  return { caseId: caseId?.toLowerCase() ?? null, dogId: dogId?.toLowerCase() ?? null };
}

/* ── reads, with the person's own access ─────────────────────────────── */
async function caseById(ctx: ToolCtx, id: string): Promise<CaseRow | null | "error"> {
  const r = await ctx.db.from("org_case_facts").select("id,case_code,title,condition_class,dog_id,animal_name").eq("ngo_id", ctx.orgId).eq("id", id).maybeSingle();
  return r.error ? "error" : (r.data as CaseRow | null);
}
async function casesByCode(ctx: ToolCtx, code: string): Promise<CaseRow[] | null> {
  const r = await ctx.db.from("org_case_facts").select("id,case_code,title,condition_class,dog_id,animal_name").eq("ngo_id", ctx.orgId).ilike("case_code", `${clean(code)}%`).limit(3);
  return r.error ? null : ((r.data ?? []) as CaseRow[]);
}
async function openCasesOf(ctx: ToolCtx, dogId: string): Promise<CaseRow[] | null> {
  const r = await ctx.db.from("org_case_facts").select("id,case_code,title,condition_class,dog_id,animal_name").eq("ngo_id", ctx.orgId).eq("dog_id", dogId).in("status_class", ["open", "in_progress"]).limit(3);
  return r.error ? null : ((r.data ?? []) as CaseRow[]);
}
async function dogById(ctx: ToolCtx, id: string): Promise<Dog | null | "error"> {
  const r = await ctx.db.from("dogs").select("id,name,code,straypaw_id,zone").eq("ngo_id", ctx.orgId).eq("id", id).maybeSingle();
  return r.error ? "error" : (r.data as Dog | null);
}
const numberMatches = (d: Dog, num: string) => {
  const n = num.toUpperCase(), code = (d.code ?? "").toUpperCase();
  return code === n || (/^\d+$/.test(n) && new RegExp(`^(?:[A-Z]+-)*0*${n}$`).test(code)) || (n.length >= 6 && !!d.straypaw_id && d.straypaw_id.toUpperCase().startsWith(n)) || (d.name ?? "").toLowerCase() === `dog ${n.toLowerCase()}`;
};
/** Animals on the organisation's register that a reference names exactly: the same name, the same number, or both. Never a near spelling. */
async function dogsFor(ctx: ToolCtx, ref: AnimalRef): Promise<{ both: Dog[]; byName: Dog[]; byNumber: Dog[] } | null> {
  const name = ref.name ? clean(ref.name) : null, num = ref.number ? clean(ref.number).replace(/\s+/g, "") : null;
  const ors = [name && `name.ilike.${name}`, num && `code.ilike.%${num}`, num && num.length >= 6 && `straypaw_id.ilike.${num}%`, num && /^\d+$/.test(num) && `name.ilike.dog ${num}`].filter(Boolean) as string[];
  if (!ors.length) return { both: [], byName: [], byNumber: [] };
  const r = await ctx.db.from("dogs").select("id,name,code,straypaw_id,zone").eq("ngo_id", ctx.orgId).or(ors.join(",")).limit(12);
  if (r.error) return null;
  const rows = (r.data ?? []) as Dog[];
  const byName = name ? rows.filter((d) => (d.name ?? "").toLowerCase() === name.toLowerCase()) : [];
  const byNumber = num ? rows.filter((d) => numberMatches(d, num)) : [];
  const both = name && num ? byName.filter((d) => byNumber.includes(d)) : name ? byName : byNumber;
  return { both, byName, byNumber };
}

/** One animal from a reference, or what to say instead: not found, which one, or the name and number point to different animals. */
async function oneDog(ctx: ToolCtx, ref: AnimalRef, said: string, sink: Sink): Promise<{ dog: Dog } | Said> {
  const found = await dogsFor(ctx, ref);
  sink.tools.push({ name: "search_records", summary: found ? `${found.both.length} animal${found.both.length === 1 ? "" : "s"} matching ${ref.phrase}` : "Could not read the register", ok: !!found });
  if (!found) return { text: COULD_NOT };
  const words = ref.name && ref.number ? `${ref.name} (${ref.number})` : ref.name ?? `number ${ref.number}`;
  if (found.both.length === 1) { cite(sink, dogCite(found.both[0])); return { dog: found.both[0] }; }
  if (found.both.length > 1) {
    found.both.slice(0, 4).forEach((d) => cite(sink, dogCite(d)));
    const named = found.both.filter((d) => dogTag(d));
    return { text: `${found.both.length} animals on your register are ${ref.name ? `called ${ref.name}` : `numbered ${ref.number}`}. Which one? I have not picked one for you.`, suggestions: named.slice(0, 3).map((d) => said.replace(ref.phrase, `${d.name ?? "Dog"} (${dogTag(d)})`)) };
  }
  if (ref.name && ref.number && (found.byName.length || found.byNumber.length)) {
    [...found.byName, ...found.byNumber].slice(0, 4).forEach((d) => cite(sink, dogCite(d)));
    return { text: `“${ref.name}” and number ${ref.number} point to different animals on your register, so I have not chosen either. Check the record and tell me again.` };
  }
  return { text: `I could not find ${words} on your organisation's register. Use the name or number shown on the animal's record; I have not guessed another.` };
}

/** The case a note or follow-up is about: a code, an animal's one open case, or the record on the page. */
async function oneCase(ctx: ToolCtx, ref: string | null, said: string, sink: Sink, what: string): Promise<{ c: CaseRow } | Said> {
  const subject = subjectOf(ctx);
  if (!ref) {
    if (subject.caseId) {
      const c = await caseById(ctx, subject.caseId);
      if (c === "error") return { text: COULD_NOT };
      if (c) { cite(sink, caseCite(c)); return { c }; }
      return { text: "The case on this page is not in your organisation's records, so I have not prepared anything." };
    }
    if (subject.dogId) {
      const d = await dogById(ctx, subject.dogId);
      if (d === "error") return { text: COULD_NOT };
      if (!d) return { text: "The animal on this page is not on your organisation's register, so I have not prepared anything." };
      return casesOfDog(ctx, d, sink, what);
    }
    return { text: `Which case? Give its case code, for example “${what === "note" ? "note on SPC-36A054: ate well today" : "follow up SPC-36A054 next Monday"}”, or open the case and tell me there.` };
  }
  const code = codeIn(ref);
  if (code) {
    const rows = await casesByCode(ctx, code);
    sink.tools.push({ name: "search_records", summary: rows ? `${rows.length} case${rows.length === 1 ? "" : "s"} matching ${code}` : "Could not read the cases", ok: !!rows });
    if (!rows) return { text: COULD_NOT };
    if (rows.length === 1) { cite(sink, caseCite(rows[0])); return { c: rows[0] }; }
    if (rows.length > 1) { rows.forEach((c) => cite(sink, caseCite(c))); return { text: `${rows.length} cases start with ${code}. Open the right one below, or give its full case code; I have not picked one.` }; }
  }
  const animal = animalAtStart(ref) ?? (code ? { name: null, number: code, phrase: code } : null);
  if (!animal) return { text: `I could not tell which case “${ref}” is. Give its case code as shown on the case.` };
  const got = await oneDog(ctx, animal, said, sink);
  if (!("dog" in got)) return code && /could not find/.test(got.text) ? { text: `I could not find a case or an animal matching “${code}” in your organisation's records. Check the code shown on the record; I have not guessed another.` } : got;
  return casesOfDog(ctx, got.dog, sink, what);
}
async function casesOfDog(ctx: ToolCtx, d: Dog, sink: Sink, what: string): Promise<{ c: CaseRow } | Said> {
  cite(sink, dogCite(d));
  const open = await openCasesOf(ctx, d.id);
  if (!open) return { text: COULD_NOT };
  if (open.length === 1) { cite(sink, caseCite(open[0])); return { c: open[0] }; }
  if (!open.length) return { text: `${dogLabel(d)} has no open case, and a ${what} belongs on a case. Open a case for ${d.name ?? "this animal"} first, or ask me to add it as a task.` };
  open.forEach((c) => cite(sink, caseCite(c)));
  return { text: `${dogLabel(d)} has ${open.length} open cases. Give the case code of the one you mean; I have not picked one.` };
}

/* ── tasks ───────────────────────────────────────────────────────────── */
type Org = { id: string; name: string | null; workspace: string };
/** The workspace a task belongs to: the person's NGO, or the organisation of the workspace they are in. Membership is checked again on Confirm. */
async function taskOrg(ctx: ToolCtx): Promise<Org | { error: string }> {
  const hint = workspaceHint(ctx);
  if (ctx.orgId && (!hint || hint === "ngo")) return { id: ctx.orgId, name: null, workspace: "ngo" };
  const r = await ctx.db.rpc("nx_my_workspaces");
  if (r.error || !Array.isArray(r.data)) return ctx.orgId ? { id: ctx.orgId, name: null, workspace: "ngo" } : { error: "I could not check your workspace just now, so nothing was prepared. Try again." };
  const rows = r.data as { org_id: string; name: string; workspace: string }[];
  const pick = rows.find((x) => x.workspace === hint) ?? rows.find((x) => x.org_id === ctx.orgId) ?? rows[0];
  return pick ? { id: pick.org_id, name: pick.name, workspace: pick.workspace } : { error: "Tasks belong to an organisation's workspace, and your account is not in one yet. Join your organisation with its code, then ask me again." };
}
/** A team member by the name as said: the full name, one of their names, or a clear start of one. Two matches are both returned; nothing is guessed. */
export function matchPerson(said: string, list: Person[]): { hit?: Person; many?: Person[] } {
  const n = said.toLowerCase().replace(/\s+/g, " ").trim();
  const people = list.filter((p) => p.name && p.name !== "A colleague");
  const words = (p: Person) => p.name.toLowerCase().split(/[\s.]+/).filter(Boolean);
  const tiers: ((p: Person) => boolean)[] = [
    (p) => p.name.toLowerCase() === n,
    (p) => (n.includes(" ") ? p.name.toLowerCase().startsWith(n) : words(p).includes(n)),
    (p) => n.length >= 3 && !n.includes(" ") && words(p).some((w) => w.startsWith(n)),
    (p) => n.length >= 5 && !n.includes(" ") && words(p).some((w) => w.length >= 5 && editDistance(w, n) <= 1),
  ];
  for (const t of tiers) { const hits = people.filter(t); if (hits.length === 1) return { hit: hits[0] }; if (hits.length > 1) return { many: hits }; }
  return {};
}

export type TaskInput = { title: string; dueOn: string | null; whoName: string | null; explicit: boolean; whoPhrase: string | null; me: boolean; caseCode: string | null; caseId: string | null; animals: AnimalRef[]; dogId: string | null; said: string };
export function fromAsk(t: TaskAsk, said: string): TaskInput {
  return { title: t.title, dueOn: t.due?.day ?? null, whoName: t.who?.name ?? null, explicit: !!t.who?.explicit, whoPhrase: t.who?.phrase ?? null, me: t.me, caseCode: t.caseCode, caseId: null, animals: t.animals, dogId: null, said };
}

/** Prepare a task from words: the workspace, the person, the case or animal, each matched exactly with the person's own access. Saves nothing. */
export async function prepareTask(t: TaskInput, ctx: ToolCtx, sink: Sink, now = new Date()): Promise<Said> {
  if (!ctx.userId) return { text: "Sign in to add tasks. Nothing was prepared." };
  if (!t.title) return { text: "What is the task? Say it in one line, for example “Add a task: call the vet tomorrow” or “Assign Ravi to visit Dog 125 on Friday”." };
  const org = await taskOrg(ctx);
  if ("error" in org) return { text: org.error };
  const today = indiaDay(now);
  if (t.dueOn && t.dueOn < today) return { text: `${sayDay(t.dueOn)} has already passed. Tell me the day it is due and I will prepare it.` };
  const notes: string[] = [];
  let title = t.title, assigneeId: string | null = null, assigneeName: string | null = null;
  const suggestions: string[] = [];
  if (t.me) { assigneeId = ctx.userId; assigneeName = personName(ctx.userName ?? "you"); }
  else if (t.whoName) {
    const r = await ctx.db.rpc("nx_org_people", { p_org: org.id });
    const people = r.error || !Array.isArray(r.data) ? null : (r.data as Person[]);
    sink.tools.push({ name: "nx_org_people", summary: people ? `Read your team (${people.length})` : "Could not read your team", ok: !!people });
    const m = people ? matchPerson(t.whoName, people) : {};
    if (m.hit) { assigneeId = m.hit.user_id; assigneeName = m.hit.name; if (!t.explicit && t.whoPhrase) title = title.replace(t.whoPhrase, "").replace(/\s+/g, " ").trim(); }
    else if (t.explicit || m.many) {
      notes.push(!people ? "I could not read your team just now, so it is unassigned." : m.many ? `${m.many.length} people match “${t.whoName}” (${m.many.slice(0, 3).map((p) => p.name).join(", ")}), so it is unassigned. Name one in full, or choose on Today.` : `Nobody called “${t.whoName}” is in your team, so it is unassigned.`);
      for (const p of (m.many ?? []).slice(0, 3)) suggestions.push(t.said.replace(t.whoName, p.name));
    }
  }
  /* The record it is about: a case code, then an animal named exactly, then the record on the page. Only for the NGO's own records. */
  let caseId: string | null = null, caseLabelText: string | null = null, dogId: string | null = null, dogLabelText: string | null = null;
  const ngoRecords = !!ctx.orgId && org.id === ctx.orgId;
  if (ngoRecords) {
    if (t.caseId) { const c = await caseById(ctx, t.caseId); if (c && c !== "error") { caseId = c.id; caseLabelText = caseLabel(c); cite(sink, caseCite(c)); } else notes.push("That case is not in your organisation's records, so the task is not linked to it."); }
    if (!caseId && t.caseCode) {
      const rows = await casesByCode(ctx, t.caseCode);
      if (rows?.length === 1) { caseId = rows[0].id; caseLabelText = caseLabel(rows[0]); cite(sink, caseCite(rows[0])); }
      else if (rows && rows.length > 1) { rows.forEach((c) => cite(sink, caseCite(c))); notes.push(`${rows.length} cases start with ${t.caseCode}, so the task is not linked to one.`); }
      else if (rows) { const d = await dogsFor(ctx, { name: null, number: t.caseCode, phrase: t.caseCode }); if (d?.both.length === 1) { dogId = d.both[0].id; dogLabelText = dogLabel(d.both[0]); cite(sink, dogCite(d.both[0])); } else notes.push(`No case or animal ${t.caseCode} is in your records, so the task is not linked.`); }
    }
    if (!caseId && !dogId && t.dogId) { const d = await dogById(ctx, t.dogId); if (d && d !== "error") { dogId = d.id; dogLabelText = dogLabel(d); cite(sink, dogCite(d)); } }
    for (const a of !caseId && !dogId ? t.animals.slice(0, 2) : []) {
      if (assigneeName && a.name && assigneeName.toLowerCase().split(/\s+/).includes(a.name.toLowerCase())) continue;
      const d = await dogsFor(ctx, a);
      if (!d) break;
      if (d.both.length === 1) {
        const dog = d.both[0]; cite(sink, dogCite(dog));
        const open = await openCasesOf(ctx, dog.id);
        if (open?.length === 1) { caseId = open[0].id; caseLabelText = `${caseLabel(open[0])} (${dog.name ?? dogLabel(dog)})`; cite(sink, caseCite(open[0])); }
        else { dogId = dog.id; dogLabelText = dogLabel(dog); }
        break;
      }
      if (d.both.length > 1) { d.both.slice(0, 3).forEach((x) => cite(sink, dogCite(x))); notes.push(`${d.both.length} animals on your register match ${a.phrase}, so the task is not linked to one. Use its number, for example ${dogLabel(d.both.find((x) => dogTag(x)) ?? d.both[0])}.`); break; }
      if (a.number) notes.push(`No animal numbered ${a.number} is on your register, so the task is not linked to one.`);
    }
    if (!caseId && !dogId) {
      const s = subjectOf(ctx);
      if (s.caseId) { const c = await caseById(ctx, s.caseId); if (c && c !== "error") { caseId = c.id; caseLabelText = caseLabel(c); cite(sink, caseCite(c)); } }
      else if (s.dogId) { const d = await dogById(ctx, s.dogId); if (d && d !== "error") { dogId = d.id; dogLabelText = dogLabel(d); cite(sink, dogCite(d)); } }
    }
  }
  if (!t.dueOn) notes.push("No date was given, so it has no due date.");
  const p: Proposal = {
    id: workId("kt", org.id, ctx.userId, t.said.replace(/\s+/g, " ").trim().toLowerCase(), today), kind: "add_task",
    why: [`Prepared from your words${org.name ? ` for ${org.name}` : ""}.`, ...notes].join(" "),
    title: title.slice(0, 240), dueOn: t.dueOn, assigneeId, assigneeName, caseId, caseLabel: caseLabelText, orgId: org.id, dogId, dogLabel: dogLabelText,
  };
  sink.proposals.push(p);
  sink.tools.push({ name: "prepare_task", summary: "Prepared a task", ok: true });
  const parts = [t.dueOn ? `due **${sayDay(t.dueOn)}**` : null, assigneeName ? `for **${assigneeId === ctx.userId ? "you" : assigneeName}**` : null, caseLabelText ? `on **${caseLabelText}**` : dogLabelText ? `about **${dogLabelText}**` : null].filter(Boolean);
  return { text: `I prepared a task: **${title}**${parts.length ? `, ${parts.join(", ")}` : ""}.${notes.length ? ` ${notes.join(" ")}` : ""} Press Confirm to add it to Today; nothing is saved until you do.`, suggestions: suggestions.length ? suggestions : undefined };
}

/** The model path's propose_task: the same preparation from a tool call. */
export async function proposeTaskTool(input: Record<string, unknown>, ctx: ToolCtx): Promise<ToolOut> {
  const sink: Sink = { citations: [], tools: [], proposals: [] };
  const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const due = s(input.due_on, 10);
  const who = s(input.assignee_name, 80);
  const said = `${s(input.title, 240)}${due ? ` ${due}` : ""}${who ? ` for ${who}` : ""}`;
  const out = await prepareTask({ title: s(input.title, 240), dueOn: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null, whoName: who || null, explicit: !!who, whoPhrase: null, me: input.assignee_is_me === true, caseCode: codeIn(s(input.case, 60)), caseId: UUID.test(s(input.case_id, 36)) ? s(input.case_id, 36) : null, animals: [], dogId: UUID.test(s(input.dog_id, 36)) ? s(input.dog_id, 36) : null, said }, ctx, sink);
  return { data: { prepared: sink.proposals.length > 0, confirm_required: true, said: out.text }, summary: sink.proposals.length ? "Prepared a task" : "Task not prepared", citations: sink.citations, proposals: sink.proposals, ok: sink.proposals.length > 0 };
}

/* ── notes, follow-ups and care on the NGO's records ─────────────────── */
export async function prepareNote(n: NoteAsk, said: string, ctx: ToolCtx, sink: Sink, call: Call): Promise<Said> {
  if (!ctx.orgId) return { text: NEEDS_ORG };
  const got = await oneCase(ctx, n.ref, said, sink, "note");
  if (!("c" in got)) return got;
  const out = await call("propose_note", { case_id: got.c.id, note: n.text });
  if (out.ok === false) return { text: out.summary === "Empty note" ? "The note is empty. Say what to write after the colon." : "That case could not be read with your access, so nothing was prepared." };
  return { text: `I prepared a note on **${caseLabel(got.c)}**: “${n.text.slice(0, 200)}”. Press Confirm to add it to the case history.` };
}

export async function prepareFollowup(f: FollowupAsk, said: string, ctx: ToolCtx, sink: Sink, call: Call, now = new Date()): Promise<Said> {
  if (!ctx.orgId) return { text: NEEDS_ORG };
  if (!f.due) return { text: `When is the follow-up? Say it with a day, for example “${f.ref ? `follow up ${f.ref} next Monday` : "follow up next Monday"}”.` };
  if (f.due.day < indiaDay(now)) return { text: `${sayDay(f.due.day)} has already passed. Choose today or a later day.` };
  const got = await oneCase(ctx, f.ref, said, sink, "follow-up");
  if (!("c" in got)) return got;
  const out = await call("propose_followup", { case_id: got.c.id, due_date: f.due.day, note: f.note });
  if (out.ok === false) return { text: "That follow-up could not be prepared with your access. Nothing was saved." };
  return { text: `I prepared a follow-up on **${caseLabel(got.c)}** for **${sayDay(f.due.day)}**${f.note ? `: “${f.note.slice(0, 160)}”` : ""}. Press Confirm to schedule it.` };
}

const DO: Record<string, string> = { vaccination: "Vaccinate", sterilisation: "Sterilise", deworming: "Deworm", treatment: "Treat", checkup: "Check on" };
export async function prepareCare(c: CareAsk, said: string, ctx: ToolCtx, sink: Sink, call: Call, now = new Date()): Promise<Said> {
  if (!ctx.orgId) return { text: NEEDS_ORG };
  const subject = subjectOf(ctx);
  let dog: Dog | null = null;
  if (c.animal) { const got = await oneDog(ctx, c.animal, said, sink); if (!("dog" in got)) return got; dog = got.dog; }
  else if (subject.dogId) { const d = await dogById(ctx, subject.dogId); if (d === "error") return { text: COULD_NOT }; dog = d; }
  else if (subject.caseId) { const cs = await caseById(ctx, subject.caseId); if (cs === "error") return { text: COULD_NOT }; if (cs?.dog_id) { const d = await dogById(ctx, cs.dog_id); if (d === "error") return { text: COULD_NOT }; dog = d; } else if (cs) return { text: "This case has no animal linked yet, so I cannot record care on it. Link the animal on the case first." }; }
  if (!dog) return { text: `Which animal? Care is recorded on one animal. Give its name or number, for example “vaccinated Tiger (DDS-00421) today”.` };
  cite(sink, dogCite(dog));
  if (c.future) {
    return prepareTask({ title: `${DO[c.careKind]} ${dog.name ?? dogLabel(dog)}`, dueOn: c.date!.day, whoName: null, explicit: false, whoPhrase: null, me: false, caseCode: null, caseId: null, animals: [], dogId: dog.id, said }, ctx, sink, now)
      .then((r) => ({ ...r, text: `${sayDay(c.date!.day)} is still to come, so this is a task, not a care record. ${r.text} Record the care once it is done.` }));
  }
  const out = await call("propose_care", { dog_id: dog.id, kind: c.careKind, date: c.date?.day ?? undefined, notes: said.trim().slice(0, 800) });
  if (out.ok === false) return { text: "That animal could not be read with your access, so nothing was prepared." };
  const p = sink.proposals[sink.proposals.length - 1];
  const noDate = !c.date;
  if (p?.kind === "record_care") p.why = `Care as you told it, for ${dogLabel(dog)}.${noDate ? " No date was given, so it would be saved with today's date." : ""} A recorded claim by your organisation, not a veterinarian's sign-off.`;
  return { text: `I prepared **${c.careKind}** for **${dogLabel(dog)}**${c.date ? ` on **${sayDay(c.date.day)}**` : ""}.${noDate ? " No date was in your note, so it would be saved with today's date; say the date if it was another day." : ""} Press Confirm to add it to the animal's care history.` };
}

/** A one-line field report: the intake desk reads it (exact-tag animal link, an open case it may repeat, the organisation's city), and prepares the case. */
export async function prepareReport(said: string, ctx: ToolCtx, sink: Sink, call: Call): Promise<Said> {
  const text = reportText(said);
  const x = extractFieldMessage(text);
  if (!ctx.orgId) { sink.tools.push({ name: "extract_field_message", summary: x.summary, ok: true }); return { text: `I read this as: **${x.summary}**. To turn it into a case you need an organisation workspace. Residents can report it at /community/report.` }; }
  const subject = subjectOf(ctx);
  /* On a case's page a report is about that case: a note. On an animal's page it goes to the animal's one open case as a note, or becomes a new case for this animal. */
  if (subject.caseId) {
    const got = await oneCase(ctx, null, said, sink, "note");
    if (!("c" in got)) return got;
    const out = await call("propose_note", { case_id: got.c.id, note: text });
    if (out.ok !== false) return { text: `This is about **${caseLabel(got.c)}**, so I prepared it as a note on that case: “${text.slice(0, 160)}”. Press Confirm to add it.` };
    return { text: COULD_NOT };
  }
  if (subject.dogId) {
    const d = await dogById(ctx, subject.dogId);
    if (d === "error") return { text: COULD_NOT };
    if (d) {
      cite(sink, dogCite(d));
      const open = await openCasesOf(ctx, d.id);
      if (!open) return { text: COULD_NOT };
      if (open.length === 1) { cite(sink, caseCite(open[0])); const out = await call("propose_note", { case_id: open[0].id, note: text }); if (out.ok !== false) return { text: `${dogLabel(d)} has an open case, **${caseLabel(open[0])}**, so I prepared this as a note on it: “${text.slice(0, 160)}”. Press Confirm to add it.` }; }
      if (open.length > 1) { open.forEach((c) => cite(sink, caseCite(c))); return { text: `${dogLabel(d)} has ${open.length} open cases. Open the one this is about and tell me there; I have not picked one.` }; }
      const org = await ctx.db.from("ngos").select("city").eq("id", ctx.orgId).maybeSingle();
      const city = x.city ?? ((org.data as { city?: string | null } | null)?.city ?? "");
      if (!city) return { text: `I read this as **${x.summary}** for ${dogLabel(d)}. Tell me the city and I will prepare the case.` };
      await call("propose_case", { title: `${x.summary}`.slice(0, 110), city, zone: x.place ?? d.zone ?? undefined, category: x.category, severity: x.severity, description: text.slice(0, 1200), dog_id: d.id });
      const missing = x.missing.filter((m) => m !== "city");
      const p = sink.proposals[sink.proposals.length - 1];
      if (p?.kind === "open_case") p.why = `New report for ${dogLabel(d)}.${missing.length ? ` Not in the message: ${missing.join(", ")}.` : ""}${x.city ? "" : ` City taken from your organisation (${city}).`}`;
      return { text: `I read this as **${x.summary}** for **${dogLabel(d)}**, which has no open case, so I prepared a new case for it.${missing.length ? ` Not in the message: ${missing.join(", ")}.` : ""} Check it and press Confirm; nothing is saved until you do.` };
    }
  }
  const out = await call("prepare_intake", { text });
  if (out.ok === false) {
    /* The duplicate check could not run: prepare the case from the words alone, and say so. */
    const city = x.city ?? "";
    sink.tools.push({ name: "extract_field_message", summary: x.summary, ok: true });
    if (city) await call("propose_case", { title: x.summary.slice(0, 110), city, zone: x.place ?? undefined, category: x.category, severity: x.severity, description: `${text.slice(0, 1200)}${x.date ? `\n\nDate given: ${x.date}.` : ""}` });
    const missing = x.missing.filter((m) => m !== "city" || !city);
    const p = sink.proposals[sink.proposals.length - 1];
    if (p?.kind === "open_case") p.why = `New report.${missing.length ? ` Not in the message: ${missing.join(", ")}.` : ""} Open cases could not be checked for the same animal just now.`;
    return { text: `I read this as **${x.summary}**${x.date ? `, dated ${x.date}` : ""}.${missing.length ? ` Still missing: ${missing.join(", ")}.` : ""}${city ? " I could not check your open cases for the same animal just now. I prepared a case below; check it and press Confirm to save it." : " Tell me the city and I will prepare the case."}` };
  }
  const plans = (Array.isArray(out.data) ? out.data : []) as { report: string; missing: string[]; blockers: string[]; duplicate: string | null }[];
  const one = plans[0];
  if (!sink.proposals.length) return { text: one?.blockers.some((b) => /city/i.test(b)) ? `I read this as **${one.report}**. Tell me the city and I will prepare the case.` : "I could not turn that into a record. Say where it is and what happened." };
  return { text: `I read this as **${one?.report ?? x.summary}**.${one?.duplicate ? ` It may be the same animal as **${one.duplicate}**, which is already open: choose whether to add it there or open a new case.` : ""}${one?.missing.length ? ` Not in the message: ${one.missing.join(", ")}.` : ""} Confirm the one you want. Nothing is saved until you do.` };
}
