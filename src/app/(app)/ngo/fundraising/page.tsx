import { Fundraising } from "@/sp/ngo/outreach/Fundraising";

export const dynamic = "force-dynamic";
export const metadata = { title: "Fundraising, StrayPaw NGO", robots: { index: false, follow: false } };
export default function Page() { return <Fundraising />; }
