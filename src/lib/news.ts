// ─────────────────────────────────────────────────────────────
// Live news feed. Fetches India street-dog news straight from Google News RSS
// (free, keyless) on the server when a page renders — no database, no cron.
// Responses are cached ~30 min so the section stays fresh but light.
// ─────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  source_url: string;
  source_name: string | null;
  published_at: string | null;
  category: string;
}

export const NEWS_CATEGORIES: Record<string, { label: string; emoji: string }> = {
  "govt-order": { label: "Govt order", emoji: "⚖️" },
  policy: { label: "Policy", emoji: "📜" },
  welfare: { label: "Welfare", emoji: "🐾" },
  other: { label: "News", emoji: "📰" },
};

export function newsCategory(value: string) {
  return NEWS_CATEGORIES[value] ?? NEWS_CATEGORIES.other;
}

const NEWS_QUERY = '("stray dogs" OR "street dogs") India';
const ORDERS_QUERY =
  '(stray OR street) dogs India (Supreme Court OR High Court OR order OR "Animal Birth Control" OR ABC rules OR municipal OR policy)';

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : null;
}

function categorize(title: string): string {
  const t = title.toLowerCase();
  if (/(supreme court|high court|court|verdict|ruling|order|directive|petition|bench)/.test(t))
    return "govt-order";
  if (/(rule|policy|guideline|notification|municipal|corporation|government|ministry|\bact\b|law|abc)/.test(t))
    return "policy";
  return "welfare";
}

async function fetchRss(query: string, limit: number): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StrayPawBot/1.0)" },
      // Cache the feed for 30 minutes (auto-refreshes without a cron job).
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const items: NewsItem[] = [];
    for (const b of blocks) {
      if (items.length >= limit) break;
      let title = tag(b, "title") ?? "";
      const link = tag(b, "link");
      if (!title || !link) continue;
      let source_name = tag(b, "source");
      const dash = title.lastIndexOf(" - ");
      if (!source_name && dash > 20) {
        source_name = title.slice(dash + 3).trim();
        title = title.slice(0, dash).trim();
      } else if (source_name && title.endsWith(` - ${source_name}`)) {
        title = title.slice(0, -(source_name.length + 3)).trim();
      }
      const pub = tag(b, "pubDate");
      let published_at: string | null = null;
      if (pub) {
        const d = new Date(pub);
        if (!isNaN(d.getTime())) published_at = d.toISOString().slice(0, 10);
      }
      items.push({
        id: link,
        title,
        source_url: link,
        source_name,
        published_at,
        category: categorize(title),
      });
    }
    return items;
  } catch {
    return [];
  }
}

/** Both feeds in one go, with government orders de-duplicated out of the news list. */
export async function getStrayNews(): Promise<{ news: NewsItem[]; orders: NewsItem[] }> {
  const [rawNews, orders] = await Promise.all([
    fetchRss(NEWS_QUERY, 24),
    fetchRss(ORDERS_QUERY, 12),
  ]);
  const orderUrls = new Set(orders.map((o) => o.source_url));
  const news = rawNews.filter((n) => !orderUrls.has(n.source_url));
  return { news, orders };
}

/** A short mixed list for the home-page teaser. */
export async function getNewsTeaser(n = 3): Promise<NewsItem[]> {
  const { news, orders } = await getStrayNews();
  return [...orders.slice(0, 1), ...news].slice(0, n);
}
