import { notFound } from "next/navigation";
import { flagOn } from "@/lib/flags";
import { ScanLookup } from "@/sp/ngo/ScanLookup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scan, StrayPaw NGO", robots: { index: false, follow: false } };
export default function ScanPage() {
  if (!flagOn("animal_identifiers")) notFound();
  return <ScanLookup />;
}
