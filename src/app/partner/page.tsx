import { PartnerOverview } from "@/components/partner/PartnerOverview";
import { HistoricalImpactStrip } from "@/components/partner/HistoricalImpactStrip";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today, StrayPaw Partner" };

/* All organisation data loads client-side through the authenticated Supabase
   session and RLS. Nothing private is rendered into signed-out HTML. */
export default function PartnerOverviewPage() {
  return <><HistoricalImpactStrip /><PartnerOverview /></>;
}
