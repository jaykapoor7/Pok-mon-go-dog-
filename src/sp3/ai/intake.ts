/* ════════════════════════════════════════════════════════════════════
   Kaju · intake desk.

   Most reports still reach an NGO as WhatsApp messages that someone
   retypes into a case form after searching the register for the animal.
   Here a person pastes (or forwards) the messages instead. For each one
   Kaju extracts the facts, links an animal only on an exact tag, finds an
   open case it may duplicate, and prepares the record. The person picks
   one option and confirms; nothing is saved by Kaju itself.

   Pure and deterministic so it can be tested without a database, and so
   that preparing the same message twice yields the same request ID: the
   audited confirm path then replays instead of creating a second case.
   The planned WhatsApp connection will feed the same planner.
   ════════════════════════════════════════════════════════════════════ */

import type { Extracted } from "./extract";
import type { Proposal } from "./types";
import { workId } from "./prepare";

/** One pasted block → separate messages. Understands WhatsApp chat exports
 *  ("[03/11/26, 7:42 am] Ravi: …" and "03/11/2026, 07:42 - Ravi: …") and
 *  blank-line separated text. Sender names are dropped, never stored. */
export function splitMessages(raw: string): string[] {
  const text = raw.replace(/\r/g, "").replace(/‎/g, "").trim();
  if (!text) return [];
  const stamp = /^\[?\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:[ap]\.?m\.?)?\]?\s*(?:-\s*)?([^:\n]{1,40}):\s*/i;
  const lines = text.split("\n");
  if (lines.some((l) => stamp.test(l))) {
    const out: string[] = [];
    for (const l of lines) {
      if (stamp.test(l)) out.push(l.replace(stamp, ""));
      else if (out.length) out[out.length - 1] += `\n${l}`;
    }
    return clean(out);
  }
  return clean(text.split(/\n\s*\n/));
}
/** Phone numbers and email addresses in a report are masked before anything is prepared or saved. */
export const redact = (x: string) => x
  .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email removed]")
  .replace(/(?:\+?91[\s-]?)?(?<!\d)[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, "[phone removed]");
export const clean = (xs: string[]) => xs.map((x) => redact(x.replace(/<media omitted>|image omitted|‎/gi, "[photo]")).trim())
  .filter((x) => x.length >= 8 && !/^(ok+|okay|thanks?|thank you|noted|👍+|done)\.?$/i.test(x)).slice(0, 12);

export type AnimalCandidate = { id: string; label: string; tag: string | null; zone: string | null; sex: string | null };
export type CaseCandidate = { id: string; label: string; dogId: string | null; zone: string | null; occurredAt: string | null };

export type IntakeOption = { key: string; label: string; detail: string; recommended: boolean; proposal: Proposal };
export type IntakePlan = {
  text: string;
  extracted: Extracted;
  animal: AnimalCandidate | null;        // linked only on an exact tag
  similarAnimals: AnimalCandidate[];      // same locality and sex: for a person to compare
  duplicate: CaseCandidate | null;
  cityFrom: "message" | "organisation" | null;
  missing: string[];                      // facts the message lacks, after defaults
  blockers: string[];                     // why it cannot be saved yet
  clear: boolean;                         // safe to include in "confirm all"
  options: IntakeOption[];
};

const lower = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
const sameZone = (a: string | null, b: string | null) => !!a && !!b && (lower(a).includes(lower(b)) || lower(b).includes(lower(a)));

export function planIntake(
  text: string, x: Extracted,
  ctx: { orgId: string; defaultCity: string | null; animals: AnimalCandidate[]; openCases: CaseCandidate[]; now: Date },
): IntakePlan {
  const animal = x.tag ? ctx.animals.find((a) => a.tag && lower(a.tag) === lower(x.tag)) ?? null : null;
  const similarAnimals = animal ? [] : ctx.animals
    .filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i)
    .filter((a) => x.place && x.place.length >= 4 && sameZone(a.zone, x.place) && (!x.sex || !a.sex || lower(a.sex).startsWith(x.sex[0])))
    .slice(0, 3);
  const recent = (c: CaseCandidate) => c.occurredAt && ctx.now.getTime() - Date.parse(c.occurredAt) < 14 * 86_400_000;
  const duplicate = (animal && ctx.openCases.find((c) => c.dogId === animal.id))
    || (x.place && x.place.length >= 4 ? ctx.openCases.find((c) => recent(c) && sameZone(c.zone, x.place)) : undefined) || null;
  const strongDuplicate = !!duplicate && !!animal && duplicate.dogId === animal.id;

  const city = x.city ?? ctx.defaultCity;
  const blockers = city ? [] : ["Add the city"];
  const title = x.summary.slice(0, 120) || "Field report";
  const description = [`Report as received:\n${text.slice(0, 1200)}`, x.missing.length ? `Not in the message: ${x.missing.join(", ")}.` : "", x.city ? "" : city ? `City taken from the organisation profile (${city}).` : ""].filter(Boolean).join("\n\n");
  const base = workId("ki", ctx.orgId, text.replace(/\s+/g, " ").trim().toLowerCase());
  const options: IntakeOption[] = [];

  if (duplicate) options.push({
    key: "note", label: `Add to ${duplicate.label}`, recommended: strongDuplicate,
    detail: strongDuplicate ? "This animal already has an open case." : `An open case in ${duplicate.zone} was recorded in the last two weeks. Check it is the same animal.`,
    proposal: { id: `${base}-n`, kind: "add_note", why: "Report matches an open case", caseId: duplicate.id, caseLabel: duplicate.label, note: `New report received:\n${text.slice(0, 1300)}` },
  });
  if (city) {
    const open = (dog: AnimalCandidate | null, suffix: string, recommended: boolean, detail: string): IntakeOption => ({
      key: `case${suffix}`, label: dog ? `New case for ${dog.label}` : "New case, animal not identified yet", recommended, detail,
      proposal: { id: `${base}-c${suffix}`, kind: "open_case", why: "New report", title, city, zone: x.place, category: x.category, severity: x.severity, description, dogId: dog?.id ?? null },
    });
    if (animal) options.push(open(animal, "a", !strongDuplicate, `Tag ${animal.tag} matches this animal exactly.`));
    else {
      options.push(open(null, "", !duplicate, "The animal can be linked after someone identifies it."));
      similarAnimals.forEach((a, i) => options.push(open(a, String(i), false, `Possible match by locality only${a.sex ? ` · ${a.sex}` : ""}. Check a photo, tag or marking before choosing.`)));
    }
  }
  /* "Confirm all" only takes plans with one obvious answer. */
  const clear = !blockers.length && options.some((o) => o.recommended) && (!duplicate || strongDuplicate) && !similarAnimals.length;
  const cityFrom = x.city ? "message" as const : city ? "organisation" as const : null;
  const missing = x.missing.filter((m) => !(m === "city" && city));
  return { text, extracted: { ...x, city }, cityFrom, missing, animal, similarAnimals, duplicate, blockers, clear, options };
}
