import { PlatformShell } from "@/components/platform/PlatformNav";
import { ResearchClient } from "@/components/platform/ResearchClient";

export const dynamic = "force-static";
export const metadata = {
  title: "Source library, StrayPaw",
  description: "A curated index of government, academic and NGO sources on street dogs, rabies and Animal Birth Control in India, with publisher, year, geography and scope.",
};

export default function ResearchPage() {
  return <PlatformShell><ResearchClient /></PlatformShell>;
}
