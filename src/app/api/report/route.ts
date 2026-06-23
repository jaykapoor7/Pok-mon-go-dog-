import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const { data, error } = await supa.rpc("report_sighting", {
    p_photo_url: photoUrl,
    p_lat: lat,
    p_lng: lng,
    p_zone: String(body.zone ?? "Delhi"),
    p_nickname: body.nickname ? String(body.nickname) : null,
    p_mood_tags: moods,
    p_notes: body.notes ? String(body.notes) : null,
    p_reporter_name: body.reporterName ? String(body.reporterName) : null,
  });

  if (error) {
    console.error("report_sighting failed:", error.message);
    return NextResponse.json({ error: "Could not save sighting." }, { status: 500 });
  }

  const dog = data as { id?: string; trust_score?: number } | null;
  return NextResponse.json({
    dogId: dog?.id ?? null,
    trust: dog?.trust_score ?? 60,
  });
}
