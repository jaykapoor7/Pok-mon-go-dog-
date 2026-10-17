import type { PublicProgrammeCategory } from "@/lib/public-programmes";

/* The ink of each kind of programme, shared by the list and the detail. */
export const CAT: Record<PublicProgrammeCategory, { label: string; ink: string }> = {
  sterilisation: { label: "Sterilisation (ABC)", ink: "#1f6f80" },
  vaccination: { label: "Vaccination (ARV)", ink: "#2457ce" },
  treatment: { label: "Treatment & rescue", ink: "#c0603c" },
  study: { label: "Survey & study", ink: "#d99b1c" },
  other: { label: "Other work", ink: "#7d8db4" },
};
