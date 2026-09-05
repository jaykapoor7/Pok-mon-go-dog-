import { getCases } from "@/lib/cases";
import { PartnerOverview } from "@/components/partner/PartnerOverview";
import { ProgrammeOverview } from "@/components/partner/ProgrammeOverview";
import { SetPasswordNudge } from "@/components/partner/SetPasswordNudge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview, StrayPaw Partner" };

export default async function PartnerOverviewPage() {
  const cases = await getCases();
  return (
    <>
      {/* Only shown to somebody who got in with a one-time code, whose
          code is now spent. */}
      <SetPasswordNudge />
      {/* The two numbers an ABC and rabies programme is judged on, before
          anything else on the page. Renders nothing when the account is not
          in an organisation. */}
      <ProgrammeOverview />
      <PartnerOverview cases={cases} />
    </>
  );
}
