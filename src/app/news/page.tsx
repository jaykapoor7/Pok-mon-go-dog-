import Link from "next/link";
import { ExternalLink, Newspaper, Scale } from "lucide-react";
import { getStrayNews, newsCategory, type NewsItem } from "@/lib/news";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = {
  title: "News, street dogs in India | StrayPaw",
  description:
    "The latest news and government orders on India's street dogs, aggregated from Indian news sources and linked to each source.",
};

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const { news, orders } = await getStrayNews();
  const empty = news.length === 0 && orders.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">

      <header className="mb-6">
        <h1 className="font-display text-3xl tracking-tightest">News &amp; orders</h1>
        <p className="mt-1 text-sm text-bark-500">
          The latest on India&apos;s street dogs, pulled live from Indian news sources.
          Every item links to its original source.
        </p>
      </header>

      {empty ? (
        <EmptyState
          icon={<Newspaper className="h-7 w-7" />}
          title="Couldn’t load news right now"
          description="The news feed is temporarily unavailable, please check back shortly."
        />
      ) : (
        <div className="space-y-8">
          {orders.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg tracking-tight">
                <Scale className="h-5 w-5 text-paw-600" /> Government orders &amp; policy
              </h2>
              <div className="space-y-3">
                {orders.map((n) => (
                  <NewsCard key={n.id} n={n} />
                ))}
              </div>
            </section>
          )}

          {news.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg tracking-tight">
                <Newspaper className="h-5 w-5 text-paw-600" /> Latest news
              </h2>
              <div className="space-y-3">
                {news.map((n) => (
                  <NewsCard key={n.id} n={n} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <p className="mt-8 text-center text-[11.5px] text-bark-400">
        Aggregated from Google News (India) · refreshed automatically
      </p>
    </div>
  );
}

function NewsCard({ n }: { n: NewsItem }) {
  const cat = newsCategory(n.category);
  return (
    <a
      href={n.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-interactive block p-4"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-paw-100 font-semibold text-paw-700">
          {cat.emoji} {cat.label}
        </span>
        {n.source_name && <span className="text-bark-500">{n.source_name}</span>}
        {n.published_at && <span className="text-bark-400">· {formatDate(n.published_at)}</span>}
      </div>
      <h3 className="font-display text-base leading-snug tracking-tight">{n.title}</h3>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-paw-600">
        Read the source <ExternalLink className="h-3.5 w-3.5" />
      </span>
    </a>
  );
}
