import { unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { assemble, type AnimalRow, type CaseRow, type CareRow, type SightRow } from "@/lib/spatial/build";
import { buildIndex, openNow, robustStart } from "@/lib/spatial/engine";
import { animalKnowledge, casesIn, firstAction, statusTotals } from "@/lib/spatial/measures";
import { A_STRIDE, C, C_STRIDE, K, K_STRIDE, RES, countOf, type SpatialDataset } from "@/lib/spatial/types";
import { CONDITIONS, DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";

const LANDING_LIMITS = { cities: 48, animals: 480, cases: 720, care: 960, sightings: 720, relayCells: 240 } as const;

type CityCandidate = { city: string; state: string | null; animals: number; cases: number; open_cases: number; cells: number; latest_seen: string | null };
type LandingRows = { animals: AnimalRow[]; cases: CaseRow[]; care: CareRow[]; sightings: SightRow[]; orgs: { id: string; name: string }[] };

/** This is deliberately a one-city dataset. The landing must never page the
 * public register: every materialised row read below has a hard cap. */
async function readLandingDataset(): Promise<{ ds: SpatialDataset; totalAnimals: number; totalCases: number } | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const [{ data: cityData, error: cityError }, animalTotal, caseTotal] = await Promise.all([
    supa.rpc("list_public_spatial_cities", { p_limit: LANDING_LIMITS.cities }),
    supa.from("public_spatial_animals").select("id", { count: "exact", head: true }),
    supa.from("public_case_facts").select("id", { count: "exact", head: true }),
  ]);
  if (cityError || animalTotal.error || caseTotal.error) throw cityError ?? animalTotal.error ?? caseTotal.error;
  const candidates = ((cityData ?? []) as CityCandidate[]).filter((r) => r.city && r.cells > 1 && r.latest_seen);
  // Fresh, multi-cell field work makes a far better replay than a large historic import.
  const city = candidates.sort((a, b) => (b.latest_seen ?? "").localeCompare(a.latest_seen ?? "") || b.open_cases - a.open_cases || b.cases - a.cases || b.animals - a.animals)[0]?.city;
  if (!city) return null;
  const { data: animalData, error: animalError } = await supa.from("public_spatial_animals")
    .select("id,h3_r8,lat,lng,city,state,zone,location_precision,source,status,needs_help,sterilisation_status,vaccination_status,ear_notch,cover_photo,first_seen,last_seen,sightings_count,ngo_id")
    .eq("city", city).order("last_seen", { ascending: false }).limit(LANDING_LIMITS.animals);
  if (animalError) throw animalError;
  const animals = (animalData ?? []) as AnimalRow[];
  const ids = animals.map((a) => a.id);
  if (!ids.length) return null;
  const [caseResult, careResult, sightResult] = await Promise.all([
    supa.from("public_case_facts").select("id,dog_id,ngo_id,h3_r8,city,zone,occurred_at,condition_class,status_class,closure_reason,intake_channel,severity,first_action_days,resolved_at,resolved_at_source,source,followups_done,followups_missed,followups_upcoming,reviewed_at")
      .eq("city", city).order("occurred_at", { ascending: false }).limit(LANDING_LIMITS.cases),
    supa.from("public_care_facts").select("dog_id,kind,event_date,h3_r8").in("dog_id", ids).order("event_date", { ascending: false }).limit(LANDING_LIMITS.care),
    supa.from("public_sighting_facts").select("dog_id,created_at,h3_r8,lat,lng,sterilisation_status,vaccination_status,has_photo").in("dog_id", ids).order("created_at", { ascending: false }).limit(LANDING_LIMITS.sightings),
  ]);
  if (caseResult.error || careResult.error || sightResult.error) throw caseResult.error ?? careResult.error ?? sightResult.error;
  const rows: LandingRows = { animals, cases: (caseResult.data ?? []) as CaseRow[], care: (careResult.data ?? []) as CareRow[], sightings: (sightResult.data ?? []) as SightRow[], orgs: [] };
  return { ds: assemble(rows, "public"), totalAnimals: animalTotal.count ?? animals.length, totalCases: caseTotal.count ?? rows.cases.length };
}

export type LandingStory = Awaited<ReturnType<typeof getCachedLandingStory>>;

export async function getLandingStory(): Promise<LandingStory> {
  return getCachedLandingStory();
}

/** The old narrative builder, now applied only to the bounded sample city. */
function coreBox(ds: SpatialDataset, cells: number[], lo: number, hi: number, pad: number): [number, number, number, number] {
  if (!cells.length) return [76.8, 10.85, 77.1, 11.15];
  const xs = cells.map((c) => ds.centers[c * 2]).sort((a, b) => a - b), ys = cells.map((c) => ds.centers[c * 2 + 1]).sort((a, b) => a - b);
  const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
  return [q(xs, lo) - pad, q(ys, lo) - pad, q(xs, hi) + pad, q(ys, hi) + pad];
}

function buildStory(ds: SpatialDataset, totals: { animals: number; cases: number }) {
  const ix = buildIndex(ds), city = 0, sample = ds.cities[city];
  const cityCells = new Set<number>(); ds.cellCity.forEach((c, i) => { if (c === city) cityCells.add(i); });
  const cityCases = casesIn(ds, { cells: cityCells, from: 0, to: ds.today });
  const cellList = [...cityCells], localIdx = new Map(cellList.map((c, i) => [c, i]));
  const events: number[] = []; let futureDated = 0;
  const addEvents = (rows: number[], stride: number, cellAt: number, dayAt: number, kind: number) => {
    for (let i = 0; i < rows.length / stride; i++) { const o = i * stride, c = rows[o + cellAt], d = rows[o + dayAt]; if (!localIdx.has(c) || d < 0) continue; if (d > ds.today) { futureDated++; continue; } events.push(localIdx.get(c)!, d, kind); }
  };
  addEvents(ds.cases, C_STRIDE, C.cell, C.day, 0); addEvents(ds.care, K_STRIDE, K.cell, K.day, 1);
  const start = robustStart(Array.from({ length: events.length / 3 }, (_, i) => events[i * 3 + 1]));
  for (let i = 1; i < events.length; i += 3) if (events[i] < start) events[i] = start;
  const order = Array.from({ length: events.length / 3 }, (_, i) => i).sort((a, b) => events[a * 3 + 1] - events[b * 3 + 1]);
  const sorted = order.flatMap((i) => [events[i * 3], events[i * 3 + 1], events[i * 3 + 2]]);
  const hero = { city: sample?.name ?? "", state: sample?.state ?? "", box: coreBox(ds, cellList, .04, .96, .012), rings: cellList.map((c) => ds.rings[c]), events: sorted, futureDated };
  const CLOSED = ds.dict.status.indexOf("closed"), vague = new Set(["Other", "Not recorded"]);
  const careBy = new Map<number, { day: number; kind: string }[]>();
  for (let i = 0; i < ix.nCare; i++) { const o = i * K_STRIDE, a = ds.care[o + K.animal]; if (a >= 0) (careBy.get(a) ?? careBy.set(a, []).get(a)!).push({ day: ds.care[o + K.day], kind: ds.dict.care[ds.care[o + K.kind]] ?? "other" }); }
  let pick = -1, pickCare: { day: number; kind: string }[] = [];
  for (const i of cityCases) { const o = i * C_STRIDE, d = ds.cases[o + C.day], fa = ds.cases[o + C.firstAction], cd = ds.cases[o + C.closedDay]; if (ds.cases[o + C.status] !== CLOSED || ds.cases[o + C.resolvedSrc] === RES.assumed || d < 0 || fa < 0 || cd < 0 || cd > ds.today || cd - d < 2 || cd - d > 60 || d + fa > cd || vague.has(CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded")) continue; const care = (careBy.get(ds.cases[o + C.animal]) ?? []).filter((k) => k.day >= d + fa && k.day <= cd); if (pick < 0 || (care.length > 0 && !pickCare.length) || (care.length === pickCare.length && cd > ds.cases[pick * C_STRIDE + C.closedDay])) { pick = i; pickCare = care; } }
  const iso = (day: number) => new Date(Date.UTC(2000, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);
  const journey = pick < 0 ? null : (() => { const o = pick * C_STRIDE, d = ds.cases[o + C.day], fa = ds.cases[o + C.firstAction], cd = ds.cases[o + C.closedDay], li = ds.cellLocality[ds.cases[o + C.cell]]; return { condition: CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded", locality: li >= 0 ? ds.localities[li] : sample?.name ?? "", ring: ds.rings[ds.cases[o + C.cell]], reported: iso(d), acted: iso(d + fa), actedAfter: fa, closed: iso(cd), days: cd - d, closure: ds.dict.closure[ds.cases[o + C.closure]] ?? "unspecified", care: { count: pickCare.length, kinds: [...new Set(pickCare.map((k) => k.kind))], first: pickCare.length ? iso(Math.min(...pickCare.map((k) => k.day))) : null } }; })();
  const at = (i: number, k: number) => ds.cases[i * C_STRIDE + k], isCritical = (i: number) => DEFAULT_TRIAGE[(CONDITIONS[at(i, C.cond)] ?? "Not recorded") as Condition] === "Critical";
  const openCity = cityCases.filter((i) => openNow(ds, i) && at(i, C.day) >= 0 && at(i, C.day) <= ds.today), live = openCity.filter((i) => ds.today - at(i, C.day) <= 90), openBy = new Map<number, number>();
  for (const i of live) openBy.set(at(i, C.cell), (openBy.get(at(i, C.cell)) ?? 0) + 1);
  const feed = cityCases.flatMap((i) => { const li = ds.cellLocality[at(i, C.cell)], base = { condition: CONDITIONS[at(i, C.cond)] ?? "Not recorded", locality: li >= 0 ? ds.localities[li] : "", cell: ds.cells[at(i, C.cell)], critical: isCritical(i) }, d = at(i, C.day), fa = at(i, C.firstAction), cd = at(i, C.closedDay); return [d >= 0 && d <= ds.today ? { kind: "report" as const, day: d, ...base } : null, d >= 0 && fa > 0 && d + fa <= ds.today ? { kind: "action" as const, day: d + fa, ...base } : null, cd >= 0 && cd <= ds.today && at(i, C.status) === CLOSED ? { kind: "closed" as const, day: cd, ...base } : null].filter(Boolean) as { kind: "report" | "action" | "closed"; day: number; condition: string; locality: string; cell: string; critical: boolean }[]; }).sort((a, b) => a.day - b.day).slice(-14).map((e) => ({ ...e, date: iso(e.day) }));
  const status = statusTotals(ds, cityCases), fa = firstAction(ds, cityCases), knowledge = animalKnowledge(ds, ix, null, ds.today);
  return { totals: { animals: totals.animals, cases: totals.cases, care: countOf(ds.care, K_STRIDE), sightings: countOf(ds.sightings, 4), residentAnimals: knowledge.resident, cities: 1, sampleShare: 0, cityCases: cityCases.length }, hero, journey, record: { requests: cityCases.length, closedAfterWork: (status as Record<string, number>).closed ?? 0, medianFirstAction: fa.median }, desk: { live: live.length, critical: live.filter(isCritical).length, older: openCity.length - live.length, queue: [...live].sort((a, b) => (at(a, C.fuMissed) > 0 ? 0 : isCritical(a) ? 1 : 2) - (at(b, C.fuMissed) > 0 ? 0 : isCritical(b) ? 1 : 2) || at(a, C.day) - at(b, C.day)).slice(0, 3).map((i) => { const li = ds.cellLocality[at(i, C.cell)]; return { condition: CONDITIONS[at(i, C.cond)] ?? "Not recorded", locality: li >= 0 ? ds.localities[li] : "", days: ds.today - at(i, C.day), critical: isCritical(i), overdue: at(i, C.fuMissed) > 0 }; }), cells: cellList.map((c) => ({ key: ds.cells[c], ring: ds.rings[c], open: openBy.get(c) ?? 0 })), box: coreBox(ds, cellList, .02, .98, .01), feed }, today: ds.today, built: ds.built };
}

async function resolveRelay(feed: ReturnType<typeof buildStory>["desk"]["feed"], cityCells: string[], city: string) {
  const supa = getSupabase(); if (!supa) return null;
  const candidate = [...feed].reverse().find((e) => e.kind === "report");
  if (!candidate) return null;
  const next = new Date(Date.parse(`${candidate.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const { data: facts } = await supa.from("public_case_facts").select("dog_id,h3_r8,condition_class,occurred_at,zone").eq("h3_r8", candidate.cell).eq("condition_class", candidate.condition).gte("occurred_at", candidate.date).lt("occurred_at", next).not("dog_id", "is", null).limit(1);
  const dogId = (facts?.[0] as { dog_id: string } | undefined)?.dog_id; if (!dogId) return null;
  const { data: animal } = await supa.from("public_spatial_animals").select("id,straypaw_id,cover_photo").eq("id", dogId).maybeSingle();
  if (!animal?.straypaw_id) return null;
  return { kind: "report" as const, date: candidate.date, condition: candidate.condition, locality: candidate.locality || city, cell: candidate.cell, critical: candidate.critical, animalId: animal.id, straypawId: animal.straypaw_id, photo: animal.cover_photo?.trim() || null };
}

const getCachedLandingStory = unstable_cache(async () => {
  const source = await readLandingDataset(); if (!source || !source.ds.cities.length) return null;
  const story = buildStory(source.ds, { animals: source.totalAnimals, cases: source.totalCases });
  return { ...story, relay: await resolveRelay(story.desk.feed, story.desk.cells.map((c) => c.key).slice(0, LANDING_LIMITS.relayCells), story.hero.city) };
}, ["landing-story-bounded-city-v1"], { revalidate: 300 });

export type RegisterFocus = {
  id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null;
  first_seen: string | null; last_seen: string | null; sightings: number; sterilisation: string | null; vaccination: string | null; org: string | null;
  requests: { condition: string | null; at: string; closed: boolean }[]; care: { kind: string; at: string }[];
};
export type AnimalRegister = { total: number; cards: RegisterFocus[] };

/* Landing cards are a fixed, curated sample plus an exact count. Their
 * related case/care reads are bounded to those card ids, never a register. */
export const getAnimalRegister = unstable_cache(async (): Promise<AnimalRegister> => {
  const supa = getSupabase();
  if (!supa) return { total: 0, cards: [] };
  const [{ count }, { data, error }] = await Promise.all([
    supa.from("public_spatial_animals").select("id", { count: "exact", head: true }),
    supa.from("public_spatial_animals").select("id,name,straypaw_id,cover_photo,zone,city,first_seen,last_seen,sightings_count,sterilisation_status,vaccination_status,status,needs_help,ngo_id")
      .eq("source", "resident").not("cover_photo", "is", null).neq("cover_photo", "").order("last_seen", { ascending: false }).limit(80),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as Array<any>;
  const picks = rows.filter((row) => row.cover_photo?.trim() && !row.needs_help && row.status !== "injured").slice(0, 8);
  const ids = picks.map((row) => row.id);
  const [{ data: cases }, { data: care }] = ids.length ? await Promise.all([
    supa.from("public_case_facts").select("dog_id,condition_class,status_class,occurred_at").in("dog_id", ids).order("occurred_at", { ascending: false }).limit(160),
    supa.from("public_care_facts").select("dog_id,kind,event_date").in("dog_id", ids).order("event_date", { ascending: false }).limit(240),
  ]) : [{ data: [] }, { data: [] }];
  const byCase = new Map<string, RegisterFocus["requests"]>();
  for (const item of (cases ?? []) as any[]) (byCase.get(item.dog_id) ?? byCase.set(item.dog_id, []).get(item.dog_id)!).push({ condition: item.condition_class, at: item.occurred_at, closed: item.status_class === "closed" });
  const byCare = new Map<string, RegisterFocus["care"]>();
  for (const item of (care ?? []) as any[]) (byCare.get(item.dog_id) ?? byCare.set(item.dog_id, []).get(item.dog_id)!).push({ kind: item.kind, at: item.event_date });
  return { total: count ?? 0, cards: picks.map((row) => ({
    id: row.id, name: row.name, straypaw_id: row.straypaw_id, cover_photo: row.cover_photo, zone: row.zone, city: row.city,
    first_seen: row.first_seen, last_seen: row.last_seen, sightings: row.sightings_count ?? 0,
    sterilisation: row.sterilisation_status, vaccination: row.vaccination_status, org: null,
    requests: byCase.get(row.id) ?? [], care: byCare.get(row.id) ?? [],
  })) };
}, ["landing-animal-register-v6"], { revalidate: 300 });
