import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Organisation setup for the moderation page.
     GET  /api/admin/orgs                              → every org, members, invites
     POST { action: "create", name, city }             → create/verify an org
     POST { action: "invite", ngoId, email, personName, role }
                                                       → mint that person a code
     POST { action: "revokeCode", id }                 → turn one code off
     POST { action: "remove", ngoId, email }           → take access away

   Adding someone mints six characters bound to their name, their email
   and this organisation, and emails it to them. That code is their sign-in
   from then on: no account to create, no password, and it keeps working
   until it is turned off. */

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
    personName?: string;
    role?: string;
    id?: string;
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
    const person = String(body.personName ?? "").trim();
    const role = body.role === "member" ? "member" : "lead";

    const { data, error } = await supa.rpc("admin_mint_access_code", {
      p_ngo_id: String(body.ngoId ?? ""),
      p_email: email,
      p_name: person,
      p_role: role,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const minted = (data ?? {}) as { code?: string; org_name?: string };
    const code = minted.code ?? "";
    const orgName = minted.org_name ?? "a StrayPaw organisation";
    const first = person.split(" ")[0] || "there";

    /* The code is the whole sign-in, so the email carries it plainly and
       says what to do with it. Sent through Resend on StrayPaw's own
       domain; Supabase's auth mailer only delivers to project addresses. */
    const emailed = await sendEmail({
      to: email,
      subject: `Your StrayPaw code for ${orgName}`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#141821">
          <p style="font-size:16px;line-height:1.55">Hello ${first},</p>
          <p style="font-size:16px;line-height:1.55">
            <strong>${orgName}</strong> now has a dashboard on StrayPaw, and
            you have access to it. Your code is:
          </p>
          <p style="margin:22px 0;text-align:center">
            <span style="display:inline-block;padding:14px 26px;border:1.5px solid #d5d9e0;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:0.18em">${code}</span>
          </p>
          <p style="margin:24px 0;text-align:center">
            <a href="${SITE}/join?code=${encodeURIComponent(code)}" style="display:inline-block;padding:12px 22px;background:#2b59d6;color:#fff;text-decoration:none;border-radius:5px;font-weight:650">Open your dashboard</a>
          </p>
          <p style="font-size:14px;line-height:1.6">
            The button signs you in on its own. If it does not open, go to
            <a href="${SITE}/join">${SITE.replace(/^https?:\/\//, "")}/join</a>
            and type the six characters.
          </p>
          <p style="font-size:14px;line-height:1.6">
            <strong>Keep this code.</strong> There is no password: it is how
            you sign in every time, on any phone or laptop.
          </p>
          <p style="font-size:14px;line-height:1.6;color:#555">
            Once you are in, you can add your own team from Team and codes:
            colleagues who need the dashboard, and field volunteers who only
            need to send in sightings from their phones. Each of them gets a
            code of their own.
          </p>
          <p style="font-size:13px;color:#777">StrayPaw &middot; ${SITE}</p>
        </div>`,
      text:
        `Hello ${first},\n\n${orgName} now has a dashboard on StrayPaw and you have access to it.\n\n` +
        `Your code: ${code}\n\n` +
        `Open ${SITE}/join and type it in. Keep the code: there is no password, it is how you sign in every time.\n\n` +
        `Once you are in, you can add your own team from Team and codes.\n\nStrayPaw`,
    });

    return NextResponse.json({ ...(minted as object), emailed });
  }

  if (body.action === "revokeCode") {
    /* Turns off any code in any organisation, whoever cut it. Moderation
       needs this for the case nobody at the organisation has handled. */
    const { data, error } = await supa.rpc("admin_revoke_code", {
      p_id: String(body.id ?? ""),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: Boolean(data) });
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
