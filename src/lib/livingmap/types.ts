/* ════════════════════════════════════════════════════════════════════
   The Living Map's data contract.

   Everything the map draws at city scale comes from complete, uncapped
   aggregates per H3 r8 area (≈0.74 km²), computed in the database from
   the public views (public_map_cells / public_map_months). No coordinate
   finer than an area ever reaches the browser; individual animals are
   read only for one chosen area, and are drawn at schematic positions
   inside it.

   Three states are kept apart everywhere a figure is shown:
     a value      something was recorded (including a recorded "no")
     zero         the place is on the record and nothing of this kind is
     unknown      the record does not say (status unknown, no dates,
                  no record of the place at all)
   ════════════════════════════════════════════════════════════════════ */

/** An organisation's share of an area: animals it keeps, requests it holds, and how many of those are open. */
export type OrgShare = { id: string; name: string | null; a: number; c: number; o?: number };

export type MapCell = {
  h3: string; zone: string | null;
  animals: number; exact_loc: number; photos: number; needs_help: number; injured: number; residents: number;
  ster_yes: number; ster_no: number; ster_unknown: number; vacc_yes: number; vacc_unknown: number;
  first_seen: string | null; last_seen: string | null;
  cases: number; open_cases: number; open_30: number; open_oldest: string | null;
  closed_field: number; handed_on: number; no_action: number; in_progress: number; status_unknown: number;
  first_action_median: number | null; fu_done: number; fu_missed: number; fu_upcoming: number; last_case: string | null;
  care: number; care_12m: number; care_last: string | null; care_kinds: Record<string, number>; orgs: OrgShare[];
  /** The area's centre, [lng, lat], computed on the server. */
  c: [number, number];
  /** Organisation map only: open requests nobody holds, and who holds the rest. */
  unassigned?: number; people?: { name: string; o: number }[];
};

/** [cellIndex, monthIndex, opened, closed, care, sterilisation, vaccination, otherCare].
 *  monthIndex = (year − 2000) × 12 + month0. */
export type MonthRow = [number, number, number, number, number, number, number, number];
export const MR = { cell: 0, m: 1, opened: 2, closed: 3, care: 4, ster: 5, vacc: 6, other: 7 } as const;

export type MapCity = {
  city: string;
  scope?: "public" | "org";
  /** What kind of record this city holds (AtlasRegister.cityEvidence). */
  kind: EvidenceKind;
  built: string;
  cells: MapCell[];
  months: MonthRow[];
  /** Centres of the areas that border the record but hold none of it. */
  edge: [number, number][];
};

export type EvidenceKind = "rescue" | "campaign" | "clinical" | "photo" | "register";

export type AreaAnimal = {
  id: string; title: string; describe: string | null; zone: string | null;
  photo: string | null; sensitive: boolean;
  status: string | null; needs_help: boolean; ster: string | null; vacc: string | null;
  last_seen: string | null; first_seen: string | null; source: string | null; org: string | null;
  /** Recorded size (a puppy gets a painted pup) and the animal's own record of care. */
  size?: string | null;
  facts?: { cases: number; open: number; care: number; ster: number; lastCare: string | null };
};
export type AreaCase = {
  condition: string | null; status: string | null; occurred: string | null; resolved: string | null;
  first_action_days: number | null; intake: string | null; org: string | null; animal: string | null;
  fu_done: number; fu_missed: number; fu_upcoming: number;
  /** Organisation map only: the case itself, and who holds it. */
  id?: string; code?: string | null; assignee?: string | null;
};
export type MapArea = { h3: string; city: string; animals: AreaAnimal[]; animalTotal: number; cases: AreaCase[]; caseTotal: number };

export const monthIndex = (iso: string) => { const d = new Date(iso); return (d.getUTCFullYear() - 2000) * 12 + d.getUTCMonth(); };
export const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (m: number, long = false) => `${MON[((m % 12) + 12) % 12]}${long ? " " : " ’"}${long ? 2000 + Math.floor(m / 12) : String(2000 + Math.floor(m / 12)).slice(2)}`;

/** One city on the national view, from public_map_cities (same definitions as
 *  the city view), placed at the existing city index's representative point. */
export type NationalCity = {
  city: string; state: string | null; lng?: number; lat?: number;
  animals: number; cells: number; needs_help: number; sterilised: number; ster_no: number; ster_unknown: number; vaccinated: number;
  cases: number; open_cases: number; open_30: number; status_unknown: number; care: number; treatments: number; last_activity: string | null;
  /** Organisation map only. */
  unassigned?: number;
};

/** Requests whose recorded place has no city, so no area: listed, never dropped. */
export type Unplaced = { zone: string; district: string | null; open_cases: number; cases: number; latest: string | null };
