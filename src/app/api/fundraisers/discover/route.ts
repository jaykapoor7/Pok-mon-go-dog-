import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
// Discover candidate dog-rescue fundraisers from the web and drop them into a
// PENDING review queue (never public until an admin approves). Auth: Vercel
// Cron sends Bearer $CRON_SECRET; manual triggers use ?key=$ADMIN_SECRET.
//
// Reality check: crowdfunding platforms have no clean API/RSS and vary in how
// scrapeable they are, so yield is best-effort, the human approval step is
// what makes this safe AND useful.
// ─────────────────────────────────────────────────────────────

// Source pages to scan (SSR-friendly listing/search pages).
const SOURCES = [
  "https://milaap.org/fundraisers/causes/animals",
  "https://lite.duckduckgo.com/lite/?q=dog+rescue+fundraiser+india+site%3Amilaap.org",
  "https://lite.duckduckgo.com/lite/?q=stray+dog+fundraiser+india+site%3Aketto.org",
  "https://lite.duckduckgo.com/lite/?q=animal+shelter+donate+india+site%3Agiveindia.org",
];

// Direct campaign-page URL patterns for the known platforms.
const CAMPAIGN_RE =
  /https?:\/\/(?:www\.)?(?:milaap\.org\/fundraisers\/(?!causes\/)[a-z0-9-]{6,}|ketto\.org\/fundraiser\/[a-z0-9-]{6,}|giveindia\.org\/(?:fundraiser|campaign|nonprofit)\/[a-z0-9-]{6,})/gi;

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (cronSecret && bearer === cronSecret) return true;
  if (adminSecret && (bearer === adminSecret || key === adminSecret)) return true;
  return !cronSecret && !adminSecret;
}

function meta(html: string, prop: string): string | null {
  const m =
    html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"));
  return m ? decode(m[1]) : null;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StrayPawBot/1.0)" },
      cache: "no-store",
    });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  }

  // 1. Collect candidate campaign URLs from the source pages.
  const pages = await Promise.all(SOURCES.map(fetchText));
  const urls = new Set<string>();
  for (const html of pages) {
    // DDG lite wraps links as /l/?uddg=<encoded>; unwrap those first.
    const unwrapped = html.replace(/\/l\/\?uddg=([^"'&]+)/g, (_, e) => {
      try {
        return decodeURIComponent(e);
      } catch {
        return _;
      }
    });
    const matches = unwrapped.match(CAMPAIGN_RE) ?? [];
    for (const u of matches) urls.add(u.split("?")[0].replace(/\/$/, ""));
  }

  const candidates = [...urls].slice(0, 15);
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, found: 0, inserted: 0, note: "No candidates found." });
  }

  // 2. Skip anything already in the table (dedupe by donate_url).
  const { data: existing } = await supa
    .from("fundraisers")
    .select("donate_url")
    .in("donate_url", candidates);
  const known = new Set((existing ?? []).map((r: any) => r.donate_url));
  const fresh = candidates.filter((u) => !known.has(u)).slice(0, 10);

  // 3. Enrich each with og:title / og:image, then insert as pending.
  let inserted = 0;
  for (const url of fresh) {
    const html = await fetchText(url);
    const title = (meta(html, "og:title") || url).slice(0, 200);
    const image = meta(html, "og:image");
    const platform = url.includes("milaap")
      ? "Milaap"
      : url.includes("ketto")
      ? "Ketto"
      : url.includes("giveindia")
      ? "GiveIndia"
      : "Web";
    const { error } = await supa.from("fundraisers").insert({
      title,
      created_by_name: platform,
      donate_url: url,
      category: "other",
      cover_photo: image,
      featured: true,
      status: "pending", // hidden until an admin approves
    });
    if (!error) inserted += 1;
  }

  return NextResponse.json({ ok: true, found: candidates.length, inserted });
}

export async function POST(req: Request) {
  return GET(req);
}
