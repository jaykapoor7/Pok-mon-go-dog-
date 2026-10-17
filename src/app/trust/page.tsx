import { Moderation } from "@/sp/trust/Moderation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trust, StrayPaw", robots: { index: false, follow: false } };
export default function TrustPage() { return <Moderation />; }
