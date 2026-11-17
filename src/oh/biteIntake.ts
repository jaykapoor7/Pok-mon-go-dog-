/* Kaju reads a bite report: a resident's own words ("A person was bitten by a stray dog near Indiranagar this
   morning. They need medical assistance.") become the fields of a bite notice. Fixed rules, on the device: no
   language model, nothing sent anywhere, and nothing invented. Whatever the words do not say is listed in `missing`
   so Kaju can ask for it, and the person confirms every field before the notice is sent.

   It reads; it never judges. Danger signs are only the words the person used (a bite on the face, heavy bleeding);
   deciding what they mean is the clinician's. English only for now: other languages are listed as planned. */

export type BiteArea = { id: string; name: string };
export type BiteField = "when" | "where" | "animal" | "looks" | "danger";

export type BiteDraft = {
  kind: "bite" | "scratch" | "lick_broken_skin" | null;
  species: "dog" | "cat" | "monkey" | "cattle" | "wildlife" | null;
  ownership: "community" | "owned" | null;
  /** The programme area named in the words, if any. */
  area: BiteArea | null;
  /** A landmark or street ("the bus stop on 100 Feet Road"), not the area. */
  place: string | null;
  /** ISO date, India time. */
  on: string | null;
  /** The words the date came from ("this morning"). */
  when: string | null;
  person: "self" | "someone" | "child" | null;
  wantsCare: boolean;
  /** The person's own words that match the danger-sign question, never a judgement. */
  signs: string[];
  /** What the animal looked like, in the person's words. */
  looks: string | null;
  missing: BiteField[];
};

const indiaDay = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
const minusDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const SPECIES: [RegExp, BiteDraft["species"]][] = [
  [/\b(dogs?|pupp(?:y|ies)|pups?|canine|bitch)\b/i, "dog"],
  [/\b(cats?|kittens?)\b/i, "cat"],
  [/\b(monkeys?|macaques?|langurs?)\b/i, "monkey"],
  [/\b(cows?|bulls?|buffalo(?:es)?|cattle|calf)\b/i, "cattle"],
  [/\b(bats?|mongoose|jackals?|foxes?|wild animal)\b/i, "wildlife"],
];
const SIGNS: [RegExp, string][] = [
  [/\b(heavy|a lot of|lots of|badly|profuse\w*|won'?t stop|not stopping)\b[^.]{0,20}\bbleed\w*|\bbleed\w*\b[^.]{0,12}\b(heavily|a lot|badly|won'?t stop|not stopping)\b/i, "heavy bleeding"],
  [/\bdeep\b/i, "a deep wound"],
  [/\b(several|many|multiple|two|three)\s+(bites|times|wounds)\b/i, "several bites"],
  [/\b(face|cheek|lip|nose|eye)\b/i, "a bite on the face"],
  [/\b(head|scalp)\b/i, "a bite on the head"],
  [/\bneck\b/i, "a bite on the neck"],
  [/\b(hand|hands|finger|fingers|palm|wrist)\b/i, "a bite on the hand"],
  [/\b(child|kid|boy|girl|son|daughter|baby|toddler|student)\b/i, "a child"],
];

export function readBite(raw: string, areas: BiteArea[], now = new Date()): BiteDraft {
  const text = raw.replace(/\s+/g, " ").trim();
  const t = text.toLowerCase();
  const today = indiaDay(now);

  const kind: BiteDraft["kind"] = /\b(bit|bite|bites|bitten|biting|nipped)\b/.test(t) ? "bite"
    : /\b(scratch\w*|clawed)\b/.test(t) ? "scratch"
      : /\blick\w*\b/.test(t) && /\b(wound|cut|broken skin)\b/.test(t) ? "lick_broken_skin" : null;
  const species = SPECIES.find(([re]) => re.test(text))?.[1] ?? null;
  const ownership: BiteDraft["ownership"] = /\b(stray|street|community|unowned|ownerless)\b/.test(t) ? "community"
    : /\b(pet|neighbou?r'?s|owner'?s|our dog|my dog|their dog|someone'?s)\b/.test(t) ? "owned" : null;

  /* The area: a programme area named anywhere in the words, matched without spaces or case ("Indira Nagar"). */
  const flat = norm(text);
  const area = [...areas].sort((a, b) => b.name.length - a.name.length).find((a) => norm(a.name).length >= 3 && flat.includes(norm(a.name))) ?? null;

  /* A landmark: "near the bus stop", "outside the temple on 100 Feet Road". The area alone is not a landmark. */
  let place: string | null = null;
  /* "bitten by a dog" names the animal, not a place. */
  const lmText = text.replace(/\b(bit|bitten|scratched|attacked|chased|licked)\s+by\b/gi, "$1");
  const lm = lmText.match(/\b(?:near|outside|opposite|behind|next to|in front of|by|at)\s+(the\s+[^,.;!?]{3,60}|[^,.;!?]*?\b(?:road|rd|street|cross|main|stop|stand|market|temple|school|park|metro|station|gate|circle|junction|signal|layout|colony|nagar|block)\b[^,.;!?]{0,30})/i);
  if (lm) {
    const p = lm[1].replace(/\b(this|today|yesterday|last)\b.*$/i, "").replace(/\s+(in|on)\s*$/i, "").trim();
    /* Words about the animal are not a landmark: "a stray dog near the bus stop" keeps "the bus stop". */
    const aboutAnimal = (x: string) => /\b(dogs?|pupp(?:y|ies)|cats?|monkeys?|cows?|stray|bitten|bit)\b/i.test(x);
    let q: string | null = p;
    for (let k = 0; k < 3 && q && aboutAnimal(q); k++) q = q.match(/\b(?:near|outside|opposite|behind|next to|in front of|at)\s+(.+)$/i)?.[1].trim() ?? null;
    /* Nor is the area itself ("near Indira Nagar"). */
    if (q && (!area || norm(q) !== norm(area.name))) place = q.slice(0, 120);
  }

  /* When: words the person used, turned into a date in India. */
  let on: string | null = null, when: string | null = null;
  const ago = t.match(/\b(\d{1,2}|a|an|one|two|three)\s+(hour|hours|day|days)\s+ago\b/);
  if (/\b(just now|a few minutes ago|this morning|this afternoon|this evening|tonight|today|an? hour ago)\b/.test(t)) { on = today; when = t.match(/\b(just now|a few minutes ago|this morning|this afternoon|this evening|tonight|today|an? hour ago)\b/)![1]; }
  else if (/\b(yesterday|last night)\b/.test(t)) { on = minusDays(today, 1); when = t.match(/\b(yesterday|last night)\b/)![1]; }
  else if (ago) {
    const n = ({ a: 1, an: 1, one: 1, two: 2, three: 3 } as Record<string, number>)[ago[1]] ?? Number(ago[1]);
    on = /day/.test(ago[2]) ? minusDays(today, Math.min(30, n)) : today; when = ago[0];
  }

  const person: BiteDraft["person"] = /\b(child|kid|boy|girl|son|daughter|baby|toddler)\b/.test(t) ? "child"
    : /\b(i was|i got|bit me|bitten me|my (?:hand|leg|arm|finger|foot)|i have been)\b/.test(t) ? "self"
      : /\b(a person|someone|somebody|a man|a woman|my (?:mother|father|wife|husband|friend|neighbou?r|brother|sister)|a resident|he|she)\b/.test(t) ? "someone" : null;
  const wantsCare = /\b(need|needs|needed|want|wants|get|getting|looking for)\b[^.]{0,30}\b(medical|doctor|hospital|treatment|help|assistance|vaccine|injection)\b/.test(t);
  const signs = SIGNS.filter(([re]) => re.test(text)).map(([, s]) => s);

  /* What the animal looked like: colour, size, collar, marks named with the animal. */
  const looksM = text.match(/\b((?:(?:black|brown|white|tan|grey|gray|golden|ginger|spotted|small|big|large|thin|old|young|limping|injured|aggressive)[\s,]+(?:and\s+)?){1,4})(?:stray\s+|street\s+)?(?:dog|puppy|cat|monkey)\b([^.;]{0,40}\b(?:collar|marks?|tail|ear|patch)\b[^.;]*)?/i);
  const collar = text.match(/\b(no collar|with a (?:red|blue|black|brown|green)?\s*collar|wearing a collar|ear[- ]?notch\w*)\b/i);
  const looks = [looksM?.[0]?.trim(), collar && !looksM?.[0]?.includes(collar[0]) ? collar[0] : null].filter(Boolean).join(", ") || null;

  const missing: BiteField[] = [];
  if (!on) missing.push("when");
  if (!area) missing.push("where");
  if (!species) missing.push("animal");
  if (!looks) missing.push("looks");
  missing.push("danger"); /* always asked, with the fixed question: the words alone never settle it */
  return { kind, species, ownership, area, place, on, when, person, wantsCare, signs, looks, missing };
}
