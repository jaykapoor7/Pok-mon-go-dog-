import { STATES, STATE_CENTROIDS } from "@/lib/platform/geography";
import { DATASETS } from "@/lib/platform/datasets";

/* ════════════════════════════════════════════════════════════════════
   State-level coverage, for the map's data-gap layer.

   The map legend has always claimed a "coverage gap" layer without one
   existing. This builds it from the same sourced points the rest of the
   app uses, so the gaps shown on the map are the gaps in the register, not a separate, hand-maintained list that could drift out of step.
   ════════════════════════════════════════════════════════════════════ */

export type CoverageStatus = "measured" | "population-only" | "unmeasured";

export type StateCoverage = {
  code: string;
  name: string;
  lat: number;
  lng: number;
  population: number | null;
  /** 0–1 where published, null where no ABC figure exists. */
  coverage: number | null;
  status: CoverageStatus;
};

function pointsFor(metric: string) {
  const m = new Map<string, number>();
  for (const ds of DATASETS) {
    for (const p of ds.points) {
      if (p.metric === metric && p.geo.level === "state") {
        m.set(p.geo.code, p.value);
      }
    }
  }
  return m;
}

/**
 * Every state with a known centroid, classified by how much is actually
 * published about it. Three states of knowledge, not two: a published
 * population with no coverage figure is a different problem from a state
 * nobody has counted at all.
 */
export function stateCoverage(): StateCoverage[] {
  const pop = pointsFor("dog_population");
  const abc = pointsFor("abc_coverage");

  return STATES.flatMap((s) => {
    const at = STATE_CENTROIDS[s.code];
    if (!at) return [];
    const p = pop.get(s.code) ?? null;
    const a = abc.get(s.code);
    const coverage = a === undefined ? null : a / 100;
    const status: CoverageStatus =
      coverage !== null ? "measured" : p !== null ? "population-only" : "unmeasured";
    return [{
      code: s.code,
      name: s.name,
      lat: at.lat,
      lng: at.lng,
      population: p,
      coverage,
      status,
    }];
  });
}

export const STATUS_META: Record<
  CoverageStatus,
  { label: string; colour: string; note: string }
> = {
  measured: {
    label: "Coverage published",
    colour: "#4cbe87",
    note: "An ABC coverage figure exists for this state.",
  },
  "population-only": {
    label: "Population only",
    colour: "#e8b64c",
    note: "A dog population is published, but no sterilisation coverage.",
  },
  unmeasured: {
    label: "Nothing published",
    colour: "#f05b40",
    note: "Neither a population nor a coverage figure has been published.",
  },
};
