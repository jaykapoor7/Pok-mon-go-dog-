import { AppShell } from "@/components/app/AppShell";
import { MunicipalCommand } from "@/components/municipality/MunicipalCommand";
import { Suspense } from "react";

export const metadata = {
  title: "Municipal command, StrayPaw",
  description: "A geographic view of coverage, ABC, ARV, cases and field activity from the StrayPaw record.",
};

export default function MunicipalityCommandPage() {
  return <AppShell flush><Suspense fallback={null}><MunicipalCommand /></Suspense></AppShell>;
}
