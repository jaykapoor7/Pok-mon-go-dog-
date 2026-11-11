import Link from "next/link";
import { S4Page } from "@/sp4/site/kit";
import { KINDS, POSTS, type Kind } from "@/sp4/site/res/content";
import { DemoBand, PostCard, ResHero } from "@/sp4/site/res/ResKit";
import "@/sp4/site/res/res.css";

export const metadata = { title: "Blog, StrayPaw", description: "Field guides, case studies, research notes, product updates and news from StrayPaw and the teams running animal-welfare programmes." };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const q = await searchParams;
  const kind = KINDS.find((k) => k === q.kind) as Kind | undefined;
  const list = [...POSTS].filter((p) => !kind || p.kind === kind).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <S4Page className="r7" close={false}>
      <ResHero title="Field notes from the teams doing the work." lede="Guides, case studies and research notes from the people who run ABC, vaccination and rescue programmes on StrayPaw." />
      <nav className="r7-filters" aria-label="Filter posts">
        <Link href="/blog" aria-current={!kind ? "page" : undefined}>All</Link>
        {KINDS.map((k) => <Link key={k} href={`/blog?kind=${encodeURIComponent(k)}`} aria-current={kind === k ? "page" : undefined}>{k}</Link>)}
      </nav>
      <div className="s4-wrap">
        {list.length ? <div className="r7-grid">{list.map((p) => <PostCard key={p.slug} p={p} />)}</div> : <p className="r7-grid">Nothing here yet.</p>}
      </div>
      <DemoBand />
    </S4Page>
  );
}
