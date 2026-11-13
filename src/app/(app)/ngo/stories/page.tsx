import { Stories } from "@/sp/ngo/records/Stories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Public case stories, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoStoriesPage() { return <Stories />; }
