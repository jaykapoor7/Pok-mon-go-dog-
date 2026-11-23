import type { Block } from "@/sp3/ai/blocks";
import type { Citation, Proposal } from "@/sp3/ai/types";
import { ANIMALS, CHECKED_PER_DAY, EVIDENCE, EVIDENCE_WORD, FIGURES, PACKAGE, SAMPLE, TODAY_BRIEF, WARDS, animalLabel, findAnimal, recordHref, type DemoAnimal, type EvidenceKind } from "./programme";

/* ════════════════════════════════════════════════════════════════════
   Kaju's tools on the homepage's sample programme.

   The same shape as the product's record tools (src/sp3/ai/tools.ts): a
   tool returns data, a one-line summary, the records it read as
   citations, and anything it prepared as a proposal. The difference is
   what they can reach: these read one in-memory sample and nothing else.
   There is no database client, no organisation, no session and no write
   path in this file. "Prepare" tools return a card; nothing is saved.
   ════════════════════════════════════════════════════════════════════ */

export type DemoOut = { data: unknown; summary: string; citations: Citation[]; proposals?: Proposal[]; blocks?: Block[]; ok?: boolean };

const cite = (a: DemoAnimal): Citation => ({ id: `animal:${a.code}`, label: animalLabel(a), href: recordHref(a.code), kind: "animal" });
const PACKAGE_CITE: Citation = { id: "package:october", label: "October package", href: recordHref("october-package"), kind: "programme" };
const date = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) : "Not recorded");
const clean = (v: unknown, n = 120) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
const pid = () => `demo-${Math.random().toString(36).slice(2, 10)}`;
const brief = (a: DemoAnimal) => ({ code: a.code, name: a.name, sex: a.sex, looks: a.looks, place: a.place, stage: a.stage, missing_evidence: a.missing.map((k) => EVIDENCE_WORD[k]), flags: a.flags, next_step: a.next });

function overview(): DemoOut {
  return {
    data: { sample: true, organisation: SAMPLE.org, programme: SAMPLE.programme, as_of: SAMPLE.asOfWords, people: SAMPLE.people.map((p) => `${p.name} (${p.role})`), ...FIGURES, october_package: { status: PACKAGE.status, due: PACKAGE.dueWords }, today: TODAY_BRIEF },
    summary: `Read the ${SAMPLE.org} register: ${FIGURES.records} records`,
    citations: [PACKAGE_CITE],
    blocks: [{ kind: "stats", title: `${SAMPLE.org} · as of ${date(SAMPLE.asOf)}`, items: [
      { label: "Animals on the register", value: String(FIGURES.records) },
      { label: "Sterilised in October", value: String(FIGURES.sterilised), tone: "good" },
      { label: "Vaccinated", value: String(FIGURES.vaccinated), tone: "good" },
      { label: "Released", value: String(FIGURES.released), note: `${FIGURES.inCare} still in care` },
      { label: "Evidence complete", value: `${FIGURES.evidenceCompletePct}%`, tone: "warn", note: `${FIGURES.missingReleasePhoto} release photos missing` },
    ] }],
  };
}

function findAnimals(input: Record<string, unknown>): DemoOut {
  const q = clean(input.query, 60).toLowerCase();
  const missing = EVIDENCE.includes(input.missing as EvidenceKind) ? (input.missing as EvidenceKind) : null;
  const stage = clean(input.stage, 20).toLowerCase();
  const rows = ANIMALS.filter((a) => (!q || `${a.code} ${a.name ?? ""} ${a.looks} ${a.place} ${a.flags.join(" ")}`.toLowerCase().includes(q)) && (!missing || a.missing.includes(missing)) && (!stage || a.stage.toLowerCase() === stage));
  return {
    data: { sample: true, note: `The sample holds ${ANIMALS.length} records in detail; programme totals are summary figures.`, matched: rows.length, animals: rows.map(brief) },
    summary: rows.length ? `Found ${rows.length} sample record${rows.length === 1 ? "" : "s"}` : "No sample record matched",
    citations: rows.map(cite),
    blocks: rows.length ? [{ kind: "records", title: missing ? `Missing: ${EVIDENCE_WORD[missing].toLowerCase()}` : "Sample records", items: rows.slice(0, 10).map((a) => ({ label: animalLabel(a), meta: `${a.sex} · ${a.looks} · ${a.place}`, href: recordHref(a.code), tag: a.stage })) }] : undefined,
  };
}

/** One animal's record: its facts, what evidence is in, and its history with who did what. */
export function recordBlocks(a: DemoAnimal): Block[] {
  return [
    { kind: "stats", title: `${animalLabel(a)} · ${a.sex}, ${a.looks}`, items: [
      { label: "Stage", value: a.stage },
      { label: "Captured", value: date(a.capturedOn), note: a.place },
      { label: "Sterilised", value: date(a.sterilisedOn), ...(a.sterilisedOn ? { tone: "good" as const } : {}) },
      { label: "Vaccinated", value: date(a.vaccinatedOn), ...(a.vaccinatedOn ? { tone: "good" as const } : {}) },
      { label: "Released", value: date(a.releasedOn) },
    ] },
    { kind: "compare", title: "Evidence", columns: ["On the record"], rows: EVIDENCE.map((k) => ({ label: EVIDENCE_WORD[k], values: [a.missing.includes(k) ? "Missing" : "Present"] })) },
    { kind: "timeline", title: "History · nothing deleted", items: a.history.map((h) => ({ when: h.when, label: `${h.who}: ${h.what}`, note: h.tag })) },
  ];
}
function animalRecord(input: Record<string, unknown>): DemoOut {
  const a = findAnimal(clean(input.code, 20));
  if (!a) return { data: { error: "No sample record has that code", known_codes: ANIMALS.map((x) => x.code) }, summary: "No sample record with that code", citations: [], ok: false };
  const twin = a.flags.join(" ").match(/SP-\d{4}/)?.[0];
  const other = twin ? findAnimal(twin) : null;
  return {
    data: { sample: true, ...brief(a), captured_on: a.capturedOn, sterilised_on: a.sterilisedOn, vaccinated_on: a.vaccinatedOn, released_on: a.releasedOn, history: a.history },
    summary: `Read ${animalLabel(a)} and its ${a.history.length} history entries`,
    citations: [cite(a), ...(other ? [cite(other)] : [])],
    blocks: recordBlocks(a),
  };
}

function evidenceCheck(): DemoOut {
  const open = ANIMALS.filter((a) => a.releasedOn && a.missing.includes("release_photo"));
  const fixed = findAnimal("SP-1031")!;
  return {
    data: { sample: true, check: "Weekly evidence check", week: SAMPLE.week, records_read: FIGURES.records, released_this_week: FIGURES.releasedThisWeek, evidence_complete_pct: FIGURES.evidenceCompletePct,
      resolved: [{ code: fixed.code, what: "Release photo added by Ravi on 3 Nov" }],
      still_missing: open.map((a) => ({ code: a.code, missing: a.missing.map((k) => EVIDENCE_WORD[k]), flags: a.flags, next_step: a.next })),
      records_checked_per_day: CHECKED_PER_DAY },
    summary: `Checked ${FIGURES.releasedThisWeek} releases from ${SAMPLE.week.split(" (")[0]}: ${open.length} still missing a photo`,
    citations: [...open.map(cite), cite(fixed)],
    blocks: [
      { kind: "table", title: `Releases in ${SAMPLE.week.split(" (")[0]} that needed a photo`, columns: ["Record", "What Kaju found", "Where it stands"], rows: [
        { cells: [fixed.code, "Release photo was missing", "Resolved: Ravi added it"], href: recordHref(fixed.code) },
        ...open.map((a) => ({ cells: [a.code, a.flags.some((f) => /duplicate/i.test(f)) ? "Release photo missing; possible duplicate" : "Release photo missing", a.flags[0] ?? "Open"], href: recordHref(a.code) })),
      ] },
      { kind: "chart", title: "Records checked per day", form: "bar", unit: "records", points: CHECKED_PER_DAY.map((d) => ({ label: d.day, value: d.records })) },
    ],
  };
}

function reportPackage(): DemoOut {
  const cited = PACKAGE.exceptions.map((e) => findAnimal(e.code)).filter((a): a is DemoAnimal => !!a);
  return {
    data: { sample: true, ...PACKAGE, figures: { sterilised: FIGURES.sterilised, vaccinated: FIGURES.vaccinated, released: FIGURES.released, exceptions: FIGURES.exceptions }, note: "Acceptance by the municipal office is not payment. Kaju prepares; Anita confirms and submits." },
    summary: `Read the October package: ${PACKAGE.status.toLowerCase()}, due ${PACKAGE.dueWords}`,
    citations: [PACKAGE_CITE, ...cited.map(cite)],
    blocks: packageBlocks(),
  };
}
export function packageBlocks(): Block[] {
  return [
    { kind: "stats", title: `${PACKAGE.title} · ${PACKAGE.status}`, items: [
      { label: "Sterilised", value: String(FIGURES.sterilised) }, { label: "Vaccinated", value: String(FIGURES.vaccinated) },
      { label: "Released", value: String(FIGURES.released) }, { label: "Exceptions", value: String(FIGURES.exceptions), note: "each explained", tone: "warn" },
    ] },
    { kind: "table", title: "Exceptions log", columns: ["Record", "Exception", "Where it stands"], rows: PACKAGE.exceptions.map((e) => ({ cells: [e.code, e.issue, e.state], href: recordHref(e.code) })) },
  ];
}

function wardComparison(): DemoOut {
  const top = [...WARDS].sort((a, b) => b.sterilised - a.sterilised)[0];
  return {
    data: { sample: true, month: "October 2026", wards: WARDS, total: WARDS.reduce((n, w) => n + w.sterilised, 0), highest: top },
    summary: `Compared ${WARDS.length} wards for October`,
    citations: [PACKAGE_CITE],
    blocks: [{ kind: "chart", title: "Sterilisations by ward · October 2026", form: "bar", unit: "sterilisations", points: WARDS.map((w) => ({ label: w.ward, value: w.sterilised })) }],
  };
}

function teamActivity(): DemoOut {
  const events = ANIMALS.flatMap((a) => a.history.map((h) => ({ ...h, code: a.code }))).filter((e) => /^(3|4) Nov/.test(e.when)).sort((x, y) => y.when.localeCompare(x.when));
  return {
    data: { sample: true, people: SAMPLE.people, recent: events, today: TODAY_BRIEF },
    summary: `Read ${events.length} recent changes by the team`,
    citations: [...new Set(events.map((e) => e.code))].map((c) => cite(findAnimal(c)!)),
    blocks: [{ kind: "timeline", title: "Latest on the record", items: events.slice(0, 8).map((e) => ({ when: e.when, label: `${e.who}: ${e.what}`, note: `${e.code} · ${e.tag}`, href: recordHref(e.code) })) }],
  };
}

/* Prepare tools: a card to confirm. Nothing is saved, here or on Confirm (the homepage's Confirm only marks the card). */
function proposeTask(input: Record<string, unknown>): DemoOut {
  const title = clean(input.title, 200);
  if (!title) return { data: { error: "A task needs a title" }, summary: "A task needs a title", citations: [], ok: false };
  const who = SAMPLE.people.find((p) => p.name.toLowerCase().replace(/^dr\.?\s*/, "") === clean(input.assignee, 40).toLowerCase().replace(/^dr\.?\s*/, "")) ?? null;
  const a = findAnimal(clean(input.animal, 20));
  const due = /^\d{4}-\d{2}-\d{2}$/.test(clean(input.due_on, 10)) ? clean(input.due_on, 10) : null;
  const p: Proposal = { id: pid(), kind: "add_task", why: "Sample programme: confirming shows how it would be saved under your name. Nothing is stored.", title, dueOn: due, assigneeId: who?.id ?? null, assigneeName: who?.name ?? null, caseId: null, caseLabel: null, dogId: a?.code ?? null, dogLabel: a ? animalLabel(a) : null };
  return { data: { prepared: true, saved: false, title, assignee: who?.name ?? null, due_on: due, about: a?.code ?? null }, summary: `Prepared a task${who ? ` for ${who.name}` : ""}`, citations: a ? [cite(a)] : [], proposals: [p] };
}
function proposeNote(input: Record<string, unknown>): DemoOut {
  const a = findAnimal(clean(input.animal, 20)); const note = clean(input.note, 400);
  if (!a || !note) return { data: { error: "A note needs a sample record code and words" }, summary: "A note needs a record and words", citations: [], ok: false };
  const p: Proposal = { id: pid(), kind: "add_note", why: "Sample programme: confirming shows how it would be saved under your name. Nothing is stored.", caseId: a.code, caseLabel: animalLabel(a), note };
  return { data: { prepared: true, saved: false, about: a.code, note }, summary: `Prepared a note on ${a.code}`, citations: [cite(a)], proposals: [p] };
}

export const DEMO_TOOL_DEFS = [
  { name: "programme_overview", description: "The sample programme's register as it stands: totals (records, sterilised, vaccinated, released, in care), evidence completeness, the October package's status and due date, the team, and today's brief. Start here for counts and for 'what needs me today'.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "find_animals", description: "Find sample animal records by words (code, name, colour, place, flag), by a missing evidence kind, or by stage. Returns each record's stage, missing evidence, flags and next step.", input_schema: { type: "object", properties: { query: { type: "string" }, missing: { type: "string", enum: [...EVIDENCE] }, stage: { type: "string", enum: ["New", "In care", "With the vet", "Evidence", "To report", "Released"] } }, additionalProperties: false } },
  { name: "animal_record", description: "Read one sample animal's record by its code (for example SP-1067): dates, evidence present or missing, flags, the next step, and its full history with who did what.", input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"], additionalProperties: false } },
  { name: "evidence_check", description: "Kaju's weekly evidence check on the sample: releases missing a release photo, what was resolved, the possible duplicate, and records checked per day.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "report_package", description: "The October report package for the reviewing municipal office: figures, sections, status, due date, who prepared and confirmed it, and the exceptions log with each exception's explanation.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "ward_comparison", description: "October sterilisations by ward, for the municipal review. Use for comparisons and charts across wards.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "team_activity", description: "Who is on the sample team and what each person changed most recently, from the records' own history.", input_schema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "propose_task", description: "Prepare a task card for the person to confirm (for example a reminder to Ravi to send a release photo). It does NOT save. assignee is one of Anita, Ravi, Dr. Rao. due_on is YYYY-MM-DD.", input_schema: { type: "object", properties: { title: { type: "string" }, assignee: { type: "string" }, due_on: { type: "string" }, animal: { type: "string", description: "A sample record code, if the task is about one animal" } }, required: ["title"], additionalProperties: false } },
  { name: "propose_note", description: "Prepare a note on one sample animal's record for the person to confirm. It does NOT save.", input_schema: { type: "object", properties: { animal: { type: "string" }, note: { type: "string" } }, required: ["animal", "note"], additionalProperties: false } },
] as const;

const RUN: Record<string, (input: Record<string, unknown>) => DemoOut> = {
  programme_overview: overview, find_animals: findAnimals, animal_record: animalRecord, evidence_check: evidenceCheck, report_package: reportPackage,
  ward_comparison: wardComparison, team_activity: teamActivity, propose_task: proposeTask, propose_note: proposeNote,
};
/** Run one sample tool. A name that is not on the list runs nothing. */
export function runDemoTool(name: string, input: Record<string, unknown>): DemoOut {
  const fn = Object.prototype.hasOwnProperty.call(RUN, name) ? RUN[name] : null;
  if (!fn) return { data: { error: "Tool unavailable in the sample" }, summary: "Tool unavailable", citations: [], ok: false };
  try { return fn(input && typeof input === "object" ? input : {}); } catch { return { data: { error: "Tool failed" }, summary: "Tool failed", citations: [], ok: false }; }
}

/** The card the homepage opens for a record link: drawn from the same tool results, with no model involved. */
export function recordCard(code: string): { title: string; meta: string; blocks: Block[]; ask: string } | null {
  if (code === "october-package") return { title: PACKAGE.title, meta: `${PACKAGE.status} · due ${PACKAGE.dueWords} · prepared by ${PACKAGE.preparedBy}, confirmed by ${PACKAGE.confirmedBy}`, blocks: packageBlocks(), ask: "What is still holding up the October package?" };
  const a = findAnimal(code);
  return a ? { title: animalLabel(a), meta: `${a.sex} · ${a.looks} · ${a.place}${a.flags.length ? ` · ${a.flags.join(" · ")}` : ""}`, blocks: recordBlocks(a), ask: `What is the next step for ${a.code}?` } : null;
}
