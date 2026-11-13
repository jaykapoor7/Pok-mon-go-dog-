import { Rescues } from "@/sp/ngo/Lines";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rescues, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoRescuesPage() { return <Rescues />; }
