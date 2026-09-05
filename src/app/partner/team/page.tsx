import { InviteCodesClient } from "@/components/partner/InviteCodesClient";

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
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          Team
        </h1>
        <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-bark-500">
          Everyone you add gets six characters of their own. That code is how
          they sign in, every time, on any phone, with no account and no
          password. Staff codes open this dashboard; volunteer codes only
          attribute reports to their name.
        </p>
      </header>
      <InviteCodesClient />
    </div>
  );
}
