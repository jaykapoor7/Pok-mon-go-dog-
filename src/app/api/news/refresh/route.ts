import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
// Auto news scraper. Pulls India street-dog news from Google News RSS (free,
// keyless) and upserts it into the `news` table. Runs on a schedule via Vercel
// Cron (see vercel.json) and can be triggered manually from /moderate.
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Manual triggers
// use ?key=$ADMIN_SECRET (or Bearer $ADMIN_SECRET).
// ─────────────────────────────────────────────────────────────

const QUERIES = [
  "stray dogs India",
  "street dogs India",
  "Animal Birth Control rules dogs India",
  "Supreme Court stray dogs",
  "municipal corporation stray dogs",
];

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (cronSecret && bearer === cronSecret) return true;
  if (adminSecret && (bearer === adminSecret || key === adminSecret)) return true;
  // If nothing is configured (local/dev), allow it.
  return !cronSecret && !adminSecret;
}

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

interface Item {
  title: string;
  source_url: string;
  source_name: string | null;
  published_at: string | null;
  category: string;
}

async function fetchQuery(q: string): Promise<Item[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StrayPawBot/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items: Item[] = [];
  for (const b of blocks.slice(0, 10)) {
    let title = tag(b, "title") ?? "";
    const link = tag(b, "link");
    if (!title || !link) continue;
    // Google News titles end in " - Publisher"; split that off for the source.
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
    items.push({ title, source_url: link, source_name, published_at, category: categorize(title) });
  }
  return items;
}

async function refresh() {
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  // Fetch all queries, then dedupe by URL within this run.
  const results = await Promise.all(QUERIES.map((q) => fetchQuery(q).catch(() => [])));
  const byUrl = new Map<string, Item>();
  for (const list of results) for (const it of list) byUrl.set(it.source_url, it);
  const items = Array.from(byUrl.values());

  if (items.length === 0) {
    return NextResponse.json({ ok: true, fetched: 0, note: "No items returned." });
  }

  const rows = items.map((it) => ({
    title: it.title,
    source_url: it.source_url,
    source_name: it.source_name,
    category: it.category,
    published_at: it.published_at,
    is_published: true,
    auto: true,
  }));

  // Insert new ones; existing URLs are ignored (dedupe key = source_url).
  const { error } = await supa
    .from("news")
    .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, fetched: rows.length });
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return refresh();
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return refresh();
}
