import Link from "next/link";
import { Map as MapIcon, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Map — StrayPaw Partner" };

export default function PartnerMapPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Map</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">Where the work is happening, and where the need is greatest.</p>
      </header>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-black/[0.1] py-20 text-center dark:border-white/[0.12]">
        <MapIcon className="h-7 w-7 text-bark-300" />
        <p className="mt-3 max-w-sm text-[14px] text-bark-500">
          The layered case &amp; survey map workspace (filters by species, status, urgency, village and worker, with a select side-panel) is the next build.
        </p>
        <Link href="/map" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-paw-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
          Open the live map <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
