/* Formatting for the public record pages. Dates are read in India time; a
   missing value is said, never shown as zero. */

export const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("en-IN"));

export const day = (iso: string | null | undefined, empty = "date not recorded") =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : empty;

export function since(iso: string | null | undefined) {
  if (!iso) return "unknown";
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d < 1 ? "today" : d === 1 ? "yesterday" : d < 45 ? `${d} days ago` : d < 540 ? `${Math.round(d / 30)} months ago` : `${(d / 365).toFixed(1).replace(/\.0$/, "")} years ago`;
}

export const plural = (k: number, one: string, many = `${one}s`) => (k === 1 ? one : many);

/* A public place name at locality level. Recorded places sometimes carry a
   house number or a street; a public page promises the area, never the
   spot, so those parts are dropped and the most general remaining
   locality is shown. */
const STREET = /\b(st|street|road|rd|lane|ln|cross|main|marg|gali|nagar\s+\d|block|sector\s+\d|house|flat|plot|no\.?|opp|opposite|near|behind)\b/i;
export function publicLocality(place: string | null | undefined): string | null {
  if (!place) return null;
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  const safe = parts.filter((p) => !/\d/.test(p) && !STREET.test(p));
  return safe.at(-1) ?? null;
}
