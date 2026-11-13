import { Console } from "@/sp/trust/console/Console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation, StrayPaw", robots: { index: false, follow: false } };

/* StrayPaw's moderation: everything an operator decides, in one place. */
export default function TrustPage() { return <Console />; }
