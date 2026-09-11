/* ════════════════════════════════════════════════════════════════════
   The busiest place on the register.

   A box drawn around every located record spans most of India, and at
   that zoom the photographs a map draws for each animal are specks. Both
   the landing map and the console's map want the same thing instead: the
   one place with records packed into it, so the first thing anybody sees
   is a populated street rather than a dot map of a subcontinent.

   Computed from the records, so it follows the work rather than naming a
   city in advance.
   ════════════════════════════════════════════════════════════════════ */

export type Located = { lat: number; lng: number };

/** Records with usable coordinates. 0,0 is the Atlantic, not a location. */
export function located<T extends Partial<Located>>(rows: T[]): (T & Located)[] {
  return rows.filter(
    (r): r is T & Located =>
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lng) &&
      (r.lat !== 0 || r.lng !== 0)
  );
}

/**
 * The densest half-degree cell, which is roughly a city.
 *
 * Falls back to everything when no cell holds at least `floor` records: one
 * or two animals in a cell is not a city, and framing on them would hide the
 * rest of the register behind a street corner.
 */
export function densestCell<T extends Located>(rows: T[], floor = 3): T[] {
  if (rows.length === 0) return [];
  const cells = new Map<string, T[]>();
  for (const r of rows) {
    const key = `${Math.round(r.lat * 2)}/${Math.round(r.lng * 2)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(r);
    else cells.set(key, [r]);
  }
  let best: T[] = [];
  for (const bucket of cells.values()) if (bucket.length > best.length) best = bucket;
  return best.length >= floor ? best : rows;
}

/** Bounding box of a set of records, in the order MapLibre wants it. */
export function boundsOf(rows: Located[]): [[number, number], [number, number]] | null {
  if (rows.length < 2) return null;
  return [
    [Math.min(...rows.map((r) => r.lng)), Math.min(...rows.map((r) => r.lat))],
    [Math.max(...rows.map((r) => r.lng)), Math.max(...rows.map((r) => r.lat))],
  ];
}
