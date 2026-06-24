import { getCases } from "@/lib/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/cases/export → CSV of all cases (NGO report).
export async function GET() {
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
