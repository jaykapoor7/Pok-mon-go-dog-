import "server-only";

/* ════════════════════════════════════════════════════════════════════
   One animal's living record, assembled for its profile.

   Built from the PUBLIC register only: the public fact views, the
   profile's public fields and the structured parts of the organisation's
   operational record (dates, kinds, statuses — never its free text).
   Workbook notes can carry a caller's name or number; they belong to the
   organisation's view, which reads them under the member's own session.
   A position is never finer than the animal's cell.
   ════════════════════════════════════════════════════════════════════ */

import { cellToBoundary, cellToLatLng, gridDisk } from "h3-js";
import { getSupabase } from "@/lib/supabase";
import { getPublicDataset } from "@/lib/spatial/server";
import { A, A_STRIDE } from "@/lib/spatial/types";
import type { DogProfile } from "@/lib/types";
import type { ProfileOperationalRecord } from "@/lib/animal-profile-record";
import type { PublicAnimalIdentity } from "@/lib/animal-identity";
import { cleanPlace, dogLabel } from "@/lib/utils";

export type Lane = "case" | "care" | "follow" | "sight";
export type Tone = "done" | "open" | "none" | "care" | "ster" | "vacc" | "miss" | "due" | "sight";
export type LivingEvent = {
  id: string; lane: Lane; date: string; end?: string | null; tone: Tone;
  title: string; note?: string | null; href?: string | null;
  source: "field" | "resident" | "import";
};
export type Known = "yes" | "no" | "unknown";

export type Living = {
  id: string; label: string; straypawId: string | null; sourceCode: string | null;
  species: string; sex: string | null; colour: string | null;
  locality: string | null; city: string | null; state: string | null;
  keeper: string; source: "field" | "resident";
  firstSeen: string | null; lastSeen: string | null;
  photo: string | null; photos: string[];
  known: { ster: Known; sterAt: string | null; vacc: Known; vaccAt: string | null; boosterDue: boolean; health: "needs_help" | "injured" | "none"; earNotch: boolean };
  cases: { id: string; condition: string; statusClass: string; opened: string | null; closed: string | null; closure: string | null; firstActionDays: number | null }[];
  events: LivingEvent[];
  comments: { id: string; author: string; body: string; date: string }[];
  place: { cell: string; center: [number, number]; box: [number, number, number, number]; cells: { key: string; ring: number[]; n: number; self: boolean }[]; here: number } | null;
  open: { cases: number; followupsMissed: number; followupsDue: number };
};

/* "Unknown", "NA", "-" in a workbook cell is not a value. */
const known = (v: string | null) => (v && !/^(unknown|not known|na|n\/a|nil|none|-+|\?+)$/i.test(v.trim()) ? v.trim() : null);

/* A phone number in text somebody chose to publish is still somebody's phone number. */
export const scrub = (t: string) => t.replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}/g, "[number removed]");

const CARE_TITLE: Record<string, string> = {
  sterilisation: "Sterilised", vaccination: "Vaccinated", treatment: "Treated", surgery: "Surgery", diagnostic: "Diagnostics",
  wound_care: "Wound care", wound: "Wound care", chemotherapy: "Chemotherapy", rescue: "Rescued and transported", deworming: "Dewormed",
};
const STATUS_TITLE: Record<string, string> = {
  closed: "closed after field work", other_ngo: "handed to another organisation", no_action: "closed without field action",
  not_attended: "not attended", in_progress: "in progress", open: "open", unknown: "outcome not recorded",
};
const CLOSURE_TITLE: Record<string, string> = {
  could_not_locate: "the animal could not be found", died: "it died before help arrived", recovered: "it recovered on its own",
  caller_unreachable: "the caller could not be reached", duplicate: "a duplicate request", other_ngo: "another organisation took it",
};

type CaseFact = {
  id: string; condition_class: string | null; status_class: string | null; closure_reason: string | null; occurred_at: string | null;
  resolved_at: string | null; resolved_at_source: string | null; first_action_days: number | null; followups_missed: number | null;
  followups_upcoming: number | null; source: string | null; reviewed_at: string | null;
};

export async function buildLiving(profile: DogProfile, operational: ProfileOperationalRecord, identity: PublicAnimalIdentity | null): Promise<Living> {
  const { dog } = profile;
  const supa = getSupabase();
  const [factsRes, careRes, spatialRes] = supa ? await Promise.all([
    supa.from("public_case_facts").select("id,condition_class,status_class,closure_reason,occurred_at,resolved_at,resolved_at_source,first_action_days,followups_missed,followups_upcoming,source,reviewed_at").eq("dog_id", dog.id),
    supa.from("public_care_facts").select("id,kind,event_date").eq("dog_id", dog.id),
    supa.from("public_spatial_animals").select("h3_r8,city,state,source,first_seen").eq("id", dog.id).maybeSingle(),
  ]) : [{ data: [] }, { data: [] }, { data: null }];
  const facts = ((factsRes.data ?? []) as CaseFact[]).sort((a, b) => (a.occurred_at ?? "").localeCompare(b.occurred_at ?? ""));
  const care = ((careRes.data ?? []) as { id: string; kind: string; event_date: string | null }[]).filter((c) => c.event_date);
  const sp = spatialRes.data as { h3_r8: string | null; city: string | null; state: string | null; source: string | null; first_seen: string | null } | null;
  /* A public profile must name the reporting organisation. The profile view
     normally supplies ngo_name; this lookup covers older public rows that
     retain only the organisation id. */
  const reporterName = dog.ngo_name ?? (supa && dog.ngo_id
    ? ((await supa.from("public_contributor_organisations").select("name").eq("id", dog.ngo_id).maybeSingle()).data?.name ?? null)
    : null);
  const first = <T,>(pick: (r: ProfileOperationalRecord["imported"][number]) => T | null | undefined) => {
    for (const r of operational.imported) { const v = pick(r); if (v !== null && v !== undefined && String(v).trim()) return v; }
    return null;
  };

  /* ── what is known ──────────────────────────────────────────────── */
  const latest = (kind: string) => care.filter((c) => c.kind === kind).map((c) => c.event_date!).sort().pop() ?? null;
  const sterAt = latest("sterilisation"), vaccAt = latest("vaccination");
  const ster: Known = dog.sterilisation_status === "sterilised" || sterAt ? "yes" : dog.sterilisation_status === "not_sterilised" ? "no" : "unknown";
  const vacc: Known = dog.vaccination_status === "vaccinated" || vaccAt ? "yes" : dog.vaccination_status === "not_vaccinated" ? "no" : "unknown";
  const boosterDue = !!vaccAt && Date.now() - Date.parse(vaccAt) > 365 * 86_400_000;
  const health = dog.needs_help ? "needs_help" as const : String(dog.status) === "injured" ? "injured" as const : "none" as const;

  /* ── events, for the lanes and the chronology ────────────────────── */
  const events: LivingEvent[] = [];
  for (const f of facts) {
    if (!f.occurred_at) continue;
    const st = f.status_class ?? "unknown";
    const open = st === "open" || st === "in_progress";
    const cond = f.condition_class && f.condition_class !== "Not recorded" ? f.condition_class : "A request for help";
    events.push({
      id: `case-${f.id}`, lane: "case", date: f.occurred_at,
      end: open ? null : f.resolved_at && f.resolved_at >= f.occurred_at ? f.resolved_at : f.reviewed_at ?? f.occurred_at,
      tone: open ? "open" : st === "no_action" || st === "not_attended" ? "none" : "done",
      title: `${cond} — ${STATUS_TITLE[st] ?? st}${f.closure_reason && CLOSURE_TITLE[f.closure_reason] ? `: ${CLOSURE_TITLE[f.closure_reason]}` : ""}`,
      source: f.source === "resident" ? "resident" : "field",
    });
  }
  for (const c of care) events.push({
    id: `care-${c.id}`, lane: "care", date: c.event_date!, tone: c.kind === "sterilisation" ? "ster" : c.kind === "vaccination" ? "vacc" : "care",
    title: CARE_TITLE[c.kind] ?? c.kind.replace(/_/g, " "), source: "field",
  });
  let followupsDue = 0, followupsMissed = 0;
  for (const f of operational.followUps) {
    const st = String(f.status ?? "").toLowerCase();
    const date = f.completedAt || f.dueAt;
    if (!date) continue;
    const missed = st === "missed", done = !!f.completedAt || st === "done";
    if (missed) followupsMissed++;
    if (!done && !missed && st !== "cancelled") followupsDue++;
    events.push({ id: `follow-${f.id}`, lane: "follow", date, tone: missed ? "miss" : done ? "done" : "due", title: missed ? "Follow-up missed" : done ? "Follow-up done" : "Follow-up due", source: "field" });
  }
  for (const s of profile.sightings) events.push({
    id: `sight-${s.id}`, lane: "sight", date: s.created_at, tone: "sight", title: s.photo_url ? "Seen by a resident, with a photograph" : "Seen by a resident", source: "resident",
  });
  events.sort((a, b) => a.date.localeCompare(b.date));

  /* ── where it lives: its cell among its neighbours ──────────────── */
  let place: Living["place"] = null;
  if (sp?.h3_r8) {
    const ds = await getPublicDataset(null).catch(() => null);
    const counts = new Map<string, number>();
    if (ds) {
      const want = new Set(gridDisk(sp.h3_r8, 2));
      for (let i = 0; i < ds.animals.length; i += A_STRIDE) {
        const k = ds.cells[ds.animals[i + A.cell]];
        if (want.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    const cells = gridDisk(sp.h3_r8, 2).map((key) => ({
      key, ring: cellToBoundary(key, true).flatMap(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]),
      n: counts.get(key) ?? 0, self: key === sp.h3_r8,
    }));
    let w = 180, s = 90, e = -180, n = -90;
    for (const c of cells) for (let i = 0; i < c.ring.length; i += 2) { w = Math.min(w, c.ring[i]); e = Math.max(e, c.ring[i]); s = Math.min(s, c.ring[i + 1]); n = Math.max(n, c.ring[i + 1]); }
    const [clat, clng] = cellToLatLng(sp.h3_r8);
    place = { cell: sp.h3_r8, center: [Math.round(clng * 1e4) / 1e4, Math.round(clat * 1e4) / 1e4], box: [w, s, e, n], cells, here: counts.get(sp.h3_r8) ?? 1 };
  }

  const photos = Array.from(new Set([dog.cover_photo, ...(dog.photos ?? []), ...profile.sightings.map((s) => s.photo_url)].filter((p): p is string => !!p && !!p.trim())));
  return {
    id: dog.id, label: dogLabel(dog), straypawId: identity?.straypaw_id ?? null,
    sourceCode: identity?.source_code || (first((r) => r.animalCode) as string | null) || dog.code || null,
    species: dog.species || "dog", sex: known(first((r) => r.sex) as string | null), colour: known((first((r) => r.colour) as string | null) || dog.color || null),
    locality: cleanPlace((first((r) => r.locality) as string | null) || dog.zone) || null, city: sp?.city ?? dog.city ?? null, state: sp?.state ?? null,
    keeper: reporterName ? `Reported by ${reporterName}` : dog.ngo_id ? "Reporting organisation not published" : "Reported by the community",
    source: sp?.source === "resident" || dog.provenance === "community_report" ? "resident" : "field",
    firstSeen: sp?.first_seen ?? dog.first_seen ?? null, lastSeen: dog.last_seen ?? null,
    photo: photos[0] ?? null, photos,
    known: { ster, sterAt, vacc, vaccAt, boosterDue, health, earNotch: !!dog.ear_notch && dog.ear_notch !== "unknown" },
    cases: facts.map((f) => ({
      id: f.id, condition: f.condition_class ?? "Not recorded", statusClass: f.status_class ?? "unknown", opened: f.occurred_at,
      closed: f.status_class === "open" || f.status_class === "in_progress" ? null : f.resolved_at, closure: f.closure_reason, firstActionDays: f.first_action_days,
    })),
    events,
    comments: profile.comments.map((c) => ({ id: c.id, author: c.user_name || "A resident", body: scrub(c.body), date: c.created_at })),
    place,
    open: { cases: facts.filter((f) => f.status_class === "open" || f.status_class === "in_progress").length, followupsMissed, followupsDue },
  };
}
