import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { reconcileHistoricAnimals } from "@/lib/master-import/reconcile";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || !auth?.startsWith("Bearer ") || auth.slice(7).trim() !== secret) {
    return NextResponse.json({ error: "Operator access required." }, { status: 401 });
  }
  const { ngoId } = await req.json().catch(() => ({}));
  if (typeof ngoId !== "string" || !ngoId) return NextResponse.json({ error: "Choose an organisation." }, { status: 400 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  try {
    return NextResponse.json({ ok: true, ...(await reconcileHistoricAnimals(supa, ngoId)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not build animal records." }, { status: 500 });
  }
}
