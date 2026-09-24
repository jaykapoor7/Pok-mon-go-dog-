import { AppShell } from "@/components/app/AppShell";
import { CommunityPatch } from "@/components/app/CommunityPatch";
import { getPublishedCaseStories } from "@/lib/community-case-stories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your patch, StrayPaw" };

/* The community home. The register arrives as the compact spatial dataset
   (shared with the map); the named animals are a bounded read of the
   patch's own cells. The whole register is never sent to the browser. */
export default async function ConsoleHome() {
  const stories = await getPublishedCaseStories();
  return <AppShell>
    <CommunityPatch stories={stories.slice(0, 60)} />
  </AppShell>;
}
