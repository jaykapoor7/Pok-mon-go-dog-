import { NextResponse } from "next/server";
import { getCases } from "@/lib/cases";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Authorised if the admin secret is presented (?key= / Bearer), OR a verified
// NGO member's Supabase access token is presented as a Bearer token.
async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (secret && (bearer === secret || key === secret)) return true;

  // NGO-member access token path.
  const supa = getSupabaseAdmin();
  if (supa && bearer) {
    const { data } = await supa.auth.getUser(bearer);
    const uid = data.user?.id;
    if (uid) {
      const { data: member } = await supa
        .from("ngo_members")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();
      if (member) return true;
    }
  }
  return false;
}

// GET /api/cases/export → CSV of all cases (admin or verified NGO members).
export async function GET(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cases = await getCases();

  const headers = [
    "id",
    "title",
    "status",
    "severity",
    "category",
    "zone",
    "assignee",
    "resolution",
    "created_at",
    "last_activity_at",
  ];

  const rows = cases.map((c) =>
    [
      c.id,
      c.title,
      c.status,
      c.severity,
      c.category,
      c.zone,
      c.assignee_name,
      c.resolution,
      c.created_at,
      c.last_activity_at,
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="straypaw-cases-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
