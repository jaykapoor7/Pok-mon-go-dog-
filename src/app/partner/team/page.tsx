import { InviteCodesClient } from "@/components/partner/InviteCodesClient";
import { ConsolePage } from "@/components/partner/ConsolePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team, StrayPaw Partner" };

/* One page for the people in an organisation.

   There were two: Team, which listed accounts and let you change a role,
   and Volunteer codes, which added people and issued codes. Both answered
   "who is on this team" and disagreed, because a person added by code had
   no account yet and so appeared on one and not the other. Codes are the
   way in now, so this is the list, and the role is set when you add
   somebody rather than afterwards. */
export default function PartnerTeamPage() {
  return (
    <ConsolePage
      kicker="Field work / people"
      title="Team"
      lede="Everyone you add gets six characters of their own. That code is how they sign in, every time, on any phone, with no account and no password. Staff codes open this dashboard; volunteer codes only attribute reports to their name."
    >
      <InviteCodesClient />
    </ConsolePage>
  );
}
