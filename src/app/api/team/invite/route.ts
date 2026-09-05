import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════════════
   A team lead adding somebody to their own organisation.

   The minting has to happen as the caller, not as the service role: the
   organisation comes from their own membership through my_ngo(), and the
   lead-only rule is enforced inside create_team_code(). So this builds a
   Supabase client carrying their access token and calls the same function
   the browser would. Nothing here can name an organisation.

   What the server adds is the email. Resend is a server-side key, and the
   whole point is that the person being added hears about it without their
   lead having to copy anything anywhere.
   ════════════════════════════════════════════════════════════════════ */

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";

const ROLE_WORD: Record<string, string> = {
  lead: "team lead",
  member: "team member",
  volunteer: "field volunteer",
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { email?: string; name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role =
    body.role === "lead" || body.role === "volunteer" ? body.role : "member";

  if (!name || !email.includes("@")) {
    return NextResponse.json(
      { error: "A name and a valid email address are both needed." },
      { status: 400 }
    );
  }

  if (!(await allowRequest(clientIp(req), "team-invite", 30, 3600))) {
    return NextResponse.json(
      { error: "Too many people added at once. Try again shortly." },
      { status: 429 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json({ error: "StrayPaw is not configured." }, { status: 503 });
  }

  const asCaller = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await asCaller.rpc("create_team_code", {
    p_email: email,
    p_name: name,
    p_role: role,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const minted = (data ?? {}) as {
    code?: string;
    org_name?: string;
    kind?: string;
  };
  const code = minted.code ?? "";
  const orgName = minted.org_name ?? "your organisation";

  /* Who did this, so the email can say so. Read from the verified session
     rather than anything the client sent. */
  let from = "";
  try {
    const admin = getSupabaseAdmin();
    const who = await admin?.auth.getUser(token);
    from = who?.data?.user?.email ?? "";
  } catch {
    /* The email reads fine without it. */
  }

  const emailed = await sendEmail({
    to: email,
    subject: `Your StrayPaw code for ${orgName}`,
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#141821">
        <p style="font-size:16px;line-height:1.55">Hello ${name.split(" ")[0]},</p>
        <p style="font-size:16px;line-height:1.55">
          You have been added to <strong>${orgName}</strong> on StrayPaw as a
          ${ROLE_WORD[role]}${from ? `, by ${from}` : ""}. Your code is:
        </p>
        <p style="margin:22px 0;text-align:center">
          <span style="display:inline-block;padding:14px 26px;border:1.5px solid #d5d9e0;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.18em">${code}</span>
        </p>
        <p style="margin:24px 0;text-align:center">
          <a href="${SITE}/join?code=${encodeURIComponent(code)}" style="display:inline-block;padding:12px 22px;background:#2b59d6;color:#fff;text-decoration:none;border-radius:5px;font-weight:650">${
            role === "volunteer" ? "Start reporting" : "Open the dashboard"
          }</a>
        </p>
        <p style="font-size:14px;line-height:1.6">
          <strong>Keep this code.</strong> There is no password and no account
          to create: it is how you get in every time, on any phone. If the
          button does not open, go to
          <a href="${SITE}/join">${SITE.replace(/^https?:\/\//, "")}/join</a>
          and type the six characters.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#555">
          ${
            role === "volunteer"
              ? `It takes you straight to the reporting page with your name filled in. Everything you send in is credited to you and goes to ${orgName}.`
              : `It opens ${orgName}'s dashboard: the animals on record, sterilisation and rabies coverage, and the cases in progress.`
          }
        </p>
        <p style="font-size:13px;color:#777">StrayPaw &middot; ${SITE}</p>
      </div>`,
    text:
      `Hello ${name.split(" ")[0]},\n\n` +
      `You have been added to ${orgName} on StrayPaw as a ${ROLE_WORD[role]}${from ? `, by ${from}` : ""}.\n\n` +
      `Your code: ${code}\n\n` +
      `Open ${SITE}/join and type it in. Keep the code: there is no password and no account to create, it is how you get in every time.\n\nStrayPaw`,
  });

  return NextResponse.json({ ...(minted as object), emailed });
}
