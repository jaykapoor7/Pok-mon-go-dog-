/* ════════════════════════════════════════════════════════════════════
   Building the spatial dataset, on the server.

   Two sources, one shape:

   public   the anon fact views (public_spatial_animals, public_case_facts,
            public_care_facts, public_sighting_facts). No free text, no
            names, positions no finer than a cell.

   org      an organisation's own rows, read with the member's own token so
            RLS decides what comes back. Nothing here widens access.

   H3 has no Postgres extension on this project, so cells are written by
   the application. Rows that arrived since the last write are healed here
   when a service role is configured; otherwise they are placed from their
   published (0.01°) position, which is never finer than the truth.
   ════════════════════════════════════════════════════════════════════ */

import { cellToBoundary, cellToLatLng, gridDisk, latLngToCell } from "h3-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/geo/cities";
import {
  CARE_KINDS, CLOSURE_REASONS, CONDITIONS, INTAKES, SEVERITIES, STATUSES,
} from "@/lib/register/taxonomy";
import {
  A, A_STRIDE, AF, C, C_STRIDE, H3_RES, K_STRIDE, S_STRIDE, SF, dayOf,
  type CityInfo, type FrontierCell, type NextCell, type SpatialDataset,
} from "./types";

/** Bump when assemble() changes shape or meaning, so cached datasets are rebuilt. */
export const DATASET_VERSION = 3;

export type AnimalRow = {
  id: string; h3_r8: string | null; lat: number | null; lng: number | null;
  city: string | null; state: string | null; zone: string | null;
  location_precision: string | null; source: string | null;
  status: string | null; needs_help: boolean | null;
  sterilisation_status: string | null; vaccination_status: string | null; ear_notch: string | null;
  cover_photo: string | null; first_seen: string | null; last_seen: string | null;
  sightings_count: number | null; ngo_id: string | null;
};
export type CaseRow = {
  id: string; dog_id: string | null; ngo_id: string | null; h3_r8: string | null;
  city: string | null; zone: string | null; occurred_at: string | null;
  condition_class: string | null; status_class: string | null; closure_reason: string | null;
  intake_channel: string | null; severity: string | null; first_action_days: number | null;
  resolved_at: string | null; resolved_at_source: string | null; source: string | null;
  followups_done: number | null; followups_missed: number | null; followups_upcoming: number | null;
};
export type CareRow = { dog_id: string | null; kind: string | null; event_date: string | null; h3_r8: string | null };
export type SightRow = {
  dog_id: string | null; created_at: string | null; h3_r8: string | null; lat: number | null; lng: number | null;
  sterilisation_status: string | null; vaccination_status: string | null; has_photo: boolean | null;
};

const round5 = (v: number) => Math.round(v * 1e5) / 1e5;
/* Rings are drawn, not measured: four decimals is ~11 m, far below a cell's 900 m. */
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;
const located = (lat: number | null | undefined, lng: number | null | undefined) =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

async function readAll<T>(load: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>, page = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await load(from, from + page - 1);
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : []) as T[];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

/** Writes exact H3 cells for rows that do not have one yet. Service role only. */
export async function healCells(admin: SupabaseClient | null) {
  if (!admin) return 0;
  const { data, error } = await admin.rpc("sp_rows_without_cells", { p_limit: 2000 });
  if (error || !Array.isArray(data) || data.length === 0) return 0;
  const byTable = new Map<string, { ids: string[]; cells: string[] }>();
  for (const r of data as { tbl: string; id: string; lat: number; lng: number }[]) {
    if (!located(r.lat, r.lng)) continue;
    const t = byTable.get(r.tbl) ?? { ids: [], cells: [] };
    t.ids.push(r.id);
    t.cells.push(latLngToCell(r.lat, r.lng, H3_RES));
    byTable.set(r.tbl, t);
  }
  let n = 0;
  for (const [tbl, { ids, cells }] of byTable) {
    const { data: count } = await admin.rpc("sp_set_cells", { p_table: tbl, p_ids: ids, p_cells: cells });
    n += Number(count ?? 0);
  }
  return n;
}

export async function readPublicRows(supa: SupabaseClient, city?: string) {
  // The query builder's type is deep; the city filter only needs its eq().
  const scoped = (q: any) => (city ? q.eq("city", city) : q);
  const [animals, cases, care, sightings, orgs] = await Promise.all([
    readAll<AnimalRow>((f, t) => scoped(supa.from("public_spatial_animals").select(
      "id,h3_r8,lat,lng,city,state,zone,location_precision,source,status,needs_help,sterilisation_status,vaccination_status,ear_notch,cover_photo,first_seen,last_seen,sightings_count,ngo_id",
    )).order("id").range(f, t)),
    readAll<CaseRow>((f, t) => scoped(supa.from("public_case_facts").select(
      "id,dog_id,ngo_id,h3_r8,city,zone,occurred_at,condition_class,status_class,closure_reason,intake_channel,severity,first_action_days,resolved_at,resolved_at_source,source,followups_done,followups_missed,followups_upcoming",
    )).order("id").range(f, t)),
    readAll<CareRow>((f, t) => scoped(supa.from("public_care_facts").select("dog_id,kind,event_date,h3_r8")).order("id").range(f, t)),
    readAll<SightRow>((f, t) => scoped(supa.from("public_sighting_facts").select(
      "dog_id,created_at,h3_r8,lat,lng,sterilisation_status,vaccination_status,has_photo",
    )).order("id").range(f, t)),
    Promise.resolve(supa.from("ngos").select("id,name")).then((r) => (r.data ?? []) as { id: string; name: string }[], () => [] as { id: string; name: string }[]),
  ]);
  return { animals, cases, care, sightings, orgs };
}

/** An organisation's own register, under the member's RLS. */
export async function readOrgRows(supa: SupabaseClient) {
  const [animals, cases, care] = await Promise.all([
    readAll<AnimalRow & { provenance?: string | null }>((f, t) => supa.from("dogs").select(
      "id,h3_r8,lat,lng,city,state,zone,location_precision,provenance,status,needs_help,sterilisation_status,vaccination_status,ear_notch,cover_photo,first_seen,last_seen,sightings_count,ngo_id",
    ).order("id").range(f, t)),
    readAll<CaseRow & { provenance?: string | null; occurred_at: string | null }>((f, t) => supa.from("org_case_facts").select(
      "id,dog_id,ngo_id,h3_r8,city,zone,occurred_at,condition_class,status_class,closure_reason,intake_channel,severity,first_action_at,resolved_at,resolved_at_source,provenance,followups_done,followups_missed,followups_upcoming",
    ).order("id").range(f, t)),
    readAll<CareRow & { dog_id: string }>((f, t) => supa.from("medical_events").select("dog_id,kind,event_date").order("id").range(f, t)),
  ]);
  const casesOut: CaseRow[] = (cases as (CaseRow & { first_action_at?: string | null; provenance?: string | null })[]).map((c) => ({
    ...c,
    source: c.provenance === "imported_historical_record" ? "field" : "resident",
    first_action_days: c.first_action_at && c.occurred_at
      ? Math.max(0, Math.round((Date.parse(c.first_action_at) - Date.parse(c.occurred_at.slice(0, 10))) / 86_400_000))
      : null,
  }));
  const animalsOut: AnimalRow[] = (animals as (AnimalRow & { provenance?: string | null })[]).map((a) => ({
    ...a,
    source: a.provenance === "community_report" ? "resident" : "field",
  }));
  return { animals: animalsOut, cases: casesOut, care: care.map((r) => ({ ...r, h3_r8: null })), sightings: [] as SightRow[], orgs: [] as { id: string; name: string }[] };
}

/* ── assembly ─────────────────────────────────────────────────────────── */

type Rows = Awaited<ReturnType<typeof readPublicRows>>;

const tally = (m: Map<string, number>, k: string | null | undefined) => {
  const key = (k ?? "").trim();
  if (key) m.set(key, (m.get(key) ?? 0) + 1);
};
const top = (m: Map<string, number> | undefined) => {
  if (!m) return null;
  let best: string | null = null, bn = 0;
  for (const [k, n] of m) if (n > bn) { best = k; bn = n; }
  return best;
};

export function assemble(rows: Rows, scope: "public" | "org", now = new Date()): SpatialDataset {
  const cellIndex = new Map<string, number>();
  const cells: string[] = [];
  const cellOfKey = (k: string) => {
    let i = cellIndex.get(k);
    if (i === undefined) { i = cells.length; cells.push(k); cellIndex.set(k, i); }
    return i;
  };
  const keyFor = (h3: string | null | undefined, lat: number | null | undefined, lng: number | null | undefined) =>
    h3 && h3.length >= 15 ? h3 : located(lat, lng) ? latLngToCell(lat as number, lng as number, H3_RES) : null;

  /* animals first: their cells anchor everything that happens to them */
  const animalIdx = new Map<string, number>();
  const animalCell: number[] = [];
  const cellCityVotes = new Map<number, Map<string, number>>();
  const cellZoneVotes = new Map<number, Map<string, number>>();
  const cityState = new Map<string, Map<string, number>>();
  const vote = (cell: number, city: string | null, zone: string | null, state: string | null) => {
    if (city) {
      const m = cellCityVotes.get(cell) ?? new Map<string, number>(); tally(m, city); cellCityVotes.set(cell, m);
      if (state) { const s = cityState.get(city) ?? new Map<string, number>(); tally(s, state); cityState.set(city, s); }
    }
    if (zone) { const m = cellZoneVotes.get(cell) ?? new Map<string, number>(); tally(m, zone); cellZoneVotes.set(cell, m); }
  };

  const keptAnimals = rows.animals.filter((a) => keyFor(a.h3_r8, a.lat, a.lng));
  keptAnimals.forEach((a, i) => {
    const cell = cellOfKey(keyFor(a.h3_r8, a.lat, a.lng)!);
    animalIdx.set(a.id, i);
    animalCell.push(cell);
    vote(cell, a.city, a.zone, a.state);
  });
  const caseCell = rows.cases.map((c) => {
    const k = keyFor(c.h3_r8, null, null) ?? (c.dog_id && animalIdx.has(c.dog_id) ? cells[animalCell[animalIdx.get(c.dog_id)!]] : null);
    if (!k) return -1;
    const cell = cellOfKey(k);
    vote(cell, c.city, c.zone, null);
    return cell;
  });
  const careCell = rows.care.map((r) => {
    const k = keyFor(r.h3_r8, null, null) ?? (r.dog_id && animalIdx.has(r.dog_id) ? cells[animalCell[animalIdx.get(r.dog_id)!]] : null);
    return k ? cellOfKey(k) : -1;
  });
  const sightCell = rows.sightings.map((s) => {
    const k = keyFor(s.h3_r8, s.lat, s.lng) ?? (s.dog_id && animalIdx.has(s.dog_id) ? cells[animalCell[animalIdx.get(s.dog_id)!]] : null);
    return k ? cellOfKey(k) : -1;
  });

  /* cities: by what is recorded in them, busiest first */
  const cityCount = new Map<string, { animals: number; cases: number }>();
  const cellCityName = cells.map((_, i) => top(cellCityVotes.get(i)) ?? "Unplaced");
  animalCell.forEach((cell) => { const n = cellCityName[cell]; const v = cityCount.get(n) ?? { animals: 0, cases: 0 }; v.animals++; cityCount.set(n, v); });
  caseCell.forEach((cell) => { if (cell < 0) return; const n = cellCityName[cell]; const v = cityCount.get(n) ?? { animals: 0, cases: 0 }; v.cases++; cityCount.set(n, v); });
  const cityNames = [...cityCount.entries()].sort((a, b) => b[1].animals - a[1].animals || b[1].cases - a[1].cases).map(([n]) => n);
  const cityIdx = new Map(cityNames.map((n, i) => [n, i]));
  const cellCity = cells.map((_, i) => cityIdx.get(cellCityName[i]) ?? 0);

  /* geometry */
  const centers: number[] = [];
  const rings: number[][] = [];
  for (const k of cells) {
    const [lat, lng] = cellToLatLng(k);
    centers.push(round5(lng), round5(lat));
    rings.push(cellToBoundary(k, true).flatMap(([x, y]) => [round4(x), round4(y)]));
  }

  const cities: CityInfo[] = cityNames.map((name) => {
    const own = cells.map((_, i) => i).filter((i) => cellCityName[i] === name);
    const xs = own.map((i) => centers[i * 2]), ys = own.map((i) => centers[i * 2 + 1]);
    const known = CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
    const pad = 0.012;
    // The city is framed on where most of its records are: a handful of
    // outlying cells (a rescue on the highway out of town) should not make
    // the whole city a speck in the middle of the screen.
    const sx = [...xs].sort((a, b) => a - b), sy = [...ys].sort((a, b) => a - b);
    const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
    const [lo, hi] = xs.length >= 40 ? [0.03, 0.97] : [0, 1];
    const box: [number, number, number, number] = xs.length
      ? [q(sx, lo) - pad, q(sy, lo) - pad, q(sx, hi) + pad, q(sy, hi) + pad]
      : [68, 7, 90, 33];
    return {
      name,
      state: top(cityState.get(name)) ?? "",
      lng: known?.lng ?? (xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)),
      lat: known?.lat ?? (ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length)),
      box,
      animals: cityCount.get(name)?.animals ?? 0,
      cases: cityCount.get(name)?.cases ?? 0,
    };
  });

  /* localities: the name most often written in each cell */
  const localities: string[] = [];
  const locIdx = new Map<string, number>();
  const cellLocality = cells.map((_, i) => {
    const z = top(cellZoneVotes.get(i));
    if (!z) return -1;
    const key = z.toLowerCase();
    let li = locIdx.get(key);
    if (li === undefined) { li = localities.length; localities.push(z); locIdx.set(key, li); }
    return li;
  });

  /* dictionaries */
  const orgIds = new Map<string, number>();
  const orgNames = new Map(rows.orgs.map((o) => [o.id, o.name]));
  const orgOf = (id: string | null) => {
    if (!id) return -1;
    let i = orgIds.get(id);
    if (i === undefined) { i = orgIds.size; orgIds.set(id, i); }
    return i;
  };
  const dictIndex = (list: readonly string[], v: string | null | undefined) => {
    const i = list.indexOf((v ?? "") as never);
    return i;
  };

  /* animals */
  const animals: number[] = [];
  keptAnimals.forEach((a, i) => {
    let flags = 0;
    if (a.needs_help) flags |= AF.help;
    if ((a.status ?? "") === "injured") flags |= AF.injured;
    if (a.sterilisation_status === "sterilised") flags |= AF.sterYes;
    if (a.sterilisation_status === "not_sterilised") flags |= AF.sterNo;
    if (a.vaccination_status === "vaccinated") flags |= AF.vaccYes;
    if (a.vaccination_status === "not_vaccinated") flags |= AF.vaccNo;
    if (a.cover_photo) flags |= AF.photo;
    if (a.ear_notch && a.ear_notch.trim() && a.ear_notch !== "unknown") flags |= AF.earNotch;
    if (a.source === "resident") flags |= AF.resident;
    if (a.location_precision === "exact") flags |= AF.exact;
    const cell = animalCell[i];
    const zoneKey = (a.zone ?? "").trim().toLowerCase();
    animals.push(
      cell, cellCity[cell], dayOf(a.first_seen), dayOf(a.last_seen), flags,
      zoneKey && locIdx.has(zoneKey) ? locIdx.get(zoneKey)! : cellLocality[cell],
      a.sightings_count ?? 0, -1, orgOf(a.ngo_id),
    );
  });

  /* care, and the last vaccination it implies for each animal */
  const care: number[] = [];
  rows.care.forEach((r, i) => {
    const cell = careCell[i];
    if (cell < 0) return;
    const ai = r.dog_id ? animalIdx.get(r.dog_id) ?? -1 : -1;
    const day = dayOf(r.event_date);
    const kind = Math.max(0, dictIndex(CARE_KINDS, r.kind) >= 0 ? dictIndex(CARE_KINDS, r.kind) : CARE_KINDS.indexOf("other"));
    care.push(cell, ai, day, kind);
    if (ai >= 0 && r.kind === "vaccination" && day > animals[ai * A_STRIDE + A.lastVacc]) animals[ai * A_STRIDE + A.lastVacc] = day;
  });

  /* cases */
  const cases: number[] = [];
  rows.cases.forEach((c, i) => {
    const cell = caseCell[i];
    if (cell < 0) return;
    const day = dayOf(c.occurred_at);
    const status = c.status_class && STATUSES.includes(c.status_class as never) ? c.status_class : "unknown";
    const open = status === "open" || status === "in_progress";
    const closed = open ? -1 : c.resolved_at ? Math.max(day, dayOf(c.resolved_at)) : day;
    const cond = c.condition_class && CONDITIONS.includes(c.condition_class as never) ? c.condition_class : "Not recorded";
    cases.push(
      cell,
      c.dog_id ? animalIdx.get(c.dog_id) ?? -1 : -1,
      day,
      CONDITIONS.indexOf(cond as never),
      STATUSES.indexOf(status as never),
      c.closure_reason ? dictIndex(CLOSURE_REASONS, c.closure_reason) : -1,
      c.intake_channel ? dictIndex(INTAKES, c.intake_channel) : -1,
      typeof c.first_action_days === "number" ? c.first_action_days : -1,
      closed,
      c.resolved_at_source === "recorded" ? 1 : 0,
      Math.max(0, dictIndex(SEVERITIES, c.severity)),
      c.followups_done ?? 0, c.followups_missed ?? 0, c.followups_upcoming ?? 0,
      orgOf(c.ngo_id),
      c.source === "resident" ? 1 : 0,
    );
  });

  /* sightings */
  const sightings: number[] = [];
  rows.sightings.forEach((s, i) => {
    const cell = sightCell[i];
    if (cell < 0) return;
    let f = 0;
    if (s.has_photo) f |= SF.photo;
    if (s.sterilisation_status && s.sterilisation_status !== "unknown") f |= SF.sterObserved;
    if (s.vaccination_status && s.vaccination_status !== "unknown") f |= SF.vaccObserved;
    sightings.push(cell, s.dog_id ? animalIdx.get(s.dog_id) ?? -1 : -1, dayOf(s.created_at), f);
  });

  const today = dayOf(now.toISOString());
  const { frontier, next } = frontierAndNext(cells, cellCity, cellLocality, localities, centers, animals, cases, care, sightings, today);

  return {
    v: 1,
    scope,
    built: now.toISOString(),
    today,
    cities,
    cells,
    centers,
    rings,
    cellCity,
    cellLocality,
    localities,
    animals,
    cases,
    care,
    sightings,
    dict: {
      condition: [...CONDITIONS],
      status: [...STATUSES],
      closure: [...CLOSURE_REASONS],
      intake: [...INTAKES],
      care: [...CARE_KINDS],
      severity: [...SEVERITIES],
      org: [...orgIds.keys()].map((id) => orgNames.get(id) ?? "Organisation"),
    },
    frontier,
    next,
  };
}

/* ── the edge of what is known, and where to look next ──────────────── */

function frontierAndNext(
  cells: string[], cellCity: number[], cellLocality: number[], localities: string[], centers: number[],
  animals: number[], cases: number[], care: number[], sightings: number[], today: number,
): { frontier: FrontierCell[]; next: NextCell[] } {
  const nCells = cells.length;
  const obs = new Array(nCells).fill(0);
  const last = new Array(nCells).fill(-1);
  const events = new Array(nCells).fill(0);
  for (let i = 0; i < animals.length; i += A_STRIDE) {
    const c = animals[i + A.cell];
    obs[c]++;
    last[c] = Math.max(last[c], animals[i + A.last], animals[i + A.first]);
  }
  for (let i = 0; i < cases.length; i += C_STRIDE) { const c = cases[i + C.cell]; events[c]++; last[c] = Math.max(last[c], cases[i + C.day]); }
  for (let i = 0; i < care.length; i += K_STRIDE) { const c = care[i]; events[c]++; last[c] = Math.max(last[c], care[i + 2]); }
  for (let i = 0; i < sightings.length; i += S_STRIDE) { const c = sightings[i]; events[c]++; last[c] = Math.max(last[c], sightings[i + 2]); }

  const byKey = new Map(cells.map((k, i) => [k, i]));
  const frontier: FrontierCell[] = [];
  const seen = new Set<string>();
  const ringOf = (k: string) => cellToBoundary(k, true).flatMap(([x, y]) => [round4(x), round4(y)]);
  const neighbours = (k: string) => gridDisk(k, 1).filter((x) => x !== k);

  const recordedByCity = new Map<number, string[]>();
  cells.forEach((k, i) => { if (obs[i] > 0 || events[i] > 0) { const l = recordedByCity.get(cellCity[i]) ?? []; l.push(k); recordedByCity.set(cellCity[i], l); } });

  const frontierNear = new Map<string, number>();
  for (const [city, list] of recordedByCity) {
    // A city with a handful of records has no meaningful edge yet.
    if (list.length < 6) continue;
    const have = new Set(list);
    const ring1 = new Set<string>();
    for (const k of list) for (const n of neighbours(k)) if (!have.has(n)) ring1.add(n);
    // One ring of the unknown is drawn: enough to say where the record stops
    // without spending the payload on a honeycomb nobody has walked.
    for (const k of ring1) if (!seen.has(k)) { seen.add(k); frontier.push({ cell: k, ring: ringOf(k), near: 1, city }); frontierNear.set(k, city); }
  }

  const obsOf = (k: string) => { const i = byKey.get(k); return i === undefined ? 0 : obs[i]; };
  const candidates: NextCell[] = [];
  const consider = (k: string, city: number, own: number, lastDay: number, locality: string) => {
    const nb = neighbours(k).reduce((a, n) => a + obsOf(n), 0);
    if (nb < 12) return;
    const months = lastDay < 0 ? null : Math.round((today - lastDay) / 30.4);
    if (months != null && months < 12) return;
    const [lat, lng] = cellToLatLng(k);
    candidates.push({
      cell: k, center: [round5(lng), round5(lat)], city, locality, neighbours: nb,
      reasons: [
        `${nb.toLocaleString("en-IN")} animals recorded in the six cells around it`,
        own === 0 ? "nothing recorded here at all" : own <= 2 ? `only ${own === 1 ? "one record" : "two records"} here` : "records here are thin",
        months == null ? "never visited by a field team" : `no field record for ${months} months`,
      ],
    });
  };
  cells.forEach((k, i) => {
    const since = last[i] < 0 ? Infinity : today - last[i];
    const strong = obs[i] >= 8 && since <= 180;
    const partial = obs[i] >= 3 && since <= 365;
    if (strong || partial) return;
    consider(k, cellCity[i], obs[i], last[i], cellLocality[i] >= 0 ? localities[cellLocality[i]] : "");
  });
  for (const [k, city] of frontierNear) {
    // Name an unrecorded cell after its busiest recorded neighbour.
    let best = -1, bn = -1;
    for (const n of neighbours(k)) { const i = byKey.get(n); if (i !== undefined && obs[i] > bn) { bn = obs[i]; best = i; } }
    consider(k, city, 0, -1, best >= 0 && cellLocality[best] >= 0 ? localities[cellLocality[best]] : "");
  }
  candidates.sort((a, b) => b.neighbours - a.neighbours);
  // One suggestion per locality: two adjacent cells of the same place are one visit.
  const named = new Set<string>();
  const next = candidates.filter((c) => { const k = `${c.city}:${c.locality || c.cell}`; if (named.has(k)) return false; named.add(k); return true; });
  void centers;
  return { frontier, next: next.slice(0, 12) };
}
