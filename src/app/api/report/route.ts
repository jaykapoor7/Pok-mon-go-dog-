import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token: string | null, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // No secret configured → spam protection disabled (dev / pre-launch).
  if (!secret) return true;
  if (!token) return false;

  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body: form });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ip =
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const ok = await verifyTurnstile((body.token as string) ?? null, ip);
  if (!ok) {
    return NextResponse.json(
      { error: "Verification failed. Please complete the check and try again." },
      { status: 400 }
    );
  }

  const photoUrl = String(body.photoUrl ?? "");
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!photoUrl || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: "A photo and location are required." },
      { status: 400 }
    );
  }

  // Prefer the service role (so direct anon RPC access can be revoked); fall
  // back to anon while migrating.
  const supa = getSupabaseAdmin() ?? getSupabase();
  if (!supa) {
    return NextResponse.json(
      { error: "Backend not configured." },
      { status: 500 }
    );
  }

  const moods = Array.isArray(body.moods) ? (body.moods as string[]) : [];
  const ownerHash = body.ownerToken
    ? sha256(String(body.ownerToken))
    : null;

  // If the reporter is signed in, verify their access token server-side and
  // attach the sighting to their account so they can manage it from any device.
  let userId: string | null = null;
  const accessToken = body.accessToken ? String(body.accessToken) : null;
  if (accessToken) {
    const { data: userData } = await supa.auth.getUser(accessToken);
    userId = userData.user?.id ?? null;
  }

  const { data, error } = await supa.rpc("report_sighting", {
    p_photo_url: photoUrl,
    p_lat: lat,
    p_lng: lng,
    p_zone: String(body.zone ?? "Delhi"),
    p_nickname: body.nickname ? String(body.nickname) : null,
    p_mood_tags: moods,
    p_notes: body.notes ? String(body.notes) : null,
    p_reporter_name: body.reporterName ? String(body.reporterName) : null,
    p_owner_hash: ownerHash,
    p_user_id: userId,
  });

  if (error) {
    console.error("report_sighting failed:", error);
    // Surface the real reason so setup issues (missing schema, permissions)
    // are obvious instead of a generic message.
    const detail = [error.message, error.hint, error.code]
      .filter(Boolean)
      .join(" · ");
    return NextResponse.json(
      { error: `Could not save sighting: ${detail || "database error"}` },
      { status: 500 }
    );
  }

  const result = data as
    | { dog_id?: string; sighting_id?: string; trust_score?: number }
    | null;
  return NextResponse.json({
    dogId: result?.dog_id ?? null,
    sightingId: result?.sighting_id ?? null,
    trust: result?.trust_score ?? 60,
  });
}
