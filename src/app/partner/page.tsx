import { OpsRoom } from "@/components/partner/OpsRoom";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations, StrayPaw Partner" };

/* The NGO home: the operations room. Aggregates come from the compact
   spatial dataset; the few rows it lists by name are bounded reads under
   the member's own session (lib/ops.ts). */
export default function PartnerOverviewPage() {
  return <OpsRoom />;
}
