import { Inbox } from "@/sp/ngo/Inbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intake, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoInboxPage() { return <Inbox />; }
