import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getPublishedCaseStoriesCached as getPublishedCaseStories } from "@/lib/community-case-stories-cached";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your patch, StrayPaw" };

/* A fast, independent community shell. Location-specific browsing belongs
   to the bounded city/viewport map, so this route never waits on spatial
   analytics before rendering. */
export default async function ConsoleHome() {
  const stories = (await getPublishedCaseStories()).slice(0, 12);
  return <AppShell>
    <main className="cp"><header className="cp-head is-loaded"><div className="cp-head-id"><p className="sys-eyebrow">Your StrayPaw</p><h1>See what matters near you.</h1><p className="cp-sample">Report an animal, browse your city’s bounded map, or follow completed care records.</p></div><div className="cp-head-acts"><Link href="/report" className="sys-btn is-flame">Report an animal <ArrowUpRight size={15} /></Link><Link href="/map" className="sys-btn is-quiet">Open city map</Link></div></header><section className="cp-done"><p className="cp-eyebrow"><span>Recently completed</span><Link href="/stories">All stories <ArrowUpRight size={12} /></Link></p><ol>{stories.map((story) => <li key={story.id}><Link href={`/dog/${story.dog_id}`}><span><b>{story.animal_name || story.animal_code || "An animal"}</b><small>{[story.title, story.zone].filter(Boolean).join(" · ")}</small></span></Link></li>)}</ol></section></main>
  </AppShell>;
}
