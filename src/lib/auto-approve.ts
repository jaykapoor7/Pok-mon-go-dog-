/* ════════════════════════════════════════════════════════════════════
   When a sighting may go live without a person reviewing it.

   Conservative on purpose. A report is approved automatically only when
   every check passes; any doubt leaves it in the moderation queue, where
   the same checks are shown to the reviewer. Approval creates a new
   animal record — a report that claims to be an existing animal always
   waits for a person, because merging identities is a judgement.

   Turn the whole thing off with AUTO_APPROVE_SIGHTINGS=off.
   ════════════════════════════════════════════════════════════════════ */

export type SightingFacts = {
  photoUrl: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  notes?: string | null;
  nickname?: string | null;
  signedIn: boolean;
  forOrganisation: boolean;
  claimedDogId?: string | null;
  trust?: number | null;
};

export type Check = { id: string; label: string; ok: boolean };

const CONTACT = /(https?:\/\/|www\.|\b[\w.+-]+@[\w-]+\.[\w.]+\b|(\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b)/i;
const INDIA = { s: 6.5, n: 36, w: 68, e: 97.5 };

export function sightingChecks(f: SightingFacts): Check[] {
  const text = `${f.nickname ?? ""} ${f.notes ?? ""}`;
  const inIndia = typeof f.lat === "number" && typeof f.lng === "number" && f.lat >= INDIA.s && f.lat <= INDIA.n && f.lng >= INDIA.w && f.lng <= INDIA.e;
  const trusted = f.signedIn || f.forOrganisation || (f.trust ?? 0) >= 80;
  return [
    { id: "photo", label: "Has a photograph", ok: !!f.photoUrl && String(f.photoUrl).trim() !== "" },
    { id: "place", label: "Located inside India", ok: inIndia },
    { id: "text", label: "No phone numbers, emails or links", ok: !CONTACT.test(text) && text.length <= 600 },
    { id: "new", label: "Not claimed as an existing animal", ok: !f.claimedDogId },
    { id: "who", label: f.forOrganisation ? "Reported for an organisation" : f.signedIn ? "Reporter is signed in" : "Trusted reporter", ok: trusted },
  ];
}

export function autoApprovalOn() {
  return (process.env.AUTO_APPROVE_SIGHTINGS ?? "on").trim().toLowerCase() !== "off";
}

export function passesAutoApproval(f: SightingFacts) {
  return autoApprovalOn() && sightingChecks(f).every((c) => c.ok);
}
