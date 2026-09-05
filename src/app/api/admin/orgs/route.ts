import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Organisation setup for the moderation page.
     GET  /api/admin/orgs                              → every org, members, invites
     POST { action: "create", name, city }             → create/verify an org
     POST { action: "invite", ngoId, email, role }     → grant access by email
     POST { action: "remove", ngoId, email }           → take it away

   Access is granted to an email address, so it works whether or not that
   person has signed up yet. If they have, they are joined immediately; if
   not, claim_org_membership() picks it up the moment they do. */

type AuthState = "ok" | "unset" | "bad";

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset";
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret ? "ok" : "bad";
}

function reject(state: AuthState) {
  if (state === "unset") {
    return NextResponse.json(
      { error: "Set ADMIN_SECRET in Vercel and redeploy to use the moderation tools." },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Wrong password." }, { status: 401 });
}

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://straypaw.org";

export async function GET(req: Request) {
  const state = authState(req);
  if (state !== "ok") return reject(state);
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const { data, error } = await supa.rpc("admin_list_orgs");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orgs: data ?? [] });
}

export async function POST(req: Request) {
  const state = authState(req);
  if (state !== "ok") return reject(state);

  let body: {
    action?: string;
    name?: string;
    city?: string;
    ngoId?: string;
    email?: string;
    role?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  if (body.action === "create") {
    const { data, error } = await supa.rpc("admin_create_org", {
      p_name: String(body.name ?? "").trim(),
      p_city: body.city ? String(body.city).trim() : null,
      p_slug: null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  }

  if (body.action === "invite") {
    const email = String(body.email ?? "").trim();
    const { data, error } = await supa.rpc("admin_invite_to_org", {
      p_ngo_id: String(body.ngoId ?? ""),
      p_email: email,
      p_role: body.role === "lead" ? "lead" : "member",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    /* Tell them, in the same breath as granting it. Sent through Resend,
       which is StrayPaw's own sending domain, rather than Supabase's auth
       mailer: that one only delivers to project team addresses. */
    let orgName = "a StrayPaw organisation";
    const { data: orgs } = await supa
      .from("ngos")
      .select("name")
      .eq("id", String(body.ngoId ?? ""))
      .single();
    if (orgs?.name) orgName = orgs.name;

    const joined = (data as { joined_immediately?: boolean } | null)?.joined_immediately;
    const emailed = await sendEmail({
      to: email,
      subject: `You have access to ${orgName} on StrayPaw`,
      html: `
        <p>Hello,</p>
        <p>You now have access to <strong>${orgName}</strong>'s dashboard on StrayPaw.</p>
        <p><a href="${SITE}/partner" style="display:inline-block;padding:11px 18px;background:#2b59d6;color:#fff;text-decoration:none;border-radius:4px;font-weight:600">Open the dashboard</a></p>
        <p style="font-size:14px;line-height:1.6">
          ${
            joined
              ? "Sign in with this email address and you will land straight in."
              : `The first time, choose <strong>Create account</strong> and use this exact address (${email}). Access is already waiting for it, so you will be in as soon as you set a password.`
          }
        </p>
        <p style="font-size:14px;line-height:1.6;color:#555">
          From the dashboard you can record animals, track sterilisation and
          rabies coverage, and create codes that let your field volunteers
          report without needing accounts of their own.
        </p>
        <p style="font-size:13px;color:#777">StrayPaw &middot; ${SITE}</p>`,
      text:
        `You now have access to ${orgName}'s dashboard on StrayPaw.\n\n` +
        `Open ${SITE}/partner and ` +
        (joined
          ? "sign in with this email address."
          : `choose "Create account" using this exact address (${email}). Access is already waiting for it.`),
    });

    return NextResponse.json({ ...(data as object), emailed });
  }

  if (body.action === "remove") {
    const { error } = await supa.rpc("admin_remove_from_org", {
      p_ngo_id: String(body.ngoId ?? ""),
      p_email: String(body.email ?? ""),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
