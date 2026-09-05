import { getCases } from "@/lib/cases";
import { PartnerOverview } from "@/components/partner/PartnerOverview";
import { ProgrammeOverview } from "@/components/partner/ProgrammeOverview";
import { QuickActions } from "@/components/partner/QuickActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard, StrayPaw Partner" };

export default async function PartnerOverviewPage() {
  const cases = await getCases();
  return (
    <>
      {/* The two numbers an ABC and rabies programme is judged on, before
          anything else on the page. Renders nothing when the account is not
          in an organisation. */}
      <ProgrammeOverview />
      {/* How are we doing, then what now, then what is open. */}
      <QuickActions />
      <PartnerOverview cases={cases} />
    </>
  );
}
