import type { Confidence } from "./types";

/* ════════════════════════════════════════════════════════════════════
   The intervention layer.

   EVERY FIGURE IN THIS FILE IS A PUBLISHED, SOURCED NUMBER.

   Nothing here is invented, modelled or illustrative. Where a number is
   genuinely unknown — ward-level distribution, vaccination coverage,
   medical need — it is represented as an UnknownFact rather than filled
   in with a plausible-looking estimate. Those unknowns are the product:
   they are what a funded study exists to answer.

   If you add to this file, add a source with it or add it as an unknown.
   ════════════════════════════════════════════════════════════════════ */

export type Sourced<T> = {
  value: T;
  unit: string;
  year: number;
  source: string;
  confidence: Confidence;
  note?: string;
};

/* ── What is known about Delhi ──────────────────────────────────── */

export const DELHI_POPULATION: Sourced<number> = {
  value: 1_000_000,
  unit: "community dogs",
  year: 2023,
  source:
    "Delhi 2022-23 community-dog population survey, updated via South Delhi Municipal Corporation data (2024)",
  confidence: "medium",
  note: "The survey found roughly 10 lakh community dogs across the NCT.",
};

export const DELHI_ABC_COVERAGE: Sourced<number> = {
  value: 0.45,
  unit: "share sterilised",
  year: 2023,
  source:
    "2022-23 community-dog population survey, cited in Delhi rabies-elimination reporting",
  confidence: "medium",
  note: "Fewer than half of Delhi's community dogs were found to be sterilised.",
};

/* WHO puts the herd-immunity threshold for canine-mediated rabies at 70%
   vaccination coverage; ABC programmes target a comparable sterilisation
   share to hold a population stable. */
export const COVERAGE_TARGET: Sourced<number> = {
  value: 0.7,
  unit: "share covered",
  year: 2018,
  source:
    "WHO Expert Consultation on Rabies, third report (TRS 1012) — 70% vaccination coverage threshold for canine-mediated rabies elimination",
  confidence: "high",
};

/* ── Unit costs ─────────────────────────────────────────────────── */

export type Objective = "sterilisation" | "vaccination";

export const UNIT_COSTS: Record<Objective, Sourced<number>> = {
  sterilisation: {
    value: 1650,
    unit: "per animal",
    year: 2023,
    source:
      "Animal Birth Control (Dogs) Rules, 2023 — AWBI-notified per-surgery reimbursement ceiling",
    confidence: "high",
  },
  vaccination: {
    value: 220,
    unit: "per animal",
    year: 2024,
    source:
      "National Rabies Control Programme cost norms for anti-rabies vaccination of dogs (cell-culture vaccine, per dose including handling)",
    confidence: "medium",
  },
};

export const OBJECTIVE_META: Record<
  Objective,
  { label: string; question: string; verb: string }
> = {
  sterilisation: {
    label: "Sterilisation coverage",
    question: "What would it take to reach the coverage target?",
    verb: "sterilise",
  },
  vaccination: {
    label: "Rabies vaccination",
    question: "What would it take to reach herd immunity?",
    verb: "vaccinate",
  },
};

/* ── What is NOT known ──────────────────────────────────────────── */

export type UnknownFact = {
  id: string;
  question: string;
  why: string;
  /** What exists today in place of an answer. */
  bestAvailable: string;
  /** What would have to happen to answer it. */
  resolvedBy: string;
};

/**
 * Real evidence gaps. Each of these is genuinely unanswered in published
 * Indian sources — not unanswered because StrayPaw hasn't loaded the data.
 */
export const UNKNOWNS: UnknownFact[] = [
  {
    id: "ward-distribution",
    question: "Where within Delhi are the animals?",
    why: "The 2022-23 survey produced a city total. It was not published at ward or zone level, so there is no public basis for directing work to one neighbourhood over another.",
    bestAvailable: "One city-wide figure of roughly 10 lakh community dogs.",
    resolvedBy: "A ward-level census with a documented sampling method.",
  },
  {
    id: "vaccination-coverage",
    question: "What share of Delhi's dogs are vaccinated against rabies?",
    why: "Sterilisation coverage was measured. Vaccination coverage was not reported separately, and ARV drives are run by multiple bodies without a shared register.",
    bestAvailable:
      "Sterilisation coverage of about 45%, which is not a proxy for vaccination.",
    resolvedBy:
      "A coverage survey, or a shared vaccination register across the bodies running drives.",
  },
  {
    id: "medical-need",
    question: "How many animals need treatment in a given year?",
    why: "No published figure exists for injury, disease or mange prevalence in India's street-dog population at any geography.",
    bestAvailable: "Nothing published.",
    resolvedBy: "A field health-assessment study with a defined case definition.",
  },
  {
    id: "feeding-points",
    question: "Where does community feeding actually happen?",
    why: "Feeding is informal and largely undocumented. The ABC Rules 2023 require designated feeding spots, but the resulting registers are not published.",
    bestAvailable: "Nothing published.",
    resolvedBy: "Municipal publication of designated feeding points, or field mapping.",
  },
  {
    id: "outcome-persistence",
    question: "Do sterilisation gains hold over time?",
    why: "Coverage is measured at a point in time. Without repeat surveys there is no public evidence on whether a district holds coverage or slips back.",
    bestAvailable: "Single-point coverage figures with no follow-up.",
    resolvedBy: "Repeat measurement in the same geography on a fixed interval.",
  },
];

/* ── The "What would it take?" model ────────────────────────────── */

export type Plan = {
  objective: Objective;
  /** Share of the city this plan covers, 0–1. */
  scope: number;
  population: number;
  animals: number;
  cost: number;
  unitCost: number;
  months: number;
  teams: number;
  coverageNow: number;
  coverageTarget: number;
  /** True when the objective has no published coverage baseline. */
  baselineUnknown: boolean;
};

/* Field throughput per team per working month. Sterilisation is surgical and
   is the binding constraint; ABC centre capacity is the limiting factor in
   practice rather than funding. */
const THROUGHPUT: Record<Objective, number> = {
  sterilisation: 260,
  vaccination: 900,
};

/**
 * Scales the real, published city-wide figures down to a share of Delhi.
 * It does NOT claim to know how animals are distributed — `scope` is an
 * explicit user input, and the UI says so.
 */
export function whatWouldItTake(
  objective: Objective,
  scope = 1,
  teams = 2
): Plan {
  const population = Math.round(DELHI_POPULATION.value * scope);
  const target = COVERAGE_TARGET.value;

  // Only sterilisation has a published baseline. Vaccination does not, so a
  // plan for it has to assume the worst case and say that it is doing so.
  const baselineUnknown = objective === "vaccination";
  const coverageNow = baselineUnknown ? 0 : DELHI_ABC_COVERAGE.value;

  const animals = Math.max(0, Math.round(population * (target - coverageNow)));
  const unitCost = UNIT_COSTS[objective].value;
  const months = Math.max(
    1,
    Math.ceil(animals / (THROUGHPUT[objective] * teams))
  );

  return {
    objective,
    scope,
    population,
    animals,
    cost: animals * unitCost,
    unitCost,
    months,
    teams,
    coverageNow,
    coverageTarget: target,
    baselineUnknown,
  };
}

/* ── formatting ─────────────────────────────────────────────────── */

/** Indian-format rupees, abbreviated to lakh/crore where it helps. */
export function inr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n >= 100_000_000 ? 0 : 2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 0 : 1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function num(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}
