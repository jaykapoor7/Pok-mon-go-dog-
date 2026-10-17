import { Import } from "@/sp/ngo/Import";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import, StrayPaw NGO", robots: { index: false, follow: false } };
export default function NgoImportPage() { return <Import />; }
