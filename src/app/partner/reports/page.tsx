import { ReportsClient } from "@/components/partner/ReportsClient";
import { FieldTabs } from "@/components/partner/FieldTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics, StrayPaw Partner" };

export default function PartnerReportsPage() {
  return <><FieldTabs /><ReportsClient /></>;
}
