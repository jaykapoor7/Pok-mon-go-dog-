import type { Dataset, DataPoint, SourceType, Confidence } from "./types";
import { STATE_BY_CODE } from "./geography";

// ════════════════════════════════════════════════════════════════
// SAMPLE datasets. These are illustrative — realistic in STRUCTURE and shape,
// but the per-geography values are sample figures, not official statistics.
// Everything here is flagged `sample: true` and rendered with a "Sample" badge.
// Real datasets (livestock census, state ABC reports, WHO/NCDC rabies data,
// research studies) can be normalized into exactly this shape and dropped in.
// ════════════════════════════════════════════════════════════════

function pt(
  code: string, metric: string, value: number, unit: string, year: number,
  sourceType: SourceType, source: string, opts: { confidence?: Confidence; note?: string } = {}
): DataPoint {
  const geo = STATE_BY_CODE.get(code) ?? { level: "state" as const, code, name: code, parent: "IN" };
  return { metric, value, unit, geo, year, sourceType, source, sample: true, ...opts };
}

// Rows: [stateCode, population, abc%, arv%, rabiesDeaths, ngoCount]. States not
// listed have NO data for these metrics — an intentional, visible data gap.
const ROWS: [string, number | null, number | null, number | null, number | null, number | null][] = [
  ["IN-MH", 1_600_000, 42, 30, 90, 210],
  ["IN-TN", 950_000, 55, 46, 40, 160],
  ["IN-KA", 900_000, 48, 38, 55, 140],
  ["IN-DL", 320_000, 60, 52, 15, 95],
  ["IN-KL", 600_000, 38, 44, 30, 120],
  ["IN-WB", 1_400_000, 22, 18, 120, 70],
  ["IN-UP", 2_300_000, 12, 9, 260, 55],
  ["IN-RJ", 1_100_000, 18, 14, 140, 40],
  ["IN-GJ", 1_000_000, 35, 27, 60, 90],
  ["IN-TG", 700_000, 44, 33, 45, 85],
  ["IN-BR", 1_500_000, 8, 6, 210, 25],
  ["IN-MP", 1_300_000, 15, 11, 160, 45],
  ["IN-PB", 500_000, 28, 22, 50, 60],
  ["IN-OR", 800_000, 20, 16, 95, 35],
];

const YEAR = 2023;

export const DATASETS: Dataset[] = [
  {
    id: "dog-population-2023",
    title: "Street-dog population (estimate)",
    metric: "dog_population",
    description: "Estimated free-roaming dog population by state. Population figures are typically modelled from census and survey data.",
    sourceType: "estimate",
    source: "Sample — modelled from census/survey structure",
    year: YEAR,
    resolution: "state",
    sample: true,
    points: ROWS.filter((r) => r[1] != null).map((r) => pt(r[0], "dog_population", r[1]!, "dogs", YEAR, "estimate", "Sample estimate", { confidence: "low" })),
  },
  {
    id: "abc-coverage-2023",
    title: "Sterilisation (ABC) coverage",
    metric: "abc_coverage",
    description: "Share of the free-roaming dog population sterilised under Animal Birth Control programmes.",
    sourceType: "government",
    source: "Sample — structured like state ABC programme reporting",
    year: YEAR,
    resolution: "state",
    sample: true,
    points: ROWS.filter((r) => r[2] != null).map((r) => pt(r[0], "abc_coverage", r[2]!, "%", YEAR, "government", "Sample (ABC report structure)", { confidence: "medium" })),
  },
  {
    id: "arv-coverage-2023",
    title: "Anti-rabies vaccination coverage",
    metric: "arv_coverage",
    description: "Share of dogs vaccinated against rabies. Central to India's rabies-elimination goal.",
    sourceType: "government",
    source: "Sample (vaccination drive structure)",
    year: YEAR,
    resolution: "state",
    sample: true,
    points: ROWS.filter((r) => r[3] != null).map((r) => pt(r[0], "arv_coverage", r[3]!, "%", YEAR, "government", "Sample (vaccination structure)", { confidence: "low" })),
  },
  {
    id: "human-rabies-deaths-2023",
    title: "Human rabies deaths (reported)",
    metric: "human_rabies_deaths",
    description: "Annual human rabies deaths. Widely acknowledged to be under-reported.",
    sourceType: "research",
    source: "Sample (surveillance/study structure)",
    year: YEAR,
    resolution: "state",
    sample: true,
    points: ROWS.filter((r) => r[4] != null).map((r) => pt(r[0], "human_rabies_deaths", r[4]!, "deaths/yr", YEAR, "research", "Sample (study structure)", { confidence: "low", note: "Under-reporting likely." })),
  },
  {
    id: "ngo-presence-2023",
    title: "Registered welfare organisations",
    metric: "ngo_presence",
    description: "Animal-welfare organisations known to operate in each state.",
    sourceType: "ngo",
    source: "Sample (directory structure)",
    year: YEAR,
    resolution: "state",
    sample: true,
    points: ROWS.filter((r) => r[5] != null).map((r) => pt(r[0], "ngo_presence", r[5]!, "count", YEAR, "ngo", "Sample directory", { confidence: "medium" })),
  },
];

export const DATASET_BY_METRIC = new Map(DATASETS.map((d) => [d.metric, d]));

// ── Queries ─────────────────────────────────────────────────────
export function pointsForMetric(metric: string): DataPoint[] {
  return DATASET_BY_METRIC.get(metric)?.points ?? [];
}

export function stateValue(metric: string, code: string): DataPoint | null {
  return pointsForMetric(metric).find((p) => p.geo.code === code) ?? null;
}

/** States with a value for `metric`, ranked; nulls (no data) reported separately. */
export function ranked(metric: string, dir: "asc" | "desc" = "desc") {
  const pts = [...pointsForMetric(metric)];
  pts.sort((a, b) => (dir === "desc" ? b.value - a.value : a.value - b.value));
  return pts;
}

/** How many of the 28 states/UTs have any value for a metric (a data-gap view). */
export function coverageOf(metric: string): { withData: number; total: number } {
  const total = 28;
  return { withData: pointsForMetric(metric).length, total };
}

export function nationalRollup(metric: string): { sum: number; mean: number; n: number } {
  const pts = pointsForMetric(metric);
  const sum = pts.reduce((a, p) => a + p.value, 0);
  return { sum, mean: pts.length ? sum / pts.length : 0, n: pts.length };
}
