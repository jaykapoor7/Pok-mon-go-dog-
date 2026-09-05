import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { allowRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Turns a typed invite code into an organisation name, so the reporting
   flow can say "Reporting for PAWS Chennai" before anything is submitted.

   Resolution happens here rather than in the browser because the code is
   what decides the organisation. resolve_invite_code is granted to the
   service role only, so a client cannot look codes up, enumerate them, or
   name an organisation it does not hold a code for.

   The organisation id is deliberately not returned. The client never needs
   it, and every later write re-resolves the code server-side anyway. */
export async function POST(req: Request) {
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const ip =
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  // Codes are short, so guessing is worth throttling.
  if (!(await allowRequest(ip, "invite-code", 20, 600))) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const code = String(body.code ?? "").trim();
  if (!code) {
    return NextResponse.json({ ok: false, error: "Enter a code." }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { ok: false, error: "Organisation reporting is not available right now." },
      { status: 503 }
    );
  }

  const { data, error } = await supa.rpc("resolve_invite_code", { p_code: code });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const r = data as { ok?: boolean; org_name?: string; error?: string } | null;
  if (!r?.ok) {
    return NextResponse.json(
      { ok: false, error: r?.error === "unknown code" ? "That code was not recognised." : r?.error ?? "That code did not work." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, orgName: r.org_name });
}
