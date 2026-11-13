import { Quality } from "@/sp/ngo/records/Quality";

export const dynamic = "force-dynamic";
export const metadata = { title: "Data quality, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoQualityPage() { return <Quality />; }
