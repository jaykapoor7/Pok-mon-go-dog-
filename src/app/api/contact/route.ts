import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where contact messages are delivered.
const INBOX = "jaykapoor7@outlook.com";

function esc(s: string) {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

export async function POST(req: Request) {
  if (!(await allowRequest(clientIp(req), "contact", 5, 600))) return NextResponse.json({ error: "Please wait a few minutes before sending another message." }, { status: 429 });
  let body: { name?: string; email?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 120);
  const email = (body.email ?? "").trim().slice(0, 200);
  const subject = (body.subject ?? "").trim().slice(0, 160) || "New message via StrayPaw";
  const message = (body.message ?? "").trim().slice(0, 5000);

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please add your name, a valid email, and a message." }, { status: 400 });
  }

  const html = `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Subject:</strong> ${esc(subject)}</p><hr/><p>${esc(message).replace(/\n/g, "<br/>")}</p>`;
  const text = `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;

  // sendEmail no-ops (returns false) when RESEND_API_KEY isn't configured.
  const delivered = await sendEmail({
    to: INBOX,
    subject: `[StrayPaw contact] ${subject}`,
    html,
    text,
  });

  if (!delivered) return NextResponse.json({ error: "Message delivery is temporarily unavailable. Please try again shortly.", delivered: false }, { status: 503 });
  return NextResponse.json({ ok: true, delivered: true });
}
