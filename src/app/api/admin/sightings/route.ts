import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendSightingLiveEmail } from "@/lib/email";
import { autoApprovalOn, sightingChecks } from "@/lib/auto-approve";
import { checkSightingPhoto, photoCheckAvailable } from "@/lib/photo-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Protected moderation endpoint (no UI). Authenticate with the ADMIN_SECRET
// env via:  Authorization: Bearer <ADMIN_SECRET>   or   ?key=<ADMIN_SECRET>
//
//   GET  /api/admin/sightings            → list pending sightings
//   POST /api/admin/sightings            → { action: "approve"|"reject", id }
// ─────────────────────────────────────────────────────────────

type AuthState = "ok" | "unset" | "bad";

function authState(req: Request): AuthState {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return "unset"; // not configured on the server
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const key = new URL(req.url).searchParams.get("key")?.trim();
  return bearer === secret || key === secret ? "ok" : "bad";
}

/** Distinct responses so a missing env var doesn't masquerade as a bad password. */
function authReject(state: AuthState) {
  if (state === "unset") {
    return NextResponse.json(
      {
        error:
          "Admin login isn't configured on the server. Set ADMIN_SECRET in Vercel → Settings → Environment Variables (Production) and redeploy.",
      },
      { status: 503 }
    );
  }
  return NextResponse.json({ error: "Wrong password." }, { status: 401 });
}

export async function GET(req: Request) {
  const state = authState(req);
  if (state !== "ok") return authReject(state);
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }
  const { data, error } = await supa
    .from("sightings")
    .select("id, reporter_name, zone, nickname, photo_url, notes, mood_tags, created_at, lat, lng, claimed_dog_id, trust_score, user_id, ngo_id, volunteer_name, sterilisation_status, vaccination_status")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  /* Each pending report carries the automatic-approval checks, so the
     reviewer sees exactly why it was left for a person. Who reported is
     reduced to its kind; no account id leaves the server. */
  const pending = (data ?? []).map(({ user_id, ngo_id, ...row }) => {
    const facts = { photoUrl: row.photo_url, lat: row.lat, lng: row.lng, notes: row.notes, nickname: row.nickname, signedIn: !!user_id, forOrganisation: !!ngo_id, claimedDogId: row.claimed_dog_id, trust: row.trust_score };
    return { ...row, reporter_kind: ngo_id ? "organisation" : user_id ? "signed-in" : "guest", checks: sightingChecks(facts), passes: sightingChecks(facts).every((c) => c.ok) };
  });
  return NextResponse.json({ pending, count: pending.length, autoApproval: autoApprovalOn(), photoCheck: photoCheckAvailable() });
}

export async function POST(req: Request) {
  const state = authState(req);
  if (state !== "ok") return authReject(state);
  const supa = getSupabaseAdmin();
  if (!supa) {
    return NextResponse.json(
      { error: "Service role not configured (set SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  let body: { action?: string; id?: string; dogId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  /* Run the photo check on one pending report, on demand. */
  if (body.action === "photo_check" && body.id) {
    if (!photoCheckAvailable()) return NextResponse.json({ available: false });
    const { data: row } = await supa.from("sightings").select("photo_url").eq("id", body.id).eq("status", "pending").maybeSingle();
    if (!row?.photo_url) return NextResponse.json({ available: true, verdict: { ok: false, reason: "No photograph" } });
    return NextResponse.json({ available: true, verdict: await checkSightingPhoto(row.photo_url) });
  }

  /* Approve every pending report that passes all the checks, as new animals. */
  if (body.action === "approve_passing") {
    const { data: rows, error: listError } = await supa
      .from("sightings")
      .select("id, photo_url, lat, lng, notes, nickname, user_id, ngo_id, claimed_dog_id, trust_score")
      .eq("status", "pending").limit(200);
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
    const passing = (rows ?? []).filter((r) => sightingChecks({ photoUrl: r.photo_url, lat: r.lat, lng: r.lng, notes: r.notes, nickname: r.nickname, signedIn: !!r.user_id, forOrganisation: !!r.ngo_id, claimedDogId: r.claimed_dog_id, trust: r.trust_score }).every((c) => c.ok));
    const approved: string[] = [];
    for (const r of passing) {
      if (photoCheckAvailable() && !(r.photo_url && (await checkSightingPhoto(r.photo_url)).ok)) continue;
      const { error: e } = await supa.rpc("approve_sighting", { p_sighting_id: r.id, p_dog_id: null });
      if (!e) approved.push(r.id);
    }
    return NextResponse.json({ ok: true, approved });
  }

  if (!body.id || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json(
      { error: "Provide { action: 'approve' | 'reject', id }" },
      { status: 400 }
    );
  }

  if (body.action === "approve") {
    const { data, error } = await supa.rpc("approve_sighting", {
      p_sighting_id: body.id,
      /* A reviewer naming the animal is the strongest link we can record.
         Absent, the reporter's own claim is used, and absent that the
         observation becomes its own animal rather than being guessed into
         a neighbour's record. */
      p_dog_id: body.dogId ? String(body.dogId) : null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify the reporter if they left an email (best-effort; never blocks).
    try {
      const { data: s } = await supa
        .from("sightings")
        .select("reporter_email, reporter_name, dog_id")
        .eq("id", body.id)
        .single();
      const dogId = s?.dog_id ?? (data as { dog_id?: string } | null)?.dog_id ?? null;
      if (s?.reporter_email && dogId) {
        void sendSightingLiveEmail(s.reporter_email, s.reporter_name ?? null, dogId);
      }
    } catch {
      /* email is non-critical */
    }

    return NextResponse.json({ ok: true, result: data });
  }

  const { data, error } = await supa.rpc("reject_sighting", {
    p_sighting_id: body.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rejected: data === true });
}
