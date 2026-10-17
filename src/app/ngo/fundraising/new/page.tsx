import { NewFundraiser } from "@/sp/ngo/outreach/NewFundraiser";

export const dynamic = "force-dynamic";
export const metadata = { title: "New campaign, StrayPaw NGO", robots: { index: false, follow: false } };
export default function Page() { return <NewFundraiser />; }
