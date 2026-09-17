import { WorkbookEnrichment } from "@/components/admin/WorkbookEnrichment";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historical data enrichment, StrayPaw", robots: { index: false, follow: false } };

export default function EnrichmentPage() { return <WorkbookEnrichment />; }
