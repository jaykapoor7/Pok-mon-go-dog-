import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PlaceBrief } from "@/components/insights/PlaceBrief";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Insights, StrayPaw",
  description:
    "A brief on one place: what needs attention now, how fast field teams get there, what happens to a request, what people call about, when it is busiest, and how much sterilisation and vaccination is recorded.",
};

/* The public brief. It is drawn in the browser from the same dataset the
   map uses, so a place chosen on one opens on the other. */
export default function InsightsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <PlaceBrief scope="public" />
      </Suspense>
    </AppShell>
  );
}
