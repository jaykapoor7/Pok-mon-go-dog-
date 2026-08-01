import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only export of the reporter email list (people who opted in when
// reporting). GET /api/admin/emails?key=<ADMIN_SECRET> → CSV of distinct emails.
function authOk(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret;
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const { data, error } = await supa
    .from("sightings")
    .select("reporter_email, reporter_name, created_at")
    .not("reporter_email", "is", null)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // De-dupe by email, keeping the most recent name.
  const seen = new Map<string, { name: string; date: string }>();
  for (const r of data ?? []) {
    const email = String(r.reporter_email).toLowerCase();
    if (!seen.has(email)) seen.set(email, { name: r.reporter_name ?? "", date: r.created_at });
  }

  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [...seen.entries()].map(([email, v]) => [email, v.name, v.date].map(cell).join(","));
  const csv = ["email,name,first_reported", ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="straypaw-reporters-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
