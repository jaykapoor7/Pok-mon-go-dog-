import { NgoGate } from "@/sp/ngo/Gate";
import { PackageView } from "@/sp/abc/PackageView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report package, StrayPaw NGO", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NgoGate title="Report packages" lede="Approved ABC records for a period, prepared for the reviewing office."><PackageView id={id} side="operator" /></NgoGate>;
}
