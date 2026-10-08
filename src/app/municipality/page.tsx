import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { MunicipalBrief } from "@/components/municipality/MunicipalBrief";

export const metadata = {
  title: "City brief, StrayPaw",
  description: "What StrayPaw's record holds for a city: kinds of evidence, recorded totals with their limits, where activity concentrates, change over time and gaps.",
};

/* The municipal surface is a city brief that links into the Atlas, not a
   second copy of the map. */
export default function MunicipalityPage() {
  return <AppShell><Suspense fallback={null}><MunicipalBrief /></Suspense></AppShell>;
}
