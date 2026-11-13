import type { PublicProgrammeCategory } from "@/lib/public-programmes";

/* The ink of each kind of programme, shared by the list and the detail: theme tints, so they hold in light and dark. */
export const CAT: Record<PublicProgrammeCategory, { label: string; ink: string }> = {
  sterilisation: { label: "Sterilisation (ABC)", ink: "var(--i-green)" },
  vaccination: { label: "Vaccination (ARV)", ink: "var(--n-blue)" },
  treatment: { label: "Treatment & rescue", ink: "var(--i-orange)" },
  study: { label: "Survey & study", ink: "var(--i-yellow)" },
  other: { label: "Other work", ink: "var(--n-text-3)" },
};
