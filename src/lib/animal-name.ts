/* ════════════════════════════════════════════════════════════════════
   What to call an animal.

   A name somebody gave the animal is shown as its name. Everything else
   in the name column is a filing label written by an import or a form —
   "Dog · KK Pudur · Oct 2024", "Jamshedpur dog 2482", "Unknown" — and is
   not a name. Those animals are called by their StrayPaw tag, which is
   unique, short and true, with the place beside it. Nothing here invents
   a name.
   ════════════════════════════════════════════════════════════════════ */

type Named = { name?: string | null; straypaw_id?: string | null; id?: string | null; zone?: string | null; sex?: string | null; size?: string | null };

const FILING = [
  /·/,
  /^(dog|cat|animal|puppy|kitten|pup|street dog|stray|unknown|unnamed|no name|none|na|n\/a|-+)\b/i,
  /\b(dog|cat|animal|puppy)\s*#?\s*\d+\s*$/i,
  /^[A-Z]{1,4}[-\s]?\d{2,}$/i,
  /^\d+$/,
];

/** The name a person gave this animal, or null if the field holds a filing label. */
export function givenName(name: string | null | undefined): string | null {
  const n = name?.trim();
  if (!n || n.length > 40) return null;
  if (FILING.some((re) => re.test(n))) return null;
  return n === n.toLowerCase() ? n.replace(/(^|[\s\-'])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()) : n;
}

/** The short form of a StrayPaw ID: "SP-D-PK0UBR" → "PK0UBR". */
export function animalTag(a: Named): string {
  const sp = a.straypaw_id?.trim();
  if (sp) return sp.split("-").pop()!.toUpperCase();
  return (a.id ?? "").replace(/-/g, "").slice(0, 6).toUpperCase() || "—";
}

/** The first part of a recorded place: "Kovilmedu, Velandipalayam" → "Kovilmedu". */
export function shortPlace(zone: string | null | undefined): string | null {
  const z = zone?.split(",")[0]?.trim();
  return z && z.toLowerCase() !== "india" ? z : null;
}

/** Title: the given name, else the tag. */
export function animalTitle(a: Named): string {
  return givenName(a.name) ?? animalTag(a);
}

/** What the record says the animal is, from its recorded sex and size:
 *  "Female · medium", "Male puppy", "Small dog". Null when neither is known. */
export function describeAnimal(a: Named): string | null {
  const sex = /^(m|male)$/i.test(a.sex?.trim() ?? "") ? "male" : /^(f|female)$/i.test(a.sex?.trim() ?? "") ? "female" : null;
  const size = (a.size ?? "").trim().toLowerCase();
  const cap = (t: string) => t.replace(/^./, (c) => c.toUpperCase());
  if (size === "puppy") return sex ? `${cap(sex)} puppy` : "Puppy";
  if (size === "small" || size === "medium" || size === "large") return sex ? `${cap(sex)} · ${size}` : `${cap(size)} dog`;
  return sex ? cap(sex) : null;
}

/** The line under the title: what it is when there is no name, then the place. */
export function animalSubtitle(a: Named): string {
  const place = shortPlace(a.zone);
  const named = !!givenName(a.name);
  return [named ? describeAnimal(a) : (describeAnimal(a) ?? "Unnamed"), place].filter(Boolean).join(" · ") || "Place not recorded";
}
