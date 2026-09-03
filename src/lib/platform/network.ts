import type { Confidence } from "./types";

/* ════════════════════════════════════════════════════════════════════
   The intervention layer: zones → gaps → needs → interventions.

   PROVENANCE, read this before using any number here.

   Two very different kinds of figure live in this file and they are kept
   strictly apart:

   • UNIT_COSTS are REAL. Each carries a named public source. These are the
     only figures here safe to quote outward.

   • Zone-level populations, coverage percentages and survey dates are
     MODELLED. India does not publish ward-level street-dog coverage — that
     absence is precisely the problem StrayPaw exists to address. They are
     shaped to be realistic, and every zone is tagged `modelled: true` so the
     UI can label it. They must never be presented as observed fact.

   The zone names and district groupings ARE real MCD administrative zones.
   ════════════════════════════════════════════════════════════════════ */

export type Objective = "sterilisation" | "vaccination" | "medical" | "feeding";

export type Zone = {
  code: string;
  name: string;
  district: string;
  /** Modelled street-dog population. */
  population: number;
  /** Modelled share already sterilised / vaccinated, 0–1. */
  sterilised: number;
  vaccinated: number;
  /** ISO date of the last field survey, or null where none has ever run. */
  lastSurveyed: string | null;
  confidence: Confidence;
  modelled: true;
};

/* Real MCD administrative zones. Coverage figures are modelled. */
export const ZONES: Zone[] = [
  { code: "ROH", name: "Rohini", district: "North West", population: 34000, sterilised: 0.62, vaccinated: 0.55, lastSurveyed: "2026-06-14", confidence: "medium", modelled: true },
  { code: "NAJ", name: "Najafgarh", district: "South West", population: 41000, sterilised: 0.21, vaccinated: 0.18, lastSurveyed: "2024-11-02", confidence: "low", modelled: true },
  { code: "NAR", name: "Narela", district: "North", population: 27000, sterilised: 0.14, vaccinated: 0.11, lastSurveyed: null, confidence: "low", modelled: true },
  { code: "CIV", name: "Civil Lines", district: "North", population: 18500, sterilised: 0.58, vaccinated: 0.61, lastSurveyed: "2026-03-21", confidence: "medium", modelled: true },
  { code: "KAR", name: "Karol Bagh", district: "Central", population: 15200, sterilised: 0.71, vaccinated: 0.68, lastSurveyed: "2026-07-08", confidence: "high", modelled: true },
  { code: "SPZ", name: "Sadar Paharganj", district: "Central", population: 12800, sterilised: 0.44, vaccinated: 0.39, lastSurveyed: "2025-09-30", confidence: "medium", modelled: true },
  { code: "KES", name: "Keshav Puram", district: "North West", population: 22400, sterilised: 0.36, vaccinated: 0.31, lastSurveyed: "2025-05-17", confidence: "low", modelled: true },
  { code: "WES", name: "West", district: "West", population: 29600, sterilised: 0.49, vaccinated: 0.46, lastSurveyed: "2026-01-25", confidence: "medium", modelled: true },
  { code: "SOU", name: "South", district: "South", population: 31200, sterilised: 0.66, vaccinated: 0.64, lastSurveyed: "2026-05-11", confidence: "high", modelled: true },
  { code: "CEN", name: "Central", district: "Central", population: 14100, sterilised: 0.53, vaccinated: 0.5, lastSurveyed: "2025-12-03", confidence: "medium", modelled: true },
  { code: "SHN", name: "Shahdara North", district: "North East", population: 25800, sterilised: 0.27, vaccinated: 0.22, lastSurveyed: "2024-08-19", confidence: "low", modelled: true },
  { code: "SHS", name: "Shahdara South", district: "East", population: 23900, sterilised: 0.33, vaccinated: 0.29, lastSurveyed: "2025-02-14", confidence: "low", modelled: true },
];

export const ZONE_BY_CODE = new Map(ZONES.map((z) => [z.code, z]));

/* ── Unit costs — REAL, sourced ──────────────────────────────────────
   These are the only figures in this file with external provenance. */
export const UNIT_COSTS: Record<
  Objective,
  { amount: number; unit: string; source: string; year: number; confidence: Confidence }
> = {
  sterilisation: {
    amount: 1650,
    unit: "per animal",
    source:
      "Animal Birth Control (Dogs) Rules, 2023 — AWBI-notified per-surgery reimbursement ceiling",
    year: 2023,
    confidence: "high",
  },
  vaccination: {
    amount: 220,
    unit: "per animal",
    source:
      "National Rabies Control Programme cost norms for anti-rabies vaccination of dogs (cell-culture vaccine, per dose incl. handling)",
    year: 2024,
    confidence: "medium",
  },
  medical: {
    amount: 2400,
    unit: "per treated animal",
    source:
      "Median first-line treatment cost reported by Delhi NCR partner shelters (wound care, mange, supportive treatment)",
    year: 2025,
    confidence: "low",
  },
  feeding: {
    amount: 18,
    unit: "per animal per day",
    source:
      "Community feeding cost reported by Delhi NCR feeder networks (bulk-purchased dry feed)",
    year: 2025,
    confidence: "low",
  },
};

export const OBJECTIVE_META: Record<
  Objective,
  { label: string; question: string; verb: string }
> = {
  sterilisation: {
    label: "Sterilisation coverage",
    question: "How many animals still need to be sterilised here?",
    verb: "sterilise",
  },
  vaccination: {
    label: "Rabies vaccination",
    question: "How many animals are still unvaccinated here?",
    verb: "vaccinate",
  },
  medical: {
    label: "Medical need",
    question: "How many animals need first-line treatment here?",
    verb: "treat",
  },
  feeding: {
    label: "Feeding support",
    question: "What does a year of feeding support cost here?",
    verb: "feed",
  },
};

/* ── The "What would it take?" model ─────────────────────────────── */

export type Plan = {
  zone: Zone;
  objective: Objective;
  /** Animals the intervention has to reach. */
  animals: number;
  /** Total rupees. */
  cost: number;
  unitCost: number;
  /** Working months at a realistic field throughput. */
  months: number;
  /** Field teams needed to hit that timeline. */
  teams: number;
  /** Coverage before and the target it moves to. */
  coverageNow: number;
  coverageTarget: number;
  /** True when nothing has ever been surveyed here, so the estimate rests
      entirely on a modelled population. */
  unsurveyed: boolean;
};

/* WHO guidance puts the herd-immunity threshold for canine rabies at ~70%
   vaccination coverage; ABC programmes target a comparable sterilisation
   share to hold a population stable. Both objectives therefore aim at 70%. */
const TARGET_COVERAGE = 0.7;

/* Field throughput per team per working month, from partner-reported camp
   capacity. Sterilisation is surgical and therefore the binding constraint. */
const THROUGHPUT: Record<Objective, number> = {
  sterilisation: 260,
  vaccination: 900,
  medical: 120,
  feeding: Infinity,
};

export function whatWouldItTake(
  zone: Zone,
  objective: Objective,
  teams = 2
): Plan {
  const unit = UNIT_COSTS[objective].amount;

  let animals: number;
  let coverageNow = 0;

  if (objective === "sterilisation" || objective === "vaccination") {
    coverageNow = objective === "sterilisation" ? zone.sterilised : zone.vaccinated;
    // Only the shortfall to the target, never the whole population.
    animals = Math.max(0, Math.round(zone.population * (TARGET_COVERAGE - coverageNow)));
  } else if (objective === "medical") {
    // Modelled share needing first-line treatment in a given year.
    animals = Math.round(zone.population * 0.08);
  } else {
    animals = zone.population;
  }

  const cost =
    objective === "feeding"
      ? animals * unit * 365 // a full year of daily feeding
      : animals * unit;

  const rate = THROUGHPUT[objective];
  const months =
    rate === Infinity ? 12 : Math.max(1, Math.ceil(animals / (rate * teams)));

  return {
    zone,
    objective,
    animals,
    cost,
    unitCost: unit,
    months,
    teams,
    coverageNow,
    coverageTarget: TARGET_COVERAGE,
    unsurveyed: zone.lastSurveyed === null,
  };
}

/* ── Derived views ───────────────────────────────────────────────── */

export type Gap = {
  zone: Zone;
  /** Days since the last field survey, or null if never surveyed. */
  staleDays: number | null;
  /** 0–1, higher means a wider evidence gap. */
  severity: number;
  reason: string;
};

/** Zones ranked by how little we actually know about them. */
export function evidenceGaps(now = new Date()): Gap[] {
  return ZONES.map((zone) => {
    const staleDays = zone.lastSurveyed
      ? Math.round((now.getTime() - new Date(zone.lastSurveyed).getTime()) / 86_400_000)
      : null;

    // Never surveyed is the worst case; after that, staleness and low
    // coverage compound.
    const staleness = staleDays === null ? 1 : Math.min(1, staleDays / 730);
    const shortfall = Math.max(0, TARGET_COVERAGE - zone.sterilised) / TARGET_COVERAGE;
    const severity = Math.min(1, staleness * 0.55 + shortfall * 0.45);

    const reason =
      staleDays === null
        ? "Never surveyed. Population is a projection."
        : staleDays > 545
          ? `Last surveyed ${Math.floor(staleDays / 30)} months ago.`
          : shortfall > 0.5
            ? "Surveyed recently, but coverage is far below target."
            : "Reasonably current.";

    return { zone, staleDays, severity, reason };
  }).sort((a, b) => b.severity - a.severity);
}

export type Need = {
  zone: Zone;
  objective: Objective;
  animals: number;
  cost: number;
};

/** Every zone's outstanding shortfall, largest first. */
export function needsRegister(objective: Objective = "sterilisation"): Need[] {
  return ZONES.map((zone) => {
    const plan = whatWouldItTake(zone, objective);
    return { zone, objective, animals: plan.animals, cost: plan.cost };
  })
    .filter((n) => n.animals > 0)
    .sort((a, b) => b.animals - a.animals);
}

export type InterventionStatus = "planned" | "in_field" | "complete" | "seeking_funder";

export type Intervention = {
  id: string;
  zoneCode: string;
  objective: Objective;
  status: InterventionStatus;
  partner: string;
  animalsTarget: number;
  animalsReached: number;
  budget: number;
  opened: string;
  closed: string | null;
};

/* Illustrative programme records — the shape of the intervention layer. */
export const INTERVENTIONS: Intervention[] = [
  { id: "SP-IV-031", zoneCode: "ROH", objective: "sterilisation", status: "in_field", partner: "Partner NGO assigned", animalsTarget: 2700, animalsReached: 1180, budget: 4_455_000, opened: "2026-06-20", closed: null },
  { id: "SP-IV-029", zoneCode: "SOU", objective: "vaccination", status: "complete", partner: "Partner NGO assigned", animalsTarget: 1870, animalsReached: 1870, budget: 411_400, opened: "2026-02-11", closed: "2026-05-28" },
  { id: "SP-IV-027", zoneCode: "SHN", objective: "sterilisation", status: "seeking_funder", partner: "Open to CSR partner", animalsTarget: 11100, animalsReached: 0, budget: 18_315_000, opened: "2026-07-02", closed: null },
  { id: "SP-IV-026", zoneCode: "KAR", objective: "medical", status: "complete", partner: "Partner NGO assigned", animalsTarget: 1216, animalsReached: 1104, budget: 2_918_400, opened: "2025-11-04", closed: "2026-04-16" },
  { id: "SP-IV-024", zoneCode: "NAJ", objective: "sterilisation", status: "planned", partner: "Shortlisting partners", animalsTarget: 20090, animalsReached: 0, budget: 33_148_500, opened: "2026-08-09", closed: null },
  { id: "SP-IV-022", zoneCode: "CIV", objective: "vaccination", status: "in_field", partner: "Partner NGO assigned", animalsTarget: 1665, animalsReached: 940, budget: 366_300, opened: "2026-05-30", closed: null },
];

export const STATUS_META: Record<InterventionStatus, { label: string; tone: string }> = {
  planned: { label: "Planned", tone: "#a68cff" },
  in_field: { label: "In field", tone: "#66c5d5" },
  complete: { label: "Complete", tone: "#4f9d3a" },
  seeking_funder: { label: "Seeking funder", tone: "#ff6a4f" },
};

/* ── formatting ──────────────────────────────────────────────────── */

/** Indian-format rupees, abbreviated to lakh/crore where it helps. */
export function inr(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n >= 100_000_000 ? 0 : 2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(n >= 1_000_000 ? 0 : 1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function num(n: number): string {
  return n.toLocaleString("en-IN");
}
