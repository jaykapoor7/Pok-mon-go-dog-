import { CampsSection } from "@/components/partner/CampsSection";
import { FieldToday } from "@/components/partner/FieldToday";
import { TasksSection } from "@/components/partner/TasksSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Field work, StrayPaw Partner" };

export default function PartnerFieldPage() {
  return (
    <div className="fp">
      <header className="fp-head">
        <p className="sys-eyebrow">Field work</p>
        <h1>Today in the field.</h1>
      </header>
      <FieldToday />
      <div className="fp-rest">
        <TasksSection />
        <CampsSection />
      </div>
    </div>
  );
}
