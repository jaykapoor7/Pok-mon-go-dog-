import { Work } from "@/sp/ngo/Work";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work, StrayPaw NGO", robots: { index: false, follow: false } };

/* NGO · Work: the action-first queue beside a case inspector. Every row is
   a bounded read under the member's own session; every action is an
   existing server-authorised RPC with a visible receipt. */
export default function NgoWorkPage() {
  return <Work />;
}
