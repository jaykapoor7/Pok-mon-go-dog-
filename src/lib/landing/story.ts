/* ════════════════════════════════════════════════════════════════════
   The landing page's story, computed from the register.

   Every figure and every shape on the landing is derived here, on the
   server, from the same spatial dataset the map reads. The browser gets
   the compact result — a sample city's cells and events, a handful of
   counts — never the register itself.

   The sample city is whichever city holds the most field work (cases),
   not the most animals: a bulk import of animals with no cases and no
   dates would otherwise take the hero and leave it nothing to replay.
   Today that is Coimbatore, from one partner's rescue register.
   ════════════════════════════════════════════════════════════════════ */

import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { unstable_cache } from "next/cache";
import { cellToLatLng, isValidCell } from "h3-js";
import { getPublicDataset, SPATIAL_TAG } from "@/lib/spatial/server";
import { buildIndex, openNow, robustStart } from "@/lib/spatial/engine";
import { animalKnowledge, casesIn, firstAction, statusTotals } from "@/lib/spatial/measures";
import { A_STRIDE, C, C_STRIDE, K, K_STRIDE, RES, countOf, type SpatialDataset } from "@/lib/spatial/types";
import { CONDITIONS, DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";

export type LandingStory = Awaited<ReturnType<typeof buildStory>>;

/** The box that holds the middle of a set of cells, trimming far outliers. */
function coreBox(ds: SpatialDataset, cells: number[], lo: number, hi: number, pad: number): [number, number, number, number] {
  if (!cells.length) return [76.8, 10.85, 77.1, 11.15];
  const xs = cells.map((c) => ds.centers[c * 2]).sort((a, b) => a - b);
  const ys = cells.map((c) => ds.centers[c * 2 + 1]).sort((a, b) => a - b);
  const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
  return [q(xs, lo) - pad, q(ys, lo) - pad, q(xs, hi) + pad, q(ys, hi) + pad];
}

function buildStory(ds: SpatialDataset) {
  const ix = buildIndex(ds);
  // The city with the most cases; animals only break a tie.
  let city = 0;
  ds.cities.forEach((c, i) => { const b = ds.cities[city]; if (c.cases > b.cases || (c.cases === b.cases && c.animals > b.animals)) city = i; });
  const sample = ds.cities[city];
  const cityCells = new Set<number>();
  ds.cellCity.forEach((c, i) => { if (c === city) cityCells.add(i); });
  const cityCases = casesIn(ds, { cells: cityCells, from: 0, to: ds.today });

  /* hero: the sample city filling in, one record at a time */
  const cellList = [...cityCells];
  const localIdx = new Map(cellList.map((c, i) => [c, i]));
  const events: number[] = [];
  // Records dated after today are data-entry errors in the source workbook
  // (a follow-up "due" in 2030 marked done). They are left out of anything
  // drawn over time, and counted as an evidence issue instead.
  let futureDated = 0;
  for (let i = 0; i < ix.nCases; i++) {
    const o = i * C_STRIDE, c = ds.cases[o + C.cell], d = ds.cases[o + C.day];
    if (!localIdx.has(c) || d < 0) continue;
    if (d > ds.today) { futureDated++; continue; }
    events.push(localIdx.get(c)!, d, 0);
  }
  for (let i = 0; i < ix.nCare; i++) {
    const o = i * K_STRIDE, c = ds.care[o + K.cell], d = ds.care[o + K.day];
    if (!localIdx.has(c) || d < 0) continue;
    if (d > ds.today) { futureDated++; continue; }
    events.push(localIdx.get(c)!, d, 1);
  }
  // The replay starts where the record really begins; a stray early date
  // (a 2011 vaccination in a 2024 import) joins the first frame instead of
  // stretching the replay across empty years.
  const start = robustStart(Array.from({ length: events.length / 3 }, (_, i) => events[i * 3 + 1]));
  for (let i = 1; i < events.length; i += 3) if (events[i] < start) events[i] = start;
  // sort by day
  const order = Array.from({ length: events.length / 3 }, (_, i) => i).sort((a, b) => events[a * 3 + 1] - events[b * 3 + 1]);
  const sorted: number[] = [];
  for (const i of order) sorted.push(events[i * 3], events[i * 3 + 1], events[i * 3 + 2]);

  const hero = {
    city: sample?.name ?? "",
    state: sample?.state ?? "",
    box: coreBox(ds, cellList, 0.04, 0.96, 0.012),
    rings: cellList.map((c) => ds.rings[c]),
    events: sorted,
    futureDated,
  };

  /* One request, followed through the record: a quickly closed case in the
     sample city that has every step written down (a known condition, a
     first action, a closing date that was not assumed), with the care
     given to that animal in between. */
  const CLOSED_I = ds.dict.status.indexOf("closed");
  const vague = new Set(["Other", "Not recorded"]);
  const careBy = new Map<number, { day: number; kind: string }[]>();
  for (let i = 0; i < ix.nCare; i++) {
    const o = i * K_STRIDE, a = ds.care[o + K.animal];
    if (a < 0) continue;
    (careBy.get(a) ?? careBy.set(a, []).get(a)!).push({ day: ds.care[o + K.day], kind: ds.dict.care[ds.care[o + K.kind]] ?? "other" });
  }
  let pick = -1, pickCare: { day: number; kind: string }[] = [];
  for (const i of cityCases) {
    const o = i * C_STRIDE, d = ds.cases[o + C.day], fa = ds.cases[o + C.firstAction], cd = ds.cases[o + C.closedDay];
    if (ds.cases[o + C.status] !== CLOSED_I || ds.cases[o + C.resolvedSrc] === RES.assumed) continue;
    if (d < 0 || fa < 0 || cd < 0 || cd > ds.today || cd - d < 2 || cd - d > 60 || d + fa > cd) continue;
    if (vague.has(CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded")) continue;
    const care = (careBy.get(ds.cases[o + C.animal]) ?? []).filter((k) => k.day >= d + fa && k.day <= cd);
    // Prefer a case with care on record; among those, the quickest to close
    // (three days or more, so each step has its own day); then the most recent.
    const len = cd - d, pLen = pick < 0 ? 0 : ds.cases[pick * C_STRIDE + C.closedDay] - ds.cases[pick * C_STRIDE + C.day];
    const score = (hasCare: boolean, l: number) => (hasCare ? 0 : 1000) + (l < 3 ? 500 : 0) + l;
    const better = pick < 0 || score(care.length > 0, len) < score(pickCare.length > 0, pLen) || (score(care.length > 0, len) === score(pickCare.length > 0, pLen) && cd > ds.cases[pick * C_STRIDE + C.closedDay]);
    if (better) { pick = i; pickCare = care; }
  }
  const iso = (day: number) => new Date(Date.UTC(2000, 0, 1) + day * 86_400_000).toISOString().slice(0, 10);
  const journey = pick < 0 ? null : (() => {
    const o = pick * C_STRIDE, d = ds.cases[o + C.day], fa = ds.cases[o + C.firstAction], cd = ds.cases[o + C.closedDay];
    const li = ds.cellLocality[ds.cases[o + C.cell]];
    const kinds = [...new Set(pickCare.map((k) => k.kind))];
    return {
      condition: CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded",
      locality: li >= 0 ? ds.localities[li] : sample?.name ?? "",
      /* The request's own cell, the finest place the public record gives it. */
      ring: ds.rings[ds.cases[o + C.cell]],
      reported: iso(d), acted: iso(d + fa), actedAfter: fa, closed: iso(cd), days: cd - d,
      closure: ds.dict.closure[ds.cases[o + C.closure]] ?? "unspecified",
      care: { count: pickCare.length, kinds, first: pickCare.length ? iso(Math.min(...pickCare.map((k) => k.day))) : null },
    };
  })();
  const status = statusTotals(ds, cityCases);
  const fa = firstAction(ds, cityCases);
  const record = { requests: cityCases.length, closedAfterWork: (status as Record<string, number>).closed ?? 0, medianFirstAction: fa.median };

  /* the field desk: the dashboard an organisation working in the sample city
     opens to, drawn from the same public record. The queue follows the
     workspace's rule: missed follow-ups, then critical, then the rest, the
     oldest first in each. Live work is what opened in the last 90 days;
     older open cases are the ones that need a decision. */
  const at = (i: number, k: number) => ds.cases[i * C_STRIDE + k];
  const isCritical = (i: number) => DEFAULT_TRIAGE[(CONDITIONS[at(i, C.cond)] ?? "Not recorded") as Condition] === "Critical";
  const openCity = cityCases.filter((i) => openNow(ds, i) && at(i, C.day) >= 0 && at(i, C.day) <= ds.today);
  const live = openCity.filter((i) => ds.today - at(i, C.day) <= 90);
  const rank = (i: number) => (at(i, C.fuMissed) > 0 ? 0 : isCritical(i) ? 1 : 2);
  const openBy = new Map<number, number>();
  for (const i of live) openBy.set(at(i, C.cell), (openBy.get(at(i, C.cell)) ?? 0) + 1);
  const desk = {
    live: live.length,
    critical: live.filter(isCritical).length,
    older: openCity.length - live.length,
    queue: [...live].sort((a, b) => rank(a) - rank(b) || at(a, C.day) - at(b, C.day)).slice(0, 3).map((i) => {
      const li = ds.cellLocality[at(i, C.cell)];
      return { condition: CONDITIONS[at(i, C.cond)] ?? "Not recorded", locality: li >= 0 ? ds.localities[li] : "", days: ds.today - at(i, C.day), critical: isCritical(i), overdue: at(i, C.fuMissed) > 0 };
    }),
    cells: cellList.map((c) => ({ key: ds.cells[c], ring: ds.rings[c], open: openBy.get(c) ?? 0 })),
    box: coreBox(ds, cellList, 0.02, 0.98, 0.01),
    /* The city's most recent real events, oldest first, for the mockup to
       replay: a request coming in, a field team's first action, a closure
       after field work. Each keeps its own date. */
    feed: (() => {
      const CLOSED = ds.dict.status.indexOf("closed");
      const ev: { kind: "report" | "action" | "closed"; day: number; condition: string; locality: string; cell: string; critical: boolean }[] = [];
      for (const i of cityCases) {
        const li = ds.cellLocality[at(i, C.cell)];
        const base = { condition: CONDITIONS[at(i, C.cond)] ?? "Not recorded", locality: li >= 0 ? ds.localities[li] : "", cell: ds.cells[at(i, C.cell)], critical: isCritical(i) };
        const d = at(i, C.day), fa = at(i, C.firstAction), cd = at(i, C.closedDay);
        if (d >= 0 && d <= ds.today) ev.push({ kind: "report", day: d, ...base });
        if (d >= 0 && fa > 0 && d + fa <= ds.today) ev.push({ kind: "action", day: d + fa, ...base });
        if (cd >= 0 && cd <= ds.today && at(i, C.status) === CLOSED) ev.push({ kind: "closed", day: cd, ...base });
      }
      return ev.sort((a, b) => a.day - b.day).slice(-14).map((e) => ({ ...e, date: new Date(Date.UTC(2000, 0, 1) + e.day * 86_400_000).toISOString().slice(0, 10) }));
    })(),
  };

  /* what is known, and what is not */
  const knowledge = animalKnowledge(ds, ix, null, ds.today);

  /* the register across India */
  const citiesWithAnimals = ds.cities.filter((c) => c.animals > 0).length;

  return {
    totals: {
      animals: countOf(ds.animals, A_STRIDE),
      cases: countOf(ds.cases, C_STRIDE),
      care: countOf(ds.care, K_STRIDE),
      sightings: countOf(ds.sightings, 4),
      residentAnimals: knowledge.resident,
      cities: citiesWithAnimals,
      sampleShare: sample ? sample.animals / Math.max(1, countOf(ds.animals, A_STRIDE)) : 0,
      cityCases: cityCases.length,
    },
    hero,
    journey,
    record,
    desk,
    today: ds.today,
    built: ds.built,
  };
}

/* The story is computed from the cached dataset, and the photo strip is two
   reads; both were redone on every visit to the landing. They share the
   dataset's tag, so an edit that refreshes the map refreshes these too. */
export const getLandingStory = unstable_cache(async () => {
  const ds = await getPublicDataset(null);
  if (!ds || !ds.cities.length) return null;
  const story = buildStory(ds);
  return { ...story, relay: await resolveRelay(story.desk.feed, story.desk.cells.map((c) => c.key), story.hero.city) };
}, ["landing-story-v10"], { revalidate: 600, tags: [SPATIAL_TAG] });

/* One report, three screens, carries the record's own identifier across
   all three. The dataset holds no ids by design, so the most recent real
   requests in the feed are looked up again by their cell, day and
   condition; the first whose animal has a StrayPaw ID is the one shown.
   No match, no relay: the landing never prints an id it cannot back. */
type FeedEvent = LandingStory["desk"]["feed"][number];
async function resolveRelay(feed: FeedEvent[], cityCells: string[], city: string) {
  const admin = getSupabaseAdmin();
  const supa = admin ?? getSupabase();
  if (!supa) return null;
  const animalFor = async (dogId: string) => {
    const table = admin ? "dogs" : "public_spatial_animals";
    const { data } = await supa.from(table).select("id,straypaw_id,cover_photo").eq("id", dogId).maybeSingle();
    return data as { id: string; straypaw_id: string | null; cover_photo: string | null } | null;
  };
  /* The phone shows the report's own photograph, so a report whose animal
     was photographed is preferred, and among those one without a wound on
     camera (as the photo section above does). A report with no photograph
     is still shown, with the photo slot marked as such. */
  type Found = { kind: "report"; date: string; condition: string; locality: string; cell: string; critical: boolean; animalId: string; straypawId: string; photo: string | null };
  const found: Found[] = [];
  const graphic = /maggot|wound|injur|accident|fracture|tumou?r|prolapse|abuse/i;
  const best = () => found.find((f) => f.photo && !graphic.test(f.condition)) ?? found.find((f) => f.photo) ?? found[0] ?? null;
  const reports = [...feed].reverse().filter((e) => e.kind === "report").slice(0, 6);
  for (const e of reports) {
    const next = new Date(Date.parse(`${e.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    const { data: facts } = await supa.from("public_case_facts").select("dog_id")
      .eq("h3_r8", e.cell).eq("condition_class", e.condition).gte("occurred_at", e.date).lt("occurred_at", next)
      .not("dog_id", "is", null).limit(1);
    const dogId = (facts?.[0] as { dog_id: string } | undefined)?.dog_id;
    if (!dogId) continue;
    const a = await animalFor(dogId);
    if (a?.straypaw_id) found.push({ ...e, kind: "report", animalId: a.id, straypawId: a.straypaw_id, photo: a.cover_photo?.trim() || null });
  }
  if (best()?.photo) return best();

  /* Few animals carry a photograph, so look from the other side too: the
     city's photographed animals first, then the latest real request on one
     of them, calm conditions preferred. */
  if (cityCells.length) {
    const { data: pics } = await supa.from("public_spatial_animals").select("id,straypaw_id,cover_photo,h3_r8")
      .in("h3_r8", cityCells.slice(0, 300)).not("cover_photo", "is", null).neq("cover_photo", "").not("straypaw_id", "is", null).limit(200);
    const byId = new Map(((pics ?? []) as { id: string; straypaw_id: string; cover_photo: string; h3_r8: string }[]).map((r) => [r.id, r]));
    if (byId.size) {
      const { data: facts } = await supa.from("public_case_facts").select("dog_id,h3_r8,condition_class,occurred_at,zone")
        .in("dog_id", [...byId.keys()]).order("occurred_at", { ascending: false }).limit(80);
      const rows = ((facts ?? []) as { dog_id: string; h3_r8: string | null; condition_class: string | null; occurred_at: string; zone: string | null }[]);
      const pick = rows.find((r) => !graphic.test(r.condition_class ?? "")) ?? rows[0];
      const a = pick ? byId.get(pick.dog_id) : undefined;
      if (pick && a) {
        const condition = pick.condition_class || "Other";
        return {
          kind: "report" as const, date: pick.occurred_at.slice(0, 10), condition, locality: pick.zone || city,
          cell: pick.h3_r8 || a.h3_r8, critical: DEFAULT_TRIAGE[condition as Condition] === "Critical",
          animalId: a.id, straypawId: a.straypaw_id, photo: a.cover_photo.trim(),
        };
      }
    }
  }

  /* The latest visual replay is deliberately short, but a corrected import
     may have only an older encounter linked to a defensible animal identity.
     Look across the sample city's real cells before giving up, so the system
     diagram does not disappear merely because recent encounters are rightly
     provisional. */
  if (cityCells.length) {
    const { data } = await supa.from("public_case_facts")
      .select("dog_id,h3_r8,condition_class,occurred_at,zone")
      .not("dog_id", "is", null)
      .in("h3_r8", cityCells.slice(0, 300))
      .order("occurred_at", { ascending: false })
      .limit(60);
    for (const row of (data ?? []) as { dog_id: string | null; h3_r8: string | null; condition_class: string | null; occurred_at: string; zone: string | null }[]) {
      if (!row.dog_id || !row.h3_r8) continue;
      const a = await animalFor(row.dog_id);
      if (!a?.straypaw_id) continue;
      const condition = row.condition_class || "Other";
      found.push({
        kind: "report" as const,
        date: row.occurred_at.slice(0, 10),
        condition,
        locality: row.zone || city,
        cell: row.h3_r8,
        critical: DEFAULT_TRIAGE[condition as Condition] === "Critical",
        animalId: a.id,
        straypawId: a.straypaw_id,
        photo: a.cover_photo?.trim() || null,
      });
      if (best()?.photo && !graphic.test(condition)) break;
    }
  }
  return best();
}

/** Resident photographs on the record, newest first, for the register strip. */
export const getPhotoRegister = unstable_cache(readPhotoRegister, ["photo-register-v3"], { revalidate: 300, tags: [SPATIAL_TAG] });

/* Case conditions that do not mean a wound on camera: routine ABC and ARV,
   and abandonment. Anything else on a case, an "injured" status or a
   needs-help flag puts the photograph after the calm ones. */
const CALM_CONDITIONS = new Set(["Sterilisation (ABC)", "Vaccination (ARV)", "Abandonment"]);

type PhotoRecord = { id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null; last_seen: string | null; h3_r8?: string | null };
/** Where a photographed animal is drawn: the centre of its cell, never finer. */
const cellPoint = (h: string | null | undefined): [number, number] | null => { if (!h || !isValidCell(h)) return null; const [lat, lng] = cellToLatLng(h); return [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]; };

async function readPhotoRegister(limit = 24) {
  const supa = getSupabase();
  if (!supa) return { rows: [], total: 0 };
  /* A wider pool than the strip shows, so the strip can lead with animals
     photographed without a visible injury and still be full. */
  const [{ data }, { count }] = await Promise.all([
    supa.from("public_spatial_animals").select("id,name,straypaw_id,cover_photo,zone,city,last_seen,status,needs_help,h3_r8").not("cover_photo", "is", null).neq("cover_photo", "").order("last_seen", { ascending: false }).limit(limit * 4),
    supa.from("public_spatial_animals").select("id", { count: "exact", head: true }).not("cover_photo", "is", null).neq("cover_photo", ""),
  ]);
  const pool = (data ?? []) as (PhotoRecord & { status: string | null; needs_help: boolean | null })[];
  const hurt = new Set(pool.filter((r) => r.status === "injured" || r.needs_help).map((r) => r.id));
  if (pool.length) {
    const { data: cases } = await supa.from("public_case_facts").select("dog_id,condition_class").in("dog_id", pool.map((r) => r.id));
    for (const c of (cases ?? []) as { dog_id: string | null; condition_class: string | null }[]) {
      if (c.dog_id && c.condition_class && !CALM_CONDITIONS.has(c.condition_class)) hurt.add(c.dog_id);
    }
  }
  const ordered = [...pool.filter((r) => !hurt.has(r.id)), ...pool.filter((r) => hurt.has(r.id))].slice(0, limit);
  const rows = ordered.map(({ id, name, straypaw_id, cover_photo, zone, city, last_seen, h3_r8 }) => ({ id, name, straypaw_id, cover_photo, zone, city, last_seen, pt: cellPoint(h3_r8) }));
  return { rows, total: count ?? 0 };
}
