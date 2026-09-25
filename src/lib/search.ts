import { CITIES } from "@/lib/delhi";
import { STATES, STATE_CENTROIDS } from "@/lib/platform/geography";
import { CITY_COORDS } from "@/lib/platform/city-coords";
import { searchPlaces, type PlaceHit } from "@/lib/wards";
import { searchAnimalIdentity } from "@/lib/animal-identity";
import { placeLine } from "@/lib/utils";
import { getSupabase } from "@/lib/supabase";

export type SearchKind = "place" | "ward" | "state" | "org" | "page" | "animal";
export type SearchHit = { kind: SearchKind; label: string; detail: string; href: string };

/* Search only exposes destinations that do a real job. */
const PAGES: { label: string; detail: string; href: string; terms: string }[] = [
  { label: "Map", detail: "Find recorded animals, clusters and places", href: "/map", terms: "map animals sightings places clusters gaps" },
  { label: "Report an animal", detail: "Add an animal or new sighting", href: "/report", terms: "report add sighting new animal" },
  { label: "Animal stories", detail: "Rescue, care, follow-up and outcomes in one timeline", href: "/stories", terms: "stories rescue care treatment follow up outcomes completed active cases" },
  { label: "Organisation directory", detail: "Animal-welfare organisations", href: "/orgs", terms: "orgs ngos directory organisations partners" },
  { label: "Saved animals", detail: "Animals you follow", href: "/following", terms: "following saved bookmarks animals" },
];

function norm(s: string) { return s.toLowerCase().trim(); }

export function search(query: string, limit = 8): SearchHit[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const scored: { hit: SearchHit; score: number }[] = [];
  const consider = (hit: SearchHit, haystack: string, base: number) => {
    const h = norm(haystack);
    if (!h.includes(q)) return;
    scored.push({ hit, score: base + (h.startsWith(q) ? 0 : 10) });
  };

  for (const c of CITIES) consider({ kind: "place", label: c.name, detail: "Jump the map here", href: `/map?lat=${c.lat}&lng=${c.lng}` }, c.name, 0);
  for (const st of STATES) {
    const at = STATE_CENTROIDS[st.code];
    consider({
      kind: "state",
      label: st.name,
      detail: "Open this state on the animal map",
      href: at ? `/map?lat=${at.lat}&lng=${at.lng}&area=${encodeURIComponent(st.name)}` : "/map",
    }, st.name, 2);
  }

  const seenCity = new Set(CITIES.map((c) => norm(c.name)));
  for (const [name, at] of Object.entries(CITY_COORDS)) {
    if (seenCity.has(norm(name))) continue;
    consider({ kind: "place", label: name, detail: "Jump the map here", href: `/map?lat=${at.lat}&lng=${at.lng}` }, name, 1);
  }

  for (const p of PAGES) consider({ kind: "page", label: p.label, detail: p.detail, href: p.href }, `${p.label} ${p.terms}`, 6);
  return scored.sort((a,b)=>a.score-b.score || a.hit.label.length-b.hit.label.length).slice(0,limit).map(s=>s.hit);
}

export const KIND_LABEL: Record<SearchKind,string> = { place:"Place", ward:"Area", state:"State", org:"Organisation", page:"Go to", animal:"Animal" };

export async function searchAreas(query: string, limit = 4): Promise<SearchHit[]> {
  const supa = getSupabase();
  const orgPromise = supa
    ? supa.from("public_contributor_organisations").select("name,slug,city,state,directory_kind").ilike("name", `%${query}%`).limit(limit)
    : Promise.resolve({ data: [] as never[] });
  const [places, animals, orgResult] = await Promise.all([searchPlaces(query, limit), searchAnimalIdentity(query, limit), orgPromise]);
  const animalHits: SearchHit[] = animals.map((animal) => ({ kind:"animal", label:animal.straypaw_id, detail:[animal.name || animal.species || "Animal", animal.zone].filter(Boolean).join(" · "), href:`/dog/${animal.id}` }));
  const orgHits: SearchHit[] = (orgResult.data ?? []).map((org: any) => ({ kind: "org", label: org.name, detail: [org.directory_kind === "partner" ? "Partner" : "Data source", org.city, org.state].filter(Boolean).join(" · "), href: `/org/${org.slug}` }));
  return [...animalHits, ...orgHits, ...places.map(toHit)].slice(0,limit);
}

function toHit(p: PlaceHit): SearchHit {
  const label = p.level === "district" ? p.ward_name ?? `District ${p.ward_no}` : p.ward_name ?? `Ward ${p.ward_no}`;
  const where = p.level === "district" ? p.state ?? "India" : placeLine(p.zone_name, p.city);
  const count = p.animals > 0 ? `${p.animals} recorded` : "nothing recorded here yet";
  return { kind:"ward", label, detail:`${where} · ${count}`, href:`/map?lat=${p.lat.toFixed(5)}&lng=${p.lng.toFixed(5)}&bbox=${p.min_lng.toFixed(4)},${p.min_lat.toFixed(4)},${p.max_lng.toFixed(4)},${p.max_lat.toFixed(4)}` };
}
