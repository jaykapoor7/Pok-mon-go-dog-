import { PartnerOverview } from "@/components/partner/PartnerOverview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today, StrayPaw Partner" };

/* No server-side case fetch. This page is readable by anyone, and reading
   cases here meant reading every organisation's, rendered into the HTML
   before anybody signed in. The dashboard loads its own rows through
   my_org_cases(), which is scoped by my_ngo(), so signed out it is
   genuinely empty rather than emptied afterwards. */
export default function PartnerOverviewPage() {
  return (
    <>
      {/* The two numbers an ABC and rabies programme is judged on, before
          anything else on the page. Renders nothing when the account is not
          in an organisation. */}
      {/* How are we doing, then what now, then what is open. */}
      <PartnerOverview />
    </>
  );
}
