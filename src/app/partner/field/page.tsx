import { CampsSection } from "@/components/partner/CampsSection";
import { FieldToday } from "@/components/partner/FieldToday";
import { TasksSection } from "@/components/partner/TasksSection";
import { DeskHeader } from "@/components/app/DeskHeader";
import Link from "next/link";

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
      <nav className="fp-views" aria-label="Field planning views">
        <Link href="/partner/field" aria-current="page">Today</Link>
        <Link href="/partner/followups">Follow-ups</Link>
        <Link href="/partner/drives">Drives</Link>
        <Link href="/partner/projects">Projects</Link>
        <Link href="/partner/surveys">Surveys</Link>
        <Link href="/partner/operations">Operations</Link>
        <Link href="/partner/volunteers">Volunteers</Link>
        <Link href="/partner/feeding">Feeding</Link>
      </nav>
      <FieldToday />
      <div className="fp-rest">
        <TasksSection />
        <CampsSection />
      </div>
    </div>
  );
}
