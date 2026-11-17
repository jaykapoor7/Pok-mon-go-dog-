/* Kaju's incident briefing: "What's happening with the Indiranagar bite incident? What's missing, and what do the
   teams need to do next?", answered from records, by fixed rules, with no model.

   It stays on the animal side, like every programme tool Kaju has. It reads the request a partner sent to the
   person's organisation (its title, place, area, status, due date and the animal linked to it, never its free
   text or outcome), the animal on the organisation's own register, that animal's care history and open cases.
   Patient, clinical and dose records are never read; the answer says so. What is missing is computed from those
   records, and every next step Kaju can help with is prepared for a person to confirm: nothing is saved here. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Citation, Proposal } from "./types";

type Ctx = { db: SupabaseClient; orgId: string | null; userName: string | null };
type Out = { data: unknown; summary: string; citations: Citation[]; proposals?: Proposal[]; ok?: boolean };

type Request = { id: string; programme_id: string; from_org: string; to_org: string; kind: string; title: string; place: string | null; area_id: string | null; animal_id: string | null; status: string; due_on: string | null; created_at: string };
type Dog = { id: string; name: string | null; code: string | null; straypaw_id: string | null; zone: string | null; color: string | null; sterilisation_status: string | null; vaccination_status: string | null; cover_photo: string | null; last_seen: string | null };
type Care = { kind: string; event_date: string | null };
type OpenCase = { id: string; case_code: string | null; title: string | null; status_class: string | null; next_due: string | null };

export type IncidentBrief =
  | { in_programme: false }
  | { in_programme: true; found: false; place: string | null }
  | {
      in_programme: true; found: true;
      request: { title: string; status: string; due_on: string | null; overdue: boolean; area: string | null; place: string | null; from: string; to: string; bite_on: string; href: string };
      dog: { id: string; label: string; code: string | null; colour: string | null; photo: boolean; vaccinated_on: string | null; sterilised_on: string | null; revaccination_due: boolean; interval_days: number | null; href: string } | null;
      candidates: { id: string; label: string; code: string | null; vaccinated: string | null; href: string }[];
      observation: { planned: boolean; days: { n: number; on: string }[] };
      cases: { id: string; label: string; href: string }[];
      missing: string[];
      next: { who: string; what: string }[];
      prepared: number;
    };

const DOG = "id,name,code,straypaw_id,zone,color,sterilisation_status,vaccination_status,cover_photo,last_seen";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pid = () => Math.random().toString(36).slice(2, 10);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const plus = (day: string, n: number) => iso(new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000));
const nice = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: day.slice(0, 4) === indiaToday().slice(0, 4) ? undefined : "numeric", timeZone: "UTC" });
const dogLabel = (d: Pick<Dog, "name" | "code" | "straypaw_id">) => d.name || d.code || d.straypaw_id || "Unnamed animal";
const clip = (s: unknown, n = 60) => String(s ?? "").replace(/[%,()*\\]/g, " ").trim().slice(0, n);
const FAILED: Out = { data: { error: "Records could not be read. Nothing is known; try again." }, summary: "Could not read the records. Try again.", citations: [], ok: false };

/** The date in a request title ("… a bite on 16 Nov"), else the day it was sent. */
function biteDay(r: Request): string {
  const m = r.title.match(/\bon (\d{1,2}) ([A-Za-z]{3})/);
  const sent = r.created_at.slice(0, 10);
  if (!m) return sent;
  const mi = MONTHS.indexOf(m[2].toLowerCase());
  if (mi < 0) return sent;
  let y = Number(sent.slice(0, 4));
  if (mi > Number(sent.slice(5, 7)) - 1) y -= 1; /* a December bite reported in January */
  return `${y}-${String(mi + 1).padStart(2, "0")}-${String(Number(m[1])).padStart(2, "0")}`;
}

/** The place a question names: "the Indiranagar bite incident", "the bite in Jayanagar". */
export function incidentPlace(q: string): string | null {
  const STOP = /^(the|a|an|this|that|latest|new|recent|dog|stray|street|last|our|my|whole|bite|incident|happening|what|whats|what's)$/i;
  const before = [...q.matchAll(/\b([A-Za-z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)?)\s+(?:dog[- ])?(?:bite|bites|incident|case)\b/g)].map((m) => m[1].split(/\s+/).filter((w) => !STOP.test(w)).join(" ")).find(Boolean);
  if (before) return before;
  const after = q.match(/\b(?:bite|incident|case)\s+(?:in|at|near|from)\s+([A-Za-z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)?)/i);
  return after ? after[1] : null;
}

export async function incidentBriefing(input: Record<string, unknown>, { db, orgId }: Ctx): Promise<Out> {
  if (!orgId) return { data: { error: "Organisation access required" }, summary: "Needs an organisation workspace", citations: [], ok: false };
  const mine = await db.rpc("oh_my_today");
  const places = (Array.isArray(mine.data) ? (mine.data as { organisation_id: string; name: string; short_name: string | null }[]) : []).map((p) => ({ id: p.organisation_id, name: p.short_name ?? p.name }));
  if (!places.length) return { data: { in_programme: false } satisfies IncidentBrief, summary: "Not part of a programme", citations: [] };

  /* Only the request's own fields: never its free text, never its outcome. */
  const rows = await db.from("oh_handoffs").select("id,programme_id,from_org,to_org,kind,title,place,area_id,animal_id,status,due_on,created_at").in("to_org", places.map((p) => p.id)).in("status", ["open", "accepted", "done"]).order("created_at", { ascending: false }).limit(40);
  if (rows.error) return FAILED;
  const list = (rows.data ?? []) as Request[];
  const areaIds = [...new Set(list.map((r) => r.area_id).filter(Boolean))] as string[];
  const [areas, orgs] = await Promise.all([
    areaIds.length ? db.from("oh_areas").select("id,name").in("id", areaIds) : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    db.from("oh_organisations").select("id,name,short_name").in("id", [...new Set(list.map((r) => r.from_org))].slice(0, 20)),
  ]);
  const areaOf = (id: string | null) => (id ? ((areas.data ?? []) as { id: string; name: string }[]).find((a) => a.id === id)?.name ?? null : null);
  const want = clip(input.place).toLowerCase();
  const match = (r: Request) => !want || [areaOf(r.area_id), r.place, r.title].some((v) => !!v && v.toLowerCase().includes(want));
  /* The newest bite follow-up that matches; an open or accepted one before one already closed. */
  const follow = list.filter((r) => r.kind === "animal_followup" && match(r));
  const r = follow.find((x) => x.status !== "done") ?? follow[0];
  if (!r) return { data: { in_programme: true, found: false, place: want || null } satisfies IncidentBrief, summary: want ? `No bite follow-up about ${want}` : "No bite follow-ups", citations: [] };

  const area = areaOf(r.area_id);
  const from = (((orgs.data ?? []) as { id: string; name: string; short_name: string | null }[]).find((o) => o.id === r.from_org)?.name) ?? "a partner facility";
  const to = places.find((p) => p.id === r.to_org)?.name ?? "your organisation";
  const [prog, ngo] = await Promise.all([
    db.from("oh_programmes").select("id,slug,config").eq("id", r.programme_id).maybeSingle(),
    db.from("ngos").select("city").eq("id", orgId).maybeSingle(),
  ]);
  const slug = (prog.data as { slug?: string } | null)?.slug ?? null;
  const interval = Number((prog.data as { config?: { dog_revaccination_days?: number } } | null)?.config?.dog_revaccination_days) || null;
  const today = indiaToday();
  const bite = biteDay(r);
  const reqHref = slug ? `/gov/programmes/${slug}?tab=Work` : "/gov/programmes";
  const citations: Citation[] = [{ id: `request:${r.id}`, label: `Request · ${area ?? r.place ?? "programme"}`, href: reqHref, kind: "programme" }];

  /* The animal: the one linked to the request, or the register's animals in that area as candidates. */
  let dog: Dog | null = null;
  let candidates: Dog[] = [];
  if (r.animal_id) {
    const d = await db.from("dogs").select(DOG).eq("ngo_id", orgId).eq("id", r.animal_id).maybeSingle();
    if (d.error) return FAILED;
    dog = (d.data as Dog | null) ?? null;
  }
  if (!dog && area) {
    const c = await db.from("dogs").select(DOG).eq("ngo_id", orgId).ilike("zone", `%${clip(area, 40)}%`).order("last_seen", { ascending: false, nullsFirst: false }).limit(4);
    if (c.error) return FAILED;
    candidates = (c.data ?? []) as Dog[];
  }
  const careOf = async (id: string) => { const x = await db.from("medical_events").select("kind,event_date").eq("dog_id", id).order("event_date", { ascending: false }).limit(30); return (x.data ?? []) as Care[]; };
  const lastOf = (care: Care[], kind: string) => care.find((c) => c.kind === kind && c.event_date)?.event_date ?? null;
  const care = dog ? await careOf(dog.id) : [];
  const candidateCare = await Promise.all(candidates.map((c) => careOf(c.id)));
  const vaccinated = lastOf(care, "vaccination"), sterilised = lastOf(care, "sterilisation");
  const since = vaccinated ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${vaccinated}T00:00:00Z`)) / 86_400_000) : null;
  const revaccinationDue = !!dog && (vaccinated === null ? dog.vaccination_status !== "vaccinated" : since !== null && since > (interval ?? 365));

  let cases: OpenCase[] = [];
  if (dog) {
    const c = await db.from("org_case_facts").select("id,case_code,title,status_class,next_due").eq("ngo_id", orgId).eq("dog_id", dog.id).in("status_class", ["open", "in_progress"]).limit(6);
    if (c.error) return FAILED;
    cases = (c.data ?? []) as OpenCase[];
    citations.push({ id: dog.id, label: dogLabel(dog), href: `/ngo/animals/${dog.id}`, kind: "animal" });
  } else for (const c of candidates) citations.push({ id: c.id, label: dogLabel(c), href: `/ngo/animals/${c.id}`, kind: "animal" });
  for (const c of cases) citations.push({ id: c.id, label: c.case_code?.slice(0, 10) ?? c.title ?? "Case", href: `/ngo/cases/${c.id}`, kind: "case" });

  /* The observation: checked on days 3, 7 and 10 after the bite, the WHO ten-day observation. */
  const days = [3, 7, 10].map((n) => ({ n, on: plus(bite, n) })).filter((d) => d.on >= today || r.status !== "done");
  /* The observation belongs to this request: its case carries the request's short reference. */
  const ref = r.id.replace(/-/g, "").slice(0, 6);
  const observing = cases.find((c) => (c.title ?? "").includes(`request ${ref}`));
  /* A revaccination already scheduled on the dog's cases is not prepared twice. */
  let revacPlanned = false;
  if (dog && revaccinationDue && cases.length) {
    const f = await db.from("animal_followups").select("id,case_id,status,note").in("case_id", cases.map((c) => c.id)).limit(40);
    revacPlanned = ((f.data ?? []) as { status: string | null; note: string | null }[]).some((x) => x.status !== "done" && x.status !== "cancelled" && /revaccinat/i.test(x.note ?? ""));
  }
  const missing: string[] = [];
  const next: { who: string; what: string }[] = [];
  if (r.status === "open") missing.push(`Nobody at ${to} has accepted the request yet${r.due_on ? `; it is due ${nice(r.due_on)}` : ""}.`);
  if (!dog) missing.push(candidates.length ? `No animal is linked to the request. ${candidates.length} ${candidates.length === 1 ? "animal is" : "animals are"} on your register in ${area}; check the description and link the right one.` : "No animal is linked to the request, and none is on your register in that area yet.");
  if (dog && !observing && r.status !== "done") missing.push(`The ten-day observation of ${dogLabel(dog)} is not planned: no case or follow-up holds it yet.`);
  if (dog && revaccinationDue) missing.push((revacPlanned ? "Revaccination is scheduled but not done yet: " : "") + (vaccinated ? `${dogLabel(dog)}'s last anti-rabies vaccination was ${nice(vaccinated)}, ${since} days ago${interval ? `, past the programme's ${interval}-day interval` : ""}.` : `${dogLabel(dog)} has no anti-rabies vaccination on record.`));

  next.push({ who: from, what: "The patient's care and vaccine course. Kaju does not read patient or dose records." });
  next.push({ who: `${to} (you)`, what: dog ? `Observe ${dogLabel(dog)} on days ${days.map((d) => `${d.n} (${nice(d.on)})`).join(", ")} after the bite and record what you find${revaccinationDue ? "; revaccinate against rabies" : ""}. If it falls ill or dies, arrange a sample for the laboratory.` : `Find the dog${area ? ` in ${area}` : ""}${r.place ? ` near ${r.place}` : ""}, link it to the request, then observe it for ten days.` });
  next.push({ who: "The programme", what: `Sees the request's status in Programme → Work${r.due_on ? `, due ${nice(r.due_on)}` : ""}.` });

  /* What Kaju prepares, for a person to confirm. */
  const proposals: Proposal[] = [];
  const city = (ngo.data as { city?: string } | null)?.city ?? "Bengaluru";
  if (r.status !== "done" && !observing) {
    proposals.push({ id: pid(), kind: "open_case", why: "Ten-day observation after a bite", title: `Observe ${dog ? dogLabel(dog) : "the dog"} after the ${area ?? ""} bite on ${nice(bite)} (request ${ref})`.replace(/\s+/g, " ").slice(0, 110), city, zone: area, category: "other", severity: "high",
      description: [`Requested by ${from} through the programme: find and observe the dog involved in a bite on ${nice(bite)}.`, `Check it on days ${days.map((d) => `${d.n} (${nice(d.on)})`).join(", ")} after the bite and record what you find.`, "If it falls ill or dies, arrange a sample for the reference laboratory.", "No patient details are shared with this request."].join("\n"), dogId: dog?.id ?? null });
  }
  if (dog && revaccinationDue && !revacPlanned && cases[0]) {
    const due = plus(today, 3);
    proposals.push({ id: pid(), kind: "schedule_followup", why: "Rabies revaccination", caseId: cases[0].id, caseLabel: cases[0].case_code?.slice(0, 10) ?? cases[0].title ?? "Case", dogId: dog.id, dueAt: `${due}T04:30:00.000Z`, note: `Revaccinate ${dogLabel(dog)} against rabies${vaccinated ? ` (last given ${nice(vaccinated)})` : ""}, while it is under observation after the ${area ?? ""} bite.`.replace(/\s+/g, " ") });
  }

  const data: IncidentBrief = {
    in_programme: true, found: true,
    request: { title: r.title, status: r.status, due_on: r.due_on, overdue: !!r.due_on && r.due_on < today && r.status !== "done", area, place: r.place, from, to, bite_on: bite, href: reqHref },
    dog: dog ? { id: dog.id, label: dogLabel(dog), code: dog.code, colour: dog.color, photo: !!dog.cover_photo, vaccinated_on: vaccinated, sterilised_on: sterilised, revaccination_due: revaccinationDue, interval_days: interval, href: `/ngo/animals/${dog.id}` } : null,
    candidates: candidates.map((c, i) => ({ id: c.id, label: dogLabel(c), code: c.code, vaccinated: lastOf(candidateCare[i], "vaccination"), href: `/ngo/animals/${c.id}` })),
    observation: { planned: !!observing, days },
    cases: cases.map((c) => ({ id: c.id, label: c.case_code?.slice(0, 10) ?? c.title ?? "Case", href: `/ngo/cases/${c.id}` })),
    missing, next, prepared: proposals.length,
  };
  return { data, summary: `Bite follow-up${area ? ` · ${area}` : ""} · ${missing.length} missing`, citations, proposals };
}

const STATUS: Record<string, string> = { open: "waiting to be accepted", accepted: "in progress", done: "closed" };

/** The briefing in words, for the answer. */
export function sayIncident(d: IncidentBrief, asked: string | null): string {
  if (!d.in_programme) return "Your organisation is not part of a programme yet, so no partner can send a bite follow-up here.";
  if (!d.found) return `I found no bite follow-up${d.place ? ` about ${d.place}` : ""} sent to your organisation. Requests from hospitals appear in Programme → Work once a bite is recorded with an area your team covers.`;
  const r = d.request;
  const lines: string[] = [];
  lines.push(`**The ${r.area ?? r.place ?? ""} bite on ${nice(r.bite_on)}** · ${r.from} asked ${r.to} to find and observe the dog · ${STATUS[r.status] ?? r.status}${r.due_on ? ` · due ${nice(r.due_on)}${r.overdue ? " (overdue)" : ""}` : ""}.`.replace(/\s+/g, " "));
  if (d.dog) {
    const g = d.dog;
    lines.push(`- **The dog:** ${g.label}${g.code ? ` (${g.code})` : ""}${g.colour ? `, ${g.colour.toLowerCase()}` : ""}, linked to the request.${g.sterilised_on ? ` Sterilised ${nice(g.sterilised_on)}.` : ""} ${g.vaccinated_on ? `Last anti-rabies vaccination ${nice(g.vaccinated_on)}.` : "No anti-rabies vaccination on record."}`);
  } else if (d.candidates.length) {
    lines.push(`- **On your register in ${r.area}:** ${d.candidates.map((c) => `${c.label}${c.code ? ` (${c.code})` : ""}${c.vaccinated ? `, vaccinated ${nice(c.vaccinated)}` : ""}`).join("; ")}. I have not chosen one; the team confirms which dog it is.`);
  }
  lines.push(d.observation.planned ? "- **Observation:** planned on a case." : `- **Observation:** days ${d.observation.days.map((x) => `${x.n} (${nice(x.on)})`).join(", ")} after the bite.`);
  const out = [lines.join("\n")];
  if (d.missing.length) out.push(`**Missing**\n${d.missing.map((m) => `- ${m}`).join("\n")}`);
  out.push(`**Who does what**\n${d.next.map((n) => `- **${n.who}:** ${n.what}`).join("\n")}`);
  out.push(d.prepared ? `I prepared ${d.prepared === 1 ? "one thing" : `${d.prepared} things`} below. Nothing is saved until you confirm.` : "Nothing needs preparing right now.");
  if (asked && /\b(patient|person|victim|dose|vaccine course|pep)\b/i.test(asked)) out.push("I read only the animal side. The patient's record and doses stay with the treating hospital.");
  return out.join("\n\n");
}
