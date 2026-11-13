import { Console } from "@/sp/trust/console/Console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation, StrayPaw", robots: { index: false, follow: false } };

/* The same moderation console as /trust; kept so /admin and old links still open it. */
export default function TrustConsolePage() { return <Console />; }
