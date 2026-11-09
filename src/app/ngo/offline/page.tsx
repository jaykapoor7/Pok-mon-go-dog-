import { OfflineMode } from "@/sp/ngo/OfflineMode";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offline mode, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoOfflinePage() { return <OfflineMode />; }
