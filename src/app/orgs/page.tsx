import { AppShell } from "@/components/app/AppShell";
import { DirectoryClient } from "@/components/app/DirectoryClient";
import { ORGS, focusCounts, statesWithOrgs } from "@/lib/platform/orgs";
import { STATE_BY_CODE } from "@/lib/platform/geography";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Organisation directory, StrayPaw",
  description:
    "Named animal-welfare organisations working across India — searchable by state and by what they do, each linking to the organisation itself.",
};

const stateName = (code: string) => STATE_BY_CODE.get(code)?.name ?? code;

export default function OrgsPage() {
  const orgs = ORGS.map((o) => ({ ...o, stateName: stateName(o.stateCode) }));
  const states = statesWithOrgs(stateName);
  const focuses = focusCounts();

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">Network / directory</span>
          <h1>
            Who is already <em>doing this.</em>
          </h1>
        </div>
      </div>

      <p className="spa-lede">
        {orgs.length} organisations across {states.length} states, each one real,
        named and linked. Sourced from published information — inclusion is not
        an endorsement, and the list is not exhaustive.
      </p>

      <DirectoryClient orgs={orgs} states={states} focuses={focuses} />
    </AppShell>
  );
}
