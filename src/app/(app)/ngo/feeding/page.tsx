import { FeedingSpots } from "@/sp/ngo/outreach/FeedingSpots";

export const dynamic = "force-dynamic";
export const metadata = { title: "Feeding spots, StrayPaw NGO", robots: { index: false, follow: false } };
export default function Page() { return <FeedingSpots />; }
