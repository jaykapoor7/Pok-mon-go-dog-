import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { FeedList } from "@/components/feed/FeedList";
import { getAllSightings } from "@/lib/data";

export const metadata = {
  title: "Sightings Feed — StrayPaw",
  description: "An Instagram-style feed of street dog sightings across India.",
};

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const realSightings = await getAllSightings();

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tightest sm:text-3xl">
            Sightings
          </h1>
          <p className="mt-1 text-sm text-bark-500">Fresh street-dog moments from across India.</p>
        </div>
        <Link href="/report" className="btn-primary shrink-0 px-4 py-2 text-sm">
          <PlusCircle className="h-4 w-4" /> Add
        </Link>
      </header>

      <FeedList real={realSightings} />
    </div>
  );
}
