import type { Metadata } from "next";
import { FounderDashboard } from "@/components/founder/FounderDashboard";

export const metadata: Metadata = {
  title: "Founder Intelligence · StrayPaw",
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

export default function FounderAnalyticsPage() {
  return <FounderDashboard />;
}
