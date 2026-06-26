import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getAllDogs, getNGOs, getRecentSightings } from "@/lib/data";
import { getCases } from "@/lib/cases";

export const metadata = {
  title: "NGO Command Center — StrayPaw",
  description:
    "Operate and Impact views for NGO partners: case pipeline, sterilisation & vaccination coverage vs the 70% herd-immunity threshold, colonies, before/after outcomes and a co-branded funder report.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Real data (empty until there are live sightings/cases). The client overlays
  // the shared demo seed when Demo mode is on — same source the map uses.
  const [dogs, ngos, sightings, cases] = await Promise.all([
    getAllDogs(),
    getNGOs(),
    getRecentSightings(80),
    getCases(),
  ]);

  return (
    <DashboardClient dogs={dogs} cases={cases} ngos={ngos} sightings={sightings} />
  );
}
