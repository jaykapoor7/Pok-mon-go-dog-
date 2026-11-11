import { Pipeline } from "@/sp/ngo/Pipeline";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline, StrayPaw NGO", robots: { index: false, follow: false } };

/* NGO · Pipeline: the whole line of work on one board. Cases, Intake and
   Sign-off & evidence are its working views. */
export default function NgoPipelinePage() {
  return <Pipeline />;
}
