import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════════════
   The first step of the one sign-in: an email address.

     POST { email } → { ok: true }     always, for any well-formed address

   The answer never says whether the address has an account, so this
   route cannot be used to find out who is on StrayPaw. If the address
   does have one, its existing code is emailed again; if not, nothing is
   sent. Either way the person is shown the same next screen.

   A StrayPaw code is a standing credential bound to one address. This
   route never returns a code and never changes one: it only re-sends the
   existing code to the inbox it already belongs to. Organisation codes
   are preferred over personal ones when an address holds both.
   ════════════════════════════════════════════════════════════════════ */

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** An ILIKE pattern that matches the text itself (case aside): its wildcards are escaped. */
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

export async function POST(req: Request) {
  let body: { email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 200) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "StrayPaw is not fully configured yet." }, { status: 503 });
  if (!(await allowRequest(clientIp(req), "access-start-ip", 40, 3600))) return NextResponse.json({ error: "Too many attempts from this connection. Try again in an hour." }, { status: 429 });

  const [staff, personal] = await Promise.all([
    admin.from("org_email_invites").select("email,code,person_name,ngo_id,expires_at,revoked_at").ilike("email", likeExact(email)).is("revoked_at", null).not("code", "is", null).order("created_at", { ascending: false }).limit(5),
    admin.from("personal_access_codes").select("code,name,active").eq("email", email).maybeSingle(),
  ]);
  if (staff.error && personal.error) return NextResponse.json({ error: "Could not reach the account service just now. Try again shortly." }, { status: 500 });

  const now = Date.now();
  /* The stored address must BE the typed address: a code only ever goes to the inbox it was issued to. */
  const invite = (staff.data ?? []).find((i) => String(i.email ?? "").trim().toLowerCase() === email && i.code && (!i.expires_at || Date.parse(i.expires_at) >= now));
  const own = personal.data && personal.data.active ? personal.data : null;
  if (!invite && !own) return NextResponse.json({ ok: true });

  /* Re-sending is bounded per address: the code has not changed, so the last email still works. */
  if (!(await allowRequest(`email:${email}`, "access-start", 6, 3600))) return NextResponse.json({ ok: true });

  let orgName: string | null = null;
  if (invite) { const { data } = await admin.from("ngos").select("name").eq("id", invite.ngo_id).maybeSingle(); orgName = data?.name ?? null; }
  const code = String(invite?.code ?? own?.code ?? "");
  const first = esc(String(invite?.person_name ?? own?.name ?? "").trim().split(/\s+/)[0] || "there");
  const where = orgName ? `${esc(orgName)} on StrayPaw` : "StrayPaw";
  const emailed = await sendEmail({
    to: email,
    subject: `${code} is your StrayPaw code`,
    html: `<p>Hello ${first},</p><p>Your code for ${where} is:</p><p style="font:700 30px ui-monospace,monospace;letter-spacing:.18em">${esc(code)}</p><p>Enter it on the sign-in screen, or <a href="${SITE_URL}/sign-in">open StrayPaw</a> and enter this email address and the code.</p><p>The same email and code work every time. If you did not ask for this, you can ignore it: nothing has changed.</p>`,
    text: `Hello ${first},\n\nYour code for ${orgName ? `${orgName} on StrayPaw` : "StrayPaw"}: ${code}\n\nEnter it on the sign-in screen, or open ${SITE_URL}/sign-in and enter this email address and the code. The same email and code work every time.\n\nIf you did not ask for this, ignore it: nothing has changed.`,
  });
  void emailed;
  return NextResponse.json({ ok: true });
}
