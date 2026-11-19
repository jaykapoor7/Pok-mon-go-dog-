import type { SupabaseClient } from "@supabase/supabase-js";
import { allRows } from "@/lib/all-rows";

/* ════════════════════════════════════════════════════════════════════
   Programme figures: the organisation's own register, counted.

   One read of the register under the caller's session (row-level security
   decides what is visible), then arithmetic. Recorded counts only: the
   denominator is animals on the record, never the street population, and
   an unknown status is counted as unknown, not as "no". Used by Kaju's
   answers ("how many are sterilised?") and by the programme summary
   report, so a deck and a chat reply can never disagree.
   ════════════════════════════════════════════════════════════════════ */

const CAP = 5000;
const DAY = 86_400_000;
/** The one rule for "sterilised" on every surface: the animal's recorded status says so. An unknown status is "not
    recorded", never "not sterilised" (the `sterilised` boolean is false for both, so nothing counts from it). */
const STERILISED = ["sterilised", "sterilized"];
export type Figures = {
  animals: number; capped: boolean;
  sterilised: number; sterilisationUnknown: number; vaccinated: number; vaccinationUnknown: number;
  added30: number; added7: number;
  wards: { zone: string; recorded: number; sterilised: number; vaccinated: number }[]; noWard: number;
  openCases: number | null;
  abc: { total: number; awaitingVet: number; awaitingReview: number; accepted: number } | null;
};

export async function programmeFigures(db: SupabaseClient, ngoId: string, now = Date.now()): Promise<Figures> {
  /* The totals are exact counts from the database; the ward table is built from the register itself, read a page of
     1,000 at a time (the API's own cap) up to CAP. Reading one page would count only the newest 1,000 animals. */
  const head = () => db.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId);
  const d30 = new Date(now - 30 * DAY).toISOString(), d7 = new Date(now - 7 * DAY).toISOString();
  const [dogs, total, ster, sterUnknown, vacc, vaccUnknown, added30, added7, open, queue] = await Promise.all([
    allRows<{ zone: string | null; sterilisation_status: string | null; vaccination_status: string | null; created_at: string | null }>(
      (from, to) => db.from("dogs").select("zone,sterilisation_status,vaccination_status,created_at").eq("ngo_id", ngoId).order("created_at", { ascending: false }).order("id").range(from, to), CAP).catch(() => null),
    head(),
    head().in("sterilisation_status", STERILISED),
    head().or("sterilisation_status.is.null,sterilisation_status.eq.unknown"),
    head().eq("vaccination_status", "vaccinated"),
    head().or("vaccination_status.is.null,vaccination_status.eq.unknown"),
    head().gte("created_at", d30),
    head().gte("created_at", d7),
    db.from("org_case_facts").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).in("status_class", ["open", "in_progress"]).or("provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null"),
    db.rpc("abc_verification_queue", { p_limit: 500 }),
  ]);
  if (!dogs) throw new Error("The animal register could not be read.");
  const rows = dogs.rows;
  const exact = (r: { error: unknown; count: number | null }, fallback: number) => (!r.error && typeof r.count === "number" ? r.count : fallback);
  let s = 0, su = 0, v = 0, vu = 0, a30 = 0, a7 = 0;
  const f: Figures = { animals: exact(total, rows.length), capped: dogs.capped, sterilised: 0, sterilisationUnknown: 0, vaccinated: 0, vaccinationUnknown: 0, added30: 0, added7: 0, wards: [], noWard: 0, openCases: open.error || typeof open.count !== "number" ? null : open.count, abc: null };
  const by = new Map<string, { zone: string; recorded: number; sterilised: number; vaccinated: number }>();
  for (const r of rows) {
    const st = (r.sterilisation_status ?? "").toLowerCase(), vx = (r.vaccination_status ?? "").toLowerCase();
    const isSt = STERILISED.includes(st), isVx = vx === "vaccinated";
    if (isSt) s++; else if (!st || st === "unknown") su++;
    if (isVx) v++; else if (!vx || vx === "unknown") vu++;
    const age = r.created_at ? now - Date.parse(r.created_at) : NaN;
    if (age <= 30 * DAY) a30++;
    if (age <= 7 * DAY) a7++;
    const zone = r.zone?.trim();
    if (!zone) { f.noWard++; continue; }
    const w = by.get(zone) ?? { zone, recorded: 0, sterilised: 0, vaccinated: 0 };
    w.recorded++; if (isSt) w.sterilised++; if (isVx) w.vaccinated++;
    by.set(zone, w);
  }
  f.sterilised = exact(ster, s); f.sterilisationUnknown = exact(sterUnknown, su);
  f.vaccinated = exact(vacc, v); f.vaccinationUnknown = exact(vaccUnknown, vu);
  f.added30 = exact(added30, a30); f.added7 = exact(added7, a7);
  f.wards = [...by.values()].sort((a, b) => b.recorded - a.recorded);
  if (!queue.error && Array.isArray(queue.data)) {
    const q = queue.data as { vet_authorised?: boolean; evidence_reviewed?: boolean; government_accepted?: boolean; provenance?: string | null }[];
    const live = q.filter((r) => r.provenance !== "imported_historical_record");
    f.abc = { total: live.length, awaitingVet: live.filter((r) => !r.vet_authorised).length, awaitingReview: live.filter((r) => r.vet_authorised && !r.evidence_reviewed).length, accepted: live.filter((r) => r.government_accepted).length };
  }
  return f;
}

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "n/a");
/** The figures as report rows: Measure, Value, What it means. */
export function figureRows(f: Figures): (string | number)[][] {
  const base = f.animals;
  const rows: (string | number)[][] = [
    ["Animals on the register", f.animals, f.capped ? `Ward rows below use the ${CAP.toLocaleString("en-IN")} most recent records; the totals count every animal` : "Every animal your organisation has recorded"],
    ["Sterilisation recorded", f.sterilised, `${pct(f.sterilised, base)} of the animals on the register; ${f.sterilisationUnknown.toLocaleString("en-IN")} not recorded`],
    ["Vaccination recorded", f.vaccinated, `${pct(f.vaccinated, base)} of the animals on the register; ${f.vaccinationUnknown.toLocaleString("en-IN")} not recorded`],
    ["Animals added in the last 30 days", f.added30, `${f.added7} in the last 7 days`],
    ["Open cases in current work", f.openCases ?? "not read", "Unreviewed historical imports excluded"],
  ];
  if (f.abc) rows.push(["ABC records in the pipeline", f.abc.total, `${f.abc.awaitingVet} waiting for a vet · ${f.abc.awaitingReview} waiting for review · ${f.abc.accepted} accepted by the office`]);
  for (const w of f.wards.slice(0, 8)) rows.push([`Ward: ${w.zone}`, w.recorded, `${w.sterilised} sterilised · ${w.vaccinated} vaccinated (recorded)`]);
  if (f.noWard) rows.push(["Animals with no ward recorded", f.noWard, "A gap in the record, not a zero"]);
  return rows;
}
