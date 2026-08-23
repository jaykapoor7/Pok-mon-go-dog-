import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { FeedingZoneControls } from "@/components/feeding/FeedingZoneControls";
import {
  getFeedingZoneById,
  getFeedingZoneVolunteers,
  getFeedingZoneCheckins,
} from "@/lib/feeding-zones";
import { timeAgo, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = await getFeedingZoneById(id);
  if (!zone) return { title: "Feeding zone not found, StrayPaw" };
  return {
    title: `${zone.name}, Feeding zone | StrayPaw`,
    description: `Feeding zone near ${zone.zone ?? "your city"}. ${zone.volunteer_count} volunteers covering it.`,
  };
}

export default async function FeedingZonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = await getFeedingZoneById(id);
  if (!zone) notFound();

  const [volunteers, checkins] = await Promise.all([
    getFeedingZoneVolunteers(id),
    getFeedingZoneCheckins(id),
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/feeding"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Feeding zones
      </Link>

      <DogPhoto
        src={zone.photo_url ?? ""}
        alt={zone.name}
        seed={zone.id}
        className="aspect-video w-full rounded-3xl"
      />

      <header className="mt-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tightest">{zone.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-bark-500">
          {zone.zone && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {zone.zone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" /> added {timeAgo(zone.created_at)}
          </span>
        </div>
        {zone.description && (
          <p className="mt-3 text-sm text-bark-700 dark:text-bark-200">{zone.description}</p>
        )}
      </header>

      <FeedingZoneControls zone={zone} volunteers={volunteers} />

      {checkins.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Recent activity</h2>
          <div className="card divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {checkins.map((c) => (
              <div key={c.id} className="p-3 text-sm">
                <p>
                  <span className="font-semibold">{c.actor_name ?? "Someone"}</span> fed this zone
                </p>
                <p className="text-xs text-bark-400">
                  {timeAgo(c.created_at)} · {formatDate(c.created_at)}
                </p>
                {c.note && <p className="mt-1 text-bark-600 dark:text-bark-300">{c.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
