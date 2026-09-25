import { DATASETS } from "./datasets";
import { STATES } from "./geography";
import type { ContributorOrg } from "@/lib/contributor-types";
import type { StateRow } from "@/components/app/StateExplorer";

/* ════════════════════════════════════════════════════════════════════
   One place that assembles the state-by-state record.

   /evidence and /gaps both draw the same explorer and both used to build
   its rows themselves, with their own copy of the metric lookup and their
   own filter. They drifted: one of them dropped every state without a
   population, so two pages showing "what is known" disagreed about which
   places exist. There is one builder now, and both pages call it.
   ════════════════════════════════════════════════════════════════════ */

function pointsFor(metric: string, year?: number) {
  const found = new Map<string, { value: number; source: string; year: number }>();
  for (const dataset of DATASETS) {
    for (const point of dataset.points) {
      if (point.metric !== metric || point.geo.level !== "state") continue;
      if (year !== undefined && point.year !== year) continue;
      found.set(point.geo.code, { value: point.value, source: point.source, year: point.year });
    }
  }
  return found;
}

export function buildStateRows(contributors: ContributorOrg[] = []): StateRow[] {
  const population = pointsFor("dog_population");
  const coverage = pointsFor("abc_coverage");
  /* Bites and suspected rabies deaths are published for every state and
     union territory, every year. Population was last enumerated in 2019
     and coverage is published by two governments out of thirty-six, so
     neither of those can carry the page on its own. */
  const bites24 = pointsFor("dog_bites", 2024);
  const bites22 = pointsFor("dog_bites", 2022);
  const deaths24 = pointsFor("human_rabies_deaths", 2024);

  return STATES.map((state) => {
    const pop = population.get(state.code);
    const abc = coverage.get(state.code);
    const b24 = bites24.get(state.code);
    const b22 = bites22.get(state.code);
    const d24 = deaths24.get(state.code);
    const orgs = contributors.filter((org) => org.stateCode === state.code);
    const cityGroups = [
      ...new Map(orgs.map((org) => [org.city, orgs.filter((item) => item.city === org.city)])),
    ]
      .map(([city, entries]) => ({
        city,
        orgs: entries.map((org) => ({ id: org.id, name: org.name, url: org.url })),
      }))
      .sort((a, b) => b.orgs.length - a.orgs.length || a.city.localeCompare(b.city));

    return {
      code: state.code,
      name: state.name,
      kind: state.kind ?? "state",
      population: pop?.value ?? null,
      populationSource: pop?.source ?? null,
      populationYear: pop?.year ?? null,
      bites2024: b24?.value ?? null,
      bites2022: b22?.value ?? null,
      biteSource: b24?.source ?? null,
      deaths2024: d24?.value ?? null,
      // abc_coverage is stored as a percentage; the explorer wants 0-1.
      abcCoverage: abc ? abc.value / 100 : null,
      abcSource: abc ? `${abc.source} (${abc.year})` : null,
      orgCount: orgs.length,
      orgs: orgs.map((org) => ({ id: org.id, name: org.name, city: org.city, url: org.url })),
      cityGroups,
    };
  });
}
