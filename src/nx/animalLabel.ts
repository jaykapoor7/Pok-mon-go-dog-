/* How the workspace names an animal, in one place.

   An animal is called by its name if it has one, otherwise by its kind and number: "Dog 128". The number is the
   digits of the organisation's own register code (YEL-128 → 128, DDS-00421 → 421), so it is what a team already
   writes on a collar or ear-tag sheet and says on the phone; the place is always shown beside it in words
   (Yelahanka), never as the code's three letters. Names repeat on every register (two Tigers, two Kalus), so where
   a named animal is mentioned in one line the number goes with it: "Tiger (132)".

   Nothing is stored or invented: the stored code stays on the record and in search, and an animal with no code is
   numbered by the first six characters of its StrayPaw ID, which search finds as well. "Unnamed" is never shown. */

export type AnimalRef = {
  id?: string | null; name?: string | null; code?: string | null; straypaw_id?: string | null;
  species?: string | null; zone?: string | null; city?: string | null;
};
export type AnimalLabel = {
  /** The name, or "Dog 128". */ title: string;
  /** The real name, if it has one. */ name: string | null;
  /** The number to write and say: "128". Null only when nothing identifies the animal at all. */ tag: string | null;
  /** One line where the animal is mentioned in passing: "Tiger (132)" or "Dog 128". */ line: string;
  /** "Dog", "Cat" or "Animal". */ kind: string;
  /** The place in words: the locality, else the city. */ place: string | null;
  /** The register code as stored, for the record and for search. */ code: string | null;
  /** The number comes from the organisation's own code (not the StrayPaw ID). */ fromCode: boolean;
};

const NOT_A_NAME = /^(unnamed( animal| dog)?|unknown|no name|none|nil|n\/?a|-+|\?+|dog|cat|animal|stray( dog)?|street dog)$/i;
/** A name a person gave, or null. Generated descriptions ("Brown · Ward 12") and placeholders are not names. */
export function animalName(s: string | null | undefined): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t && !/·/.test(t) && !NOT_A_NAME.test(t) ? t : null;
}

const KIND: Record<string, string> = { dog: "Dog", cat: "Cat" };
export const kindWord = (species: string | null | undefined) => KIND[(species ?? "dog").trim().toLowerCase()] ?? (species?.trim() ? "Animal" : "Dog");

/** The number in a register code: "YEL-128" → "128", "DDS-00421" → "421", "AN-1042" → "1042", "0042" → "42".
    A code of another shape is kept whole, as the team wrote it. */
export function codeNumber(code: string | null | undefined): string | null {
  const c = (code ?? "").trim();
  if (!c) return null;
  const m = /^[A-Za-z]{0,8}[\s\-_/.#]*?(\d{1,8})$/.exec(c);
  if (m) return m[1].replace(/^0+(?=\d)/, "");
  return c.length <= 16 ? c.toUpperCase() : `${c.slice(0, 15)}…`;
}

/** The first six characters of the StrayPaw ID (or the record's own ID, which it is made from). */
function idChars(a: AnimalRef): string | null {
  const sp = (a.straypaw_id ?? "").trim();
  const hex = /([0-9A-F]{6,})$/i.exec(sp.replace(/-/g, ""))?.[1] ?? (a.id ? a.id.replace(/-/g, "") : "");
  return hex.length >= 6 ? hex.slice(0, 6).toUpperCase() : null;
}

export function animalLabel(a: AnimalRef | null | undefined): AnimalLabel {
  const r = a ?? {};
  const name = animalName(r.name);
  const fromCode = !!(r.code ?? "").trim();
  const tag = fromCode ? codeNumber(r.code) : idChars(r);
  const kind = kindWord(r.species);
  const title = name ?? (tag ? `${kind} ${tag}` : kind);
  return {
    title, name, tag, kind, fromCode,
    line: name ? (tag ? `${name} (${tag})` : name) : title,
    place: (r.zone ?? "").trim() || (r.city ?? "").trim() || null,
    code: (r.code ?? "").trim() || null,
  };
}
/** "Tiger (132)" or "Dog 128": where an animal is mentioned in passing. */
export const animalLine = (a: AnimalRef | null | undefined) => animalLabel(a).line;

/** Text written with an animal's code in it ("Vaccination due · BTM-125") reads with the animal's name or number
    instead ("Vaccination due · Dog 125"). Only that animal's own code is replaced; the stored text is unchanged. */
export function withAnimalName(text: string, a: AnimalRef | null | undefined): string {
  const code = (a?.code ?? "").trim();
  if (!text || code.length < 3) return text;
  const re = new RegExp(`(^|[^A-Za-z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`, "i");
  return re.test(text) ? text.replace(re, (_m, pre: string) => `${pre}${animalLabel(a).line}`) : text;
}

/** What a person types to find an animal, turned into what the register can match: "#128", "No. 128", "dog 128" and
    "Tiger (128)" all look for 128, which finds YEL-128. Anything else (a name, a code, a place) is searched as typed. */
export function animalSearch(q: string): string {
  const t = q.replace(/\s+/g, " ").trim();
  const alone = /^(?:(?:dog|cat|animal|no\.?|number|num)\s*)?#?\s*0*(\d{1,8})$/i.exec(t);
  if (alone) return alone[1] || "0";
  const named = /^[^#()\d]+?\s*(?:#|\(|no\.?\s*)\s*0*(\d{1,8})\)?$/i.exec(t);
  if (named) return named[1] || "0";
  return t;
}
