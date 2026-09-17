import { PartnerRecordHome } from "@/components/partner/PartnerRecordHome";

export const dynamic = "force-dynamic";
export const metadata = { title: "Organisation record, StrayPaw Partner" };

/* The NGO home is an index into the organisation's native records. Detailed
   operational history stays behind authenticated RLS reads in the client. */
export default function PartnerOverviewPage() {
  return <PartnerRecordHome />;
}
