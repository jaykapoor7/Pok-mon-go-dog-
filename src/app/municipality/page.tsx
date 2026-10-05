import { AppShell } from "@/components/app/AppShell";
import { MunicipalCommand } from "@/components/municipality/MunicipalCommand";

export const metadata = {
  title: "Municipal command, StrayPaw",
  description: "A geographic view of coverage, ABC, ARV, cases and field activity from the StrayPaw record.",
};

export default function MunicipalityCommandPage() {
  return <AppShell flush><MunicipalCommand /></AppShell>;
}
