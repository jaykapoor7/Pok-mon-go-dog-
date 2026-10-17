import { Surveys } from "@/sp/ngo/outreach/Surveys";

export const dynamic = "force-dynamic";
export const metadata = { title: "Surveys, StrayPaw NGO", robots: { index: false, follow: false } };
export default function Page() { return <Surveys />; }
