import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { FeedList } from "@/components/feed/FeedList";
import { getAllSightings, countLiveSightings } from "@/lib/data";

export const metadata = {
  title: "Sightings Feed, StrayPaw",
  description: "A live feed of street-animal sightings from across India.",
};

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const [realSightings, liveTotal] = await Promise.all([
    getAllSightings(),
    countLiveSightings(),
  ]);

  return (
    <div className="feed-page mx-auto px-4 sm:px-6">
      <header className="feed-page-head mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-widest text-paw-600 dark:text-paw-300">Community field journal</p>
          <h1 className="mt-1 font-display text-2xl tracking-tight sm:text-3xl">Latest sightings</h1>
          <p className="mt-1 text-sm text-bark-500">A live stream of evidence from streets across India.</p>
        </div>
        <Link href="/report" className="feed-report-button shrink-0">
          <PlusCircle className="h-4 w-4" /> Report an animal
        </Link>
      </header>

      <FeedList real={realSightings} total={liveTotal} />
    </div>
  );
}
