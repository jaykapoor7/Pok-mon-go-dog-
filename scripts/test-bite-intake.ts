/* Kaju's bite-report reader (src/oh/biteIntake.ts): plain words become a bite notice's fields, nothing is invented,
   and whatever the words do not say is asked for. */
import assert from "node:assert/strict";
import { readBite } from "../src/oh/biteIntake";

const AREAS = ["HSR Layout", "Koramangala", "BTM Layout", "Jayanagar", "Banashankari", "Indiranagar", "Whitefield", "Malleshwaram", "Rajajinagar", "Yelahanka"].map((name, i) => ({ id: `a${i}`, name }));
const now = new Date("2026-11-16T03:30:00Z"); /* 09:00 in India */
let n = 0;
const ok = (m: string) => { n++; console.log(`ok ${n} - ${m}`); };

const demo = readBite("A person was bitten by a stray dog near Indiranagar this morning. They need medical assistance.", AREAS, now);
assert.equal(demo.kind, "bite");
assert.equal(demo.species, "dog");
assert.equal(demo.ownership, "community");
assert.equal(demo.area?.name, "Indiranagar");
assert.equal(demo.place, null, "the area alone is not a landmark");
assert.equal(demo.on, "2026-11-16");
assert.equal(demo.when, "this morning");
assert.equal(demo.person, "someone");
assert.equal(demo.wantsCare, true);
assert.deepEqual(demo.signs, []);
assert.equal(demo.looks, null);
assert.deepEqual(demo.missing, ["looks", "danger"]);
ok("the demo report: a bite, a street dog, Indiranagar, today, someone else, wants care; asks what the dog looked like and the danger signs");

const rich = readBite("My son was bitten on the hand by a brown dog with no collar near the bus stop on 100 Feet Road, Indira Nagar, yesterday. It is bleeding a lot.", AREAS, now);
assert.equal(rich.area?.name, "Indiranagar", "spacing and case do not matter");
assert.equal(rich.on, "2026-11-15");
assert.equal(rich.person, "child");
assert.ok(rich.signs.includes("a bite on the hand") && rich.signs.includes("heavy bleeding") && rich.signs.includes("a child"), JSON.stringify(rich.signs));
assert.ok(rich.looks && /brown dog/i.test(rich.looks) && /no collar/i.test(rich.looks), String(rich.looks));
assert.ok(rich.place && /bus stop/.test(rich.place), String(rich.place));
assert.deepEqual(rich.missing, ["danger"]);
ok("a fuller report fills every field, keeps the person's own words for danger signs, and still asks the danger question");

const bare = readBite("Something attacked me", AREAS, now);
assert.equal(bare.kind, null);
assert.equal(bare.species, null);
assert.equal(bare.area, null);
assert.equal(bare.on, null);
assert.deepEqual(bare.missing, ["when", "where", "animal", "looks", "danger"]);
ok("nothing is guessed: an unclear report asks for everything");

const cat = readBite("A neighbour's cat scratched my daughter 2 days ago in Jayanagar", AREAS, now);
assert.equal(cat.kind, "scratch");
assert.equal(cat.species, "cat");
assert.equal(cat.ownership, "owned");
assert.equal(cat.on, "2026-11-14");
assert.equal(cat.area?.name, "Jayanagar");
ok("scratches, cats, owned animals and 'N days ago' are read");

const elsewhere = readBite("A dog bit me near the market in Mysuru today", AREAS, now);
assert.equal(elsewhere.area, null, "an area outside the programme is not matched to one inside it");
assert.ok(elsewhere.missing.includes("where"));
ok("a place outside the programme's areas is left for the person to choose");

console.log(`\n${n} bite intake checks passed`);
