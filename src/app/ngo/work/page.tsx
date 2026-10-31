import { Work } from "@/sp/ngo/Work";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work queue, StrayPaw NGO", robots: { index: false, follow: false } };

/* NGO · Work queue: the action-first queue beside a case inspector (moved
   from /ngo, which is now the daily brief). Unchanged behaviour. */
export default function NgoWorkQueuePage() {
  return <Work />;
}
