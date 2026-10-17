import { Console } from "@/sp/trust/console/Console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trust console, StrayPaw", robots: { index: false, follow: false } };

/* The operator console, rebuilt in 2.0 on the same /api/admin routes and password. */
export default function TrustConsolePage() { return <Console />; }
