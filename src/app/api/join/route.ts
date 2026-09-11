import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ════════════════════════════════════════════════════════════════════
   Redeeming a six-character code.

     POST { email, code }             → what the code is, and for a staff
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
  email?: string;
  org_name?: string;
  volunteer_name?: string;
};
type PersonalResolved = { id: string; email: string; name: string; role: "individual" | "feeder" };

const NO_MATCH = "That email and code do not match. Check both and try again.";
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const normaliseEmail = (value: string) => value.trim().toLowerCase();
/* The same shape the codes are read in: upper case, nothing but letters
   and digits. Applied to what is typed AND to what is stored, so the two
   are compared on equal terms. */
const normaliseCode = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function POST(req: Request) {
  let body: { code?: string; email?: string; action?: string };
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
  const email = normaliseEmail(String(body.email ?? ""));
  if (body.action !== "claim" && !emailPattern.test(email)) {
    return NextResponse.json({ error: "Enter the email address that received this code." }, { status: 400 });
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
    (await allowRequest(`code:${code}:${email || "claim"}`, "join_code", 8, 3600));
  if (!ok) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes and try again." },
      { status: 429 }
    );
  }

  if (body.action === "claim") return claim(req, code);

  /* Every lookup below can fail for a reason that has nothing to do with
     the code: a migration that was never run, an RPC that is not there, a
     permission. Those used to be discarded, and all three code spaces
     collapsed into "that email and code do not match" — so somebody
     holding a perfectly good code was sent hunting for a typo that did not
     exist, and nobody could tell from the outside that anything was wrong.
     They are collected instead, and reported as what they are. */
  const broke: string[] = [];

  /* Staff first: a code that opens a dashboard is the one worth checking
     hardest, and the two code spaces do not overlap. */
  const { data: staffRaw, error: staffErr } = await supa.rpc("resolve_access_code", { p_code: code });
  if (staffErr) broke.push(`resolve_access_code: ${staffErr.message}`);
  const staff = (staffRaw ?? {}) as Resolved;

  /* A code that exists and is dead explains itself. The RPC already works
     out which, and those two messages were written to be read by the
     person holding the code — "ask for a new one" is the whole answer, and
     saying "check both and try again" instead just wastes their afternoon.
     A code that is live still reveals nothing: only "expired" and "turned
     off" are passed on, and neither is any use to somebody guessing. */
  if (!staff.ok && typeof staff.error === "string" && /expired|turned off/i.test(staff.error)) {
    return NextResponse.json({ error: staff.error }, { status: 403 });
  }

  if (staff.ok && staff.email && normaliseEmail(staff.email) === email) {
    const accountEmail = normaliseEmail(staff.email);

    /* An account may not exist yet, and she should not have to make one.
       Creating it here is what lets a code be the whole sign-in. */
    const created = await supa.auth.admin.createUser({
      email: accountEmail,
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

    const link = await supa.auth.admin.generateLink({ type: "magiclink", email: accountEmail });
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
      email: accountEmail,
      name: staff.name ?? null,
      role: staff.role ?? "member",
      orgName: staff.org_name ?? "your organisation",
    });
  }

  /* Not a staff code. It may be a volunteer's reporting code, which grants
     no dashboard and needs no account. */
  const { data: volRaw, error: volErr } = await supa.rpc("resolve_invite_code", { p_code: code });
  if (volErr) broke.push(`resolve_invite_code: ${volErr.message}`);
  const vol = (volRaw ?? {}) as VolunteerResolved;
  if (vol.ok && vol.email && normaliseEmail(vol.email) === email) {
    return NextResponse.json({
      kind: "volunteer",
      code,
      name: vol.volunteer_name ?? null,
      orgName: vol.org_name ?? "your organisation",
    });
  }

  /* Matched the way the staff lookup matches, which is not how this one
     used to. resolve_access_code() compares upper(btrim(code)), so a row
     carrying a stray space or the wrong case still resolves. This compared
     both fields with exact equality, so a code stored as "9pne4h" or an
     address stored as "Info@example.org " — which is what happens the
     moment a row is typed into a SQL editor or arrives from a
     spreadsheet rather than through this endpoint — was invisible, and
     the holder was told their code was wrong.

     Fetch by code case-insensitively, then compare both fields fully
     normalised. Codes are unique, so this is one row either way. */
  const { data: personalRows, error: personalErr } = await supa
    .from("personal_access_codes")
    .select("id,email,name,role,code,active")
    .ilike("code", code);
  if (personalErr) broke.push(`personal_access_codes: ${personalErr.message}`);
  const personal =
    (personalRows ?? []).find(
      (row: { email?: string; code?: string; active?: boolean }) =>
        row.active !== false &&
        normaliseCode(String(row.code ?? "")) === code &&
        normaliseEmail(String(row.email ?? "")) === email
    ) as PersonalResolved | null ?? null;
  if (personal) {
    const created = await supa.auth.admin.createUser({ email: personal.email, email_confirm: true, user_metadata: { display_name: personal.name } });
    if (created.error && !/already|registered|exists/i.test(created.error.message ?? "")) return NextResponse.json({ error: "Could not open your account. Try again shortly." }, { status: 500 });
    const link = await supa.auth.admin.generateLink({ type: "magiclink", email: personal.email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) return NextResponse.json({ error: "Could not sign you in just now. Try again shortly." }, { status: 500 });
    return NextResponse.json({ kind: "personal", tokenHash, email: personal.email, name: personal.name, role: personal.role });
  }

  /* Nothing matched — but if every place we looked was broken, "your code
     is wrong" is a guess, and the wrong one. Say so, and put the real
     reason where whoever runs this can read it. `missing relation` is the
     migration case and names the file to run. */
  if (broke.length > 0) {
    console.error("[join] code lookup failed:", broke.join(" | "));
    const missing = broke.some((b) => /does not exist|relation|schema cache|function/i.test(b));
    return NextResponse.json(
      {
        error: missing
          ? "StrayPaw cannot look up codes yet: its database is missing a piece. This is not your code. Tell whoever sent it to you."
          : "StrayPaw could not check your code just now. Try again in a moment.",
        ref: missing ? "codes-table-missing" : "codes-lookup-failed",
      },
      { status: 503 }
    );
  }

  /* Say as little as the person needs. Distinguishing "expired" from
     "never existed" is worth it for someone holding a real code, but
     anything finer just tells a guesser they are warm. */
  return NextResponse.json({ error: NO_MATCH }, { status: 404 });
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

  const signedInEmail = normaliseEmail(who.user.email ?? "");
  const { data: claimRows } = await supa
    .from("personal_access_codes")
    .select("id,email,uses,code,active")
    .ilike("code", code);
  const personal =
    (claimRows ?? []).find(
      (row: { code?: string; active?: boolean }) =>
        row.active !== false && normaliseCode(String(row.code ?? "")) === code
    ) ?? null;
  if (personal && normaliseEmail(personal.email) === signedInEmail) {
    /* Increment. Assigning 1 meant the column read "used once" no matter how
       many times somebody signed in, so the one number that would show a
       shared or leaked code never moved off 1. */
    await supa
      .from("personal_access_codes")
      .update({ uses: (personal.uses ?? 0) + 1, last_used_at: new Date().toISOString() })
      .eq("id", personal.id);
    return NextResponse.json({ ok: true });
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
