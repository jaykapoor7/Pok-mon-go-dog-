import { AppShell } from "@/components/app/AppShell";
import { OrgRegister } from "@/components/orgs/OrgRegister";
import { getContributorOrganisations } from "@/lib/contributors";
import { STATES } from "@/lib/platform/geography";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Partner and source organisations, StrayPaw",
  description:
    "The organisations partnering with StrayPaw and the institutions responsible for public records in the atlas.",
};

export default async function OrgsPage() {
  const orgs = await getContributorOrganisations();
  const states = new Set(orgs.map((org) => org.stateCode).filter((code) => code !== "IN-UN"));
  const stateNames = Object.fromEntries(STATES.map((s) => [s.code, s.name]));

  return (
    <AppShell>
      <div className="og-page">
        <header className="og-mast">
          <p className="sys-eyebrow">Partners · data sources</p>
          <h1>Who stands behind the&nbsp;record.</h1>
          <p className="og-lede">
            <b>{orgs.length}</b> organisations across <b>{states.size}</b> states: StrayPaw&rsquo;s operational partners and the institutions
            whose public datasets are actually represented on the atlas. Every animal and area record attributed to an organisation links
            back to its page; unrelated directory listings are not included.
          </p>
        </header>
        <OrgRegister orgs={orgs} stateNames={stateNames} />
      </div>
    </AppShell>
  );
}
