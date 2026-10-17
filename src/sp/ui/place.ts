/* A public place name at locality level. Recorded places sometimes carry a
   house number or a street ("24 SS Nagar, Annayappan St, Nallampalayam");
   a public page promises the area, never the spot, so those parts are
   dropped and the most general remaining locality is shown. */
const STREET = /\b(st|street|road|rd|lane|ln|cross|main|marg|gali|nagar\s+\d|block|sector\s+\d|house|flat|plot|no\.?|opp|opposite|near|behind)\b/i;
export function publicLocality(place: string | null | undefined): string | null {
  if (!place) return null;
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  const safe = parts.filter((p) => !/\d/.test(p) && !STREET.test(p));
  return safe.at(-1) ?? null;
}
