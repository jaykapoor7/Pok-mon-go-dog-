import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || !auth?.startsWith("Bearer ") || auth.slice(7).trim() !== secret) {
    return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  }
  // Deliberately retired: the first master-import version created one HIST
  // profile per source row. V2 stages, matches and commits only defensible
  // identities, so this endpoint must never mint another synthetic profile.
  return NextResponse.json({ error: "Historic profile reconciliation has been retired. Use the staged master-import review instead." }, { status: 410 });
}
