import { PlatformShell } from "@/components/platform/PlatformNav";
import { ExploreClient } from "@/components/platform/ExploreClient";

export const dynamic = "force-static";
export const metadata = {
  title: "Explore - StrayPaw",
  description: "Explore street-dog data across India: sterilisation and vaccination coverage, population estimates, rabies burden, and welfare-organisation presence, with visible data gaps.",
};

export default function ExplorePage() {
  return <PlatformShell><ExploreClient /></PlatformShell>;
}
