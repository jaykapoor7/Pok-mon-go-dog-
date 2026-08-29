import { PlatformShell } from "@/components/platform/PlatformNav";
import { TakeActionClient } from "@/components/platform/TakeActionClient";

export const dynamic = "force-static";
export const metadata = {
  title: "Take Action - StrayPaw",
  description: "Evidence-based actions by geography: what an area's data says it needs, the organisations working there, and how to help — report, volunteer, or open data.",
};

export default function TakeActionPage() {
  return <PlatformShell><TakeActionClient /></PlatformShell>;
}
