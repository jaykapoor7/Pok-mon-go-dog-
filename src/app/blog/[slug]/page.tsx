import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { S4Page } from "@/sp4/site/kit";
import { POSTS, dateLabel } from "@/sp4/site/res/content";
import { CoverArt, DemoBand } from "@/sp4/site/res/ResKit";
import "@/sp4/site/res/res.css";

export function generateStaticParams() { return POSTS.map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const p = POSTS.find((x) => x.slug === slug);
  return p ? { title: `${p.title}, StrayPaw`, description: p.dek } : {};
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const p = POSTS.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <S4Page className="r7" close={false}>
      <article className="r7-article">
        <Link href={`/blog?kind=${encodeURIComponent(p.kind)}`} className="r7-back"><ArrowLeft size={15} aria-hidden /> {p.kind}</Link>
        <p className="r7-meta">{p.kind} · {dateLabel(p.date)} · {p.minutes} min read</p>
        <h1>{p.title}</h1>
        <p className="r7-dek">{p.dek}</p>
        <CoverArt c={p.cover} />
        {p.body.map((b, i) => (
          <section key={i}>
            {b.h && <h2>{b.h}</h2>}
            {b.p && <p>{b.p}</p>}
            {b.list && <ul>{b.list.map((x) => <li key={x}>{x}</li>)}</ul>}
          </section>
        ))}
      </article>
      <DemoBand />
    </S4Page>
  );
}
