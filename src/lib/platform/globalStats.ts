// Real, sourced global rabies-mortality figures used by the landing page's
// globe stage (ScrollExperience). Scope is intentionally narrow: this is a
// short cinematic transition establishing global scale before the story
// narrows to a single dog, not a data dashboard, so only a handful of
// countries with real citable figures are needed - not a comprehensive
// 200-country table.
//
// Two different methodologies are represented on purpose, same as the
// India-specific rabies figures already in datasets.ts:
//  - WHO regional/global totals (widely cited, official)
//  - GBD 2019 (Global Burden of Disease Study) country-level modelled
//    deaths, published in the International Journal of Infectious Diseases
//    (2023): "Global burden of rabies in 204 countries and territories,
//    from 1990 to 2019: results from the Global Burden of Disease Study
//    2019". These are internally consistent with each other (same study,
//    same year), which matters more for a comparative globe than absolute
//    precision.

export interface CountryRabiesStat {
  country: string;
  /** ISO 3166-1 alpha-2, used for marker placement. */
  iso2: string;
  deaths: number;
  year: number;
  source: string;
  confidence: "high" | "medium" | "low";
  sample: false;
  note?: string;
}

const GBD_2019_SOURCE =
  "Global Burden of Disease Study 2019, published as \"Global burden of rabies in 204 countries and territories, from 1990 to 2019\" (International Journal of Infectious Diseases, 2023)";

export const COUNTRY_RABIES_STATS: CountryRabiesStat[] = [
  {
    country: "India",
    iso2: "IN",
    deaths: 5206,
    year: 2019,
    source: GBD_2019_SOURCE,
    confidence: "medium",
    sample: false,
    note: "GBD 2019 modelled estimate, deliberately different in method and scale from the India-specific figures elsewhere on StrayPaw (54 officially reported vs ~19,000 modelled, 2023-24) - both point to the same passive-surveillance gap.",
  },
  {
    country: "Nigeria",
    iso2: "NG",
    deaths: 1295,
    year: 2019,
    source: GBD_2019_SOURCE,
    confidence: "medium",
    sample: false,
  },
  {
    country: "Pakistan",
    iso2: "PK",
    deaths: 1198,
    year: 2019,
    source: GBD_2019_SOURCE,
    confidence: "medium",
    sample: false,
  },
  {
    country: "Ethiopia",
    iso2: "ET",
    deaths: 922,
    year: 2019,
    source: GBD_2019_SOURCE,
    confidence: "medium",
    sample: false,
  },
  {
    country: "China",
    iso2: "CN",
    deaths: 719,
    year: 2019,
    source: GBD_2019_SOURCE,
    confidence: "medium",
    sample: false,
  },
];

/** Global annual total, WHO. Used for scale-setting, not a per-country sum
 *  (WHO's total uses a different, higher modelled methodology than GBD). */
export const GLOBAL_RABIES_TOTAL = {
  deaths: 59_000,
  source: "WHO, Rabies fact sheet",
  confidence: "medium" as const,
  sample: false as const,
};

export const REGIONAL_RABIES_SHARE: {
  region: string;
  share: number;
  deaths: number;
  source: string;
}[] = [
  { region: "Asia", share: 0.596, deaths: 35_172, source: "WHO regional estimate" },
  { region: "Africa", share: 0.364, deaths: 21_476, source: "WHO regional estimate" },
];

/** The single most important, widely-cited number for the globe's India
 *  moment: India accounts for roughly a third of the world's rabies deaths. */
export const INDIA_GLOBAL_SHARE = {
  share: 0.35,
  source:
    "WHO-cited estimate (Hampson et al. 2015 methodology), widely reported as India accounting for approximately 35% of global human rabies deaths and roughly 60% of Asia's",
  confidence: "medium" as const,
  sample: false as const,
};
