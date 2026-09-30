import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your patch, StrayPaw" };

/* A fast, independent community shell. Location-specific browsing belongs
   to the bounded city map; care completion is confirmed by the organisation
   that recorded it, not presented as a community-wide assertion here. */
export default function ConsoleHome() {
  return <AppShell>
    <main className="cp"><header className="cp-head is-loaded"><div className="cp-head-id"><p className="sys-eyebrow">Your StrayPaw</p><h1>See what matters near you.</h1><p className="cp-sample">Report an animal, browse your city’s bounded map, or follow records confirmed by the organisation that owns them.</p></div><div className="cp-head-acts"><Link href="/report" className="sys-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link><Link href="/map" className="sys-btn is-quiet">Open city map</Link></div></header></main>
  </AppShell>;
}
