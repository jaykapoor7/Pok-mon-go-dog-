/* ════════════════════════════════════════════════════════════════════
   The landing story, computed from the bounded register.

   The hero plate, the one-request walkthrough and the three-screen relay
   are all drawn from ONE sample city, never the national register. The
   city rollups name the sample (the city with the most open field work);
   that one city's cells, cases and care are read bounded and cached, and
   the compact result — a few hundred cell rings, a timeline of events, a
   handful of counts — is all the browser ever receives.

   The sample is whichever city holds the most open work, then the most
   cases, then animals: a bulk import of animals with no dated field work
   never takes the hero. Today that is Coimbatore, one partner's rescue
   register. Nothing is invented; where the record is thin the plate is.
   ════════════════════════════════════════════════════════════════════ */

import { unstable_cache } from "next/cache";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { getSupabase } from "@/lib/supabase";
import { getPublicSpatialCities, getPublicSpatialCityCells } from "@/lib/spatial/server";
import { robustStart } from "@/lib/spatial/engine";
import { CONDITIONS, DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import { cleanPlace } from "@/lib/utils";

const EPOCH_MS = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;
const dayOf = (iso: string | null) => { if (!iso) return -1; const t = Date.parse(iso); return Number.isFinite(t) ? Math.floor((t - EPOCH_MS) / DAY_MS) : -1; };
const isoOf = (day: number) => new Date(EPOCH_MS + day * DAY_MS).toISOString().slice(0, 10);
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;
const CONDITION_SET = new Set<string>(CONDITIONS as readonly string[]);
const VAGUE = new Set(["Other", "Not recorded", ""]);
const isCritical = (cond: string, severity: string | null) =>
  DEFAULT_TRIAGE[cond as Condition] === "Critical" || severity === "critical" || severity === "high";

export type LandingStory = {
  totals: { animals: number; cases: number; cities: number };
  hero: { city: string; state: string; box: [number, number, number, number]; rings: number[][]; events: number[] };
  journey: {
    condition: string; locality: string; ring: number[];
    reported: string; acted: string; actedAfter: number; closed: string; days: number; closure: string;
    care: { count: number; kinds: string[]; first: string | null };
  } | null;
  record: { requests: number; medianFirstAction: number | null };
  desk: {
    live: number; critical: number; older: number;
    queue: { condition: string; locality: string; days: number; critical: boolean; overdue: boolean }[];
    cells: { key: string; ring: number[]; open: number }[];
    box: [number, number, number, number];
  };
  relay: { date: string; condition: string; locality: string; cell: string; critical: boolean; straypawId: string; animalId: string; photo: string | null } | null;
};

type CaseFact = {
  dog_id: string | null; h3_r8: string | null; zone: string | null; occurred_at: string | null;
  condition_class: string | null; status_class: string | null; closure_reason: string | null; severity: string | null;
  first_action_days: number | null; resolved_at: string | null; resolved_at_source: string | null; followups_missed: number | null;
};
type CareFact = { dog_id: string | null; kind: string | null; event_date: string | null; h3_r8: string | null };

/** The box holding the middle of a set of cell centres, trimming outliers. */
function coreBox(centers: [number, number][], lo: number, hi: number, pad: number): [number, number, number, number] {
  if (!centers.length) return [76.8, 10.85, 77.1, 11.15];
  const xs = centers.map((c) => c[0]).sort((a, b) => a - b);
  const ys = centers.map((c) => c[1]).sort((a, b) => a - b);
  const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
  return [q(xs, lo) - pad, q(ys, lo) - pad, q(xs, hi) + pad, q(ys, hi) + pad];
}

/** A cell's boundary as the plate draws it: flat [lng, lat, lng, lat, …]. */
function ringOf(h3: string): number[] {
  const b = cellToBoundary(h3, true) as [number, number][]; // GeoJSON order: [lng, lat]
  const r: number[] = [];
  for (const p of b) r.push(round4(p[0]), round4(p[1]));
  return r;
}

async function buildStory(): Promise<LandingStory | null> {
  const supa = getSupabase();
  if (!supa) return null;

  const cities = await getPublicSpatialCities(200);
  if (!cities.length) return null;
  let sample = cities[0];
  for (const c of cities) {
    const better =
      c.open_cases > sample.open_cases ||
      (c.open_cases === sample.open_cases && (c.cases > sample.cases || (c.cases === sample.cases && c.animals > sample.animals)));
    if (better) sample = c;
  }

  const cells = await getPublicSpatialCityCells(sample.city);
  if (!cells.length) return null;
  const cellList = cells.map((c) => c.h3_r8);
  const idx = new Map<string, number>();
  cellList.forEach((h, i) => idx.set(h, i));
  const rings = cellList.map(ringOf);
  const centers = cellList.map((h) => { const [lat, lng] = cellToLatLng(h); return [lng, lat] as [number, number]; });

  /* The sample city's own field work. Bounded to one city, cached; the
     register itself is never read. */
  const [caseRes, careRes] = await Promise.all([
    supa.from("public_case_facts")
      .select("dog_id,h3_r8,zone,occurred_at,condition_class,status_class,closure_reason,severity,first_action_days,resolved_at,resolved_at_source,followups_missed")
      .eq("city", sample.city).order("occurred_at", { ascending: false }).limit(3000),
    supa.from("public_care_facts")
      .select("dog_id,kind,event_date,h3_r8")
      .eq("city", sample.city).order("event_date", { ascending: false }).limit(3000),
  ]);
  const cases = (caseRes.data ?? []) as CaseFact[];
  const care = (careRes.data ?? []) as CareFact[];
  const today = dayOf(new Date().toISOString());

  /* hero: the sample city filling in, one record at a time. */
  const raw: number[] = [];
  for (const c of cases) {
    const i = c.h3_r8 != null ? idx.get(c.h3_r8) : undefined;
    const d = dayOf(c.occurred_at);
    if (i === undefined || d < 0 || d > today) continue;
    raw.push(i, d, 0);
  }
  for (const k of care) {
    const i = k.h3_r8 != null ? idx.get(k.h3_r8) : undefined;
    const d = dayOf(k.event_date);
    if (i === undefined || d < 0 || d > today) continue;
    raw.push(i, d, 1);
  }
  const start = robustStart(Array.from({ length: raw.length / 3 }, (_, i) => raw[i * 3 + 1]));
  for (let i = 1; i < raw.length; i += 3) if (raw[i] < start) raw[i] = start;
  const order = Array.from({ length: raw.length / 3 }, (_, i) => i).sort((a, b) => raw[a * 3 + 1] - raw[b * 3 + 1]);
  const events: number[] = [];
  for (const i of order) events.push(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]);

  const hero = {
    city: sample.city,
    state: sample.state ?? "",
    box: coreBox(centers, 0.04, 0.96, 0.012),
    rings,
    events,
  };

  /* One request, followed to the end: a cleanly closed case with every step
     on record — a known condition, a first action strictly before a real
     (not assumed) closing date, so reported → on site → closed are distinct
     days — and the care given to that animal in between. Care is read for
     the shortlisted animals directly, so an older case's treatments are not
     missed by the hero's recent-care window. */
  const qualifying = cases.filter((c) => {
    const d = dayOf(c.occurred_at), cd = dayOf(c.resolved_at), fa = c.first_action_days ?? -1;
    return c.status_class === "closed" && c.resolved_at_source !== "assumed" && c.dog_id && c.h3_r8 != null && idx.has(c.h3_r8)
      && d >= 0 && cd >= 0 && fa >= 0 && cd <= today && cd - d >= 2 && cd - d <= 60 && d + fa < cd && !VAGUE.has(c.condition_class ?? "Not recorded");
  });
  const shortlist = qualifying
    .slice()
    .sort((a, b) => (dayOf(b.resolved_at) - dayOf(a.resolved_at)))
    .slice(0, 40);
  const careBy = new Map<string, { day: number; kind: string }[]>();
  if (shortlist.length) {
    const dogIds = [...new Set(shortlist.map((c) => c.dog_id as string))];
    const { data: jcare } = await supa.from("public_care_facts").select("dog_id,kind,event_date").in("dog_id", dogIds).limit(2000);
    for (const k of (jcare ?? []) as CareFact[]) {
      if (!k.dog_id) continue;
      (careBy.get(k.dog_id) ?? careBy.set(k.dog_id, []).get(k.dog_id)!).push({ day: dayOf(k.event_date), kind: (k.kind ?? "care").toLowerCase() });
    }
  }
  let pick: CaseFact | null = null, pickCare: { day: number; kind: string }[] = [], pickScore = Infinity, pickResolved = -1;
  for (const c of shortlist) {
    const d = dayOf(c.occurred_at), cd = dayOf(c.resolved_at), fa = c.first_action_days ?? 0, span = cd - d;
    const kcare = (careBy.get(c.dog_id as string) ?? []).filter((k) => k.day >= d + fa && k.day <= cd);
    // Lower is better: care first, then a gap for a visible on-site→close arc, then brevity.
    const score = (kcare.length ? 0 : 1000) + (cd - (d + fa) >= 1 ? 0 : 200) + (span < 3 ? 400 : 0) + span;
    if (score < pickScore || (score === pickScore && cd > pickResolved)) { pick = c; pickCare = kcare; pickScore = score; pickResolved = cd; }
  }
  const journey: LandingStory["journey"] = !pick ? null : (() => {
    const c = pick!;
    const d = dayOf(c.occurred_at), cd = dayOf(c.resolved_at), fa = c.first_action_days ?? 0;
    const kinds = [...new Set(pickCare.map((k) => k.kind))];
    return {
      condition: c.condition_class ?? "Not recorded",
      locality: cleanPlace(c.zone) || sample.city,
      ring: c.h3_r8 ? rings[idx.get(c.h3_r8)!] : [],
      reported: isoOf(d), acted: isoOf(d + fa), actedAfter: fa, closed: isoOf(cd), days: cd - d,
      closure: c.closure_reason ?? "unspecified",
      care: { count: pickCare.length, kinds, first: pickCare.length ? isoOf(Math.min(...pickCare.map((k) => k.day))) : null },
    };
  })();

  /* record: the sample city's requests and how fast half were acted on. */
  const faDays = cases.map((c) => c.first_action_days ?? -1).filter((n) => n >= 0).sort((a, b) => a - b);
  const medianFirstAction = faDays.length ? faDays[Math.floor(faDays.length / 2)] : null;
  const record = { requests: cases.length, medianFirstAction };

  /* the field desk: the console an organisation working this city opens to,
     drawn from the same public record. */
  const openCases = cases.filter((c) => c.status_class !== "closed" && dayOf(c.occurred_at) >= 0 && dayOf(c.occurred_at) <= today);
  const live = openCases.filter((c) => today - dayOf(c.occurred_at) <= 90);
  const crit = (c: CaseFact) => isCritical(c.condition_class ?? "", c.severity);
  const rank = (c: CaseFact) => ((c.followups_missed ?? 0) > 0 ? 0 : crit(c) ? 1 : 2);
  const openByCell = new Map<string, number>();
  for (const c of live) if (c.h3_r8) openByCell.set(c.h3_r8, (openByCell.get(c.h3_r8) ?? 0) + 1);
  const desk = {
    live: live.length,
    critical: live.filter(crit).length,
    older: openCases.length - live.length,
    queue: [...live].sort((a, b) => rank(a) - rank(b) || dayOf(a.occurred_at) - dayOf(b.occurred_at)).slice(0, 3).map((c) => ({
      condition: c.condition_class ?? "Not recorded", locality: cleanPlace(c.zone) || "", days: today - dayOf(c.occurred_at), critical: crit(c), overdue: (c.followups_missed ?? 0) > 0,
    })),
    cells: cellList.map((h) => ({ key: h, ring: rings[idx.get(h)!], open: openByCell.get(h) ?? 0 })),
    box: coreBox(centers, 0.02, 0.98, 0.01),
  };

  /* One report, three screens: a real recent request whose animal carries a
     StrayPaw ID (and, where it has one, its own photograph). No match, no
     relay — the landing never prints an id it cannot back. */
  const relay = await resolveRelay(supa, cases, sample.city);

  const totals = {
    animals: cities.reduce((n, c) => n + (c.animals || 0), 0),
    cases: cities.reduce((n, c) => n + (c.cases || 0), 0),
    cities: cities.filter((c) => (c.animals || 0) > 0).length,
  };

  return { totals, hero, journey, record, desk, relay };
}

const GRAPHIC = /maggot|wound|injur|accident|fracture|tumou?r|prolapse|abuse/i;

async function resolveRelay(
  supa: NonNullable<ReturnType<typeof getSupabase>>,
  cases: CaseFact[],
  city: string,
): Promise<LandingStory["relay"]> {
  const recent = cases.filter((c) => c.dog_id && c.condition_class && c.h3_r8 && !VAGUE.has(c.condition_class) && dayOf(c.occurred_at) >= 0).slice(0, 24);
  if (!recent.length) return null;
  const ids = [...new Set(recent.map((c) => c.dog_id as string))].slice(0, 24);
  const { data } = await supa.from("public_spatial_animals").select("id,straypaw_id,cover_photo").in("id", ids).limit(ids.length);
  const byId = new Map<string, { straypaw_id: string | null; cover_photo: string | null }>();
  for (const a of (data ?? []) as { id: string; straypaw_id: string | null; cover_photo: string | null }[]) byId.set(a.id, a);
  const built = recent
    .map((c) => {
      const a = byId.get(c.dog_id as string);
      if (!a?.straypaw_id) return null;
      return {
        date: isoOf(dayOf(c.occurred_at)), condition: c.condition_class as string, locality: cleanPlace(c.zone) || city,
        cell: c.h3_r8 as string, critical: isCritical(c.condition_class as string, c.severity),
        straypawId: a.straypaw_id, animalId: c.dog_id as string, photo: a.cover_photo?.trim() || null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (!built.length) return null;
  /* Prefer a report whose animal was photographed, and a calm condition over
     a graphic one; otherwise the most recent real record carries it. */
  return built.find((f) => f.photo && !GRAPHIC.test(f.condition)) ?? built.find((f) => f.photo) ?? built.find((f) => !GRAPHIC.test(f.condition)) ?? built[0];
}

/* Bounded, cached: one sample city's rollup, cells, cases and care, assembled
   into the compact story the landing draws. */
export const getLandingStory = unstable_cache(
  async (): Promise<LandingStory | null> => buildStory(),
  ["landing-story-bounded-v2"],
  { revalidate: 600 },
);

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
      .eq("source", "resident").not("cover_photo", "is", null).neq("cover_photo", "").order("last_seen", { ascending: false }).limit(120),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as Array<any>;
  /* A fuller set of calm, photographed dogs for the landing's marquee — the
     register shown as a wall of real profiles, not a short stack. */
  const picks = rows.filter((row) => row.cover_photo?.trim() && !row.needs_help && row.status !== "injured").slice(0, 18);
  const ids = picks.map((row) => row.id);
  const [{ data: cases }, { data: care }] = ids.length ? await Promise.all([
    supa.from("public_case_facts").select("dog_id,condition_class,status_class,occurred_at").in("dog_id", ids).order("occurred_at", { ascending: false }).limit(360),
    supa.from("public_care_facts").select("dog_id,kind,event_date").in("dog_id", ids).order("event_date", { ascending: false }).limit(540),
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
}, ["landing-animal-register-v8"], { revalidate: 300 });
