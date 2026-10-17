import { Volunteers } from "@/sp/ngo/records/Volunteers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Volunteer sign-ups, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoVolunteersPage() { return <Volunteers />; }
