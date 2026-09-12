import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabase } from "@/lib/supabase";
import { notifyTelegram, moderateUrl } from "@/lib/telegram";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Somebody telling us what is wrong with the site.
 *
 * Goes through the same door as a content report: an IP throttle here, a
 * security-definer function in the database that validates and trims, and a
 * table with no select policy on it. The client never touches the table.
 */
export async function POST(req: Request) {
  let body: { message?: string; kind?: string; page?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Please write something first." }, { status: 400 });
  }

  /* Generous, because this is a suggestion box rather than a form somebody
     would want to automate. Six an hour is more than anybody with something
     to say will need and less than a script is worth writing. */
  if (!(await allowRequest(clientIp(req), "feedback", 6, 3600))) {
    return NextResponse.json(
      { error: "That is a few messages in a short time. Please come back in a bit." },
      { status: 429 }
    );
  }

  const supa = getSupabaseAdmin() ?? getSupabase();
  if (!supa) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const { error } = await supa.rpc("submit_feedback", {
    p_message: message,
    p_kind: body.kind ? String(body.kind) : "idea",
    p_page: body.page ? String(body.page) : null,
    p_email: body.email ? String(body.email) : null,
  });
  if (error) {
    /* The database raises these with wording meant for a person, so they
       are passed through rather than replaced with "something went wrong". */
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const kind = String(body.kind ?? "idea");
  notifyTelegram(
    `💬 <b>Feedback</b> (${kind})\n${message.slice(0, 600)}${
      body.page ? `\n\nOn: ${String(body.page)}` : ""
    }${body.email ? `\nReply to: ${String(body.email)}` : ""}\nReview → ${moderateUrl}`
  );

  return NextResponse.json({ ok: true });
}
