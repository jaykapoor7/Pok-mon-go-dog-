// ─────────────────────────────────────────────────────────────
// Ward-level density.
//
// The map draws one polygon per municipal ward, shaded by how many animals
// have been recorded inside it. The geometry and the counts arrive together
// as one GeoJSON FeatureCollection built by Postgres, because joining 200
// polygons to 200 rows is work worth doing once in the database rather than
// once in every visitor's browser.
//
// The load-bearing idea in here is `surveyed`. A ward with no records is not
// a ward with no dogs, it is a ward nobody has been to yet, and those are
// opposite findings. Everything below keeps them apart: unsurveyed wards
// carry null rather than 0, and the map paints them as absence rather than
// as a low number.
//
// See supabase/ward-density.sql.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";

export type WardMetric =
  | "animals"
  | "per_km2"
  | "ster_pct_of_known"
  | "needs_help";

export type WardProps = {
  ward_id: string;
  ward_no: string;
  ward_name: string | null;
  zone_name: string | null;
  area_km2: number;
  animals: number;
  /** Null until something has been recorded here. Never 0. */
  per_km2: number | null;
  sterilised: number;
  not_sterilised: number;
  sterilised_unknown: number;
  vaccinated: number;
  needs_help: number;
  /** Of the animals somebody actually checked. Null when nobody has. */
  ster_pct_of_known: number | null;
  /** Of every animal on record, unknowns counted against. */
  ster_pct_of_all: number | null;
  surveyed: boolean;
};

export type WardFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: number;
    geometry: GeoJSON.MultiPolygon;
    properties: WardProps;
  }[];
};

export type WardCoverage = {
  city: string;
  wards_total: number;
  wards_surveyed: number;
  wards_unsurveyed: number;
  pct_wards_surveyed: number | null;
  animals: number;
  area_km2_total: number;
  area_km2_surveyed: number;
  sterilised: number;
  not_sterilised: number;
  sterilised_unknown: number;
  ster_pct_of_known: number | null;
  ster_pct_of_all: number | null;
  /** Carried so any report can cite the boundaries it was drawn against. */
  boundary_source: string | null;
  boundary_source_url: string | null;
  boundary_licence: string | null;
};

const EMPTY: WardFeatureCollection = { type: "FeatureCollection", features: [] };

/** Ward polygons with their counts, ready to hand straight to MapLibre. */
export async function getWardDensity(city: string): Promise<WardFeatureCollection> {
  const supa = getSupabase();
  if (!supa) return EMPTY;
  const { data, error } = await supa.rpc("ward_density_geojson", { p_city: city });
  if (error || !data) return EMPTY;
  return data as WardFeatureCollection;
}

/** The headline a funder reads: coverage first, every rate below it. */
export async function getWardCoverage(city: string): Promise<WardCoverage | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc("ward_coverage", { p_city: city });
  if (error || !data) return null;
  return data as WardCoverage;
}

/** Cities that have boundaries loaded, for the city picker. */
export async function getWardCities(): Promise<{ city: string; wards: number }[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("ward_cities");
  if (error || !data) return [];
  return data as { city: string; wards: number }[];
}

/* ── How a metric is read ────────────────────────────────────────────
   Each metric needs its own scale, its own unit and its own sentence,
   because "12" means something different in each of them. Keeping the
   label, the unit and the breaks together stops the legend and the map
   drifting apart. */
export const WARD_METRICS: Record<
  WardMetric,
  {
    label: string;
    unit: string;
    /** Upper bound of each band. The last band is everything above. */
    breaks: number[];
    describe: (p: WardProps) => string;
  }
> = {
  animals: {
    label: "Animals recorded",
    unit: "animals",
    breaks: [5, 15, 40, 100],
    describe: (p) => `${p.animals} recorded in ${p.area_km2.toFixed(1)} km²`,
  },
  per_km2: {
    label: "Density",
    unit: "per km²",
    breaks: [2, 6, 15, 40],
    describe: (p) =>
      p.per_km2 == null ? "Not surveyed" : `${p.per_km2} animals per km²`,
  },
  ster_pct_of_known: {
    label: "Sterilised",
    unit: "% of checked",
    breaks: [20, 40, 60, 80],
    describe: (p) =>
      p.ster_pct_of_known == null
        ? "None checked"
        : `${p.ster_pct_of_known}% of ${p.sterilised + p.not_sterilised} checked` +
          (p.sterilised_unknown > 0
            ? `, ${p.sterilised_unknown} unchecked`
            : ""),
  },
  needs_help: {
    label: "Needing help",
    unit: "open",
    breaks: [1, 3, 8, 20],
    describe: (p) => `${p.needs_help} awaiting a decision`,
  },
};

/* Sequential blues, light to dark, from StrayPaw's own electric family.
   Deliberately not a red-to-green ramp: the number being shaded is a count,
   not a judgement, and green would read as "good" on a map where a high
   sterilisation rate and a high dog count mean opposite things. */
export const WARD_RAMP = ["#dbe7fb", "#a9c6f3", "#6f9ce6", "#3f70cf", "#1b46b0"];

/** Wards nobody has surveyed. Not on the ramp, on purpose. */
export const WARD_UNSURVEYED = "#e6e8ec";
