/* Kaju's capture desk and conversation, without a model: tasks from one line, records from one line, small talk and what
   Kaju can do, the fallback, a clinician's bite and PEP questions, a bite record from a note, and the two confirms
   (a task into nx_tasks, a bite through the bite form's own function). Then properties over many generated inputs.
   The record store is a double (scripts/test-kaju-fixtures.ts); fake data only; nothing reaches a database or a model.
   Run: npm run test:kaju-capture */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answer, withTools } from "../src/sp3/ai/engine";
import type { ToolCtx } from "../src/sp3/ai/tools";
import type { AiReply, Proposal } from "../src/sp3/ai/types";
import { addDays, findDate, indiaDay, looksLikeExposure, looksLikeReport, parseCare, parseExposure, parseFollowup, parseHealthAsk, parseNote, parseTask, stripMention, CLINICAL_DECISION } from "../src/sp3/ai/capture";
import { matchPerson, subjectOf } from "../src/sp3/ai/captureRoute";
import { asksAboutKaju, EXAMPLES } from "../src/sp3/ai/introduce";
import { confirmExposure, confirmTask, taskIdFor } from "../src/sp3/ai/confirm";
import { setInferenceLedger } from "../src/lib/ai/inference";
import { isAiReply } from "../src/sp3/ai/validation";
import { BHOLU, CASE_CLOSED, CASE_MAX, CASE_OTHER, HOSPITAL, MAX, ME, ORG, OTHER_HOSPITAL, OTHER_ORG, OUTSIDER, PRIYA, RAVI, TIGER, TIGER_OTHER, fakeDb, healthWorld, ngoWorld } from "./test-kaju-fixtures";

let checks = 0;
const ok = (label: string) => console.log(`ok ${++checks} - ${label}`);
type Reply = Omit<AiReply, "notice">;
const quiet = <T>(f: () => Promise<T>) => { const info = console.info; console.info = () => {}; return f().finally(() => { console.info = info; }); };

/* ── worlds ──────────────────────────────────────────────────────────── */
function ngo(opts: Parameters<typeof ngoWorld>[0] & { pagePath?: string; subject?: ToolCtx["subject"]; workspace?: string } = {}) {
  const w = ngoWorld(opts); const f = fakeDb(w.tables, w.rpcs);
  const ctx: ToolCtx = { db: f.db, orgId: ORG, userId: ME, userVerified: true, userName: "Asha Menon", actorRole: "coordinator", pagePath: opts.pagePath ?? "/ngo/today", subject: opts.subject, workspace: opts.workspace ?? null };
  return { ctx, ...f };
}
function clinic(role: "clinician" | "nurse" | "records" | "field" = "clinician") {
  const w = healthWorld({ role }); const f = fakeDb(w.tables, w.rpcs);
  const ctx: ToolCtx = { db: f.db, orgId: null, userId: ME, userVerified: true, userName: "Dr Asha Menon", actorRole: null, pagePath: "/health/today" };
  return { ctx, world: w, ...f };
}
const office = () => { const w = ngoWorld(); const f = fakeDb(w.tables, { ...w.rpcs, nx_my_workspaces: () => ({ data: [{ org_id: "0ff1ce00-0000-4000-8000-000000000001", name: "Ward Office", workspace: "government", kind: "municipal", role: "reviewer" }], error: null }) }); return { ctx: { db: f.db, orgId: null, userId: "0ff1ce00-0000-4000-8000-0000000000a1", userName: "Lata", actorRole: "municipal_reviewer", pagePath: "/gov/verification" } as ToolCtx, ...f }; };
const guest = () => { const w = ngoWorld(); const f = fakeDb(w.tables, w.rpcs); return { ctx: { db: f.db, orgId: null, userName: null } as ToolCtx, ...f }; };
const ask = (q: string, ctx: ToolCtx) => quiet(() => withTools(q, ctx));
const only = <K extends Proposal["kind"]>(r: Reply, kind: K) => { const p = r.proposals.filter((x) => x.kind === kind); assert.equal(p.length, 1, `one ${kind}: ${r.text}`); return p[0] as Extract<Proposal, { kind: K }>; };
const fallback = (r: Reply) => /could not match/.test(r.text);
const WRITES = /^(?:oh_record_exposure|kaju_confirm_action|add_case_note|add_case_followup|add_medical_event|create_case_with_location|oh_prescribe|oh_set_category|oh_record_dose|nx_mission_start|remove_record)$/;
const savedNothing = (f: { log: { writes: { table: string }[]; rpcs: { name: string }[] } }) => f.log.writes.every((w) => w.table === "ai_action_log") && !f.log.rpcs.some((r) => WRITES.test(r.name));

async function main() {
  const NOW = new Date("2026-11-17T06:00:00Z"); // Tuesday, 11:30 in India
  const today = indiaDay(), tomorrow = addDays(today, 1);
  const weekday = (name: string) => findDate(`on ${name}`, new Date())!.day;

  /* ── 1. the words ──────────────────────────────────────────────────── */
  {
    const T = (q: string) => parseTask(q, NOW);
    assert.deepEqual([T("add a task: call the vet tomorrow")?.title, T("add a task: call the vet tomorrow")?.due?.day], ["Call the vet", "2026-11-18"]);
    assert.deepEqual([T("@Kaju todo check Tiger's wound Friday")?.title, T("@Kaju todo check Tiger's wound Friday")?.due?.day], ["Check Tiger's wound", "2026-11-20"]);
    assert.deepEqual([T("remind me to send the package on Monday")?.title, T("remind me to send the package on Monday")?.due?.day, T("remind me to send the package on Monday")?.me], ["Send the package", "2026-11-23", true]);
    const assign = T("assign Ravi to visit Dog 125 tomorrow")!;
    assert.deepEqual([assign.title, assign.due?.day, assign.who?.name, assign.who?.explicit, assign.animals[0]?.number], ["Visit Dog 125", "2026-11-18", "Ravi", true, "125"]);
    const priya = T("task for Priya: photos of SPC-36A054")!;
    assert.deepEqual([priya.title, priya.who?.name, priya.caseCode, priya.due], ["Photos of SPC-36A054", "Priya", "SPC-36A054", null]);
    assert.equal(T("add a task for Ravi to buy food next Monday")?.due?.day, "2026-11-23");
    assert.equal(T("add a task")?.title, "");
    assert.equal(T("remind me every monday about overdue follow-ups"), null, "a recurring reminder is an automation");
    assert.equal(T("call the vet for Ravi"), null, "a bare sentence is never a task on a guess");
    assert.equal(T("what are my tasks?"), null);
    assert.equal(T("task list"), null);
    assert.equal(T("add a task: call the vet yesterday")?.dueInPast, true);
    ok("tasks: title, day (India), person and record are read from one line; recurring words and questions are not tasks");

    for (const [said, want] of [["@Kaju hi", "hi"], ["@kaju", "hello"], ["Kaju, what can you do", "what can you do"], ["@Kaju   add a task: x", "add a task: x"], ["hey kaju what's up", "what's up"], ["ask @Priya to call", "ask Priya to call"]] as const) assert.equal(stripMention(said), want, said);
    ok("“@Kaju”, “Kaju,” and “hey Kaju” in front are how a person addresses Kaju, not part of the request");

    const D = (s: string, now = NOW, lean: "future" | "past" = "future") => findDate(s, now, lean)?.day ?? null;
    assert.deepEqual([D("tomorrow"), D("tmrw"), D("day after tomorrow"), D("next Monday"), D("this Tuesday"), D("on Tuesday"), D("by Friday"), D("20 Nov"), D("20/11"), D("in 3 days"), D("end of month")],
      ["2026-11-18", "2026-11-18", "2026-11-19", "2026-11-23", "2026-11-17", "2026-11-24", "2026-11-20", "2026-11-20", "2026-11-20", "2026-11-20", "2026-11-30"]);
    assert.equal(D("tomorrow", new Date("2026-11-16T20:00:00Z")), "2026-11-18", "01:30 in India on the 17th: tomorrow is the 18th");
    assert.equal(D("2 Jan"), "2027-01-02", "a day already past this year is next year's when it is due");
    assert.equal(D("Monday", NOW, "past"), "2026-11-16", "done on Monday means the Monday just gone");
    assert.equal(D("sat near the gate on Friday"), "2026-11-20", "a short weekday needs a word before it");
    ok("dates are calendar days in India: tomorrow, weekdays, next Monday, dates and end of month");

    assert.deepEqual(parseNote("note on SPC-36A054: ate well"), { ref: "SPC-36A054", text: "ate well" });
    assert.deepEqual(parseNote("add a note to Tiger's case - eating well"), { ref: "Tiger", text: "eating well" });
    assert.deepEqual(parseNote("note: stitches clean"), { ref: null, text: "stitches clean" });
    assert.equal(parseNote("what does the note say"), null);
    const F = (q: string) => parseFollowup(q, NOW);
    assert.deepEqual(F("follow up Max next Monday"), { ref: "Max", due: { day: "2026-11-23", phrase: "next Monday" }, note: "" });
    assert.equal(F("schedule a follow-up for SPC-36A054 on 20 Nov: check the stitches")?.note, "check the stitches");
    assert.equal(F("recheck Tiger Friday")?.ref, "Tiger");
    assert.equal(F("follow up next Monday")?.ref, null);
    for (const q of ["follow-ups due this week", "What follow-ups are overdue?", "Follow-ups could not be read just now, so what is scheduled is unknown.", "Follow-up (dressing change) was due", "Follow-up done (recheck)", "follow-ups never repeat the question", "remind me every week about follow-ups"]) assert.equal(F(q), null, q);
    ok("a note and a follow-up name their case or animal; sentences about follow-ups are not ones to schedule");

    const C = (q: string) => parseCare(q, NOW);
    assert.deepEqual([C("vaccinated Tiger (132) today, batch B-1")?.careKind, C("vaccinated Tiger (132) today, batch B-1")?.animal?.name, C("vaccinated Tiger (132) today, batch B-1")?.animal?.number, C("vaccinated Tiger (132) today, batch B-1")?.date?.day], ["vaccination", "Tiger", "132", "2026-11-17"]);
    assert.equal(C("Tiger (132) vaccinated today")?.animal?.number, "132");
    assert.equal(C("gave ARV to Bholu on Monday")?.date?.day, "2026-11-16");
    assert.equal(C("vaccinate Bholu tomorrow")?.future, true);
    assert.equal(C("vaccinated today, batch B-1")?.animal, null);
    for (const q of ["brown female vaccinated near the market", "vaccinated a brown female near the temple", "how many were vaccinated today?", "is Tiger vaccinated?"]) assert.equal(C(q), null, q);
    ok("care given names one animal; an unnamed animal is a field report and a question is a question");

    for (const q of ["brown female limping near Ward 12 market, needs a vet", "found a puppy alone by the bus stand", "Record a brown female limping near Ward 12 market", "Pups abandoned in a box", "black male with mange outside the temple", "dog hit by a bike near Gandhipuram signal, bleeding"]) assert.equal(looksLikeReport(q), true, q);
    for (const q of ["What's overdue?", "which dogs need a vet?", "Dog with a wound", "Register an animal", "8 year old boy bitten on the left calf by a stray at 4pm today", "show injured dogs"]) assert.equal(looksLikeReport(q), false, q);
    ok("a one-line field report is told apart from questions, case titles, how-to words and a person bitten");

    assert.deepEqual(parseHealthAsk("PEP doses due today"), { kind: "due", when: "today" });
    assert.deepEqual(parseHealthAsk("who is due tomorrow"), { kind: "due", when: "tomorrow" });
    assert.deepEqual(parseHealthAsk("missed doses"), { kind: "missed" });
    assert.deepEqual(parseHealthAsk("Which patients should we call?"), { kind: "calls" });
    assert.deepEqual(parseHealthAsk("referrals waiting"), { kind: "referrals" });
    assert.deepEqual(parseHealthAsk("look up BX-2611-AB12CD"), { kind: "lookup", code: "BX-2611-AB12CD" });
    assert.deepEqual(parseHealthAsk("which bites need a category"), { kind: "needs_category" });
    for (const q of ["Schedule a follow-up this week on SPC-1", "schedule a field visit for Ward 14 tomorrow at 10am", "35F scratched by a cat 2 days ago, OPD 4521, phone 98450 12345 agrees to reminder calls", "how do i refer a patient", "add a task: call the lab tomorrow"]) assert.equal(parseHealthAsk(q), null, q);
    for (const q of ["should we give RIG", "what dose should I give", "is this category III?", "Is the patient eligible for PEP?", "change the dose to 0.5 ml", "diagnose this"]) assert.equal(CLINICAL_DECISION.test(q), true, q);
    ok("a clinician's questions are read by kind; commands and bite notes are not questions; clinical decisions are recognised");

    const E = (q: string) => parseExposure(q, NOW)!;
    const boy = E("8 year old boy bitten on the left calf by a stray at 4pm today, wound washed, category III");
    assert.deepEqual([boy.date?.day, boy.time, boy.kind, boy.site, boy.category, boy.ageBand, boy.ageText, boy.sex, boy.washed, boy.washedUnclear, boy.species, boy.ownership, boy.patientRef, boy.phone, boy.consent],
      ["2026-11-17", "16:00", "bite", "left calf", "III", "5-14", "8 years", "male", null, true, "unknown", "community", null, null, false]);
    const woman = E("35F scratched by a cat 2 days ago, OPD 4521, washed at home, phone 98450 12345 agrees to reminder calls");
    assert.deepEqual([woman.kind, woman.date?.day, woman.ageBand, woman.sex, woman.species, woman.category, woman.patientRef, woman.washed, woman.phone, woman.consent], ["scratch", "2026-11-15", "30-49", "female", "cat", null, "OPD 4521", "before_arrival", "9845012345", true]);
    const girl = E("Girl, 6 yrs, licked by pet dog on broken skin yesterday");
    assert.deepEqual([girl.kind, girl.ownership, girl.species, girl.category], ["lick_broken_skin", "owned", "dog", null]);
    assert.equal(E("man bitten by a cat yesterday").category, null, "“a cat” is the animal, never category I");
    assert.equal(E("boy bitten by a dog today, cat 2 by the triage note").category, null, "“cat 2” is not written as a category");
    assert.equal(E("woman bitten by a dog today, phone 9845012345").phone, "9845012345");
    assert.equal(E("woman bitten by a dog today, phone 9845012345").consent, false, "a phone without agreement is not consent");
    assert.equal(looksLikeExposure("dog bitten by other dogs near the market"), false, "an animal bitten is a field report");
    ok("a bite note gives only what it states: the category only when written as one, consent only when said");

    for (const q of ["what can I do with you?", "what can you help with", "how do you work", "what are you capable of", "help", "hi kaju", "@Kaju", "wat can u do", "what cn you do?", "tum kya kar sakte ho", "kya kar sakte ho", "namaste", "good morning kaju", "how can I use kaju", "what can kaju do"]) assert.equal(asksAboutKaju(q), true, q);
    for (const q of ["what can I do about the overdue cases", "help me find Tiger", "how do I add a task", "hi kaju add a task: call the vet tomorrow"]) assert.equal(asksAboutKaju(q), false, q);
    ok("“what can I do with you”, typos and a little Hinglish are asking what Kaju does; real requests are not");

    const team = [{ user_id: RAVI, name: "Ravi Kumar", role: "field" }, { user_id: PRIYA, name: "Priya Nair", role: "field" }, { user_id: OUTSIDER, name: "Ravi Shankar", role: "vet" }];
    assert.equal(matchPerson("Priya", team).hit?.user_id, PRIYA);
    assert.equal(matchPerson("ravi kumar", team).hit?.user_id, RAVI);
    assert.equal(matchPerson("Ravi", team).many?.length, 2);
    for (const said of ["Pri", "Priyaa", "Rav", "Ramesh"]) assert.deepEqual(matchPerson(said, team), {}, said);
    ok("a person is matched by full name or a whole name; two matches are both returned; near spellings match nobody");

    assert.deepEqual(subjectOf({ subject: { caseId: CASE_MAX }, pagePath: "/ngo/today" }), { caseId: CASE_MAX, dogId: null, sent: true });
    assert.deepEqual(subjectOf({ pagePath: `/ngo/cases/${CASE_MAX}` }), { caseId: CASE_MAX, dogId: null, sent: false });
    assert.deepEqual(subjectOf({ subject: { caseId: "not-an-id" }, pagePath: "/ngo/today" }), { caseId: null, dogId: null, sent: false });
    ok("the record a page sends is the subject; the record open on the page is used only by commands that name none");
  }

  /* ── 2. tasks, prepared from one line, nothing saved ─────────────────── */
  {
    const w = ngo();
    const vet = await ask("add a task: call the vet tomorrow", w.ctx);
    const p = only(vet, "add_task");
    assert.deepEqual([p.title, p.dueOn, p.assigneeId, p.caseId, p.orgId], ["Call the vet", tomorrow, null, null, ORG]);
    assert.match(vet.text, /I prepared a task: \*\*Call the vet\*\*.*Press Confirm/);
    const ravi = only(await ask("assign Ravi to visit Dog 125 tomorrow", w.ctx), "add_task");
    assert.deepEqual([ravi.title, ravi.dueOn, ravi.assigneeId, ravi.assigneeName, ravi.caseId], ["Visit Dog 125", tomorrow, RAVI, "Ravi Kumar", CASE_MAX]);
    const priya = only(await ask("task for Priya: photos of SPC-36A054", w.ctx), "add_task");
    assert.deepEqual([priya.assigneeId, priya.caseId, priya.caseLabel, priya.dueOn], [PRIYA, CASE_MAX, "SPC-36A054", null]);
    assert.match(priya.why, /No date was given/);
    const me = only(await ask("remind me to send the package on Monday", w.ctx), "add_task");
    assert.deepEqual([me.assigneeId, me.dueOn], [ME, weekday("Monday")]);
    const tiger = await ask("@Kaju todo check Tiger's wound Friday", w.ctx);
    const tt = only(tiger, "add_task");
    assert.deepEqual([tt.dogId, tt.caseId, tt.dueOn], [null, null, weekday("Friday")]);
    assert.match(tt.why, /2 animals on your register match/);
    assert.ok(savedNothing(w));
    ok("the five ways of asking for a task each prepare one add_task with its day, person and record; nothing is saved");

    const two = ngo({ twoRavis: true });
    const amb = await ask("assign Ravi to visit Dog 125 tomorrow", two.ctx);
    const ap = only(amb, "add_task");
    assert.equal(ap.assigneeId, null); assert.match(ap.why, /2 people match “Ravi” \(Ravi Kumar, Ravi Shankar\), so it is unassigned/);
    assert.deepEqual(amb.suggestions, ["assign Ravi Kumar to visit Dog 125 tomorrow", "assign Ravi Shankar to visit Dog 125 tomorrow"]);
    const unknown = only(await ask("assign Ramesh to clean the shelter tomorrow", w.ctx), "add_task");
    assert.equal(unknown.assigneeId, null); assert.match(unknown.why, /Nobody called “Ramesh” is in your team, so it is unassigned/);
    assert.match((await ask("add a task: call the vet yesterday", w.ctx)).text, /has already passed/);
    assert.equal((await ask("add a task: call the vet yesterday", w.ctx)).proposals.length, 0);
    assert.match((await ask("add a task", w.ctx)).text, /What is the task\?/);
    ok("an ambiguous or unknown person leaves the task unassigned and says so; a past day or no title prepares nothing");

    const sent = ngo({ subject: { caseId: CASE_MAX } });
    assert.equal(only(await ask("add a task: change the dressing tomorrow", sent.ctx), "add_task").caseId, CASE_MAX);
    const beside = ngo({ pagePath: `/ngo/cases/${CASE_MAX}` });
    assert.equal(only(await ask("add a task: change the dressing tomorrow", beside.ctx), "add_task").caseId, null);
    ok("a task is linked to the record a page sent with the words, never to the record that happens to be open beside the panel");

    const h = clinic();
    const ht = only(await ask("add a task for Ravi to call the lab tomorrow", h.ctx), "add_task");
    assert.deepEqual([ht.orgId, ht.assigneeId, ht.caseId], [HOSPITAL, RAVI, null]);
    const o = office();
    assert.equal(only(await ask("add a task: visit Ward 12 on Friday", o.ctx), "add_task").orgId, "0ff1ce00-0000-4000-8000-000000000001");
    const g = guest();
    const gr = await ask("add a task: call the vet tomorrow", g.ctx);
    assert.match(gr.text, /Sign in to add tasks/); assert.equal(gr.proposals.length, 0); assert.deepEqual(g.log.rpcs, []);
    ok("every role's home can add a task to its own workspace (NGO, facility, reviewing office); a visitor is asked to sign in");
  }

  /* ── 3. records from one line ─────────────────────────────────────── */
  {
    const w = ngo();
    const brown = await ask("brown female limping near Ward 12 market, needs a vet", w.ctx);
    const bc = brown.proposals.find((p) => p.kind === "open_case") as Extract<Proposal, { kind: "open_case" }>;
    assert.deepEqual([bc.category, bc.severity, bc.zone, bc.city], ["injury", "high", "Ward 12 market", "Coimbatore"]);
    assert.match(bc.why, /Not in the message: photo evidence\. City taken from your organisation \(Coimbatore\)/);
    assert.ok(brown.proposals.some((p) => p.kind === "add_note" && p.caseId === CASE_MAX), "an open case in the same place is offered, never merged");
    assert.match(brown.text, /It may be the same animal as \*\*SPC-36A054\*\*/);
    const pup = only(await ask("found a puppy alone by the bus stand", w.ctx), "open_case");
    assert.deepEqual([pup.category, pup.zone], ["rescue", "bus stand"]);
    const care = only(await ask("vaccinated Tiger (132) today, batch B-1", w.ctx), "record_care");
    assert.deepEqual([care.dogId, care.careKind, care.date], [TIGER, "vaccination", today]);
    assert.match(care.notes, /batch B-1/);
    const which = await ask("vaccinated Tiger today", w.ctx);
    assert.equal(which.proposals.length, 0); assert.match(which.text, /2 animals on your register are called Tiger\. Which one\? I have not picked one/);
    assert.deepEqual(which.suggestions, ["vaccinated Tiger (DDS-00132) today", "vaccinated Tiger (DDS-00777) today"]);
    const note = only(await ask("note on SPC-36A054: ate well", w.ctx), "add_note");
    assert.deepEqual([note.caseId, note.note], [CASE_MAX, "ate well"]);
    const fu = only(await ask("follow up Max next Monday", w.ctx), "schedule_followup");
    assert.deepEqual([fu.caseId, fu.dueAt.slice(0, 10)], [CASE_MAX, findDate("next Monday")!.day]);
    const later = only(await ask("vaccinate Bholu tomorrow", w.ctx), "add_task");
    assert.deepEqual([later.dogId, later.dueOn], [BHOLU, tomorrow]);
    assert.match((await ask("vaccinated Rocky today", w.ctx)).text, /could not find Rocky on your organisation's register/);
    assert.ok(savedNothing(w));
    ok("one line becomes the record a form would take: a case (injury, high, place), care on the exact animal, a note, a follow-up; nothing saved");

    const sent = ngo({ subject: { caseId: CASE_MAX } });
    const plain = only(await ask("ate well, stitches clean", sent.ctx), "add_note");
    assert.deepEqual([plain.caseId, plain.note], [CASE_MAX, "ate well, stitches clean"]);
    const dogSent = ngo({ subject: { dogId: MAX } });
    assert.equal(only(await ask("limping again since morning", dogSent.ctx), "add_note").caseId, CASE_MAX);
    const beside = ngo({ pagePath: `/ngo/cases/${CASE_MAX}` });
    assert.equal((await ask("ate well, stitches clean", beside.ctx)).proposals.length, 0, "the panel beside a case does not turn any sentence into a note");
    assert.equal(only(await ask("note: stitches clean", beside.ctx), "add_note").caseId, CASE_MAX, "“note: …” beside a case is a note on it");
    const foreign = ngo({ subject: { caseId: CASE_OTHER } });
    const fr = await ask("ate well today", foreign.ctx);
    assert.equal(fr.proposals.length, 0); assert.match(fr.text, /not in your organisation's records/);
    ok("words sent from a case or an animal become a note there; another organisation's case is refused; the open page alone links nothing");

    const bite = await ask("8 year old boy bitten on the left calf by a stray at 4pm today, wound washed, category III", w.ctx);
    assert.equal(bite.proposals.length, 0); assert.match(bite.text, /person who was bitten, scratched or licked/);
    ok("a person bitten, told in an NGO workspace, is never made into an animal case with patient details");
  }

  /* ── 4. talking to Kaju ─────────────────────────────────────────────── */
  {
    const n = ngo(), h = clinic(), o = office(), g = guest();
    const intro = await ask("what can I do with you?", n.ctx);
    assert.match(intro.text, /^Hello, Asha\. I'm Kaju\. Here is what I can do for you here:/);
    assert.match(intro.text, /\*\*Tasks\*\*/); assert.match(intro.text, /\*\*Records from one line\*\*/); assert.doesNotMatch(intro.text, /bite and PEP/);
    assert.match(intro.text, /A person always decides a verification, a laboratory result, a clinical decision and access to restricted data\./);
    assert.match(intro.text, /Not connected yet: free-form sentences/);
    const tries = intro.text.match(/Try: (.+)/)![1].split(" · ");
    assert.ok(tries.length >= 4 && tries.length <= 6, `${tries.length} examples`);
    const clinical = await ask("what can you help with", h.ctx);
    assert.match(clinical.text, /bite and PEP work/); assert.doesNotMatch(clinical.text, /Records from one line/);
    assert.match((await ask("tum kya kar sakte ho", o.ctx)).text, /Your office's queue/);
    assert.match((await ask("help", g.ctx)).text, /Sign in to work with your organisation's/);
    const records = clinic("field");
    assert.doesNotMatch((await ask("what can you do", records.ctx)).text, /bite and PEP/, "a role that cannot open the register is not offered it");
    for (const r of [intro, clinical]) for (const s of r.suggestions ?? []) assert.ok(!/bitten|Record a|Add a task/.test(s), `a one-tap suggestion only reads: ${s}`);
    ok("“what can I do with you” lists what is wired for this person's workspace and role, the decisions kept for people, and what is not connected yet");

    const run: [string, () => { ctx: ToolCtx }][] = [["tasks", () => ngo()], ["capture", () => ngo()], ["day", () => ngo()], ["cases", () => ngo()], ["office", office], ["clinic", () => clinic()], ["bite", () => clinic()]];
    for (const [id, make] of run) for (const say of EXAMPLES[id] ?? []) {
      const r = await ask(say, make().ctx);
      assert.ok(!fallback(r), `${id}: “${say}” → ${r.text.slice(0, 80)}`);
      if (["tasks", "capture", "bite"].includes(id)) assert.ok(r.proposals.length > 0, `${id}: “${say}” prepares something`);
    }
    for (const s of intro.suggestions ?? []) assert.ok(!fallback(await ask(s, ngo().ctx)), s);
    for (const s of clinical.suggestions ?? []) assert.ok(!fallback(await ask(s, clinic().ctx)), s);
    ok("every example Kaju offers is answered in that workspace, and the capture examples prepare a record");

    assert.match((await ask("hey kaju how are you", n.ctx)).text, /^Tail wagging, Asha\. I've got your records open/);
    assert.match((await ask("kaise ho kaju", g.ctx)).text, /sign in to work with your organisation's records/);
    assert.match((await ask("thanks kaju", n.ctx)).text, /^Any time, Asha/);
    ok("small talk is answered like a colleague, and a visitor is not told Kaju has their records open");

    const lost = await ask("zzqx plorb", n.ctx);
    assert.match(lost.text, /could not match “zzqx plorb”/); assert.equal(lost.suggestions?.length, 3);
    const bits = await ask("the blue thing on friday near Ward 12 market", n.ctx);
    assert.match(bits.text, /I picked out a date \(.+\) and a place \(Ward 12 market\), but not what to do with them/);
    assert.equal(bits.suggestions?.length, 3, "three closest things even when only one is close");
    assert.equal(bits.suggestions?.[0], "Open cases by zone", "the closest comes first");
    const todo = await ask("call the vet on friday about the pups", n.ctx);
    assert.equal(todo.proposals.length, 0, "a to-do with a day is offered back, never prepared on a guess");
    assert.equal(todo.suggestions?.[0], "Add a task: call the vet on friday about the pups");
    for (const ctx of [n.ctx, h.ctx, o.ctx, g.ctx]) {
      const r = await ask("zzqx plorb", ctx);
      assert.ok(r.suggestions && r.suggestions.length === 3, "three closest things");
      for (const s of r.suggestions) assert.ok(!fallback(await ask(s, ctx)), `offered “${s}” is answered`);
    }
    ok("what Kaju does not follow is said plainly, with what it picked out and three closest things that each work");
  }

  /* ── 5. a clinician's bite and PEP work ─────────────────────────────── */
  {
    const h = clinic();
    const due = await ask("PEP doses due today", h.ctx);
    assert.match(due.text, /\*\*1 PEP dose due today\*\*/); assert.match(due.text, /BX-2611-AB12CD.*dose 3 of 4/); assert.match(due.text, /1 dose is past its date/);
    assert.ok(due.citations.some((c) => c.href === "/health/bites/aa000000-0000-4000-8000-000000000001"));
    assert.match((await ask("who is due tomorrow", h.ctx)).text, /BX-2611-CD56EF/);
    assert.match((await ask("missed doses", h.ctx)).text, /BX-2611-GH78IJ.*was due/);
    assert.match((await ask("which patients should we call?", h.ctx)).text, /2 people to remind about a dose.*\n.*\n.*\n\*\*1 person to tell their course is complete/);
    assert.match((await ask("referrals waiting", h.ctx)).text, /1 person referred to you/);
    assert.match((await ask("which bites need a category", h.ctx)).text, /BX-2611-EF34GH/);
    const look = await ask("look up BX-2611-AB12CD", h.ctx);
    assert.match(look.text, /Category: III, recorded by Dr Asha Menon/); assert.match(look.text, /Next: dose 3, today/); assert.match(look.text, /stays with the clinician/);
    const other = await ask("BX-2611-ZZ99ZZ", h.ctx);
    assert.match(other.text, /not in City General's register/); assert.doesNotMatch(JSON.stringify(other), /OPD 9999|bb000000/);
    assert.ok(h.log.rpcs.filter((r) => "p_facility" in r.args).every((r) => r.args.p_facility === HOSPITAL), "only the person's own facility is ever asked for");
    for (const q of ["should we give RIG", "what dose should I give", "is this category III?", "Is the patient eligible for PEP?"]) {
      const r = await ask(q, h.ctx);
      assert.match(r.text, /^That is a clinical decision, so it stays with the treating clinician/, q); assert.equal(r.proposals.length, 0);
    }
    const logged = h.log.writes.filter((w) => w.table === "ai_action_log").map((w) => w.rows[0] as { kind: string; organisation_id?: string });
    const reads = h.log.rpcs.filter((r) => /^oh_clinic_(?:due|register|transfers|exposure)$/.test(r.name)).length;
    assert.equal(logged.filter((r) => r.kind === "health_read").length, reads, "every read of patient records is logged");
    assert.ok(logged.every((r) => r.organisation_id === HOSPITAL));
    assert.ok(savedNothing(h));
    ok("doses due today and tomorrow, missed doses, calls, referrals and a bite by its code, from the facility's own functions; every read logged; decisions refused");

    const denied = clinic("field");
    assert.match((await ask("PEP doses due today", denied.ctx)).text, /does not open its bite register/);
    assert.ok(!denied.log.rpcs.some((r) => /^oh_clinic_/.test(r.name)), "a role without the register is not read for");
    ok("a facility role that cannot open the register gets nothing read for it");

    const note = await ask("8 year old boy bitten on the left calf by a stray at 4pm today, wound washed, category III", h.ctx);
    const x = only(note, "register_exposure");
    assert.deepEqual([x.facilityId, x.exposureOn, x.exposureTime, x.exposureKind, x.site, x.category, x.ageBand, x.sex, x.woundWashed, x.species, x.ownership, x.patientRef, x.contactPhone, x.reminderConsent],
      [HOSPITAL, today, "16:00", "bite", "left calf", "III", "5-14", "male", null, "unknown", "community", null, null, false]);
    assert.match(x.why, /Not in the note: register number, wound washing \(the note says washed, not whether before arrival or here\), which animal\./);
    assert.match(x.why, /The register has no field for the time or wound site/); assert.match(note.text, /Prescribing the course stays with the clinician/);
    const noCat = only(await ask("Girl, 6 yrs, licked by pet dog on broken skin yesterday", h.ctx), "register_exposure");
    assert.equal(noCat.category, null); assert.equal(noCat.exposureKind, "lick_broken_skin");
    const records = clinic("records");
    const rc = only(await ask("8 year old boy bitten by a dog today, category III", records.ctx), "register_exposure");
    assert.equal(rc.category, null); assert.match(rc.why, /only a clinician records the category/);
    const when = await ask("boy bitten by a cat near Gandhi market", h.ctx);
    assert.equal(when.proposals.length, 0); assert.match(when.text, /When did it happen\?/);
    assert.ok(savedNothing(h) && savedNothing(records));
    ok("a bite record is prepared from the note with only what it states; the category only as written and only for a clinician; nothing saved");
  }

  /* ── 6. confirming: a task, as the person, read back, once ──────────── */
  {
    const w = ngo();
    const prepared = only(await ask("assign Ravi to visit Dog 125 tomorrow", w.ctx), "add_task");
    const first = await confirmTask(w.db, ME, ORG, prepared);
    assert.equal(first.status, 200);
    assert.deepEqual([first.body.verified, first.body.replayed, first.body.href, typeof first.body.at, first.body.what], [true, false, "/ngo/today", "string", "Task added: Visit Dog 125"]);
    const row = w.tables.nx_tasks[0] as Record<string, unknown>;
    assert.deepEqual([row.id, row.org_id, row.title, row.due_on, row.assignee_id, row.assignee_name, row.created_by, row.source_kind, row.record_kind, row.record_id], [taskIdFor(ME, prepared.id), ORG, "Visit Dog 125", tomorrow, RAVI, "Ravi Kumar", ME, "kaju", "case", CASE_MAX]);
    assert.match(String(row.note), /Prepared with StrayPaw AI, confirmed by Asha Menon/);
    const again = await confirmTask(w.db, ME, ORG, prepared);
    assert.deepEqual([again.status, again.body.verified, again.body.replayed, w.tables.nx_tasks.length], [200, true, true, 1]);
    const changed = await confirmTask(w.db, ME, ORG, { ...prepared, title: "Something else" });
    assert.equal(changed.status, 409); assert.equal(w.tables.nx_tasks.length, 1);
    assert.equal((await confirmTask(w.db, ME, ORG, { ...prepared, id: "other-1", dueOn: "2020-01-01" })).status, 400);
    assert.equal((await confirmTask(w.db, ME, ORG, { ...prepared, id: "other-2", orgId: OTHER_ORG })).status, 403);
    assert.equal((await confirmTask(w.db, ME, ORG, { ...prepared, id: "other-3", assigneeId: OUTSIDER })).status, 400);
    assert.equal((await confirmTask(w.db, ME, ORG, { ...prepared, id: "other-4", caseId: CASE_OTHER })).status, 400);
    assert.equal((await confirmTask(w.db, ME, ORG, { ...prepared, id: "other-5", dogId: TIGER_OTHER, caseId: null })).status, 400);
    assert.equal(w.tables.nx_tasks.length, 1);
    (w.tables.nx_tasks[0] as Record<string, unknown>).state = "cancelled";
    const back = await confirmTask(w.db, ME, ORG, prepared);
    assert.deepEqual([back.status, back.body.what, (w.tables.nx_tasks[0] as Record<string, unknown>).state, w.tables.nx_tasks.length], [200, "Task put back: Visit Dog 125", "open", 1]);
    assert.ok(w.tables.ai_action_log.some((r) => r.kind === "add_task"));
    ok("Confirm adds the task as the confirming person, reads it back, and the same proposal never adds a second (a deleted one is put back); another organisation, person or record is refused");
  }

  /* ── 7. confirming: a bite, through the bite form's own function ───── */
  {
    const h = clinic();
    const prepared = only(await ask("35F scratched by a cat 2 days ago, OPD 4521, washed at home, phone 98450 12345 agrees to reminder calls", h.ctx), "register_exposure");
    const r = await quiet(() => confirmExposure(h.db, ME, prepared));
    assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.verified, true); assert.match(String(r.body.what), /^Bite recorded as BX-2611-NEW/); assert.match(String(r.body.href), /^\/health\/bites\//);
    const args = h.world.recorded[0] as Record<string, unknown>;
    const formSource = readFileSync(new URL("../src/nx/pages/health/NewBite.tsx", import.meta.url), "utf8");
    const formCall = formSource.slice(formSource.indexOf("recordExposure({"), formSource.indexOf("}, fromReferral)"));
    const form = new Set([...formCall.matchAll(/\b(p_[a-z_]+):/g)].map((m) => m[1]));
    assert.ok(form.size >= 15, "the form's call was found");
    assert.deepEqual(new Set(Object.keys(args)), form, "the same arguments as the manual bite form");
    assert.deepEqual([args.p_category, args.p_patient_ref, args.p_contact_phone, args.p_reminder_consent, args.p_wound_washed, args.p_species, args.p_sex, args.p_age_band], ["not_recorded", "OPD 4521", "9845012345", true, "before_arrival", "cat", "female", "30-49"]);
    const replay = await quiet(() => confirmExposure(h.db, ME, prepared));
    assert.deepEqual([replay.status, replay.body.replayed, replay.body.id, h.world.recorded.length], [200, true, r.body.id, 1]);
    const sameDetails = await quiet(() => confirmExposure(h.db, ME, { ...prepared, id: "kx-other" }));
    assert.equal(sameDetails.status, 409); assert.equal(h.world.recorded.length, 1);
    const recordsRole = clinic("records");
    const withCat = only(await ask("8 year old boy bitten by a dog today, category III", clinic().ctx), "register_exposure");
    assert.equal((await quiet(() => confirmExposure(recordsRole.db, ME, withCat))).status, 403, "only a clinician records a category");
    assert.equal((await quiet(() => confirmExposure(h.db, ME, { ...prepared, id: "kx-elsewhere", facilityId: OTHER_HOSPITAL }))).status, 403);
    assert.equal((await quiet(() => confirmExposure(h.db, ME, { ...prepared, id: "kx-future", exposureOn: addDays(today, 3) }))).status, 400);
    assert.equal(h.world.recorded.length, 1);
    ok("Confirm records the bite through oh_record_exposure with the form's own arguments, as the clinician, reads it back, and never records it twice");
  }

  /* ── 8. a model never sees patient records ──────────────────────────── */
  {
    const ON = { STRAYPAW_AI_MODE: "model", STRAYPAW_AI_AUTHORISED_BY: "test:2026-11-03", STRAYPAW_AI_MONTHLY_CEILING_INR: "100", STRAYPAW_AI_USER_DAILY_REQUESTS: "50", STRAYPAW_AI_ORG_DAILY_REQUESTS: "50", STRAYPAW_AI_INR_PER_MTOK_IN: "420", STRAYPAW_AI_INR_PER_MTOK_OUT: "2100", STRAYPAW_AI_ROLLOUT: "grants", STRAYPAW_AI_RUN_MAX_INR: "50", ANTHROPIC_API_KEY: "isolated-test-key", STRAYPAW_AI_APPROVED_DATA_ROUTE: "direct:claude-opus-5-5" } as const;
    const saved = Object.fromEntries(Object.keys(ON).map((k) => [k, process.env[k]]));
    Object.assign(process.env, ON); setInferenceLedger({ usage: async () => ({ userToday: 0, orgToday: 0, monthInr: 0, live: true, userGrant: { monthlyBudgetInr: 100, dailyRequests: 50 }, orgGrant: null, userMonthInr: 0, orgMonthInr: 0 }), reserve: async () => 'res-1', settle: async () => true });
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "test", stop_reason: "end_turn", content: [{ type: "text", text: "Hello from the model." }], usage: { input_tokens: 1, output_tokens: 1 } }), { headers: { "content-type": "application/json" } }); };
    try {
      const h = clinic();
      for (const q of ["PEP doses due today", "8 year old boy bitten by a dog today", "should we give RIG"]) { const r = await quiet(() => answer([{ role: "user", text: q }], h.ctx, { path: "/health/today" })); assert.equal(r.engine, "tools", q); }
      const carried = await quiet(() => answer([{ role: "user", text: "look up BX-2611-AB12CD" }, { role: "assistant", text: "**BX-2611-AB12CD** at City General · OPD 4521" }, { role: "user", text: "and what else?" }], h.ctx, { path: "/health/today" }));
      assert.equal(carried.engine, "tools");
      assert.equal(calls, 0, "no patient turn reached the model");
      const n = ngo();
      assert.equal((await quiet(() => answer([{ role: "user", text: "Hello" }], n.ctx, {}))).engine, "model", "the approved model path still works elsewhere");
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = originalFetch; setInferenceLedger(null);
      for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    ok("with a model approved, a clinician's patient questions, bite notes and any conversation holding a bite code are still answered by rules on the server");
  }

  /* ── 9. properties over many generated inputs ─────────────────────── */
  {
    let seed = 20261117;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pick = <T>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
    const maybe = (s: string, p = 0.5) => (rnd() < p ? s : "");

    /* (a) no stated category → none produced */
    const who = ["8 year old boy", "girl, 6 yrs,", "35F", "man", "woman aged 60", "2 year old child", "patient", "boy", "42 yo male", "farmer"];
    const how = ["bitten", "scratched", "licked on broken skin", "bit", "bitten twice"];
    const by = ["by a stray", "by a street dog", "by a cat", "by a pet dog", "by the neighbour's cat", "by a monkey", "by a dog", "by a kitten", "by a cat I think"];
    const where = ["on the left calf", "on the right hand", "on the face", "", "on the thigh", "near the bus stand", "at Gandhi market"];
    const when = ["today", "yesterday", "2 days ago", "this morning", "at 4pm today", "on Monday", "last night"];
    const extra = ["wound washed", "washed at home", "not washed", "OPD 4521", "phone 98450 12345 agrees to reminder calls", "cat scared the child", "the cat is 3 years old", "category not assessed yet", ""];
    const notes: string[] = [];
    for (let i = 0; i < 400; i++) notes.push([pick(who), pick(how), pick(by), pick(where), pick(when), maybe(pick(extra)), maybe(pick(extra), 0.3)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
    for (const q of notes) { const e = parseExposure(q, NOW); if (e) assert.equal(e.category, null, q); }
    const h = clinic();
    for (const q of notes.slice(0, 120)) { const r = await ask(q, h.ctx); for (const p of r.proposals) if (p.kind === "register_exposure") assert.equal(p.category, null, q); }
    for (const [said, cat] of [["category III", "III"], ["cat III", "III"], ["Category 2", "II"], ["category-I", "I"]] as const) assert.equal(parseExposure(`boy bitten by a dog today, ${said}`, NOW)?.category, cat, said);
    ok(`no stated category, no category: ${notes.length} generated bite notes (with “cat” the animal in many) never produced one`);
    /* The record-a-bite page's own example ends "…brown stray near the bus stand": a note to prepare, not a question about
       an incident ("where does it stand"). It used to fall into the incident route and get "needs an organisation workspace". */
    for (const ex of ["dog bite on the left calf this morning, 34 F, OPD 4521, washed at home, brown stray near the bus stand", "boy bitten by a stray next to the school today, OPD 77"]) {
      const r = await ask(ex, clinic().ctx);
      assert.ok(r.proposals.some((p) => p.kind === "register_exposure"), `${ex} -> ${r.text}`);
    }
    ok("a bite note that mentions a bus stand or 'next to' is prepared as a record, not routed to the incident briefing");

    /* (b) nothing saved without a confirm call; (c) another organisation's or facility's records never appear */
    const phrasings = [
      "anything pending for me?", "what needs my attention today", "give me a weekly update", "any follow ups that slipped?", "get this months claim ready", "which ones need the vet", "which dogs have no photo", "any dogs entered twice?",
      "kitne kutte sterilised hai", "how many animals do we have", "where is our submission", "run a quick check on our records", "Ginger", "SPC-31CE05", "yelahanka", "what is unknown status", "export the animal register as excel",
      "How many open cases are unassigned?", "who holds the most cases", "Summarise this case", "What is ABC?", "open intake", "Hello", "What can you do?", "zzqx plorb",
      "add a task: call the vet tomorrow", "vaccinated Tiger (132) today", "vaccinated Tiger (DDS-00132) today", "note on SPC-36A054: ate well", "follow up SPC-36A054 tomorrow", "Summarise SPC-36A054", "status of SPC-36A054",
      "task for Priya: photos of Tiger (132)", "brown female limping near Ward 12 market", "look up BX-2611-ZZ99ZZ", "BX-2611-ZZ99ZZ", "PEP doses due today", "missed doses", "patients to call", "referrals waiting",
      ...notes.slice(0, 40),
    ] as string[];
    const verbs = ["add a task:", "remind me to", "note on", "follow up", "vaccinated", "dewormed", "found", "record", "assign Ravi to", "", "please", "@Kaju"];
    const objs = ["Tiger", "Tiger (132)", "DDS-00132", "SPC-36A054", "Max", "Rocky", "Dog 125", "BX-2611-ZZ99ZZ", "the vet", "a puppy near the bus stand"];
    const tails = ["tomorrow", "today", "on Friday", "next Monday", ": ate well", "batch B-1", "", "near Ward 12 market"];
    for (let i = 0; i < 250; i++) phrasings.push([pick(verbs), pick(objs), pick(tails)].filter(Boolean).join(" "));
    const foreignIds = [OTHER_ORG, CASE_OTHER, TIGER_OTHER, OTHER_HOSPITAL, "bb000000-0000-4000-8000-000000000009", "OPD 9999", "SPC-36A054AAAA", "SPA-DOG-EEE"];
    const makers = [() => ngo(), () => ngo({ pagePath: `/ngo/cases/${CASE_MAX}` }), () => ngo({ subject: { caseId: CASE_MAX } }), () => clinic(), () => office(), () => guest()];
    let replies = 0;
    for (const make of makers) for (const q of phrasings) {
      const f = make();
      const r = await ask(q, f.ctx); replies++;
      assert.ok(savedNothing(f), `saved something without a confirm: “${q}”`);
      assert.ok(isAiReply(r), `the panel would refuse the reply to “${q}”`);
      const out = JSON.stringify({ t: r.text, p: r.proposals, c: r.citations, s: r.suggestions });
      for (const id of foreignIds) assert.ok(!out.includes(id), `“${q}” showed ${id}`);
      assert.ok(f.log.rpcs.every((x) => !("p_facility" in x.args) || x.args.p_facility === HOSPITAL), `“${q}” asked another facility`);
    }
    ok(`nothing saved without a confirm, nothing of another organisation or facility shown, and every reply passes the panel's own check: ${replies} replies across six workspaces`);

    /* (d) stripping “@Kaju” never changes the result */
    let pairs = 0;
    /* Older proposal kinds take a random id each time they are prepared; tasks and bite records take one from the words, which must not change either. */
    const same = (r: Reply) => ({ ...r, proposals: r.proposals.map((p) => (p.kind === "add_task" || p.kind === "register_exposure" ? p : { ...p, id: "random" })) });
    for (const make of [() => ngo(), () => clinic(), () => guest()]) for (const q of phrasings.slice(0, 220)) {
      const plain = same(await ask(q, make().ctx)), addressed = same(await ask(`@Kaju ${q}`, make().ctx)), comma = same(await ask(`@kaju, ${q}`, make().ctx));
      assert.deepEqual(addressed, plain, `“@Kaju ${q}”`); assert.deepEqual(comma, plain, `“@kaju, ${q}”`); pairs += 2;
    }
    ok(`“@Kaju” in front never changes the reply: ${pairs} pairs`);

    /* (e) “tomorrow” and weekday phrases never produce a past date, in India */
    const phrases = ["tomorrow", "tmrw", "tomorrow morning", "day after tomorrow", "on Monday", "on Friday", "by Wed", "next Sunday", "this Saturday", "coming Thursday", "Tuesday", "on sat", "next week", "this weekend", "in 3 days", "end of month"];
    let dated = 0;
    for (let i = 0; i < 600; i++) {
      const at = new Date(Date.UTC(2026, 0, 1) + Math.floor(rnd() * 365 * 86_400_000));
      const day = indiaDay(at), phrase = pick(phrases);
      const d = findDate(phrase, at, "future");
      assert.ok(d && d.day >= day, `${phrase} at ${at.toISOString()} gave ${d?.day} before ${day}`);
      if (/^(?:tomorrow|tmrw)/.test(phrase)) assert.equal(d!.day, addDays(day, 1));
      const t = parseTask(`add a task: feed the pups ${phrase}`, at);
      assert.ok(t?.due && t.due.day >= day && !t.dueInPast, `task “${phrase}” at ${at.toISOString()}`);
      dated++;
    }
    for (const edge of ["2026-11-16T18:29:59Z", "2026-11-16T18:30:00Z", "2026-12-31T18:30:00Z", "2026-02-28T19:00:00Z"]) assert.equal(findDate("tomorrow", new Date(edge))!.day, addDays(indiaDay(new Date(edge)), 1), edge);
    ok(`“tomorrow” and weekday phrases are never in the past in India: ${dated} generated instants, and the midnight edges`);
  }

  console.log(`kaju capture: ${checks} checks passed`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
