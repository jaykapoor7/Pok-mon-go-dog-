import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SPATIAL_TAG } from "@/lib/spatial/server";

/* Rebuild the cached public dataset after someone changes the register.

   Signed-in people only, and at most once every twenty seconds per server:
   the rebuild reads the whole register, so a refresh is a request, never a
   lever anyone can pull in a loop. */

let last = 0;
const MIN_GAP_MS = 20_000;

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!token || !url || !anon) return NextResponse.json({ ok: false }, { status: 401 });
  const supa = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supa.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });
  const now = Date.now();
  if (now - last < MIN_GAP_MS) return NextResponse.json({ ok: true, refreshed: false });
  last = now;
  revalidateTag(SPATIAL_TAG);
  return NextResponse.json({ ok: true, refreshed: true });
}
