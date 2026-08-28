import type { Dataset, DataPoint, SourceType, Confidence } from "./types";
import { STATE_BY_CODE, INDIA } from "./geography";
import { orgCounts } from "./orgs";

// ════════════════════════════════════════════════════════════════
// Real data. Every point below is a genuine published figure with a named
// source, a year, and a confidence level — not sample or invented data.
//
// Where a real, verifiable figure could not be found for a state or metric,
// no point is added. Those gaps are shown, not hidden — on Explore, in the
// coverage meters on Insights, and in the "no data" states throughout the
// product. India does not currently publish comprehensive, state-wise data
// for several of these metrics (most visibly ABC and ARV coverage — the
// Supreme Court found in 2025 that only 2 of 28 states/UTs had filed
// sterilisation-compliance reports). That absence is itself one of the most
// important things this platform surfaces.
// ════════════════════════════════════════════════════════════════

function pt(
  code: string, metric: string, value: number, unit: string, year: number,
  sourceType: SourceType, source: string,
  opts: { confidence?: Confidence; note?: string } = {}
): DataPoint {
  const geo = STATE_BY_CODE.get(code) ?? { level: "state" as const, code, name: code, parent: "IN" };
  return { metric, value, unit, geo, year, sourceType, source, sample: false, ...opts };
}

function nat(
  metric: string, value: number, unit: string, year: number,
  sourceType: SourceType, source: string,
  opts: { confidence?: Confidence; note?: string } = {}
): DataPoint {
  return { metric, value, unit, geo: INDIA, year, sourceType, source, sample: false, ...opts };
}

// ── Street-dog population ──────────────────────────────────────
// Primary source: 20th Livestock Census (2019), Dept. of Animal Husbandry &
// Dairying — the last official nationwide count, reporting ~1.53 crore
// (15.3 million) stray dogs. State-level figures here are compiled from that
// census by a third-party public data analysis (not DAHD's own state table,
// which was not machine-readable at the time of writing) — marked as such
// and given medium confidence.
const CENSUS_SOURCE = "20th Livestock Census (2019), Dept. of Animal Husbandry & Dairying — state figures via public compilation";
const POPULATION_POINTS: DataPoint[] = [
  pt("IN-UP", "dog_population", 2_060_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-OR", "dog_population", 1_730_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-MH", "dog_population", 1_280_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-BR", "dog_population", 800_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-AP", "dog_population", 850_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-GJ", "dog_population", 850_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-PB", "dog_population", 520_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
  pt("IN-DL", "dog_population", 550_000, "dogs", 2019, "estimate", CENSUS_SOURCE, { confidence: "medium" }),
];

// ── Sterilisation (ABC) coverage ───────────────────────────────
// India does not publish a comprehensive, verifiable state-wise ABC coverage
// dataset. These are the only two figures with a citable source at time of
// writing — one state-level, one city-level. Every other state is a real gap.
const ABC_POINTS: DataPoint[] = [
  pt("IN-DL", "abc_coverage", 45, "%", 2023, "research", "2022–23 community-dog population survey cited in Delhi rabies-elimination reporting", {
    confidence: "medium",
    note: "Survey found fewer than half of Delhi's ~10 lakh community dogs sterilised.",
  }),
];
// City-level (not part of the 28-state ranking, shown separately on Explore).
const ABC_CITY_POINTS: DataPoint[] = [
  { metric: "abc_coverage", value: 83, unit: "%", geo: { level: "city", code: "IN-UP-LUCKNOW", name: "Lucknow", parent: "IN-UP" }, year: 2024, sourceType: "government", source: "Lucknow Municipal Corporation ABC programme performance, reported December 2024", sample: false, confidence: "medium", note: "City-level figure — not representative of Uttar Pradesh as a whole, where state-wide coverage is not published." },
];

// ── Anti-rabies vaccination (ARV) coverage ─────────────────────
// No state currently publishes a comprehensive, verifiable ARV coverage
// figure — left empty deliberately. WHO's ≥70% herd-immunity benchmark for
// breaking rabies transmission is a target, not a measured state of any
// Indian state, which is itself the finding shown on Insights.
const ARV_POINTS: DataPoint[] = [];

// ── Human rabies deaths ─────────────────────────────────────────
// No verified, current state-wise breakdown was available at time of
// writing (it exists inside NCDC/IDSP-IHIP surveillance systems but is not
// published in an accessible, citable table) — left empty. The national
// picture is where the real story is: a huge gap between passive
// surveillance and modelled disease burden.
const RABIES_STATE_POINTS: DataPoint[] = [];
const RABIES_NATIONAL_POINTS: DataPoint[] = [
  nat("human_rabies_deaths", 54, "deaths/yr", 2024, "government", "NCDC / Union Health Ministry, reported to Parliament (via Lok Sabha reply, cited July 2025)", {
    confidence: "high",
    note: "“Suspected human rabies deaths” reported through passive surveillance.",
  }),
  nat("human_rabies_deaths", 19_000, "deaths/yr", 2023, "research", "Community-based cross-sectional survey & probability decision-tree modelling (peer-reviewed, published 2024)", {
    confidence: "low",
    note: "Modelled estimate; published range is 18,000–20,000/yr. The ~350x gap between this and the 54 officially “suspected” deaths reported in 2024 is a surveillance gap, not a real decline in cases.",
  }),
];

// ── Registered welfare organisations ───────────────────────────
// Not a census — a count of the real, named organisations verified and
// listed in StrayPaw's own directory (see orgs.ts). Low confidence and
// explicitly not claimed to be comprehensive.
const NGO_SOURCE = "Count of organisations verified and listed in StrayPaw's directory — not a comprehensive registry of all AWBI-recognised bodies";
const NGO_POINTS: DataPoint[] = [...orgCounts().entries()].map(([code, count]) =>
  pt(code, "ngo_presence", count, "count", 2026, "community", NGO_SOURCE, { confidence: "low" })
);

const YEAR = 2024;

export const DATASETS: Dataset[] = [
  {
    id: "dog-population-2019",
    title: "Street-dog population",
    metric: "dog_population",
    description: "Free-roaming dog population by state, from India's last official nationwide count.",
    sourceType: "government",
    source: CENSUS_SOURCE,
    year: 2019,
    resolution: "state",
    sample: false,
    points: POPULATION_POINTS,
    national: [
      nat("dog_population", 15_300_000, "dogs", 2019, "government", "20th Livestock Census (2019), Dept. of Animal Husbandry & Dairying", { confidence: "high" }),
    ],
  },
  {
    id: "abc-coverage",
    title: "Sterilisation (ABC) coverage",
    metric: "abc_coverage",
    description: "Share of the free-roaming dog population sterilised under Animal Birth Control programmes. Comprehensive state-wise data is not currently published — most of the country is a real, documented gap.",
    sourceType: "government",
    source: "Multiple — see individual points",
    year: YEAR,
    resolution: "city",
    sample: false,
    points: [...ABC_POINTS, ...ABC_CITY_POINTS],
  },
  {
    id: "arv-coverage",
    title: "Anti-rabies vaccination coverage",
    metric: "arv_coverage",
    description: "Share of dogs vaccinated against rabies — central to India's rabies-elimination goal, and not currently tracked or published by any state in a verifiable, comparable way.",
    sourceType: "government",
    source: "No verified state-wise dataset found — documented gap",
    year: YEAR,
    resolution: "state",
    sample: false,
    points: ARV_POINTS,
  },
  {
    id: "human-rabies-deaths",
    title: "Human rabies deaths",
    metric: "human_rabies_deaths",
    description: "Annual human rabies deaths. Officially reported figures (passive surveillance) sit far below independently modelled disease-burden estimates — the gap between the two is itself the headline finding.",
    sourceType: "government",
    source: "NCDC (reported) and peer-reviewed burden modelling (estimated) — see national figures",
    year: YEAR,
    resolution: "national",
    sample: false,
    points: RABIES_STATE_POINTS,
    national: RABIES_NATIONAL_POINTS,
  },
  {
    id: "ngo-presence",
    title: "Welfare organisations (StrayPaw directory)",
    metric: "ngo_presence",
    description: "Real, named animal-welfare organisations verified and listed in StrayPaw's directory. Not a comprehensive census of every registered body — a growing, sourced list.",
    sourceType: "community",
    source: NGO_SOURCE,
    year: 2026,
    resolution: "state",
    sample: false,
    points: NGO_POINTS,
  },
];

export const DATASET_BY_METRIC = new Map(DATASETS.map((d) => [d.metric, d]));

// ── Queries ─────────────────────────────────────────────────────
export function pointsForMetric(metric: string): DataPoint[] {
  return DATASET_BY_METRIC.get(metric)?.points ?? [];
}

export function nationalPoints(metric: string): DataPoint[] {
  return DATASET_BY_METRIC.get(metric)?.national ?? [];
}

export function stateValue(metric: string, code: string): DataPoint | null {
  return pointsForMetric(metric).find((p) => p.geo.code === code) ?? null;
}

/** States with a value for `metric`, ranked; nulls (no data) reported separately. */
export function ranked(metric: string, dir: "asc" | "desc" = "desc") {
  const pts = pointsForMetric(metric).filter((p) => p.geo.level === "state");
  return [...pts].sort((a, b) => (dir === "desc" ? b.value - a.value : a.value - b.value));
}

/** How many of the 28 states/UTs have any value for a metric (a data-gap view). */
export function coverageOf(metric: string): { withData: number; total: number } {
  const total = 28;
  const withData = pointsForMetric(metric).filter((p) => p.geo.level === "state").length;
  return { withData, total };
}

export function nationalRollup(metric: string): { sum: number; mean: number; n: number } {
  const pts = pointsForMetric(metric).filter((p) => p.geo.level === "state");
  const sum = pts.reduce((a, p) => a + p.value, 0);
  return { sum, mean: pts.length ? sum / pts.length : 0, n: pts.length };
}
