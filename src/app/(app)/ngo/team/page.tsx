import { Team } from "@/sp/ngo/Team";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoTeamPage() { return <Team />; }
