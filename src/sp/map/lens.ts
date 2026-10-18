import { LENSES, PUBLIC_LENSES, type LensId } from "../atlas/lenses";

/* The Map's lenses. Community sees the four public lenses (decision 018);
 * an NGO and a municipality pass their own. The Care lens is named for what it holds. */
export type MapVariant = "community" | "ngo" | "city";
export type MapScope = "public" | "org";
export const MAP_LENSES: LensId[] = PUBLIC_LENSES;
export const lensLabel = (id: LensId) => (id === "care" ? "Sterilisation records" : LENSES[id].label);
/** A lens's unit for a count: "1 place to look", "1 open request", "3 follow-ups". */
export function unitFor(id: LensId, n: number): string {
  const u = id === "animals" ? "animals" : LENSES[id].unit;
  if (n !== 1) return u;
  const w = u.split(" "), i = u.includes(" to ") ? 0 : w.length - 1;
  w[i] = w[i].replace(/s$/, "");
  return w.join(" ");
}
