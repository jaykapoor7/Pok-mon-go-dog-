Warning: truncated output (original token count: 4530)
Total output lines: 311

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
/* Every landing read is deliberately capped. Keep the bounds named so the
 * static performance guard can prevent a future full-register regression. */
const LANDING_LIMITS = {
  cityFacts: 3_000,
  joinedCare: 2_000,
  relayCandidates: 24,
  registerCandidates: 120,
  registerCards: 18,
  registerCases: 360,
  registerCare: 540,
} as const;
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
type CareFact = { dog_id: string …2530 tokens truncated…alId: c.dog_id as string, photo: a.cover_photo?.trim() || null,
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
      .eq("source", "resident").not("cover_photo", "is", null).neq("cover_photo", "").order("last_seen", { ascending: false }).limit(LANDING_LIMITS.registerCandidates),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as Array<any>;
  /* A fuller set of calm, photographed dogs for the landing's marquee — the
     register shown as a wall of real profiles, not a short stack. */
  const picks = rows.filter((row) => row.cover_photo?.trim() && !row.needs_help && row.status !== "injured").slice(0, LANDING_LIMITS.registerCards);
  const ids = picks.map((row) => row.id);
  const [{ data: cases }, { data: care }] = ids.length ? await Promise.all([
    supa.from("public_case_facts").select("dog_id,condition_class,status_class,occurred_at").in("dog_id", ids).order("occurred_at", { ascending: false }).limit(LANDING_LIMITS.registerCases),
    supa.from("public_care_facts").select("dog_id,kind,event_date").in("dog_id", ids).order("event_date", { ascending: false }).limit(LANDING_LIMITS.registerCare),
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
