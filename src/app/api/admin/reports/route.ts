import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  const { data, error } = await supa
    .from("content_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Service role not configured." }, { status: 500 });

  let body: { id?: string; action?: "actioned" | "dismissed" | "open"; note?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body.id || !body.action) return NextResponse.json({ error: "Provide id and action." }, { status: 400 });

  const patch: Record<string, unknown> = { status: body.action };
  if (body.action !== "open") { patch.resolution = body.note ?? null; patch.resolved_at = new Date().toISOString(); }

  const { data, error } = await supa.from("content_reports").update(patch).eq("id", body.id).select("reporter_email, reason").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Tell the reporter, if they left an email.
  const email = (data as { reporter_email?: string } | null)?.reporter_email;
  if (email && body.action !== "open") {
    const outcome = body.action === "actioned" ? "investigated and action was taken" : "reviewed";
    await sendEmail({
      to: email,
      subject: "Your StrayPaw report has been reviewed",
      html: `<p>Thank you for flagging content on StrayPaw.</p><p>Your report was ${outcome}.${body.note ? ` Note from our team: ${body.note}` : ""}</p><p>We appreciate you helping keep StrayPaw safe.</p>`,
      text: `Thank you for flagging content on StrayPaw. Your report was ${outcome}.${body.note ? ` Note: ${body.note}` : ""}`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
