import { PartnerRecordExplorer } from "@/components/partner/PartnerRecordExplorer";
import { DeskHeader } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Records, StrayPaw Partner" };

export default function PartnerRecordsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <Records searchParams={searchParams} />;
}

async function Records({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  return (
    <div className="dk-page">
      <DeskHeader
        kicker="Records · search"
        title="The working register"
        lede="Rescue, care, follow-up and outcome in one searchable record. Open a row to work on the animal or case behind it."
      />
      <PartnerRecordExplorer initialFilter={params.view || "all"} />
    </div>
  );
}
