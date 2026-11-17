/* Tell Kaju's local readers (src/nx/data/capture.ts). Field mode's "Say it" reads a line on the phone with readField and
   fills the record screen's choices, offline. The rule it must keep: it never fills a field the words do not state, and
   it never throws. This checks that two ways:

   1. Examples a person would say, with the answer expected.
   2. A property test: thousands of generated phrasings, each built from fragments whose meaning is known (a reason, a
      sex, a mark, a place, or a distractor that mentions one of those words without stating it: "no wound", "already
      sterilised", "near his shop", "a male volunteer", "at 9am"), joined, reordered and cased at random from a fixed
      seed. Every field readField fills must come from a fragment that states it. Then random text of every kind, which
      must never throw.

   Run: node --import tsx scripts/test-capture-readers.ts [seed] [count] */
import assert from "node:assert/strict";
import { readBite, readCase, readField, readRecord, type Reason } from "../src/nx/data/capture";

const NOW = new Date("2026-11-17T10:00:00+05:30");
let checks = 0;

/* ── 1. Examples ─────────────────────────────────────────────────── */
const FIELD: [string, Partial<ReturnType<typeof readField>>][] = [
  ["Brown female limping by the temple, needs a vet", { category: "injury", sex: "Female", marks: "brown", zone: "By the temple" }],
  ["caught for ABC, male, ear notched, near the school", { category: "sterilisation", sex: "Male", marks: "ear notched", zone: "Near the school" }],
  ["puppy stuck in a drain, bleeding", { category: "rescue", also: ["injury"], sex: null, marks: null, zone: null }],
  ["not injured, already sterilised, sleeping near his shop", { category: null, sex: null, zone: null }],
  ["no collar, no wound, she eats well", { category: null, sex: null, marks: null }],
  ["a male volunteer saw a female dog at 9am", { sex: "Female", zone: null }],
  ["rescue van came, dog is fine, near the ABC centre", { category: null, zone: "Near the ABC centre" }],
  ["not sure of the sex, vaccinate it", { category: "vaccination", sex: "Unknown" }],
  ["", { category: null, sex: null, marks: null, zone: null, note: "" }],
];
for (const [text, want] of FIELD) {
  const got = readField(text);
  for (const [k, v] of Object.entries(want)) { assert.deepEqual((got as Record<string, unknown>)[k], v, `${k} for “${text}”: got ${JSON.stringify(got)}`); checks++; }
}
const c = readCase("Brown female dog limping near the HSR Layout bus stop, needs a vet today", NOW);
assert.equal(c.category, "injury"); assert.equal(c.severity, "high"); assert.equal(c.zone, "Near the HSR Layout bus stop"); assert.equal(c.city, null); checks += 4;
assert.equal(readCase("White dog sleeping outside the bakery in Pune", NOW).severity, null, "no urgency word, no severity"); checks++;
assert.equal(readCase("Limping dog, not urgent", NOW).severity, "low"); checks++;
const r = readRecord("Ate well, follow up Monday", NOW);
assert.deepEqual(r.followup, { due: "2026-11-23", note: "" }); assert.equal(r.note, "Ate well"); assert.equal(r.care, null); checks += 3;
assert.equal(readRecord("Not vaccinated yet, recheck in 3 days", NOW).care, null, "not vaccinated is not care given"); checks++;
assert.deepEqual(readRecord("Vaccinated today, batch 12-3", NOW).care?.date, "2026-11-17", "a batch number is never a date"); checks++;
const b = readBite("Dog bite on the left calf this morning, 34 F, OPD 4521, washed at home, brown stray near the bus stand", NOW);
assert.deepEqual([b.kind, b.species, b.exposure_on, b.age, b.sex, b.ref, b.washed, b.category, b.site, b.ownership], ["bite", "dog", "2026-11-17", "30-49", "female", "4521", "before_arrival", null, "left calf", "community"]); checks++;
const b2 = readBite("bitten by a cat 3 days ago, not happy to be called 9845012345", NOW);
assert.deepEqual([b2.species, b2.category, b2.exposure_on, b2.consent, b2.phone], ["cat", null, "2026-11-14", false, null], "a cat 3 days ago is a cat; refusing calls is not consent"); checks++;
assert.equal(readBite("Cat III scratch on the hand", NOW).category, "III"); checks++;
assert.equal(readBite("bitten by a cat I think", NOW).category, null, "“a cat I think” is not category I"); checks++;
assert.equal(readBite("child bitten, mother brought him", NOW).sex, null, "the mother is not the patient"); checks++;

/* ── 2. Property test ────────────────────────────────────────────── */
const seed = Number(process.argv[2] ?? 20261117), count = Number(process.argv[3] ?? 20000);
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(seed);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const shuffle = <T,>(xs: T[]) => { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };

const REASON: Record<Reason, string[]> = {
  rescue: ["stuck in a drain", "trapped under a car", "needs rescue", "fell into a well", "stranded on the roof", "abandoned puppies", "can't get out of the pit"],
  injury: ["limping", "bleeding from the leg", "deep wound on the back", "injured paw", "looks sick", "not eating since two days", "maggots in the ear", "hit by a bike", "needs a vet", "has mange", "lame on one leg"],
  sterilisation: ["caught for ABC", "to sterilise", "needs sterilisation", "for spaying", "neuter him", "for castration"],
  vaccination: ["vaccinate it", "needs anti-rabies vaccine", "for ARV", "due for vaccination", "rabies shot needed"],
};
/* Mention a reason word without stating a reason. */
const NOT_A_REASON = ["no wound", "not injured", "isn't limping", "not bleeding", "without any injury", "already sterilised", "spayed last year", "was vaccinated", "neutered", "no maggots", "doesn't look hurt", "not stuck", "never sick", "rescue van came", "abandoned building nearby", "vaccinated already", "the ABC team left", "vaccination camp is over"];
const SEX = { Female: ["female", "a female", "she is a female", "bitch"], Male: ["male", "a male dog", "it is male"], Unknown: ["not sure of the sex", "sex unknown"] } as const;
const NOT_A_SEX = ["near his shop", "her owner feeds her", "he was fed rice", "she eats well", "a male volunteer saw it", "the female staff called", "boys threw stones", "girls feed it", "his friend called"];
const MARK = ["brown", "black and white", "white", "tan", "red collar", "ear notched", "one eye", "short tail", "scar on the nose", "spotted", "curly tail", "white paws", "fawn", "brindle"];
const NOT_A_MARK = ["no collar", "without a collar", "not ear notched"];
const PLACE = ["near the temple", "by the bus stand", "outside the school", "behind the market", "opposite the petrol pump", "next to the tea stall", "in front of the bank", "near the ABC centre", "at the main gate", "near Malegaon road"];
const NOT_A_PLACE = ["at 9am", "at home", "bitten by a dog", "seen by a neighbour", "at night", "by evening", "at the clinic"];
const NOISE = ["seen this morning", "friendly", "eating well", "pls check", "kutta hai", "🙏", "ok", "thanks", "very calm", "sleeping", "since 2 days", "call me back", "same dog as last time"];
const SEP = [", ", ". ", "; ", "\n", " - ", "! "];
const CASE = [(s: string) => s, (s: string) => s.toLowerCase(), (s: string) => s.toUpperCase(), (s: string) => s.replace(/\b\w/g, (x) => x.toUpperCase())];

type Frag = { text: string; reason?: Reason; sex?: keyof typeof SEX; mark?: boolean; place?: boolean };
let filled = { category: 0, sex: 0, marks: 0, zone: 0 };
for (let i = 0; i < count; i++) {
  const frags: Frag[] = [];
  const nReasons = Math.floor(rnd() * 3);
  for (let k = 0; k < nReasons; k++) { const reason = pick(Object.keys(REASON) as Reason[]); frags.push({ text: pick(REASON[reason]), reason }); }
  if (rnd() < 0.5) frags.push({ text: pick(NOT_A_REASON) });
  if (rnd() < 0.4) { const sex = pick(Object.keys(SEX) as (keyof typeof SEX)[]); frags.push({ text: pick(SEX[sex]), sex }); }
  if (rnd() < 0.5) frags.push({ text: pick(NOT_A_SEX) });
  for (let k = Math.floor(rnd() * 3); k > 0; k--) frags.push({ text: pick(MARK), mark: true });
  if (rnd() < 0.3) frags.push({ text: pick(NOT_A_MARK) });
  if (rnd() < 0.5) frags.push({ text: pick(PLACE), place: true });
  if (rnd() < 0.5) frags.push({ text: pick(NOT_A_PLACE) });
  for (let k = Math.floor(rnd() * 3); k > 0; k--) frags.push({ text: pick(NOISE) });
  shuffle(frags);
  const sep = rnd() < 0.8 ? pick(SEP) : null;
  const cased = pick(CASE);
  const text = cased(frags.map((f) => f.text).join(sep ?? pick(SEP)) + (rnd() < 0.3 ? pick([".", "!!", "?", " "]) : ""));
  const lower = text.toLowerCase();
  let got: ReturnType<typeof readField>;
  try { got = readField(text); } catch (e) { assert.fail(`readField threw on “${text}”: ${String(e)}`); }
  const why = `“${text.replace(/\n/g, "⏎")}” → ${JSON.stringify(got)}`;
  assert.deepEqual(Object.keys(got).sort(), ["also", "category", "marks", "note", "sex", "zone"], `only these fields: ${why}`);
  const reasons = new Set(frags.map((f) => f.reason).filter(Boolean));
  if (got.category) { assert.ok(reasons.has(got.category), `category not stated: ${why}`); filled.category++; }
  for (const a of got.also) assert.ok(reasons.has(a), `also-reason not stated: ${why}`);
  if (!reasons.size) assert.equal(got.category, null, `category from no reason: ${why}`);
  const sexes = new Set(frags.map((f) => f.sex).filter(Boolean));
  if (got.sex) { assert.ok(sexes.has(got.sex), `sex not stated: ${why}`); filled.sex++; }
  const marks = frags.filter((f) => f.mark).map((f) => f.text.toLowerCase());
  if (got.marks) { for (const m of got.marks.split(", ")) assert.ok(marks.some((f) => f.includes(m)), `mark “${m}” not stated: ${why}`); filled.marks++; }
  if (!marks.length) assert.equal(got.marks, null, `marks from no mark: ${why}`);
  const places = frags.filter((f) => f.place).map((f) => f.text.toLowerCase());
  if (got.zone) {
    const z = got.zone.toLowerCase();
    assert.ok(lower.includes(z) && places.some((p) => z.startsWith(p.split(" ").slice(0, 2).join(" ")) && z.includes(p.split(" ").slice(-1)[0])), `place not stated: ${why}`);
    filled.zone++;
  }
  if (!places.length) assert.equal(got.zone, null, `place from no place: ${why}`);
  assert.equal(got.note, text.trim(), `the note is the words as said: ${why}`);
  checks += 8;
}
/* Each stating fragment on its own, between clause marks, is read (so the soundness above is not bought by reading nothing). */
for (const [reason, xs] of Object.entries(REASON)) for (const x of xs) for (const cased of CASE) { assert.equal(readField(cased(`${pick(NOISE)}, ${x}. ${pick(NOISE)}`)).category, reason, `missed reason in “${x}”`); checks++; }
for (const [sex, xs] of Object.entries(SEX)) for (const x of xs) { assert.equal(readField(`${x}, ${pick(NOISE)}`).sex, sex, `missed sex in “${x}”`); checks++; }
for (const x of MARK) { assert.ok(readField(`${pick(NOISE)}, ${x}`).marks, `missed mark “${x}”`); checks++; }
for (const x of PLACE) { assert.ok(readField(`${pick(NOISE)}, ${x}, ${pick(NOISE)}`).zone, `missed place “${x}”`); checks++; }

/* Random text of every kind: never throws, in any reader. */
const ALPHABET = "abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?'\"-/\\()[]{}*+?^$|#@%&=_~`\n\t🙏🐕ऀकुत्ता";
for (let i = 0; i < 3000; i++) {
  const len = Math.floor(rnd() * (i % 50 === 0 ? 12000 : 200));
  let s = ""; for (let k = 0; k < len; k++) s += ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  if (rnd() < 0.3) s = `${pick(REASON.injury)} ${s} ${pick(PLACE)}`;
  for (const f of [readField, (x: string) => readCase(x, NOW), (x: string) => readRecord(x, NOW), (x: string) => readBite(x, NOW)]) {
    try { f(s); } catch (e) { assert.fail(`a reader threw on random text (${s.length} chars): ${String(e)}`); }
  }
  checks++;
}
for (const odd of [undefined, null, 42, {}] as unknown[]) { assert.doesNotThrow(() => readField(odd as string)); checks++; }

console.log(`capture-readers: ${checks} checks passed (seed ${seed}, ${count} generated phrasings; filled category ${filled.category}, sex ${filled.sex}, marks ${filled.marks}, area ${filled.zone})`);
