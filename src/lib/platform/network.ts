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

export type Objective = "sterilisation" | "vaccination" | "survey";

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
  /* No per-ward or per-animal cost for street-dog enumeration is published
     anywhere in India. Cities run these surveys — Bengaluru through BBMP,
     Ahmedabad across its 48 wards — but none publishes what one costs. A zero
     here means "not published", and the tool says so rather than guessing:
     inventing this number would undermine every other figure on the page. */
  survey: {
    value: 0,
    unit: "not published",
    year: 2026,
    source:
      "No published unit cost for street-dog enumeration in India. Municipal censuses (BBMP Bengaluru; Amdavad Municipal Corporation, 48 wards) report findings but not programme cost",
    confidence: "low",
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
  survey: {
    label: "Baseline survey only",
    question: "What would it take just to find out what is there?",
    verb: "enumerate",
  },
};

/* ── What is NOT known ──────────────────────────────────────────── */

/**
 * Why a question is unanswered. The distinction matters commercially: a
 * number nobody has ever measured needs funding a study. A number that
 * exists in a filing cabinet needs someone to go and get it — which is
 * cheaper, faster, and mostly unglamorous work nobody is doing.
 */
export type AccessBarrier =
  /** No one has measured it, anywhere, at any geography. */
  | "never-measured"
  /** A body collects or holds it, but does not publish it. */
  | "held-not-published"
  /** Published, but at a resolution or in a format that cannot be used. */
  | "published-unusable";

export const BARRIER_META: Record<
  AccessBarrier,
  { label: string; short: string; tone: string }
> = {
  "never-measured": {
    label: "Never measured",
    short: "Needs a study",
    tone: "#ff6a4f",
  },
  "held-not-published": {
    label: "Held, not published",
    short: "Needs disclosure",
    tone: "#a68cff",
  },
  "published-unusable": {
    label: "Published, unusable",
    short: "Needs restructuring",
    tone: "#66c5d5",
  },
};

export type UnknownFact = {
  id: string;
  question: string;
  barrier: AccessBarrier;
  /** Named body that holds or would hold the data. Null when nobody does. */
  heldBy: string | null;
  why: string;
  /** What exists today in place of an answer. */
  bestAvailable: string;
  /** What would have to happen to answer it. */
  resolvedBy: string;
};

/**
 * Real evidence gaps.
 *
 * Note the `barrier` field. Only some of these are unanswered because nobody
 * ever measured them. Several are unanswered because a named body collects
 * the data and does not release it, or releases it in a form that cannot be
 * used. Those are a different problem with a different, cheaper fix — and
 * they are the ones most often mistaken for "no data exists".
 *
 * Claims here are limited to what is publicly retrievable. Where a body is
 * named as holding data, that is because a statutory duty or a published
 * programme implies they hold it, not because the file has been seen.
 */
export const UNKNOWNS: UnknownFact[] = [
  {
    id: "ward-distribution",
    question: "Where within Delhi are the animals?",
    barrier: "published-unusable",
    heldBy: "Municipal corporations of Delhi; survey implementing agency",
    why: "The 2022-23 survey produced a city total, and a total is the one resolution at which the number is useless for deployment. Fieldwork of this kind is collected in enumeration blocks — the granular data existed at some point in the process. What reached the public was the sum.",
    bestAvailable: "One city-wide figure of roughly 10 lakh community dogs.",
    resolvedBy:
      "Release of the survey's block-level counts, or a fresh ward-level census with a documented sampling method.",
  },
  {
    id: "abc-programme-output",
    question: "How many sterilisations did each municipal ABC programme perform?",
    barrier: "held-not-published",
    heldBy: "Municipal corporations; AWBI-recognised ABC centres; state monitoring committees",
    why: "ABC programmes run on public money against tendered contracts, and the ABC (Dogs) Rules 2023 require local authorities to constitute monitoring committees and maintain programme records. Those records are not proactively published, so the public cannot reconcile spend against surgeries.",
    bestAvailable:
      "Occasional aggregate claims in press statements, with no verifiable underlying record.",
    resolvedBy:
      "Proactive disclosure of monitoring-committee returns — the data already exists in a reportable form.",
  },
  {
    id: "vaccination-coverage",
    question: "What share of Delhi's dogs are vaccinated against rabies?",
    barrier: "held-not-published",
    heldBy: "Bodies running ARV drives — municipal, state and NGO",
    why: "Vaccination drives happen and are counted by whoever runs them. What does not exist is a shared register, so several partial counts sit with several organisations and nobody can state a coverage figure for the city.",
    bestAvailable:
      "Sterilisation coverage of about 45%, which is not a proxy for vaccination.",
    resolvedBy:
      "A common register across the bodies already counting, or a coverage survey to establish a baseline independently.",
  },
  {
    id: "bite-surveillance",
    question: "Where do animal bites actually happen?",
    barrier: "published-unusable",
    heldBy: "Hospitals and ARV clinics; NCDC surveillance reporting",
    why: "Bite cases are recorded at the point of treatment — that is how anti-rabies vaccine gets administered and stocked. The records exist patient by patient, but what surfaces publicly is state or national aggregate. The reported-versus-modelled rabies death gap is the clearest symptom of what passive surveillance misses.",
    bestAvailable:
      "National and state totals, with a reported-to-modelled death gap of roughly two orders of magnitude.",
    resolvedBy:
      "Geographic release of bite-incidence data at district or ward level, anonymised.",
  },
  {
    id: "medical-need",
    question: "How many animals need treatment in a given year?",
    barrier: "never-measured",
    heldBy: null,
    why: "No published figure exists for injury, disease or mange prevalence in India's street-dog population at any geography. This one genuinely has not been measured — there is no filing cabinet to open.",
    bestAvailable: "Nothing published.",
    resolvedBy:
      "A field health-assessment study with a defined case definition and a stated sampling frame.",
  },
  {
    id: "outcome-persistence",
    question: "Do sterilisation gains hold over time?",
    barrier: "never-measured",
    heldBy: null,
    why: "Coverage gets measured once, when a programme wants a number. Nobody funds the second measurement, so there is no public evidence on whether a district holds coverage or slips back — and therefore no way to tell a durable intervention from a temporary one.",
    bestAvailable: "Single-point coverage figures with no follow-up.",
    resolvedBy:
      "Repeat measurement in the same geography on a fixed interval. Cheap relative to the first survey; almost never commissioned.",
  },
];

/** Counts by barrier, for the summary strip. */
export function barrierCounts() {
  return {
    neverMeasured: UNKNOWNS.filter((u) => u.barrier === "never-measured").length,
    withheld: UNKNOWNS.filter((u) => u.barrier !== "never-measured").length,
    total: UNKNOWNS.length,
  };
}

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
  // Enumeration is walked transects, not surgery — far faster per animal.
  survey: 2400,
};

/**
 * Scales the real, published city-wide figures down to a share of Delhi.
 * It does NOT claim to know how animals are distributed — `scope` is an
 * explicit user input, and the UI says so.
 */
/** The geography a plan is being costed for. Both figures must be real and
 *  sourced; `coverage` is null wherever no ABC baseline has been published,
 *  which is most of the country. */
export type PlanGeography = {
  code: string;
  name: string;
  population: number;
  populationSource: string;
  populationYear: number;
  coverage: number | null;
  coverageSource: string | null;
};

export function whatWouldItTake(
  objective: Objective,
  scope = 1,
  teams = 2,
  geo?: PlanGeography
): Plan {
  const basePopulation = geo ? geo.population : DELHI_POPULATION.value;
  const population = Math.round(basePopulation * scope);
  const target = COVERAGE_TARGET.value;

  // A plan can only subtract a baseline that someone has actually published.
  // Vaccination has none anywhere, and most states have no ABC figure either,
  // so those plans assume zero and say plainly that they are doing so.
  const publishedCoverage = geo
    ? geo.coverage
    : DELHI_ABC_COVERAGE.value;
  const baselineUnknown =
    objective === "vaccination" || publishedCoverage === null;
  const coverageNow = baselineUnknown ? 0 : (publishedCoverage as number);

  /* A survey enumerates everything in scope; the other objectives only treat
     the share needed to close the coverage gap. */
  const animals =
    objective === "survey"
      ? population
      : Math.max(0, Math.round(population * (target - coverageNow)));
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
