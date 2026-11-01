/* ════════════════════════════════════════════════════════════════════
   What kind of record each city holds, and how precisely it is placed.

   At national scale the atlas colours each city by the KIND of evidence
   it holds (Opportunity Atlas's lesson: different evidence resolutions
   must look different), and sizes it by the active lens's live count.
   These notes are qualitative and verified against the source audit;
   counts always come from the live index, never from here.
   ════════════════════════════════════════════════════════════════════ */

export type EvidenceKind = "rescue" | "campaign" | "clinical" | "photo" | "register";

export const KINDS: Record<EvidenceKind, { label: string; ink: string; echo: string; reads: string }> = {
  rescue: { label: "Rescue & care", ink: "#e0583a", echo: "#2f3d8f", reads: "Requests for help, treatment and outcomes" },
  campaign: { label: "Historical vaccination campaign (2014–15)", ink: "#2c9aa6", echo: "#b65a3a", reads: "Where a campaign worked, from source GPS" },
  clinical: { label: "Historical clinical register (2013–16)", ink: "#2f3d8f", echo: "#f05b40", reads: "An archive kept at city level only: drawn hollow" },
  photo: { label: "Photo observations", ink: "#d99b1c", echo: "#2457ce", reads: "Individual animals, photographed" },
  register: { label: "Place registers", ink: "#7d8db4", echo: "#9b3149", reads: "Smaller lists of recorded animals" },
};

export function cityEvidence(city: string, cells: number) {
  if (city === "Jamshedpur") return { kind: "clinical" as const, precision: "City-level location only", note: "Historical clinical records share one city location. They cannot describe streets or neighbourhoods, so this city is never drawn as areas or dots." };
  if (city === "Ranchi") return { kind: "campaign" as const, precision: "Source GPS, shown by area", note: "Campaign records carry source GPS. Public positions are grouped into areas: the campaign's footprint, not a population survey." };
  if (city === "Coimbatore") return { kind: "rescue" as const, precision: "Approximate localities", note: "Rescue requests and care histories are placed mostly by recorded locality. Dots inside an area are schematic." };
  if (city === "Lucknow") return { kind: "rescue" as const, precision: "Approximate localities", note: "Rescue encounters include provisional identities. Several encounters may be one animal." };
  if (city === "Hyderabad" || city === "Delhi") return { kind: "photo" as const, precision: "Public observation areas", note: "A small set of photographed observations, not representative of every animal in the city." };
  return { kind: "register" as const, precision: cells <= 1 ? "One recorded area" : "Public location areas", note: "The footprint of recorded evidence. Empty places mean nothing was reported, not that there are no animals or no care." };
}

export const kindOf = (city: string, cells: number): EvidenceKind => cityEvidence(city, cells).kind;
