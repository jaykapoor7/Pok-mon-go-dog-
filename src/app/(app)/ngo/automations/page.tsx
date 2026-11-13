import { Automations } from "@/sp/ngo/Automations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Automations, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoAutomationsPage() { return <Automations />; }
