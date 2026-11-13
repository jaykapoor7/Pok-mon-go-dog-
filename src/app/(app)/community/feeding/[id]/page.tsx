import { notFound } from "next/navigation";
import { FeedingSpot } from "@/sp/community/more/FeedingSpot";
import { getFeedingZoneById, getFeedingZoneCheckins, getFeedingZoneVolunteers } from "@/lib/feeding-zones";
import { toPublic } from "@/sp/community/more/spots";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feeding spot, StrayPaw" };
export default async function FeedingSpotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const z = await getFeedingZoneById(id).catch(() => null);
  if (!z) notFound();
  const [v, c] = await Promise.all([getFeedingZoneVolunteers(id).catch(() => []), getFeedingZoneCheckins(id, 12).catch(() => [])]);
  return <FeedingSpot s={toPublic(z)} volunteers={v} checkins={c} />;
}
