import { AppShell } from "@/components/app/AppShell";
import { PlaceBrief } from "@/components/insights/PlaceBrief";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Insights, StrayPaw",
  description: "A brief on one place: what needs attention now, how fast field teams respond, what people call about, and how much sterilisation and vaccination is recorded.",
};

/* Insights retains the intended place brief, backed by one bounded city
   dataset rather than a platform-wide analytical bootstrap. */
export default function InsightsPage() {
  return (
    <AppShell>
      <PlaceBrief scope="public" />
    </AppShell>
  );
}
