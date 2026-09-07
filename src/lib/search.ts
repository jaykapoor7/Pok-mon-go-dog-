import { CITIES } from "@/lib/delhi";
import { STATES, STATE_BY_CODE } from "@/lib/platform/geography";
import { ORGS } from "@/lib/platform/orgs";
import { CITY_COORDS, coordsForCity } from "@/lib/platform/city-coords";
import { searchPlaces, type PlaceHit } from "@/lib/wards";

/* ════════════════════════════════════════════════════════════════════
   Console search.

   The search box used to push /map?q=… , which the map ignores. It reads
   lat/lng. So typing anywhere in the console did nothing. This resolves a
   query against everything the app can actually navigate to, and hands
   back a real destination.
   ════════════════════════════════════════════════════════════════════ */

export type SearchKind = "place" | "ward" | "state" | "org" | "page";

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

  /* Every city an organisation is in, whether or not it is one of the
     twenty the map already knew about. Searching "Bhubaneswar" should reach
     Bhubaneswar. */
  const seenCity = new Set(CITIES.map((c) => norm(c.name)));
  for (const [name, at] of Object.entries(CITY_COORDS)) {
    if (seenCity.has(norm(name))) continue;
    consider(
      {
        kind: "place",
        label: name,
        detail: "Jump the map here",
        href: `/map?lat=${at.lat}&lng=${at.lng}`,
      },
      name,
      1
    );
  }

  for (const o of ORGS) {
    const stateName = STATE_BY_CODE.get(o.stateCode)?.name ?? "";
    const at = coordsForCity(o.city);
    consider(
      {
        kind: "org",
        label: o.name,
        /* An organisation is a place as much as it is a record. Someone
           searching one on a console whose main surface is a map wants to
           see where it works, so this opens the map over its city rather
           than a directory row. The directory is still reachable by name
           from the Organisation directory result. */
        detail: at
          ? `Open the map on ${[o.city, stateName].filter(Boolean).join(", ")}`
          : [o.city, stateName].filter(Boolean).join(", ") || "Organisation",
        href: at
          ? `/map?lat=${at.lat}&lng=${at.lng}&org=${encodeURIComponent(o.name)}`
          : `/orgs?q=${encodeURIComponent(o.name)}`,
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
  ward: "Area",
  state: "State",
  org: "Organisation",
  page: "Go to",
};


/* ── Wards and districts, which live in the database ──────────────────
   Everything above is a static list bundled with the app. Municipal wards
   and districts are rows in Postgres — 641 districts and 200 Chennai wards
   at the time of writing, more as pilots land — so they are looked up
   rather than shipped, and merged into the results as they arrive.

   Kept separate from search() rather than making that function async: the
   static answers should appear on the first keystroke instead of waiting on
   a round trip that may return nothing. */
export async function searchAreas(query: string, limit = 4): Promise<SearchHit[]> {
  const hits = await searchPlaces(query, limit);
  return hits.map(toHit);
}

function toHit(p: PlaceHit): SearchHit {
  /* "Ward 172" is what the boundary data calls it; the zone is what a
     person in Chennai calls the part of the city it is in, so both go in.
     Districts carry their own name and their state. */
  const label =
    p.level === "district"
      ? p.ward_name ?? `District ${p.ward_no}`
      : p.ward_name ?? `Ward ${p.ward_no}`;
  const where =
    p.level === "district"
      ? p.state ?? "India"
      : [p.zone_name, p.city].filter(Boolean).join(", ");
  /* Said plainly, because an area with nothing recorded in it is the
     finding rather than an empty result. */
  const count =
    p.animals > 0
      ? `${p.animals} recorded`
      : "nothing recorded here yet";
  return {
    kind: "ward",
    label,
    detail: `${where} · ${count}`,
    href:
      `/map?lat=${p.lat.toFixed(5)}&lng=${p.lng.toFixed(5)}` +
      `&bbox=${p.min_lng.toFixed(4)},${p.min_lat.toFixed(4)},${p.max_lng.toFixed(4)},${p.max_lat.toFixed(4)}`,
  };
}
