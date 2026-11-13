import { CareLedger } from "@/sp/ngo/records/CareLedger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Care ledger, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoCarePage() { return <CareLedger />; }
