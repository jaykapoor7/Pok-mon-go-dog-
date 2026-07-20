import Link from "next/link";
import { ArrowLeft, ExternalLink, Newspaper } from "lucide-react";
import { getNews, newsCategory } from "@/lib/news";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "News — street dogs in India | StrayPaw",
  description:
    "The latest news, government orders and policy updates on India's street dogs — auto-aggregated and linked to each source.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const news = await getNews();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-24 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bark-500 hover:text-paw-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to the map
      </Link>

      <header className="mb-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tightest">News &amp; orders</h1>
        <p className="mt-1 text-sm text-bark-500">
          The latest on India&apos;s street dogs — court orders, policy and welfare,
          auto-aggregated. Every item links to its source.
        </p>
      </header>

      {news.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-7 w-7" />}
          title="No news yet"
          description="Verified stray-dog news and government orders will appear here."
        />
      ) : (
        <div className="space-y-4">
          {news.map((n) => {
            const cat = newsCategory(n.category);
            return (
              <article key={n.id} className="card overflow-hidden">
                {n.image_url && (
                  <img src={n.image_url} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="chip bg-paw-100 font-semibold text-paw-700">
                      {cat.emoji} {cat.label}
                    </span>
                    {n.published_at && (
                      <span className="text-bark-400">{formatDate(n.published_at)}</span>
                    )}
                  </div>
                  <h2 className="font-display text-lg font-bold leading-snug tracking-tight">
                    {n.title}
                  </h2>
                  {n.summary && (
                    <p className="mt-1.5 text-sm text-bark-600 dark:text-bark-300">{n.summary}</p>
                  )}
                  {n.source_url && (
                    <a
                      href={n.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:underline"
                    >
                      {n.source_name ? `Read at ${n.source_name}` : "Read the source"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
