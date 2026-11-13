import { Brief } from "@/sp/ngo/Brief";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home, StrayPaw NGO", robots: { index: false, follow: false } };

/* NGO · Home: the daily brief. Every row is a bounded read under the
   member's own session; signed out, it shows the workspace door. */
export default function NgoHomePage() {
  return <Brief />;
}
