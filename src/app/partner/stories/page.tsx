import { StoriesClient } from "@/components/partner/StoriesClient";
import { DeskHeader } from "@/components/app/DeskHeader";

export const metadata = { title: "Public case stories, StrayPaw Partner" };

export default function PartnerStoriesPage() {
  return (
    <div>
      <DeskHeader
        kicker="Organisation · stories"
        title="Public case stories"
        lede="Turn a completed, approved case into a short public story for your page, reports and social posts."
      />
      <StoriesClient />
    </div>
  );
}
