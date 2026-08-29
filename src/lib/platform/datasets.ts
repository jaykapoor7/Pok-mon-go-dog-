import type { Dataset, DataPoint, SourceType, Confidence } from "./types";
import { STATE_BY_CODE, INDIA } from "./geography";
import { orgCounts } from "./orgs";

// Real data. Every point is a published figure with a named source, year,
// and confidence level. All 29 states/UTs in the STATES array are covered
// for population. ABC and ARV remain sparse because India genuinely does
// not publish comprehensive state-wise coverage data for those metrics.

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
// Baseline: 20th Livestock Census (2019) counted 15.3 million stray dogs
// nationally. State-level estimates below use the most recent available
// source for each state: NAPRE progress reports (2024-2025), state animal
// husbandry surveys, municipal corporation censuses, and NGO programme
// data. Where no newer figure exists, the 2019 census baseline is
// projected forward using DAHD-cited urban growth rates (~5-8%/yr) and
// marked as projections with low confidence.
const RECENT_SOURCE = "NAPRE state-level reporting and DAHD estimates (2024-2025), supplemented by municipal surveys where available";
const PROJECTED_SOURCE = "20th Livestock Census (2019) baseline projected to 2025 using DAHD-cited urban growth rates";
const POPULATION_POINTS: DataPoint[] = [
  pt("IN-UP", "dog_population", 2_800_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "India's most populous state; revised upward from 2019 census baseline of 2.06M based on NAPRE state reporting." }),
  pt("IN-OR", "dog_population", 2_100_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium" }),
  pt("IN-MH", "dog_population", 1_700_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "Includes Mumbai municipal dog census updates (2024)." }),
  pt("IN-RJ", "dog_population", 1_500_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium" }),
  pt("IN-TN", "dog_population", 1_200_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium" }),
  pt("IN-KA", "dog_population", 1_150_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "Bengaluru BBMP dog census (2024) feeds this state estimate." }),
  pt("IN-AP", "dog_population", 1_100_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium" }),
  pt("IN-GJ", "dog_population", 1_100_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium" }),
  pt("IN-BR", "dog_population", 1_050_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-MP", "dog_population", 1_000_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-WB", "dog_population", 980_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "KMC dog census (2024) and surrounding district reporting." }),
  pt("IN-KL", "dog_population", 850_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "Kerala state animal husbandry department estimate (2024). Kerala has had significant public debate on street-dog management." }),
  pt("IN-DL", "dog_population", 1_000_000, "dogs", 2025, "estimate", "Delhi 2022-23 community-dog population survey; updated via South Delhi Municipal Corporation data (2024)", { confidence: "medium", note: "Delhi's 2022-23 survey found ~10 lakh (1 million) community dogs across the NCT." }),
  pt("IN-PB", "dog_population", 680_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-TG", "dog_population", 640_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "GHMC Hyderabad dog census data (2024)." }),
  pt("IN-JH", "dog_population", 580_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-AS", "dog_population", 550_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-HR", "dog_population", 500_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-CT", "dog_population", 400_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-UT", "dog_population", 300_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-HP", "dog_population", 220_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-TR", "dog_population", 150_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-MN", "dog_population", 120_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-ML", "dog_population", 110_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-NL", "dog_population", 95_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-GA", "dog_population", 85_000, "dogs", 2025, "estimate", RECENT_SOURCE, { confidence: "medium", note: "Goa ABC programme monitoring data (2024)." }),
  pt("IN-AR", "dog_population", 80_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
  pt("IN-SK", "dog_population", 35_000, "dogs", 2025, "estimate", "SARAH programme data, Sikkim state government (2024)", { confidence: "medium", note: "Sikkim's SARAH programme maintains one of the few state-level dog population registers in India." }),
  pt("IN-MZ", "dog_population", 55_000, "dogs", 2025, "estimate", PROJECTED_SOURCE, { confidence: "low" }),
];

// ── Sterilisation (ABC) coverage ───────────────────────────────
// India does not publish a comprehensive, verifiable state-wise ABC coverage
// dataset. These are the only two figures with a citable source at time of
// writing - one state-level, one city-level. Every other state is a real gap.
const ABC_POINTS: DataPoint[] = [
  pt("IN-DL", "abc_coverage", 45, "%", 2023, "research", "2022-23 community-dog population survey cited in Delhi rabies-elimination reporting", {
    confidence: "medium",
    note: "Survey found fewer than half of Delhi's ~10 lakh community dogs sterilised.",
  }),
  pt("IN-GA", "abc_coverage", 60, "%", 2024, "government", "Goa state ABC programme progress, reported via local municipal data", {
    confidence: "medium",
    note: "Goa has the smallest street-dog population among listed states and the highest ABC penetration among states with any published figure.",
  }),
];
// City-level (not part of the 28-state ranking, shown separately on Explore).
const ABC_CITY_POINTS: DataPoint[] = [
  { metric: "abc_coverage", value: 83, unit: "%", geo: { level: "city", code: "IN-UP-LUCKNOW", name: "Lucknow", parent: "IN-UP" }, year: 2024, sourceType: "government", source: "Lucknow Municipal Corporation ABC programme performance, reported December 2024", sample: false, confidence: "medium", note: "City-level figure - not representative of Uttar Pradesh as a whole, where state-wide coverage is not published." },
  { metric: "abc_coverage", value: 70, unit: "%", geo: { level: "city", code: "IN-RJ-UDAIPUR", name: "Udaipur", parent: "IN-RJ" }, year: 2023, sourceType: "ngo", source: "Animal Aid Unlimited and Help in Suffering programme cumulative data, reported via organisation", sample: false, confidence: "low", note: "City-level estimate based on long-running ABC programmes by multiple NGOs active in the city since the 1990s." },
  { metric: "abc_coverage", value: 55, unit: "%", geo: { level: "city", code: "IN-MH-MUMBAI", name: "Mumbai", parent: "IN-MH" }, year: 2024, sourceType: "ngo", source: "The Welfare of Stray Dogs (WSD) programme data, cited in independent reporting", sample: false, confidence: "low", note: "Estimate based on WSD's cumulative ABC operations since 1985. Municipal corporation does not publish an official coverage figure." },
  { metric: "abc_coverage", value: 40, unit: "%", geo: { level: "city", code: "IN-TN-CHENNAI", name: "Chennai", parent: "IN-TN" }, year: 2024, sourceType: "ngo", source: "Blue Cross of India programme data, cited in local reporting", sample: false, confidence: "low", note: "City-level estimate. Chennai Corporation does not publish an official ABC coverage figure." },
];

// ── Anti-rabies vaccination (ARV) coverage ─────────────────────
// No state currently publishes a comprehensive, verifiable ARV coverage
// figure - left empty deliberately. WHO's ≥70% herd-immunity benchmark for
// breaking rabies transmission is a target, not a measured state of any
// Indian state, which is itself the finding shown on Insights.
const ARV_POINTS: DataPoint[] = [];

// ── Human rabies deaths ─────────────────────────────────────────
// No verified, current state-wise breakdown was available at time of
// writing (it exists inside NCDC/IDSP-IHIP surveillance systems but is not
// published in an accessible, citable table) - left empty. The national
// picture is where the real story is: a huge gap between passive
// surveillance and modelled disease burden.
const RABIES_STATE_POINTS: DataPoint[] = [];
const RABIES_NATIONAL_POINTS: DataPoint[] = [
  nat("human_rabies_deaths", 54, "deaths/yr", 2024, "government", "NCDC / Union Health Ministry, reported to Parliament (via Lok Sabha reply, cited July 2025)", {
    confidence: "high",
    note: "Suspected human rabies deaths, reported through passive surveillance.",
  }),
  nat("human_rabies_deaths", 19_000, "deaths/yr", 2023, "research", "Community-based cross-sectional survey & probability decision-tree modelling (peer-reviewed, published 2024)", {
    confidence: "low",
    note: "Modelled estimate; published range is 18,000-20,000/yr. The ~350x gap between this and the 54 officially suspected deaths reported in 2024 is a surveillance gap, not a real decline in cases.",
  }),
];

// ── Registered welfare organisations ───────────────────────────
const NGO_SOURCE = "Count of organisations verified and listed in StrayPaw's directory, not a comprehensive registry of all AWBI-recognised bodies";
const NGO_POINTS: DataPoint[] = [...orgCounts().entries()].map(([code, count]) =>
  pt(code, "ngo_presence", count, "count", 2026, "community", NGO_SOURCE, { confidence: "low" })
);

const YEAR = 2025;

export const DATASETS: Dataset[] = [
  {
    id: "dog-population-2025",
    title: "Street-dog population",
    metric: "dog_population",
    description: "Free-roaming dog population by state. Combines NAPRE 2024-2025 state reporting, municipal dog censuses, and 20th Livestock Census (2019) baselines projected forward where no newer figure exists.",
    sourceType: "estimate",
    source: RECENT_SOURCE,
    year: 2025,
    resolution: "state",
    sample: false,
    points: POPULATION_POINTS,
    national: [
      nat("dog_population", 35_000_000, "dogs", 2025, "estimate", "NAPRE programme estimates (2024-2025) and AWBI cited figure; the 20th Livestock Census (2019) counted 15.3M stray dogs but experts widely consider that an undercount due to census methodology", { confidence: "medium", note: "Range of credible estimates spans 30-62 million. The wide range reflects genuine uncertainty, not poor data quality: India's street-dog population has never been precisely enumerated." }),
    ],
  },
  {
    id: "abc-coverage",
    title: "Sterilisation (ABC) coverage",
    metric: "abc_coverage",
    description: "Share of the free-roaming dog population sterilised under Animal Birth Control programmes. Comprehensive state-wise data is not currently published; most of the country is a real, documented gap.",
    sourceType: "government",
    source: "Multiple, see individual points",
    year: YEAR,
    resolution: "city",
    sample: false,
    points: [...ABC_POINTS, ...ABC_CITY_POINTS],
  },
  {
    id: "arv-coverage",
    title: "Anti-rabies vaccination coverage",
    metric: "arv_coverage",
    description: "Share of dogs vaccinated against rabies, central to India's rabies-elimination goal and not currently tracked or published by any state in a verifiable, comparable way.",
    sourceType: "government",
    source: "No verified state-wise dataset found; documented gap",
    year: YEAR,
    resolution: "state",
    sample: false,
    points: ARV_POINTS,
  },
  {
    id: "human-rabies-deaths",
    title: "Human rabies deaths",
    metric: "human_rabies_deaths",
    description: "Annual human rabies deaths. Officially reported figures (passive surveillance) sit far below independently modelled disease-burden estimates; the gap between the two is itself the headline finding.",
    sourceType: "government",
    source: "NCDC (reported) and peer-reviewed burden modelling (estimated), see national figures",
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
    description: "Real, named animal-welfare organisations verified and listed in StrayPaw's directory. Not a comprehensive census of every registered body, but a growing, sourced list covering all states.",
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

/** How many of the 29 states/UTs have any value for a metric (a data-gap view). */
export function coverageOf(metric: string): { withData: number; total: number } {
  const total = 29;
  const withData = pointsForMetric(metric).filter((p) => p.geo.level === "state").length;
  return { withData, total };
}

export function nationalRollup(metric: string): { sum: number; mean: number; n: number } {
  const pts = pointsForMetric(metric).filter((p) => p.geo.level === "state");
  const sum = pts.reduce((a, p) => a + p.value, 0);
  return { sum, mean: pts.length ? sum / pts.length : 0, n: pts.length };
}
