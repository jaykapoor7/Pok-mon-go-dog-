/* Kaju on the field home (src/nx/data/fieldKaju.ts). A field worker says what they are doing; Kaju answers only from
   the records it is given and opens an existing screen. The rules this checks:

   1. What a sentence is about: the field work a person would say, and sentences that are not field work (those go to
      Kaju itself, so they must come back null here).
   2. Answers from records: a drive on today is offered as "Start the drive"; with no drive, Kaju says so and never
      invents one; an animal already recorded as vaccinated is not offered a vaccination; a status that was not read is
      not called a gap; missing ABC evidence is named from the checklist.
   3. A property test over generated sentences and worlds: an answer never throws, every button points at a stop that
      exists or at an app page, every count in the words is one the world holds, and no answer says something was saved
      or done.

   Run: node --import tsx scripts/test-field-kaju.ts [seed] [count] */
import assert from "node:assert/strict";
import { answerField, daySummary, quickAsks, readIntent, type Drive, type FieldIntent, type Stop, type World } from "../src/nx/data/fieldKaju";

let checks = 0;
const ok = (c: unknown, m: string) => { assert.ok(c, m); checks++; };
const eq = <T>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); checks++; };

/* ── 1. What a sentence is about ─────────────────────────────────── */
const INTENT: [string, FieldIntent | null][] = [
  ["I'm about to start vaccinations", "vaccinate"],
  ["starting ARV in ward 12", "vaccinate"],
  ["hi, starting vaccinations now", "vaccinate"],
  ["Bindu ko teeka lagana hai", "vaccinate"],
  ["catching dogs for ABC today", "sterilise"],
  ["I'm starting the sterilisation drive", "sterilise"],
  ["I released the dog at Malleshwaram", "release"],
  ["Record a release", "release"],
  ["Which follow-ups are due?", "followup"],
  ["going to check on Bindu", "followup"],
  ["found a brown female limping near the temple", "record"],
  ["I want to report an injured dog", "record"],
  ["found a dog, not vaccinated", "record"],
  ["What's left for me today?", "status"],
  ["what's next", "status"],
  ["I'm done for the day", "status"],
  ["kya baaki hai", "status"],
  ["Is Bindu's evidence complete?", "report"],
  ["which photos are missing", "report"],
  ["what can you do?", "help"],
  ["help", "help"],
  ["Add a task: call the vet tomorrow", null],
  ["How many animals are sterilised in Bengaluru?", null],
  ["", null],
];
for (const [t, want] of INTENT) eq(readIntent(t), want, `intent of "${t}"`);

/* ── 2. Answers from records ─────────────────────────────────────── */
const TODAY = "2026-11-20";
const bindu: Stop = { key: "c:1", kind: "case", caseId: "case-1", title: "Sterilisation (ABC)", animal: "Bindu (116)", dogId: "dog-1", place: "Malleshwaram", started: true, vaccinated: true, sterilised: true,
  abc: { missing: [], required: ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"], vetOk: true, reviewed: false } };
const base: World = { stops: [bindu], drives: [], waiting: 0, failed: 0, sentToday: [], today: TODAY, online: true };
const ward12: Drive = { id: "drive-12", name: "Ward 12 ARV round", kind: "vaccination", zone: "Ward 12", starts_on: TODAY, ends_on: TODAY, total: 18, vaccinated: 0, not_vaccinated: 3, vacc_unknown: 15, sterilised: 0, not_sterilised: 0, ster_unknown: 18 };

// The worker on staging: no drive, one ABC case already vaccinated, evidence complete.
{
  const a = answerField("I'm about to start vaccinations", base)!;
  ok(/no vaccination drive on today/i.test(a.text), "no drive is said plainly");
  ok(/Bindu \(116\) is already recorded as vaccinated/.test(a.text), "a vaccinated animal is named as vaccinated");
  ok(!a.acts.some((x) => x.go.to === "stop" && x.go.tool === "vacc"), "a vaccinated animal is not offered a vaccination");
  eq(a.acts[0].go, { to: "record", category: "vaccination" }, "the main action records an animal to vaccinate");
}
// A vaccination drive on today: the example in the brief, from the drive's own counts.
{
  const a = answerField("I'm about to start vaccinations", { ...base, drives: [ward12] })!;
  eq(a.text, "You have a vaccination drive on today in Ward 12: Ward 12 ARV round. 18 animals are filed in it, and 18 have no vaccination recorded yet. Ready to begin?", "the drive is described from its counts");
  eq(a.acts[0], { label: "Start the drive", go: { to: "href", href: "/ngo/programmes/drive-12" }, primary: true }, "Start the drive opens the drive");
}
// A drive that ended yesterday is not on today; one next week is named as next.
{
  const past = { ...ward12, starts_on: "2026-11-18", ends_on: "2026-11-19" }, next = { ...ward12, id: "d2", starts_on: "2026-11-24", ends_on: "2026-11-24" };
  const a = answerField("starting vaccinations", { ...base, drives: [past, next] })!;
  ok(!/on today/.test(a.text) && /starts Tuesday, 24 Nov/.test(a.text), "a finished drive is not today; the next one is named");
  ok(a.acts.some((x) => x.go.to === "href" && x.go.href === "/ngo/programmes/d2"), "the next drive can be opened");
}
// Drives that could not be read are never "no drive".
{
  const a = answerField("starting vaccinations", { ...base, drives: null })!;
  ok(/could not be read/.test(a.text) && !/no vaccination drive/.test(a.text), "an unread list is not called empty");
}
// An animal whose status was not read is not offered; one with none recorded is.
{
  const unread = { ...bindu, vaccinated: undefined };
  ok(!answerField("vaccinate", { ...base, stops: [unread] })!.acts.some((x) => x.go.to === "stop"), "an unread status is not a gap");
  const none = { ...bindu, vaccinated: null };
  const a = answerField("vaccinate", { ...base, stops: [none] })!;
  ok(/has no vaccination recorded/.test(a.text), "none recorded is said as such");
  eq(a.acts[0].go, { to: "stop", key: "c:1", tool: "vacc" }, "it opens that stop's vaccination form");
}
// Release: complete evidence is said to be complete; a gap opens the evidence form with the right kind.
{
  const a = answerField("I released the dog", base)!;
  ok(/release is already on record/.test(a.text), "a complete release is not asked again");
  const gap = { ...bindu, abc: { ...bindu.abc!, missing: ["release_photo" as const, "release_location" as const] } };
  const b = answerField("released Bindu", { ...base, stops: [gap] })!;
  ok(/needs the release photo and the release place/.test(b.text), "the missing items are named");
  eq(b.acts[0].go, { to: "stop", key: "c:1", tool: "evidence", evidence: "release_photo" }, "the first missing item opens");
}
// Status: what's done, what remains, what needs attention.
{
  const a = answerField("What's left for me today?", base)!;
  ok(/all 5 evidence items and the vet's sign-off; it waits for a coordinator's review/.test(a.text), "the ABC stage comes from the checklist");
  ok(/Nothing is late, and nothing is waiting on this phone/.test(a.text), "a clear day is said once");
  const late: Stop = { key: "f:9", kind: "followup", caseId: "case-1", title: "Recheck", animal: "Bindu (116)", dogId: "dog-1", place: "Malleshwaram", due: "2026-11-18", late: true };
  const b = answerField("what's left?", { ...base, stops: [late, bindu], failed: 1, waiting: 1 })!;
  ok(/1 follow-up is late and 1 record on this phone did not send/.test(b.text), "attention lists what is late and what failed");
  eq(b.acts[0].go, { to: "phone" }, "a failed record is the first thing to fix");
  const empty = answerField("what's next", { ...base, stops: [] })!;
  ok(/Nothing is assigned to you right now/.test(empty.text), "an empty round says so");
}
// Follow-ups and records.
{
  ok(/No follow-ups are due/.test(answerField("any follow-ups due?", base)!.text), "no follow-ups is said plainly");
  const r = answerField("found a puppy stuck in a drain, bleeding", base)!;
  eq(r.acts[0].go, { to: "record", say: "found a puppy stuck in a drain, bleeding" }, "a found animal opens the record screen with the words");
  ok(r.acts.some((x) => x.go.to === "href" && x.go.href === "/ngo/cases/new"), "an urgent animal also offers a case");
}
// The greeting line and the shortcuts.
{
  eq(daySummary(base), "1 case on your round. Nothing is late.", "the day in one line");
  eq(daySummary({ ...base, drives: [ward12] }), "A vaccination drive is on today in Ward 12. 1 case on your round. Nothing is late.", "a drive leads the day");
  eq(quickAsks(base).map((q) => q.label), ["Start vaccinations", "Record a release"], "shortcuts without a drive");
  eq(quickAsks({ ...base, drives: [ward12] })[0].label, "Start the vaccination drive", "a drive changes the shortcut");
  for (const q of quickAsks(base)) ok(answerField(q.say, base) !== null, `the shortcut "${q.label}" is answered here`);
}

/* ── 3. Property test ────────────────────────────────────────────── */
const seed = Number(process.argv[2] ?? 20261120), count = Number(process.argv[3] ?? 4000);
let s = seed >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const FRAG = ["I'm about to start vaccinations", "released", "catching for ABC", "what's left", "found a dog", "follow up", "not vaccinated", "already sterilised", "evidence", "Bindu", "ward 12", "help", "teeka", "what's next?", "near the temple", "report", "the photo", "?", "", "🐕", "a".repeat(600)];
const KINDS = ["capture_photo", "surgery_record", "ear_notch_photo", "release_photo", "release_location"] as const;
const world = (): World => {
  const stops: Stop[] = Array.from({ length: Math.floor(rnd() * 5) }, (_, i) => rnd() < 0.3
    ? { key: `f:${i}`, kind: "followup", caseId: `c${i}`, title: pick(["Recheck", "Day 7 observation"]), animal: rnd() < 0.8 ? pick(["Bindu (116)", "Dog 128", "Tiger"]) : null, dogId: `d${i}`, place: rnd() < 0.7 ? "Ward 8" : null, due: pick(["2026-11-18", TODAY, "2026-11-23"]), late: rnd() < 0.4 }
    : { key: `c:${i}`, kind: "case", caseId: `c${i}`, title: pick(["Sterilisation (ABC)", "Road accident"]), animal: rnd() < 0.8 ? pick(["Bindu (116)", "Dog 128", "Moti"]) : null, dogId: rnd() < 0.8 ? `d${i}` : null, place: rnd() < 0.7 ? "Malleshwaram" : null,
        vaccinated: pick([true, false, null, undefined]), abc: rnd() < 0.5 ? { missing: KINDS.filter(() => rnd() < 0.3), required: [...KINDS], vetOk: rnd() < 0.5, reviewed: rnd() < 0.3 } : null });
  const drives: Drive[] | null = rnd() < 0.15 ? null : Array.from({ length: Math.floor(rnd() * 3) }, (_, i) => ({ ...ward12, id: `dr${i}`, kind: pick(["vaccination", "sterilisation", "census"]), total: Math.floor(rnd() * 40), starts_on: pick([TODAY, "2026-11-22", "2026-11-01", null]), ends_on: pick([TODAY, "2026-11-25", "2026-11-10", null]) }));
  return { stops, drives, waiting: Math.floor(rnd() * 3), failed: Math.floor(rnd() * 2), sentToday: rnd() < 0.5 ? ["x"] : [], today: TODAY, online: rnd() < 0.8 };
};
const numbersOf = (w: World) => new Set([...w.stops.length ? [w.stops.length] : [], w.waiting, w.failed, w.sentToday.length, ...(w.drives ?? []).flatMap((d) => [d.total, d.not_vaccinated + d.vacc_unknown, d.not_sterilised + d.ster_unknown]), 1, 2, 3, 4, 5, 7, 12, 128, 116, 8, 18, 20, 22, 23, 24, 25, 10, 2026].map(String));
for (let i = 0; i < count; i++) {
  const text = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => pick(FRAG)).join(pick([" ", ", ", ". "]));
  const w = world();
  let a: ReturnType<typeof answerField>;
  try { a = answerField(text, w); } catch (e) { throw new Error(`threw on "${text.slice(0, 80)}": ${e}`); }
  if (!a) { checks++; continue; }
  for (const act of a.acts) {
    if (act.go.to === "stop") { const key = act.go.key; ok(w.stops.some((x) => x.key === key), `button points at a stop that exists (${text})`); }
    if (act.go.to === "href") ok(act.go.href.startsWith("/ngo/"), `button opens an app page (${act.go.href})`);
  }
  ok(a.acts.filter((x) => x.primary).length <= 1, "at most one main action");
  ok(!/\b(saved|I've recorded|has been recorded|I recorded|done for you|completed it)\b/i.test(a.text.replace(/nothing is saved until you press Save/g, "")), `never says something was saved or done: "${a.text}"`);
  const known = numbersOf(w);
  for (const m of a.text.matchAll(/\b\d+\b/g)) ok(known.has(m[0]) || w.stops.some((x) => `${x.animal} ${x.title} ${x.place}`.includes(m[0])), `"${m[0]}" comes from the records: "${a.text}"`);
}
console.log(`field Kaju: ${checks} checks passed (seed ${seed}, ${count} generated)`);
