import { getAllDogs, getRecentSightings } from "@/lib/data";
import { getCases } from "@/lib/cases";
import { OverviewPanel } from "@/components/dashboard/OverviewPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview — StrayPaw Partner" };

export default async function PartnerOverviewPage() {
  const [dogs, cases, sightings] = await Promise.all([
    getAllDogs(),
    getCases(),
    getRecentSightings(80),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Overview</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">What needs attention today.</p>
      </header>
      <OverviewPanel cases={cases} dogs={dogs} sightings={sightings} hrefBase="/partner" />
    </div>
  );
}
