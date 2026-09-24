import { AppShell } from "@/components/app/AppShell";
import { OrgRegister } from "@/components/orgs/OrgRegister";
import { ORGS, statesWithOrgs } from "@/lib/platform/orgs";
import { STATES, STATE_BY_CODE } from "@/lib/platform/geography";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Organisation directory, StrayPaw",
  description:
    "Named animal-welfare organisations working across India, by state and by what they do, each linking to the organisation itself.",
};

const stateName = (code: string) => STATE_BY_CODE.get(code)?.name ?? code;

export default function OrgsPage() {
  const orgs = ORGS.map((o) => ({ ...o, stateName: stateName(o.stateCode) }));
  const states = statesWithOrgs(stateName);
  const stateNames = Object.fromEntries(STATES.map((s) => [s.code, s.name]));

  return (
    <AppShell>
      <div className="og-page">
        <header className="og-mast">
          <p className="sys-eyebrow">Network · directory</p>
          <h1>Who is already doing&nbsp;this.</h1>
          <p className="og-lede">
            <b>{orgs.length}</b> named organisations in <b>{states.length}</b> of India&rsquo;s {STATES.length} states and union
            territories, each one real and linked to the organisation itself. Sourced from published information; being listed is not an
            endorsement, and the list is not exhaustive — a state with nobody listed is a gap in this list, not a place nobody works.
          </p>
        </header>
        <OrgRegister orgs={orgs} stateNames={stateNames} />
      </div>
    </AppShell>
  );
}
