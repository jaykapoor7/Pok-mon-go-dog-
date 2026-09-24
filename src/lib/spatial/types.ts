/* ════════════════════════════════════════════════════════════════════
   The spatial dataset: the register, reduced to what a map and a chart
   need to answer their questions — and nothing that identifies anyone.

   Every screen that draws place (the landing plate, the map, analytics,
   the dashboards, a patch around a resident) reads this one shape. It is
   built on the server from the public fact views (or, for an
   organisation, from its own rows under its own RLS) and it replaces the
   old habit of sending every animal row, with every column, to every
   browser.

   Records are flat integer tuples. No animal id, no name, no free text
   and no coordinate finer than an H3 cell travels in it: a cell is the
   unit of place, and a selected cell asks the server for its animals.
   ════════════════════════════════════════════════════════════════════ */

/** Day zero of the register's clock. Far enough back that any real record —
    an organisation importing a decade of paper registers — gets a positive
    day; -1 is kept for "no date". Screens start their clocks at the first
    record, never at the epoch. */
export const EPOCH_YEAR = 2000;
export const EPOCH_MS = Date.UTC(EPOCH_YEAR, 0, 1);
export const DAY_MS = 86_400_000;
export const dayOf = (iso: string | null | undefined): number => {
  if (!iso) return -1;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((t - EPOCH_MS) / DAY_MS) : -1;
};
export const dateOfDay = (day: number) => new Date(EPOCH_MS + day * DAY_MS);

/** H3 resolution for the unit of place: ≈0.74 km² a cell. */
export const H3_RES = 8;

/* Animal tuple. */
export const A = { cell: 0, city: 1, first: 2, last: 3, flags: 4, locality: 5, sightings: 6, lastVacc: 7, org: 8 } as const;
export const A_STRIDE = 9;
export const AF = {
  help: 1,
  injured: 2,
  sterYes: 4,
  sterNo: 8,
  vaccYes: 16,
  vaccNo: 32,
  photo: 64,
  earNotch: 128,
  resident: 256,
  exact: 512,
} as const;

/* Case tuple. */
export const C = {
  cell: 0, animal: 1, day: 2, cond: 3, status: 4, closure: 5, intake: 6,
  firstAction: 7, closedDay: 8, reliable: 9, severity: 10, fuDone: 11, fuMissed: 12, fuUp: 13, org: 14, source: 15,
} as const;
export const C_STRIDE = 16;

/* Care tuple (medical events). */
export const K = { cell: 0, animal: 1, day: 2, kind: 3 } as const;
export const K_STRIDE = 4;

/* Sighting tuple (resident reports). */
export const S = { cell: 0, animal: 1, day: 2, flags: 3 } as const;
export const S_STRIDE = 4;
export const SF = { photo: 1, sterObserved: 2, vaccObserved: 4 } as const;

export type CityInfo = {
  name: string;
  state: string;
  lng: number;
  lat: number;
  /** [west, south, east, north] of the city's recorded cells, padded. */
  box: [number, number, number, number];
  animals: number;
  cases: number;
};

export type FrontierCell = { cell: string; ring: number[]; near: 0 | 1; city: number };

export type NextCell = {
  cell: string;
  center: [number, number];
  city: number;
  locality: string;
  neighbours: number;
  reasons: string[];
};

export type SpatialDataset = {
  v: 1;
  scope: "public" | "org";
  built: string;
  /** Day index of the build, on the register clock. */
  today: number;
  cities: CityInfo[];
  cells: string[];
  /** Flat [lng, lat] per cell. */
  centers: number[];
  /** Flat [lng, lat, lng, lat, …] closed ring per cell. */
  rings: number[][];
  cellCity: number[];
  cellLocality: number[];
  localities: string[];
  animals: number[];
  cases: number[];
  care: number[];
  sightings: number[];
  dict: {
    condition: string[];
    status: string[];
    closure: string[];
    intake: string[];
    care: string[];
    severity: string[];
    org: string[];
  };
  frontier: FrontierCell[];
  next: NextCell[];
};

export const countOf = (flat: number[], stride: number) => Math.floor(flat.length / stride);
