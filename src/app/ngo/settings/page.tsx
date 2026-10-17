import { Settings } from "@/sp/ngo/Settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoSettingsPage() { return <Settings />; }
