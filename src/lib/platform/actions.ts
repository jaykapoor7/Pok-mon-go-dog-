// Evidence-based actions surfaced on Take Action, tied to what the data shows.
export interface ActionItem {
  id: string;
  title: string;
  audience: "Everyone" | "Volunteers" | "Organisations" | "Local government" | "Researchers";
  rationale: string;
  /** Metric this action responds to, used to prioritise by a region's gaps. */
  metric?: "abc_coverage" | "arv_coverage" | "human_rabies_deaths" | "community_reports" | "dog_population";
  href?: string;
  cta?: string;
}

export const ACTIONS: ActionItem[] = [
  {
    id: "report",
    title: "Add observations from your area",
    audience: "Everyone",
    rationale: "Ground-level sightings fill gaps where official data is thin, and build a live picture over time.",
    metric: "community_reports",
    href: "/report",
    cta: "Report a sighting",
  },
  {
    id: "vaccinate",
    title: "Back mass anti-rabies vaccination",
    audience: "Local government",
    rationale: "WHO evidence indicates sustained ~70% dog vaccination coverage breaks rabies transmission. Most areas here sit well below that.",
    metric: "arv_coverage",
  },
  {
    id: "abc",
    title: "Support the local ABC (sterilisation) programme",
    audience: "Organisations",
    rationale: "Animal Birth Control humanely stabilises population when coverage is high and sustained; low coverage has little effect.",
    metric: "abc_coverage",
    href: "/orgs",
    cta: "Find organisations",
  },
  {
    id: "volunteer",
    title: "Register to volunteer or feed",
    audience: "Volunteers",
    rationale: "Feeding rotations and rescue transport are the operational backbone; organisations can reach you when they need hands.",
    href: "/help",
    cta: "Register to volunteer",
  },
  {
    id: "bite-care",
    title: "Know post-bite care and report bites",
    audience: "Everyone",
    rationale: "Prompt wound washing and PEP prevent rabies deaths; bite reporting improves surveillance where it is weakest.",
    metric: "human_rabies_deaths",
  },
  {
    id: "data",
    title: "Contribute or open a dataset",
    audience: "Researchers",
    rationale: "ABC/vaccination records, census and study data can be normalised into the platform to close the biggest gaps.",
    href: "/contact",
    cta: "Get in touch",
  },
];
