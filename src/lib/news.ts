import { getSupabase } from "./supabase";

export interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source_name: string | null;
  source_url: string | null;
  category: string;
  image_url: string | null;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
}

export const NEWS_CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "govt-order", label: "Govt order", emoji: "⚖️" },
  { value: "policy", label: "Policy", emoji: "📜" },
  { value: "welfare", label: "Welfare", emoji: "🐾" },
  { value: "community", label: "Community", emoji: "🤝" },
  { value: "other", label: "News", emoji: "📰" },
];

export function newsCategory(value: string) {
  return NEWS_CATEGORIES.find((c) => c.value === value) ?? NEWS_CATEGORIES[4];
}

function mapNews(r: any): NewsItem {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary ?? null,
    source_name: r.source_name ?? null,
    source_url: r.source_url ?? null,
    category: r.category ?? "other",
    image_url: r.image_url ?? null,
    published_at: r.published_at ?? null,
    is_published: r.is_published ?? true,
    created_at: r.created_at,
  };
}

/** Published news, newest first. */
export async function getNews(limit = 50): Promise<NewsItem[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapNews);
}
