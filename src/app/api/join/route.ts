import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════════════
   Redeeming a six-character code.

     POST { code }                    → what the code is, and for a staff
                                        code a one-time token to sign in with
     POST { code, action: "claim" }   → record the use and join them, once
                                        the sign-in has happened

   A code is a standing credential: the same six characters sign the same
   person in every time, until somebody turns them off. Short enough to read
   down a phone line, which also makes it short enough to guess if nothing
   stops you, so guessing is bounded here rather than by the length: the
   code is never checked in the browser, and attempts are rate limited both
   per address and per code.

   This route does not mint sessions. For a staff code it asks Supabase for
   a one-time token bound to that person's email and hands it back; the
   browser exchanges it, so Supabase issues the session and owns the
   security of it. The use is recorded afterwards, against a session the
   server has verified for itself.
   ════════════════════════════════════════════════════════════════════ */

type Resolved = {
  ok?: boolean;
  error?: string;
  email?: string;
  ngo_id?: string;
  role?: string;
  name?: string;
  org_name?: string;
};

type VolunteerResolved = {
  ok?: boolean;
  error?: string;
  org_name?: string;
  volunteer_name?: string;
};

const NO_MATCH = "That code was not recognised. Check the six characters and try again.";

export async function POST(req: Request) {
  let body: { code?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = String(body.code ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (code.length < 4 || code.length > 12) {
    return NextResponse.json({ error: NO_MATCH }, { status: 400 });
  }

  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "StrayPaw is not fully configured yet. Tell whoever sent you the code." },
      { status: 503 }
    );
  }

  /* Two limits, deliberately. The address one stops one machine working
     through the keyspace; the code one stops a spread of machines
     hammering a single code they half know. */
  const ip = clientIp(req);
  const ok =
    (await allowRequest(ip, "join", 12, 600)) &&
    (await allowRequest(`code:${code}`, "join_code", 8, 3600));
  if (!ok) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (body.action === "claim") return claim(req, code);

  /* Staff first: a code that opens a dashboard is the one worth checking
     hardest, and the two code spaces do not overlap. */
  const { data: staffRaw } = await supa.rpc("resolve_access_code", { p_code: code });
  const staff = (staffRaw ?? {}) as Resolved;

  if (staff.ok && staff.email) {
    const email = staff.email;

    /* An account may not exist yet, and she should not have to make one.
       Creating it here is what lets a code be the whole sign-in. */
    const created = await supa.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (
      created.error &&
      !/already|registered|exists/i.test(created.error.message ?? "")
    ) {
      return NextResponse.json(
        { error: "Could not open your account. Try again in a moment." },
        { status: 500 }
      );
    }

    const link = await supa.auth.admin.generateLink({ type: "magiclink", email });
    const hashed = link.data?.properties?.hashed_token;
    if (link.error || !hashed) {
      return NextResponse.json(
        { error: "Could not sign you in just now. Try again in a moment." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      kind: "staff",
      tokenHash: hashed,
      email,
      name: staff.name ?? null,
      role: staff.role ?? "member",
      orgName: staff.org_name ?? "your organisation",
    });
  }

  /* Not a staff code. It may be a volunteer's reporting code, which grants
     no dashboard and needs no account. */
  const { data: volRaw } = await supa.rpc("resolve_invite_code", { p_code: code });
  const vol = (volRaw ?? {}) as VolunteerResolved;
  if (vol.ok) {
    return NextResponse.json({
      kind: "volunteer",
      code,
      name: vol.volunteer_name ?? null,
      orgName: vol.org_name ?? "your organisation",
    });
  }

  /* Say as little as the person needs. Distinguishing "expired" from
     "never existed" is worth it for someone holding a real code, but
     anything finer just tells a guesser they are warm. */
  const message =
    staff.error && staff.error !== "That code was not recognised."
      ? staff.error
      : NO_MATCH;
  return NextResponse.json({ error: message }, { status: 404 });
}

/* Second half of a staff sign-in. The browser sends the session it just
   got; the server verifies it with Supabase before joining anyone to
   anything, so a claim cannot be made on a token the caller invented. */
async function claim(req: Request, code: string) {
  const supa = getSupabaseAdmin();
  if (!supa) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!token) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: who, error: whoErr } = await supa.auth.getUser(token);
  if (whoErr || !who?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supa.rpc("redeem_access_code", {
    p_code: code,
    p_user_id: who.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const result = (data ?? {}) as { ok?: boolean; error?: string; org_name?: string };
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? NO_MATCH }, { status: 400 });
  }
  return NextResponse.json(result);
}
