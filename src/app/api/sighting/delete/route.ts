import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: Request) {
  let body: { sightingId?: string; ownerToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sightingId = body.sightingId;
  const ownerToken = body.ownerToken;
  if (!sightingId || !ownerToken) {
    return NextResponse.json(
      { error: "Missing sighting or ownership token." },
      { status: 400 }
    );
  }

  const supa = getSupabaseAdmin() ?? getSupabase();
  if (!supa) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 500 });
  }

  const { data, error } = await supa.rpc("delete_sighting", {
    p_sighting_id: sightingId,
    p_owner_hash: sha256(ownerToken),
  });

  if (error) {
    console.error("delete_sighting failed:", error);
    return NextResponse.json(
      { error: `Could not delete sighting: ${error.message}` },
      { status: 500 }
    );
  }

  // The function returns false when the token doesn't match.
  if (data !== true) {
    return NextResponse.json(
      { error: "Not allowed — you can only delete sightings you created." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
