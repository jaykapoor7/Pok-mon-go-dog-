import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCtx } from "./tools";
import type { AgeBand, Citation, Proposal, ToolRun } from "./types";
import { logKaju } from "./actionLog";
import { addDays, indiaDay, sayDay, type ExposureNote, type HealthAsk } from "./capture";
import { workId } from "./prepare";

/* ════════════════════════════════════════════════════════════════════
   Kaju for clinical staff: their own facility's bite and PEP work.

   Reads go only through the database functions the health pages use
   (oh_my_today, oh_clinic_due, oh_clinic_register, oh_clinic_exposure,
   oh_clinic_transfers, oh_org_areas), with the person's own session, so
   each read is decided exactly as on their screens: staff of the facility
   with the right role, nobody else. Kaju only ever asks about facilities
   oh_my_today lists for this person; another organisation's records are
   never asked for. Each read of patient records is logged (actionLog.ts).

   Answers are written here, by fixed rules, on the server. Nothing in this
   file sends anything to a language model.

   Clinical decisions stay with people: Kaju finds, summarises and prepares.
   It never diagnoses, prescribes, changes a dose, validates a result or
   decides eligibility, and it never infers an exposure category: a bite
   record it prepares carries only what the clinician's note states.
   ════════════════════════════════════════════════════════════════════ */

export type Sink = { citations: Citation[]; tools: ToolRun[]; proposals: Proposal[] };
export type Said = { text: string; suggestions?: string[] };
export type Facility = { id: string; name: string; role: string; caps: Set<string> };

type DueDose = { dose_id: string; dose_no: number; doses_total: number; due_on: string; exposure_id: string; code: string; patient_ref: string | null; age_band: string; regimen: string; phone: string | null; last_reminder: { at: string; outcome: string } | null };
type Completed = { course_id: string; exposure_id: string; code: string; patient_ref: string | null; completed_at: string; phone: string | null; told: boolean };
type RegisterRow = { id: string; code: string; patient_ref: string | null; exposure_on: string; presented_on: string; kind: string; category: string; course_status: string | null; doses_given: number; doses_total: number; next_due: string | null };
type Transfer = { id: string; exposure_id?: string; code?: string; service: string; status: string; from?: string; from_short?: string | null; to?: string; to_short?: string | null; sent_at: string };
type Dose = { id: string; dose_no: number; due_on: string; given_on: string | null; status: string };
type ExposureRecord = { id: string; code: string; facility_id: string; patient_ref: string | null; age_band: string; sex: string; exposure_on: string; presented_on: string; exposure_kind: string; category: string; category_by_name: string | null; wound_washed: string; animal_species: string; today: string; course: { regimen: string; status: string; prescribed_by_name: string | null; rig_given: boolean } | null; doses: Dose[]; created_at?: string };

const KIND: Record<string, string> = { bite: "bite", scratch: "scratch", lick_broken_skin: "lick on broken skin", other: "other contact" };
const WASHED: Record<string, string> = { before_arrival: "washed before arrival", at_facility: "washed here", not_washed: "not washed", not_recorded: "not recorded" };
const AGE: Record<string, string> = { "0-4": "under 5", "5-14": "5 to 14", "15-29": "15 to 29", "30-49": "30 to 49", "50+": "50 and over", not_recorded: "age not recorded" };
const COURSE: Record<string, string> = { active: "in course", completed: "course complete", discontinued: "stopped by a clinician", lost_to_follow_up: "did not return" };
const CALL: Record<string, string> = { called_reached: "called, reached", called_no_answer: "called, no answer", message_sent_manually: "message sent", patient_will_attend: "will attend", wrong_number: "wrong number" };
const SERVICE: Record<string, string> = { arv: "vaccine", rig: "immunoglobulin", wound_care: "wound washing", dog_vaccination: "dog vaccination", rabies_testing: "testing" };
const SPECIES: Record<string, string> = { dog: "dog", cat: "cat", cattle: "cattle", monkey: "monkey", wildlife: "wild animal", other: "other animal", unknown: "animal not stated" };
const SHOW = 8;
const short = (iso: string) => sayDay(iso.slice(0, 10));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const bite = (id: string, code: string): Citation => ({ id: `bite:${id}`, label: code, href: `/health/bites/${id}`, kind: "page" });
const NOT_A_FACILITY = "Bite and PEP records are kept by hospitals and health centres. Your account is not on the staff of one, so there is nothing of yours for me to read.";
const COULD_NOT = "I could not check your facility just now, so I have not read anything. Try again.";

/** The hospitals and health centres where this person works, from oh_my_today (their own access). null when it could not be read. */
export async function myFacilities(db: Pick<SupabaseClient, "rpc">): Promise<Facility[] | null> {
  const r = await db.rpc("oh_my_today");
  if (r.error) return null;
  return (Array.isArray(r.data) ? r.data : [])
    .filter((p: { kind?: string }) => p && (p.kind === "hospital" || p.kind === "clinic"))
    .map((p: { organisation_id: string; name: string; short_name: string | null; role: string; capabilities?: string[] | null }) => ({ id: p.organisation_id, name: p.short_name || p.name, role: p.role, caps: new Set(p.capabilities ?? []) }));
}

async function read<T>(ctx: ToolCtx, sink: Sink, f: Facility, fn: string, args: Record<string, unknown>, label: string, count: (d: T) => number): Promise<T | null> {
  const r = await ctx.db.rpc(fn, args);
  const ok = !r.error && r.data !== null && r.data !== undefined;
  const n = ok ? count(r.data as T) : 0;
  sink.tools.push({ name: fn, summary: ok ? `${label} at ${f.name}: ${n}` : `Could not read ${label.toLowerCase()} at ${f.name}`, ok });
  await logKaju(ctx.db, { kind: "health_read", ok, target: `${fn}:${f.id}`, summary: ok ? `${n} rows` : "read refused or failed", organisationId: f.id });
  return ok ? (r.data as T) : null;
}

/** A question about the facility's own bite and PEP work, answered from its own records. */
export async function healthAnswer(ask: HealthAsk, ctx: ToolCtx, sink: Sink, now = new Date()): Promise<Said> {
  const all = await myFacilities(ctx.db);
  if (!all) return { text: COULD_NOT };
  const mine = all.filter((f) => f.caps.has("view_register")).slice(0, 3);
  if (!mine.length) return { text: all.length ? "Your role at your facility does not open its bite register, so I cannot read it for you either. A clinician, nurse or records officer there can." : NOT_A_FACILITY };
  const at = (f: Facility) => (mine.length > 1 ? ` at ${f.name}` : "");
  const today = indiaDay(now);

  if (ask.kind === "lookup") {
    for (const f of mine) {
      const reg = await read<RegisterRow[]>(ctx, sink, f, "oh_clinic_register", { p_facility: f.id, p_filter: "all", p_limit: 200 }, "Bite register", (d) => (Array.isArray(d) ? d.length : 0));
      const row = (reg ?? []).find((x) => x.code?.toUpperCase() === ask.code);
      if (!row) continue;
      const e = await read<ExposureRecord>(ctx, sink, f, "oh_clinic_exposure", { p_exposure: row.id }, "Bite record", () => 1);
      if (!e) return { text: `${ask.code} is in ${f.name}'s register, but its record could not be opened just now. Try again.` };
      sink.citations.push(bite(e.id, e.code));
      return { text: exposureSummary(e, f) };
    }
    return { text: `${ask.code} is not in ${mine.length > 1 ? "your facilities' registers" : `${mine[0].name}'s register`} (the 200 most recent). I only look in your own facility's records. Check the code on the record.` };
  }

  if (ask.kind === "referrals") {
    const lines: string[] = [];
    let unread = 0;
    for (const f of mine) {
      const x = await read<{ incoming: Transfer[]; outgoing: Transfer[] }>(ctx, sink, f, "oh_clinic_transfers", { p_facility: f.id }, "Referrals", (d) => (d.incoming?.length ?? 0) + (d.outgoing?.length ?? 0));
      if (!x) { unread++; continue; }
      const inWait = (x.incoming ?? []).filter((t) => t.status === "sent"), outWait = (x.outgoing ?? []).filter((t) => t.status === "sent");
      if (inWait.length) lines.push(`**${plural(inWait.length, "person", "people")} referred to you${at(f)}** and not yet marked:`, ...inWait.slice(0, SHOW).map((t) => `- **${t.code ?? "Referral"}** from ${t.from_short ?? t.from ?? "another facility"} for ${SERVICE[t.service] ?? t.service} · sent ${short(t.sent_at)}`));
      if (outWait.length) { lines.push(`**${plural(outWait.length, "person", "people")} you referred${at(f)}** not yet marked by the other facility:`, ...outWait.slice(0, SHOW).map((t) => `- **${t.code ?? "Referral"}** to ${t.to_short ?? t.to ?? "another facility"} for ${SERVICE[t.service] ?? t.service} · sent ${short(t.sent_at)}`)); for (const t of outWait.slice(0, SHOW)) if (t.exposure_id && t.code) sink.citations.push(bite(t.exposure_id, t.code)); }
    }
    sink.citations.push({ id: "page:/health/referrals", label: "Referrals", href: "/health/referrals", kind: "page" });
    if (unread === mine.length) return { text: "I could not read your referrals just now, so I do not know what is waiting. Try again." };
    return { text: lines.length ? `${lines.join("\n")}\n\nMark arrivals on Referrals.${unread ? " One facility's referrals could not be read just now." : ""}` : `No referral is waiting${unread ? " in the referrals I could read" : ""}. Arrivals are marked on Referrals.` };
  }

  if (ask.kind === "needs_category") {
    const lines: string[] = [];
    for (const f of mine) {
      const reg = await read<RegisterRow[]>(ctx, sink, f, "oh_clinic_register", { p_facility: f.id, p_filter: "needs_assessment", p_limit: 50 }, "Bites waiting for a clinician", (d) => (Array.isArray(d) ? d.length : 0));
      if (!reg) return { text: COULD_NOT };
      if (reg.length) lines.push(`**${plural(reg.length, "bite")} waiting for a clinician${at(f)}**:`, ...reg.slice(0, SHOW).map((r) => { sink.citations.push(bite(r.id, r.code)); return `- **${r.code}**${r.patient_ref ? ` · ${r.patient_ref}` : ""} · ${KIND[r.kind] ?? r.kind} on ${short(r.exposure_on)} · ${r.category === "not_recorded" ? "category not recorded" : `category ${r.category}, no course yet`}`; }));
    }
    return { text: lines.length ? `${lines.join("\n")}\n\nThe category and any course are the clinician's to record on each record.` : "No bite is waiting for a clinician's category or course." };
  }

  /* Doses: due today and tomorrow, past their date, and the calls to make. One read per facility (oh_clinic_due). */
  const sections: string[] = [];
  let any = false;
  for (const f of mine) {
    const d = await read<{ today: string; due: DueDose[]; completed: Completed[] }>(ctx, sink, f, "oh_clinic_due", { p_facility: f.id }, "Doses due", (x) => x.due?.length ?? 0);
    if (!d) return { text: COULD_NOT };
    const day = d.today ?? today;
    const line = (x: DueDose) => { sink.citations.push(bite(x.exposure_id, x.code)); return `- **${x.code}**${x.patient_ref ? ` · ${x.patient_ref}` : ""} · dose ${x.dose_no} of ${x.doses_total} · ${x.due_on === day ? "today" : x.due_on === addDays(day, 1) ? "tomorrow" : `was due ${short(x.due_on)}`}${x.phone ? " · phone on record" : ""}${x.last_reminder ? ` · last call ${CALL[x.last_reminder.outcome] ?? x.last_reminder.outcome}, ${short(x.last_reminder.at)}` : ""}`; };
    const due = d.due ?? [];
    if (ask.kind === "missed") {
      const late = due.filter((x) => x.due_on < day);
      if (late.length) { any = true; sections.push(`**${plural(late.length, "dose")} past ${late.length === 1 ? "its" : "their"} date with nothing recorded${at(f)}**:`, ...late.slice(0, SHOW).map(line)); }
    } else if (ask.kind === "calls") {
      const calls = due.filter((x) => x.phone && !(x.last_reminder && x.last_reminder.at.slice(0, 10) >= addDays(day, -1)));
      const tell = (d.completed ?? []).filter((c) => c.phone && !c.told);
      if (calls.length) { any = true; sections.push(`**${plural(calls.length, "person", "people")} to remind about a dose${at(f)}** (they agreed to calls):`, ...calls.slice(0, SHOW).map(line)); }
      if (tell.length) { any = true; sections.push(`**${plural(tell.length, "person", "people")} to tell their course is complete${at(f)}**:`, ...tell.slice(0, SHOW).map((c) => { sink.citations.push(bite(c.exposure_id, c.code)); return `- **${c.code}**${c.patient_ref ? ` · ${c.patient_ref}` : ""} · completed ${short(c.completed_at)}`; })); }
    } else {
      const want = due.filter((x) => (ask.when === "today" ? x.due_on === day : ask.when === "tomorrow" ? x.due_on === addDays(day, 1) : x.due_on >= day));
      const late = due.filter((x) => x.due_on < day).length;
      if (want.length) { any = true; sections.push(`**${plural(want.length, "PEP dose")} due ${ask.when === "both" ? "today and tomorrow" : ask.when}${at(f)}**:`, ...want.slice(0, SHOW).map(line), ...(want.length > SHOW ? [`- and ${want.length - SHOW} more on PEP`] : [])); }
      if (late) sections.push(`${plural(late, "dose")} ${late === 1 ? "is" : "are"} past ${late === 1 ? "its" : "their"} date with nothing recorded${at(f)}. Ask me “missed doses” to see ${late === 1 ? "it" : "them"}.`);
      if (late) any = true;
    }
  }
  sink.citations.push({ id: "page:/health/pep", label: "PEP", href: "/health/pep", kind: "page" });
  const empty = ask.kind === "missed" ? "No dose is past its date without a record." : ask.kind === "calls" ? "Nobody is waiting for a reminder call: everyone due has been called in the last day, or did not agree to calls." : `No PEP dose is due ${ask.kind === "due" && ask.when !== "both" ? ask.when : "today or tomorrow"}.`;
  return { text: any ? `${sections.join("\n")}\n\nRecord each dose or call on its record. I read and list; giving, missing or changing a dose is recorded by your team.` : empty, suggestions: ask.kind === "due" ? ["Missed doses", "Which patients should we call?", "Referrals waiting"] : ["PEP doses due today", "Referrals waiting"] };
}

/** One bite record in words: what is recorded, nothing decided. */
function exposureSummary(e: ExposureRecord, f: Facility): string {
  const doses = (e.doses ?? []).filter((d) => d.status !== "cancelled");
  const given = doses.filter((d) => d.status === "given").length;
  const next = doses.find((d) => d.status === "due");
  const today = e.today ?? indiaDay();
  const lines = [
    `**${e.code}** at ${f.name}${e.patient_ref ? ` · ${e.patient_ref}` : ""} · ${AGE[e.age_band] ?? e.age_band}${e.sex && e.sex !== "not_recorded" ? `, ${e.sex}` : ""}`,
    `- ${KIND[e.exposure_kind] ?? e.exposure_kind} by ${SPECIES[e.animal_species] ?? e.animal_species} on ${short(e.exposure_on)}, seen ${short(e.presented_on)} · wound ${WASHED[e.wound_washed] ?? e.wound_washed}`,
    `- Category: ${e.category === "not_recorded" ? "not recorded yet" : `${e.category}${e.category_by_name ? `, recorded by ${e.category_by_name}` : ""}`}`,
    e.course ? `- Course: ${e.course.regimen}${e.course.rig_given ? " with immunoglobulin" : ""} · ${COURSE[e.course.status] ?? e.course.status}${e.course.prescribed_by_name ? ` · prescribed by ${e.course.prescribed_by_name}` : ""} · ${given} of ${doses.length} doses given` : "- Course: none prescribed",
    ...doses.map((d) => `  - Dose ${d.dose_no}: ${d.status === "given" ? `given ${d.given_on ? short(d.given_on) : ""}`.trim() : d.status === "missed" ? `missed (due ${short(d.due_on)})` : d.due_on < today ? `due ${short(d.due_on)}, nothing recorded` : `due ${short(d.due_on)}`}`),
    next ? `\nNext: dose ${next.dose_no}, ${next.due_on === today ? "today" : next.due_on < today ? `was due ${short(next.due_on)}` : short(next.due_on)}.` : "",
    "Recorded values only. Any clinical decision on this record stays with the clinician.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** A clinical decision asked for: said plainly, with what Kaju can do instead. */
export const CLINICAL_REPLY: Said = {
  text: "That is a clinical decision, so it stays with the treating clinician. I do not diagnose, prescribe, change doses, validate results or decide eligibility. I can show a bite record and its dose schedule, list what is due, or prepare a bite record from your note for you to confirm.",
  suggestions: ["PEP doses due today", "Missed doses", "Which patients should we call?"],
};

/* ── a bite record from a clinician's note ───────────────────────────── */
export type ExposureProposal = Extract<Proposal, { kind: "register_exposure" }>;

/** Prepare a bite record from the note. Saves nothing: the person confirms it, and /api/ai/act records it through oh_record_exposure as them. */
export async function prepareExposure(note: ExposureNote, said: string, ctx: ToolCtx, sink: Sink, now = new Date()): Promise<Said> {
  const all = await myFacilities(ctx.db);
  if (!all) return { text: COULD_NOT };
  const can = all.filter((f) => f.caps.has("record_exposure"));
  if (!can.length) return { text: all.length ? `Your role at ${all[0].name} does not record bites. A clinician, nurse or records officer there can.` : NOT_A_FACILITY };
  const f = can[0];
  const today = indiaDay(now);
  if (!note.date) return { text: `When did it happen? Say it again with the date, for example “${said.replace(/[.\s]+$/, "")}, today”. I have not prepared anything yet.`, suggestions: [`${said.replace(/[.\s]+$/, "")}, today`, `${said.replace(/[.\s]+$/, "")}, yesterday`] };
  if (note.date.day > today) return { text: `The date it happened (${sayDay(note.date.day)}) is in the future. Check it and tell me again; nothing was prepared.` };
  if (note.date.day < addDays(today, -365)) return { text: "The date it happened is more than a year ago, so the register will not take it. Nothing was prepared." };
  const clinician = f.caps.has("assess");
  const category = note.category && clinician ? note.category : null;
  /* The area, only when the note names one of the facility's own areas exactly. */
  let area: { id: string; name: string } | null = null;
  if (note.place) {
    const r = await ctx.db.rpc("oh_org_areas", { p_org: f.id });
    const areas = !r.error && Array.isArray(r.data) ? (r.data as { id: string; name: string }[]) : [];
    const words = ` ${note.place.toLowerCase()} `;
    const hits = areas.filter((a) => a.name && words.includes(` ${a.name.toLowerCase()} `));
    if (hits.length === 1) area = hits[0];
  }
  const p: ExposureProposal = {
    id: workId("kx", f.id, ctx.userId ?? "", said.replace(/\s+/g, " ").trim().toLowerCase(), today), kind: "register_exposure", why: "",
    facilityId: f.id, facilityName: f.name, exposureOn: note.date.day, exposureTime: note.time, exposureKind: note.kind, site: note.site,
    category, patientRef: note.patientRef, ageBand: note.ageBand as AgeBand | null, ageText: note.ageText, sex: note.sex, woundWashed: note.washed,
    species: note.species, ownership: note.ownership, animalPlace: note.place, contactPhone: note.consent ? note.phone : null, reminderConsent: note.consent && !!note.phone,
    areaId: area?.id ?? null, areaName: area?.name ?? null,
  };
  const missing = [
    !p.patientRef && "register number",
    !p.ageBand && "age",
    !p.sex && "sex",
    !p.woundWashed && (note.washedUnclear ? "wound washing (the note says washed, not whether before arrival or here)" : "wound washing"),
    !note.category && "category",
    !note.speciesStated && "which animal",
  ].filter(Boolean) as string[];
  const notes = [
    note.kindNote,
    note.category && !clinician ? `Category ${note.category} is in your note, but only a clinician records the category, so it is left for them.` : null,
    note.phone && !note.consent ? "A phone number is in the note but not the patient's agreement to be called, so it is not saved." : null,
    note.time || note.site ? `The register has no field for the ${[note.time && "time", note.site && "wound site"].filter(Boolean).join(" or ")}, so ${note.time && note.site ? "they are" : "it is"} not saved with the record.` : null,
    area ? `The ${area.name} animal team will be asked to find and observe the animal (description and place only, never patient details).` : note.place ? `“${note.place}” did not match one of your areas, so no area is set and no animal follow-up is asked for.` : null,
  ].filter(Boolean) as string[];
  p.why = [`From your note, for ${f.name}.`, missing.length ? `Not in the note: ${missing.join(", ")}.` : "", ...notes, "Prescribing a course stays with the clinician on the record."].filter(Boolean).join(" ");
  sink.proposals.push(p);
  sink.tools.push({ name: "prepare_exposure", summary: `Prepared a bite record for ${f.name}`, ok: true });
  const facts = [
    `**${KIND[p.exposureKind]}** on **${sayDay(p.exposureOn)}**${p.exposureTime ? ` at ${p.exposureTime}` : ""}${p.site ? `, ${p.site}` : ""}`,
    p.ageText || p.sex ? `${[p.sex, p.ageText].filter(Boolean).join(", ")}` : "",
    p.category ? `category **${p.category}**` : "",
    p.patientRef ? `register number ${p.patientRef}` : "",
  ].filter(Boolean).join("; ");
  return { text: `I prepared a bite record for **${f.name}**: ${facts}.${missing.length ? ` Not in your note: ${missing.join(", ")}; I left ${missing.length === 1 ? "it" : "them"} empty.` : ""} Check it and press Confirm; it is saved in your name. Prescribing the course stays with the clinician on the record.` };
}
