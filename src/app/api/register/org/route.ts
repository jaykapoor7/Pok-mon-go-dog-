import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { CONTACT_INBOX } from "@/lib/contact-inbox";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════════════
   An organisation registering itself.

     POST { orgName, name, email, city } → { ok, emailed }

   Creates a NEW, UNVERIFIED organisation and emails its first lead a
   sign-in code. Three rules keep this from being a way into somebody
   else's organisation:

     1. It never touches an existing organisation. A name that is already
        taken is refused, and the person is pointed at their admin. (The
        admin tool's admin_create_org re-uses an organisation by name, so
        it is deliberately not used here.)
     2. The code is emailed, never returned: the workspace opens only for
        whoever reads that inbox.
     3. The organisation starts unverified and unlisted (partner_status
        "self_registered" keeps it out of the public directory). Its own workspace works at
        once; claiming public cases, fundraising and a verified listing
        wait until StrayPaw has checked who they are.

   StrayPaw is told about every registration so a person can verify it.
   ════════════════════════════════════════════════════════════════════ */

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function POST(req: Request) {
  let body: { orgName?: string; name?: string; email?: string; city?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const orgName = String(body.orgName ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const city = String(body.city ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const slug = slugOf(orgName);
  if (orgName.length < 3 || slug.length < 3) return NextResponse.json({ error: "Add your organisation's name." }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: "Add your own name." }, { status: 400 });
  if (!emailPattern.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (city.length < 2) return NextResponse.json({ error: "Add the city you work in." }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "StrayPaw is not fully configured yet." }, { status: 503 });
  const [ipOk, addressOk] = await Promise.all([allowRequest(clientIp(req), "register-org-ip", 4, 3600), allowRequest(`email:${email}`, "register-org", 3, 86400)]);
  if (!ipOk || !addressOk) return NextResponse.json({ error: "Too many registrations from here. Try again later, or write to us and we will set you up." }, { status: 429 });

  /* An address that already opens an organisation signs in instead. */
  const { data: held, error: heldError } = await admin.from("org_email_invites").select("id").ilike("email", likeExact(email)).is("revoked_at", null).limit(1);
  if (heldError) return NextResponse.json({ error: "Could not check that address just now. Try again shortly." }, { status: 500 });
  /* Answered exactly like a new registration, so this cannot be used to learn who has an account; their existing code is on its way from the sign-in step. */
  if (held?.length) return NextResponse.json({ ok: true, emailed: true });

  const [bySlug, byName] = await Promise.all([
    admin.from("ngos").select("id").eq("slug", slug).limit(1),
    admin.from("ngos").select("id").ilike("name", likeExact(orgName)).limit(1),
  ]);
  if (bySlug.error || byName.error) return NextResponse.json({ error: "Could not check that name just now. Try again shortly." }, { status: 500 });
  const taken = [...(bySlug.data ?? []), ...(byName.data ?? [])];
  if (taken?.length) return NextResponse.json({ error: "An organisation with this name is already on StrayPaw. Ask its admin to add you, or write to us if that is wrong.", code: "name_taken" }, { status: 409 });

  const { data: org, error: orgError } = await admin.from("ngos").insert({ name: orgName, slug, city, verified: false, partner_status: "self_registered" }).select("id").single();
  if (orgError || !org) return NextResponse.json({ error: "Could not create the organisation. Nothing was saved; try again shortly." }, { status: 500 });

  const { data: minted, error: mintError } = await admin.rpc("admin_mint_access_code", { p_ngo_id: org.id, p_email: email, p_name: name, p_role: "lead" });
  const code = (minted as { code?: string } | null)?.code;
  if (mintError || !code) {
    /* No way in was created, so the empty organisation is removed rather than left behind. */
    await admin.from("ngos").delete().eq("id", org.id);
    return NextResponse.json({ error: "Could not finish setting up. Nothing was saved; try again shortly." }, { status: 500 });
  }

  const first = esc(name.split(" ")[0]);
  const [emailed] = await Promise.all([
    sendEmail({
      to: email,
      subject: `${code} is your StrayPaw code for ${orgName}`,
      html: `<p>Hello ${first},</p><p><strong>${esc(orgName)}</strong> now has a StrayPaw workspace, and you are its admin. Your code is:</p><p style="font:700 30px ui-monospace,monospace;letter-spacing:.18em">${esc(code)}</p><p>Enter it on the sign-in screen, or <a href="${SITE_URL}/sign-in">open StrayPaw</a> and enter this email address and the code. The same email and code work every time.</p><p>You can start now: import a register, add your team and record animals. We will check your organisation's details before it is listed as verified; until then claiming public cases and fundraising stay off.</p>`,
      text: `Hello ${name.split(" ")[0]},\n\n${orgName} now has a StrayPaw workspace, and you are its admin.\n\nYour code: ${code}\n\nEnter it on the sign-in screen, or open ${SITE_URL}/sign-in and enter this email address and the code. The same email and code work every time.\n\nYou can start now: import a register, add your team and record animals. We will check your organisation's details before it is listed as verified; until then claiming public cases and fundraising stay off.`,
    }),
    sendEmail({
      to: CONTACT_INBOX, replyTo: email,
      subject: `[StrayPaw] New organisation registered - ${orgName}`,
      html: `<p><strong>${esc(orgName)}</strong> (${esc(city)}) registered itself.</p><p>Admin: ${esc(name)} · ${esc(email)}</p><p>It is unverified. Verify it from the moderation page once checked.</p>`,
      text: `${orgName} (${city}) registered itself.\nAdmin: ${name} <${email}>\nIt is unverified. Verify it from the moderation page once checked.`,
    }).catch(() => false),
  ]);
  return NextResponse.json({ ok: true, emailed });
}
