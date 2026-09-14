import type { Dataset, DataPoint, SourceType, Confidence } from "./types";
import { STATE_BY_CODE, STATES, INDIA } from "./geography";
import { orgCounts } from "./orgs";

// Real data. Every point is a published figure with a named source, year,
// and confidence level. The geography is India's 28 states and 8 union
// territories. Dog bites and suspected rabies deaths are published for
// every one of the 36; population comes from the 2019 census; ABC and ARV
// coverage stay sparse because India genuinely does not publish
// comprehensive state-wise coverage for them.

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
// WHAT IS ACTUALLY PUBLISHED. The Department of Animal Husbandry &
// Dairying publishes one hard number for street dogs: the national total
// from the 20th Livestock Census (2019), 153 lakh. It does not publish an
// accessible state-wise table of that count, and no department publishes
// a 2025 state-wise figure at all.
//
// This block used to carry 2025 state figures attributed to "NAPRE
// state-level reporting". NAPRE is a rabies-elimination action plan; it
// does not publish state dog populations, and the numbers could not be
// traced to any table. They are gone. What stands below is the 2019
// census, the year it was taken, with the compilation named, and marked
// low confidence throughout — which is what the evidence actually
// supports. Tamil Nadu is absent because no figure for it appears in the
// compiled census tables, and a blank is the truthful thing to draw.
const CENSUS_SOURCE = "20th Livestock Census (2019), Department of Animal Husbandry & Dairying; state figures as compiled in public reporting of the census tables";
const POPULATION_POINTS: DataPoint[] = [
  pt("IN-UP", "dog_population", 2_060_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-OR", "dog_population", 1_730_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-MH", "dog_population", 1_280_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-RJ", "dog_population", 1_000_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low", note: "Published only as \"above 10 lakh\"; no exact state figure appears in an accessible table." }),
  pt("IN-KA", "dog_population", 1_000_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low", note: "Published only as \"above 10 lakh\"; no exact state figure appears in an accessible table." }),
  pt("IN-WB", "dog_population", 1_000_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low", note: "Published only as \"above 10 lakh\"; no exact state figure appears in an accessible table." }),
  pt("IN-MP", "dog_population", 1_000_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low", note: "Published only as \"above 10 lakh\"; no exact state figure appears in an accessible table." }),
  pt("IN-AP", "dog_population", 860_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-GJ", "dog_population", 850_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-BR", "dog_population", 800_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-DL", "dog_population", 550_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-PB", "dog_population", 520_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-TG", "dog_population", 450_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-KL", "dog_population", 350_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-HR", "dog_population", 320_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-JH", "dog_population", 300_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-CT", "dog_population", 280_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-AS", "dog_population", 250_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-UT", "dog_population", 150_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-HP", "dog_population", 120_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-JK", "dog_population", 100_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-TR", "dog_population", 80_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-MN", "dog_population", 50_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-ML", "dog_population", 40_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-GA", "dog_population", 30_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-AR", "dog_population", 20_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-MZ", "dog_population", 7_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-NL", "dog_population", 7_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-SK", "dog_population", 5_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-PY", "dog_population", 4_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-CH", "dog_population", 3_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-AN", "dog_population", 2_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-DH", "dog_population", 1_500, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-LA", "dog_population", 1_000, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
  pt("IN-LD", "dog_population", 500, "dogs", 2019, "government", CENSUS_SOURCE, { confidence: "low" }),
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

// ── Human rabies deaths, and dog bites ──────────────────────────
// Both of these ARE published per state, every state and union territory,
// by the Ministry of Health and Family Welfare through the IDSP-IHIP
// portal, and tabled in Parliament. The site previously said no citable
// state-wise table existed and left the metric empty nationally. It does
// exist; it is below, transcribed from the annexures and checked against
// the totals printed in the same document (37,15,713 bites and 54 deaths
// for 2024, both reconcile exactly).
//
// The deaths figure is SUSPECTED rabies deaths caught by passive
// surveillance. It is not the disease burden: modelling puts that near
// 19,000 a year. Both numbers are kept, and the distance between them is
// the point rather than an embarrassment to hide.
const BITE_SOURCE = "Dog bite cases reported by states and UTs on the IDSP-IHIP portal, Ministry of Health and Family Welfare; tabled as Annexure-I to the Ministry of Fisheries, Animal Husbandry & Dairying reply \"Stray Dogs\", 1 April 2025 (PIB)";
const DEATH_SOURCE = "Suspected human rabies deaths reported by states and UTs on the IDSP-IHIP portal, Ministry of Health and Family Welfare; tabled as Annexure-II to the Ministry of Fisheries, Animal Husbandry & Dairying reply \"Stray Dogs\", 1 April 2025 (PIB)";

const BITE_POINTS: DataPoint[] = [
pt("IN-MH", "dog_bites", 485345, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TN", "dog_bites", 480427, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-GJ", "dog_bites", 392837, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-KA", "dog_bites", 361494, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-BR", "dog_bites", 263930, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AP", "dog_bites", 245174, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-OR", "dog_bites", 166792, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AS", "dog_bites", 166232, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-UP", "dog_bites", 164009, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MP", "dog_bites", 142948, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-RJ", "dog_bites", 140543, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TG", "dog_bites", 121997, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-KL", "dog_bites", 115046, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-WB", "dog_bites", 76486, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-HR", "dog_bites", 60417, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-JK", "dog_bites", 51027, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-JH", "dog_bites", 43874, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-CT", "dog_bites", 38268, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-DL", "dog_bites", 25210, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-UT", "dog_bites", 23091, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-PB", "dog_bites", 22912, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-HP", "dog_bites", 22909, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-ML", "dog_bites", 17784, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-GA", "dog_bites", 17236, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-PY", "dog_bites", 12148, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TR", "dog_bites", 9641, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MN", "dog_bites", 9257, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-CH", "dog_bites", 8644, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-SK", "dog_bites", 8601, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-DH", "dog_bites", 7926, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AR", "dog_bites", 6388, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-LA", "dog_bites", 4078, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MZ", "dog_bites", 1873, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-NL", "dog_bites", 714, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AN", "dog_bites", 455, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-LD", "dog_bites", 0, "cases", 2024, "government", BITE_SOURCE, { confidence: "high" }),
pt("IN-MH", "dog_bites", 393020, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MH", "dog_bites", 472790, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TN", "dog_bites", 364435, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TN", "dog_bites", 441796, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-GJ", "dog_bites", 169363, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-GJ", "dog_bites", 278537, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-KA", "dog_bites", 163356, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-KA", "dog_bites", 232715, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-BR", "dog_bites", 141926, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-BR", "dog_bites", 241827, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AP", "dog_bites", 192360, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AP", "dog_bites", 212146, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-OR", "dog_bites", 65396, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-OR", "dog_bites", 92848, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AS", "dog_bites", 39919, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AS", "dog_bites", 94945, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-UP", "dog_bites", 191361, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-UP", "dog_bites", 229921, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MP", "dog_bites", 66018, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MP", "dog_bites", 113499, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-RJ", "dog_bites", 88029, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-RJ", "dog_bites", 103533, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TG", "dog_bites", 92924, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TG", "dog_bites", 119014, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-KL", "dog_bites", 4000, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-KL", "dog_bites", 71606, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-WB", "dog_bites", 22627, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-WB", "dog_bites", 48664, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-HR", "dog_bites", 35837, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-HR", "dog_bites", 42690, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-JK", "dog_bites", 22110, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-JK", "dog_bites", 34664, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-JH", "dog_bites", 9539, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-JH", "dog_bites", 31251, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-CT", "dog_bites", 21365, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-CT", "dog_bites", 29221, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-DL", "dog_bites", 6691, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-DL", "dog_bites", 17874, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-UT", "dog_bites", 15649, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-UT", "dog_bites", 25623, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-PB", "dog_bites", 15519, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-PB", "dog_bites", 18680, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-HP", "dog_bites", 15935, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-HP", "dog_bites", 21096, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-ML", "dog_bites", 5302, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-ML", "dog_bites", 9611, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-GA", "dog_bites", 8057, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-GA", "dog_bites", 11904, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-PY", "dog_bites", 11937, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-PY", "dog_bites", 13006, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TR", "dog_bites", 3051, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-TR", "dog_bites", 6510, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MN", "dog_bites", 4450, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MN", "dog_bites", 2964, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-CH", "dog_bites", 5365, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-CH", "dog_bites", 11782, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-SK", "dog_bites", 3845, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-SK", "dog_bites", 6636, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-DH", "dog_bites", 4169, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-DH", "dog_bites", 5921, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AR", "dog_bites", 2501, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AR", "dog_bites", 4409, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-LA", "dog_bites", 2165, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-LA", "dog_bites", 2569, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MZ", "dog_bites", 891, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-MZ", "dog_bites", 1141, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-NL", "dog_bites", 452, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-NL", "dog_bites", 600, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AN", "dog_bites", 345, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-AN", "dog_bites", 528, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-LD", "dog_bites", 0, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
  pt("IN-LD", "dog_bites", 0, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
];

const RABIES_STATE_POINTS: DataPoint[] = [
pt("IN-MH", "human_rabies_deaths", 14, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-MP", "human_rabies_deaths", 6, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-UP", "human_rabies_deaths", 6, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-KA", "human_rabies_deaths", 5, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-ML", "human_rabies_deaths", 4, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-HP", "human_rabies_deaths", 3, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-KL", "human_rabies_deaths", 3, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-BR", "human_rabies_deaths", 2, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-MN", "human_rabies_deaths", 2, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-TN", "human_rabies_deaths", 2, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-AP", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-AR", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-AS", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-GJ", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-JH", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-TR", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-WB", "human_rabies_deaths", 1, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-AN", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-CH", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-CT", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-DL", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-DH", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-GA", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-HR", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-JK", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-LA", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-LD", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-MZ", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-NL", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-OR", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-PY", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-PB", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-RJ", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-SK", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-TG", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
  pt("IN-UT", "human_rabies_deaths", 0, "deaths/yr", 2024, "government", DEATH_SOURCE, { confidence: "high" }),
];
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
    id: "dog-population-census-2019",
    title: "Street-dog population",
    metric: "dog_population",
    description: "Free-roaming dog population by state and union territory, from the 20th Livestock Census (2019). This is the last enumeration India has. Where the compiled census tables carry no figure for a state, the row is blank rather than filled in.",
    sourceType: "government",
    source: CENSUS_SOURCE,
    year: 2019,
    resolution: "state",
    sample: false,
    points: POPULATION_POINTS,
    national: [
      nat("dog_population", 15_300_000, "dogs", 2019, "government", "20th Livestock Census (2019), Department of Animal Husbandry & Dairying, as stated in Parliament: 153 lakh stray dogs", { confidence: "high", note: "The only enumerated national figure. It is widely held to be an undercount, because the census reaches rural households better than it reaches cities. It is printed because it is the one number with a census behind it." }),
    ],
  },
  {
    id: "dog-bites-idsp",
    title: "Dog bite cases reported",
    metric: "dog_bites",
    description: "Dog bite cases reported by every state and union territory on the health ministry's IDSP-IHIP portal. Complete national coverage, three years running, and the one street-animal metric India measures the same way everywhere.",
    sourceType: "government",
    source: BITE_SOURCE,
    year: 2024,
    resolution: "state",
    sample: false,
    points: BITE_POINTS,
    national: [
      nat("dog_bites", 3_715_713, "cases", 2024, "government", BITE_SOURCE, { confidence: "high", note: "Up from 21,89,909 in 2022. Part of that rise is more bites and part is better reporting; the annexure does not separate the two." }),
      nat("dog_bites", 3_052_521, "cases", 2023, "government", BITE_SOURCE, { confidence: "high" }),
      nat("dog_bites", 2_189_909, "cases", 2022, "government", BITE_SOURCE, { confidence: "high" }),
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
    source: DEATH_SOURCE,
    year: 2024,
    resolution: "state",
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

/** How many of the 36 states and union territories have any value for a
    metric (a data-gap view). */
export function coverageOf(metric: string): { withData: number; total: number } {
  /* 29 was hardcoded here, and it was the denominator on /explore and
     /insights while everything else counted the real geography — which is
     how the site came to say "35 / 29 states". It is the length of the
     list, so it moves when the list does.

     withData counted POINTS, not places. Dog bites carry three years per
     state, so that number was about to read 108 of 36. Distinct codes. */
  const total = STATES.length;
  const withData = new Set(
    pointsForMetric(metric)
      .filter((p) => p.geo.level === "state")
      .map((p) => p.geo.code)
  ).size;
  return { withData, total };
}

export function nationalRollup(metric: string): { sum: number; mean: number; n: number } {
  const pts = pointsForMetric(metric).filter((p) => p.geo.level === "state");
  const sum = pts.reduce((a, p) => a + p.value, 0);
  return { sum, mean: pts.length ? sum / pts.length : 0, n: pts.length };
}
