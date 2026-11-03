import { NextResponse } from "next/server";
import { SURVEY_COLUMNS, publishedSurveyRows } from "@/sp4/research/server";

export const revalidate = 3600;

/* The one dataset StrayPaw publishes itself: aggregate survey results, no
   personal data. CSV with a citation header; unavailable is an error, not
   an empty file. */
export async function GET() {
  const rows = await publishedSurveyRows();
  if (!rows) return NextResponse.json({ error: "The published dataset could not be read just now." }, { status: 503 });
  const cell = (v: unknown) => { const s = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [
    `# StrayPaw published survey results. Retrieved ${new Date().toISOString().slice(0, 10)}. Cite as: StrayPaw published surveys, https://www.straypaw.org/research/datasets. Proportions are of animals checked, not of the population.`,
    SURVEY_COLUMNS.join(","),
    ...rows.map((r) => SURVEY_COLUMNS.map((c) => cell(r[c])).join(",")),
  ].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="straypaw-published-surveys.csv"' } });
}
