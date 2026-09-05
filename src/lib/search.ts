import { CITIES } from "@/lib/delhi";
import { STATES, STATE_BY_CODE } from "@/lib/platform/geography";
import { ORGS } from "@/lib/platform/orgs";

/* ════════════════════════════════════════════════════════════════════
   Console search.

   The search box used to push /map?q=… , which the map ignores. It reads
   lat/lng. So typing anywhere in the console did nothing. This resolves a
   query against everything the app can actually navigate to, and hands
   back a real destination.
   ════════════════════════════════════════════════════════════════════ */

export type SearchKind = "place" | "state" | "org" | "page";

export type SearchHit = {
  kind: SearchKind;
  label: string;
  /** Secondary line, state, city, or what the page is for. */
  detail: string;
  href: string;
};

/** Fixed destinations worth reaching by name rather than by nav hunting. */
const PAGES: { label: string; detail: string; href: string; terms: string }[] = [
  { label: "Living map", detail: "All sightings, studies and outcomes", href: "/map", terms: "map sightings clusters live" },
  { label: "Report an animal", detail: "Add a sighting or flag a need", href: "/report", terms: "report add sighting new" },
  { label: "Adoption", detail: "Animals listed for adoption by organisations", href: "/adopt", terms: "adopt adoption rehome foster home listing" },
  { label: "Resources", detail: "Filed register pages, ledgers and medical notes", href: "/partner/resources", terms: "resources documents scans register ledger records paper notes files" },
  { label: "Data gaps", detail: "State-by-state coverage picture", href: "/gaps", terms: "gaps data coverage unknown missing evidence" },
  { label: "What would it take?", detail: "Cost a scoped intervention", href: "/what-would-it-take", terms: "cost costing budget plan scope funding wwit" },
  { label: "Studies", detail: "Commissioned survey work", href: "/studies", terms: "studies research survey" },
  { label: "Interventions", detail: "Funded work in progress", href: "/interventions", terms: "interventions programmes work" },
  { label: "Outcomes", detail: "The closed-record register", href: "/outcomes", terms: "outcomes results register verified" },
  { label: "Needs", detail: "Outstanding animal needs", href: "/needs", terms: "needs urgent help" },
  { label: "Organisation directory", detail: "NGOs across India", href: "/orgs", terms: "orgs ngos directory organisations partners" },
  { label: "Volunteer", detail: "Routes into the work", href: "/get-involved", terms: "volunteer help involved" },
  { label: "Following", detail: "Animals you follow", href: "/following", terms: "following saved bookmarks" },
];

function norm(s: string) {
  return s.toLowerCase().trim();
}

/**
 * Ranked matches for a query. Prefix matches beat substring matches, and
 * places rank above pages so "Pune" goes to the map rather than a menu item.
 */
export function search(query: string, limit = 8): SearchHit[] {
  const q = norm(query);
  if (q.length < 2) return [];

  const scored: { hit: SearchHit; score: number }[] = [];

  const consider = (hit: SearchHit, haystack: string, base: number) => {
    const h = norm(haystack);
    if (!h.includes(q)) return;
    // Prefix matches are almost always what was meant.
    scored.push({ hit, score: base + (h.startsWith(q) ? 0 : 10) });
  };

  for (const c of CITIES) {
    consider(
      {
        kind: "place",
        label: c.name,
        detail: "Jump the map here",
        href: `/map?lat=${c.lat}&lng=${c.lng}`,
      },
      c.name,
      0
    );
  }

  for (const st of STATES) {
    consider(
      {
        kind: "state",
        label: st.name,
        detail: "Coverage, population and organisations",
        href: `/gaps?state=${encodeURIComponent(st.code)}`,
      },
      st.name,
      2
    );
  }

  for (const o of ORGS) {
    const stateName = STATE_BY_CODE.get(o.stateCode)?.name ?? "";
    consider(
      {
        kind: "org",
        label: o.name,
        detail: [o.city, stateName].filter(Boolean).join(", ") || "Organisation",
        href: `/orgs?q=${encodeURIComponent(o.name)}`,
      },
      `${o.name} ${o.city} ${stateName}`,
      4
    );
  }

  for (const p of PAGES) {
    consider(
      { kind: "page", label: p.label, detail: p.detail, href: p.href },
      `${p.label} ${p.terms}`,
      6
    );
  }

  return scored
    .sort((a, b) => a.score - b.score || a.hit.label.length - b.hit.label.length)
    .slice(0, limit)
    .map((s) => s.hit);
}

export const KIND_LABEL: Record<SearchKind, string> = {
  place: "Place",
  state: "State",
  org: "Organisation",
  page: "Go to",
};
