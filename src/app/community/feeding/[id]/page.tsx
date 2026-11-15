import { notFound } from "next/navigation";
import { PubPage } from "@/sp4/pub/kit";
import { FeedingSpot } from "@/sp4/pub/community/FeedingSpot";
import { toPublic } from "@/sp4/pub/community/spots";
import { getFeedingZoneById, getFeedingZoneCheckins, getFeedingZoneVolunteers } from "@/lib/feeding-zones";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const z = await getFeedingZoneById((await params).id).catch(() => null);
  return { title: z ? `${z.name}, StrayPaw` : "Feeding spot, StrayPaw", description: "A regular feeding spot for street animals, shown by area: who feeds here and on which days." };
}

export default async function FeedingSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const z = await getFeedingZoneById(id).catch(() => null);
  if (!z) notFound();
  const [v, c] = await Promise.all([getFeedingZoneVolunteers(id).catch(() => []), getFeedingZoneCheckins(id, 12).catch(() => [])]);
  return <PubPage><FeedingSpot s={toPublic(z)} volunteers={v} checkins={c} /></PubPage>;
}
