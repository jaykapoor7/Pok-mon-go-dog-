import { Projects } from "@/sp/ngo/outreach/Projects";

export const dynamic = "force-dynamic";
export const metadata = { title: "Projects, StrayPaw NGO", robots: { index: false, follow: false } };
export default function Page() { return <Projects />; }
