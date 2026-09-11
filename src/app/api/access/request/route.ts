import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { allowRequest, clientIp } from "@/lib/rate-limit";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code = () => Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

async function codeIsAvailable(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  candidate: string
) {
  /* Codes are short because field teams need to read them out, so all three
     code spaces share one namespace. A collision is unlikely, but avoiding
     it here means a personal code can never be mistaken for a team code. */
  const [personal, staff, volunteer] = await Promise.all([
    admin.from("personal_access_codes").select("id").eq("code", candidate).maybeSingle(),
    admin.from("org_email_invites").select("id").eq("code", candidate).maybeSingle(),
    admin.from("org_invite_codes").select("id").eq("code", candidate).maybeSingle(),
  ]);
  return !personal.data && !staff.data && !volunteer.data;
}

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
  /* Asking again should be reassuring, not create a second credential. The
     same email keeps the same code, and the email simply sends it again. */
  const { data: existing, error: existingError } = await admin
    .from("personal_access_codes")
    .select("id,code")
    .eq("email", email)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: "Could not look up your code. Try again shortly." }, { status: 500 });

  let accessCode = existing?.code ?? "";
  if (existing) {
    const { error } = await admin
      .from("personal_access_codes")
      .update({ name, role, active: true })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: "Could not send your code. Try again shortly." }, { status: 500 });
  } else {
    let issued = false;
    for (let i = 0; i < 8; i++) {
      const candidate = code();
      if (!(await codeIsAvailable(admin, candidate))) continue;
      const { error } = await admin
        .from("personal_access_codes")
        .insert({ email, name, role, code: candidate, active: true });
      if (!error) {
        accessCode = candidate;
        issued = true;
        break;
      }
    }
    if (!issued) return NextResponse.json({ error: "Could not issue a code. Try again shortly." }, { status: 500 });
  }
  await sendEmail({
    to: email,
    subject: "Your StrayPaw access code",
    html: `<p>Hello ${name.split(" ")[0]},</p><p>Your StrayPaw code is:</p><p style="font:700 30px ui-monospace,monospace;letter-spacing:.18em">${accessCode}</p><p><a href="${SITE}/join">Open StrayPaw</a>, then enter this email address and your code.</p><p>Keep this code. The same email and code open your personal workspace on any device.</p>`,
    text: `Hello ${name.split(" ")[0]},\n\nYour StrayPaw code: ${accessCode}\n\nOpen ${SITE}/join and enter this email address and your code. Keep both: they open your space on any device.`,
  });
  return NextResponse.json({ ok: true });
}
