import type { Dog } from "./types";

export type Need = { label: string; urgent: boolean };

/* What this animal actually needs, in the words the record supports.

   "Needs Help" on its own converts nobody: it tells a reader something is
   wrong without telling them what, so they cannot judge whether they are
   the right person to act. Everything here is derived from recorded fields,
   never guessed.

   Unknown is kept distinct from no. An animal nobody has checked for
   sterilisation is not an unsterilised animal, and collapsing the two would
   misreport the one thing an ABC programme is measured on. */
export function needsFor(dog: Dog): Need[] {
  const needs: Need[] = [];

  if (dog.status === "injured") needs.push({ label: "Reported injured", urgent: true });
  if (dog.status === "hungry") needs.push({ label: "Reported hungry", urgent: false });

  const ster = dog.sterilisation_status ?? (dog.sterilised ? "sterilised" : "unknown");
  if (ster === "not_sterilised") needs.push({ label: "Not sterilised", urgent: false });
  else if (ster === "unknown") needs.push({ label: "Sterilisation not checked", urgent: false });

  const vacc = dog.vaccination_status ?? (dog.vaccinated ? "vaccinated" : "unknown");
  if (vacc === "not_vaccinated") needs.push({ label: "Not vaccinated", urgent: true });
  else if (vacc === "unknown") needs.push({ label: "Vaccination not checked", urgent: false });

  return needs;
}

/* The most recent thing a person actually wrote about this animal. It is
   the closest the record gets to a description of the need, so it is worth
   more than any label. Trimmed to one line; the record page carries the
   rest. */
export function latestNote(dog: Dog): string | null {
  const note = (dog.community_notes ?? []).filter(Boolean).at(-1) ?? dog.intake_notes ?? null;
  if (!note) return null;
  const clean = String(note).replace(/\s+/g, " ").trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean || null;
}

/* Localities arrive from imports with placeholders like "Awaiting location".
   Printing that as if it were a place claims a street that does not exist. */
export function placeLabel(zone: string | null | undefined): string {
  const z = String(zone ?? "").trim();
  if (!z || /^awaiting|^unknown|^n\/?a$/i.test(z)) return "Location pending";
  return z;
}
