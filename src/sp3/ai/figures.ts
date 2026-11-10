import type { SupabaseClient } from "@supabase/supabase-js";

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
export type Figures = {
  animals: number; capped: boolean;
  sterilised: number; sterilisationUnknown: number; vaccinated: number; vaccinationUnknown: number;
  added30: number; added7: number;
  wards: { zone: string; recorded: number; sterilised: number; vaccinated: number }[]; noWard: number;
  openCases: number | null;
  abc: { total: number; awaitingVet: number; awaitingReview: number; accepted: number } | null;
};

export async function programmeFigures(db: SupabaseClient, ngoId: string, now = Date.now()): Promise<Figures> {
  const [dogs, total, open, queue] = await Promise.all([
    db.from("dogs").select("zone,sterilisation_status,vaccination_status,created_at").eq("ngo_id", ngoId).order("created_at", { ascending: false }).limit(CAP),
    db.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId),
    db.from("org_case_facts").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).in("status_class", ["open", "in_progress"]).or("provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null"),
    db.rpc("abc_verification_queue", { p_limit: 500 }),
  ]);
  if (dogs.error) throw new Error("The animal register could not be read.");
  const rows = (dogs.data ?? []) as { zone: string | null; sterilisation_status: string | null; vaccination_status: string | null; created_at: string | null }[];
  const f: Figures = { animals: typeof total.count === "number" ? total.count : rows.length, capped: rows.length >= CAP, sterilised: 0, sterilisationUnknown: 0, vaccinated: 0, vaccinationUnknown: 0, added30: 0, added7: 0, wards: [], noWard: 0, openCases: open.error || typeof open.count !== "number" ? null : open.count, abc: null };
  const by = new Map<string, { zone: string; recorded: number; sterilised: number; vaccinated: number }>();
  for (const r of rows) {
    const st = (r.sterilisation_status ?? "").toLowerCase(), vx = (r.vaccination_status ?? "").toLowerCase();
    const isSt = st === "sterilised" || st === "sterilized", isVx = vx === "vaccinated";
    if (isSt) f.sterilised++; else if (!st || st === "unknown") f.sterilisationUnknown++;
    if (isVx) f.vaccinated++; else if (!vx || vx === "unknown") f.vaccinationUnknown++;
    const age = r.created_at ? now - Date.parse(r.created_at) : NaN;
    if (age <= 30 * DAY) f.added30++;
    if (age <= 7 * DAY) f.added7++;
    const zone = r.zone?.trim();
    if (!zone) { f.noWard++; continue; }
    const w = by.get(zone) ?? { zone, recorded: 0, sterilised: 0, vaccinated: 0 };
    w.recorded++; if (isSt) w.sterilised++; if (isVx) w.vaccinated++;
    by.set(zone, w);
  }
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
  const base = f.capped ? CAP : f.animals;
  const rows: (string | number)[][] = [
    ["Animals on the register", f.animals, f.capped ? `Shares below use the ${CAP.toLocaleString("en-IN")} most recent records` : "Every animal your organisation has recorded"],
    ["Sterilisation recorded", f.sterilised, `${pct(f.sterilised, base)} of recorded animals; ${f.sterilisationUnknown} unknown`],
    ["Vaccination recorded", f.vaccinated, `${pct(f.vaccinated, base)} of recorded animals; ${f.vaccinationUnknown} unknown`],
    ["Animals added in the last 30 days", f.added30, `${f.added7} in the last 7 days`],
    ["Open cases in current work", f.openCases ?? "not read", "Unreviewed historical imports excluded"],
  ];
  if (f.abc) rows.push(["ABC records in the pipeline", f.abc.total, `${f.abc.awaitingVet} waiting for a vet · ${f.abc.awaitingReview} waiting for review · ${f.abc.accepted} accepted by the office`]);
  for (const w of f.wards.slice(0, 8)) rows.push([`Ward: ${w.zone}`, w.recorded, `${w.sterilised} sterilised · ${w.vaccinated} vaccinated (recorded)`]);
  if (f.noWard) rows.push(["Animals with no ward recorded", f.noWard, "A gap in the record, not a zero"]);
  return rows;
}
