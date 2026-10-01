/** A dog-only register may reject a non-dog source; it must never relabel it. */
export function importedSpecies(raw: Record<string, unknown>, mappedHeader?: string | null, sheet = ''): string {
  const header = mappedHeader || Object.keys(raw).find((key) => /^(species|animal\s*type|type\s*of\s*animal)$/i.test(key.trim()));
  const explicit = String(header ? raw[header] ?? '' : '').trim().toLowerCase();
  if (explicit) return /^(dogs?|canines?|pupp(?:y|ies)|pups?)$/.test(explicit) ? 'dog' : explicit;
  if (/\b(cats?|kittens?|horses?|cattle|cows?|buffalo(?:es)?|birds?|goats?)\b/i.test(sheet)) return 'non-dog';
  return 'dog';
}
