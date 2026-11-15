import { Console } from "@/sp4/pub/trust/Console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation, StrayPaw", robots: { index: false, follow: false } };

/* StrayPaw's moderation: everything an operator decides, in one place, outside the app frame. */
export default function TrustPage() { return <Console />; }
