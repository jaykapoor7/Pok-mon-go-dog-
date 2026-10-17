import { Programmes } from "@/sp/ngo/Programmes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programmes, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoProgrammesPage() { return <Programmes />; }
