import { Sterilisation } from "@/sp/ngo/Lines";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sterilisation, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoSterilisationPage() { return <Sterilisation />; }
