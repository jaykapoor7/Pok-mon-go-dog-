import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { allowRequest, clientIp } from "@/lib/rate-limit";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () => Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

export async function POST(req: Request) {
  let body: { name?: string; email?: string; role?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role === "feeder" ? "feeder" : body.role === "individual" ? "individual" : null;
  if (name.length < 2 || !email.includes("@") || !role) return NextResponse.json({ error: "Add your name and a valid email address." }, { status: 400 });
  if (!(await allowRequest(clientIp(req), "personal-code", 4, 3600))) return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "StrayPaw is not configured yet." }, { status: 503 });
  let accessCode = code();
  for (let i = 0; i < 8; i++) {
    const { error } = await admin.from("personal_access_codes").upsert({ email, name, role, code: accessCode, active: true, uses: 0, last_used_at: null }, { onConflict: "email" });
    if (!error) break;
    if (i === 7) return NextResponse.json({ error: "Could not issue a code. Try again shortly." }, { status: 500 });
    accessCode = code();
  }
  await sendEmail({
    to: email,
    subject: "Your StrayPaw access code",
    html: `<p>Hello ${name.split(" ")[0]},</p><p>Your StrayPaw code is:</p><p style="font:700 30px ui-monospace,monospace;letter-spacing:.18em">${accessCode}</p><p><a href="${SITE}/join?code=${accessCode}">Open your StrayPaw space</a></p><p>Keep this code. It restores your personal workspace on any device.</p>`,
    text: `Hello ${name.split(" ")[0]},\n\nYour StrayPaw code: ${accessCode}\n\nOpen ${SITE}/join and enter it to access your space.`,
  });
  return NextResponse.json({ ok: true });
}
