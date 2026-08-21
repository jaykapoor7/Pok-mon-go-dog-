import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabase } from "@/lib/supabase";
import { notifyTelegram, moderateUrl } from "@/lib/telegram";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public "Report content" flag. Persists + alerts the operator on Telegram.
export async function POST(req: Request) {
  let body: { reason?: string; details?: string; link?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  // Throttle: max 10 reports per IP per hour.
  if (!(await allowRequest(clientIp(req), "report_content", 10, 3600))) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      { status: 429 }
    );
  }

  const supa = getSupabaseAdmin() ?? getSupabase();
  if (!supa) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const { error } = await supa.rpc("submit_content_report", {
    p_reason: reason,
    p_details: body.details ? String(body.details) : null,
    p_link: body.link ? String(body.link) : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  notifyTelegram(
    `🚩 <b>Content report</b>\n${reason}${body.link ? `\n${body.link}` : ""}${
      body.details ? `\n${String(body.details).slice(0, 300)}` : ""
    }\nReview → ${moderateUrl}`
  );

  return NextResponse.json({ ok: true });
}
