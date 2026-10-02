import { CampsSection } from "@/components/partner/CampsSection";
import { FieldToday } from "@/components/partner/FieldToday";
import { TasksSection } from "@/components/partner/TasksSection";
import { DeskHeader } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Field work, StrayPaw Partner" };

export default function PartnerFieldPage() {
  return (
    <div className="fp">
      <DeskHeader
        kicker="Field work · today"
        title="Today in the field"
        lede="Who is out, what they are attending, and the tasks and camps still to come."
      />
      <FieldToday />
      <div className="fp-rest">
        <TasksSection />
        <CampsSection />
      </div>
    </div>
  );
}
