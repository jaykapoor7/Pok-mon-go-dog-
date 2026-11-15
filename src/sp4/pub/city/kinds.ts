import type { PublicProgrammeCategory } from "@/lib/public-programmes";

/* The ink of each kind of programme, shared by the list and the detail. */
export const CAT: Record<PublicProgrammeCategory, { label: string; ink: string }> = {
  sterilisation: { label: "Sterilisation (ABC)", ink: "#1f7a4d" },
  vaccination: { label: "Vaccination (ARV)", ink: "#2457ce" },
  treatment: { label: "Treatment & rescue", ink: "#c2532d" },
  study: { label: "Survey & study", ink: "#b7791f" },
  other: { label: "Other work", ink: "#8a93a6" },
};
